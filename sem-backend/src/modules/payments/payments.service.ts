import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentIntent } from './entities/payment-intent.entity';
import {
  PaymentAuditEvent,
  PaymentAuditLog,
} from './entities/payment-audit-log.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { BillingService } from '../billing/billing.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import { WebhookEvent } from './providers/payment-provider.interface';

/**
 * Owns the payment lifecycle.
 *
 * Creates provider-agnostic PaymentIntents against invoices, records every
 * provider interaction in an append-only audit log, applies incoming
 * webhooks by mutating the intent + underlying invoice, and dispatches
 * refunds back to the originating provider.
 *
 * The BillingService's `recordPayment` is used to keep the invoice ledger
 * in sync with successful payments — same code path as manual payments,
 * so the invoice always has one canonical view.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentIntent)
    private readonly intentRepo: Repository<PaymentIntent>,
    @InjectRepository(PaymentAuditLog)
    private readonly auditRepo: Repository<PaymentAuditLog>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly billingService: BillingService,
    private readonly workspacesService: WorkspacesService,
    private readonly providers: PaymentProviderRegistry,
  ) {}

  // ─── Create intent ────────────────────────────────────────────────────

  async createIntentForInvoice(
    workspaceId: string,
    invoiceId: string,
    userId: string,
    returnUrl?: string,
  ): Promise<PaymentIntent> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );

    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, workspaceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice is already paid');
    }
    if (invoice.status === 'void') {
      throw new BadRequestException('Cannot pay a voided invoice');
    }

    const outstanding = this.outstanding(invoice);
    if (outstanding <= 0) {
      throw new BadRequestException('Nothing outstanding on this invoice');
    }

    const provider = await this.providers.active();
    const created = await provider.createIntent({
      workspaceId,
      invoiceId,
      subscriptionId: invoice.subscriptionId,
      amountCents: outstanding,
      currency: invoice.currency,
      metadata: {
        workspaceId,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
      },
      returnUrl,
    });

    const intent = this.intentRepo.create({
      workspaceId,
      invoiceId,
      subscriptionId: invoice.subscriptionId,
      providerCode: provider.code,
      providerRef: created.providerRef,
      amountCents: outstanding,
      currency: invoice.currency,
      status: 'requires_payment_method',
      metadata: created.metadata,
    });
    const saved = await this.intentRepo.save(intent);

    await this.audit({
      workspaceId,
      paymentIntentId: saved.id,
      providerCode: provider.code,
      event: 'intent_created',
      payload: {
        invoiceId,
        providerRef: created.providerRef,
        amountCents: outstanding,
        currency: invoice.currency,
      },
      userId,
    });

    return saved;
  }

  // ─── Confirm (mock only) ──────────────────────────────────────────────

  async confirmMockIntent(
    workspaceId: string,
    providerRef: string,
    userId: string,
    sourceIp?: string,
  ): Promise<PaymentIntent> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );

    const intent = await this.intentRepo.findOne({
      where: { workspaceId, providerRef },
    });
    if (!intent) throw new NotFoundException('Payment intent not found');
    if (intent.status === 'succeeded') return intent;

    const provider = this.providers.byCode(intent.providerCode);
    if (!provider.confirmIntent) {
      throw new BadRequestException(
        'This provider does not support server-side confirmation — complete the payment via its hosted flow.',
      );
    }

    const result = await provider.confirmIntent(providerRef);
    if (result.status === 'succeeded') {
      // Instead of updating state directly, feed a synthetic webhook event
      // through the same handler real webhooks go through. Guarantees one
      // canonical apply-path, so mock ↔ real behave identically.
      return this.applyWebhookEvent(
        intent.providerCode,
        {
          kind: 'payment_succeeded',
          providerRef,
          amountCents: intent.amountCents,
          currency: intent.currency,
          raw: { synthetic: true, source: 'mock-confirm' },
        },
        sourceIp ?? null,
        userId,
      );
    }

    intent.status = 'failed';
    intent.failureReason = 'Mock confirmation returned failed status';
    const saved = await this.intentRepo.save(intent);
    await this.audit({
      workspaceId: intent.workspaceId,
      paymentIntentId: intent.id,
      providerCode: intent.providerCode,
      event: 'intent_failed',
      payload: { providerRef },
      userId,
      sourceIp: sourceIp ?? null,
    });
    return saved;
  }

  // ─── Refunds ──────────────────────────────────────────────────────────

  async refundInvoice(
    workspaceId: string,
    invoiceId: string,
    amountCents: number | undefined,
    reason: string | undefined,
    userId: string,
  ): Promise<PaymentIntent[]> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );

    const intents = await this.intentRepo.find({
      where: { workspaceId, invoiceId, status: 'succeeded' },
      order: { createdAt: 'ASC' },
    });
    if (intents.length === 0) {
      throw new BadRequestException(
        'No succeeded payment intents on this invoice',
      );
    }

    // Simplest sane policy for MVP: refund the most recent succeeded intent.
    // Partial-refund-across-multiple-charges is a follow-up.
    const target = intents[intents.length - 1];
    const provider = this.providers.byCode(target.providerCode);

    await this.audit({
      workspaceId,
      paymentIntentId: target.id,
      providerCode: provider.code,
      event: 'refund_requested',
      payload: {
        invoiceId,
        amountCents: amountCents ?? target.amountCents,
        reason: reason ?? null,
      },
      userId,
    });

    try {
      const result = await provider.refund({
        providerRef: target.providerRef!,
        amountCents,
        reason,
      });

      target.status = 'refunded';
      target.refundedAt = new Date();
      await this.intentRepo.save(target);

      await this.audit({
        workspaceId,
        paymentIntentId: target.id,
        providerCode: provider.code,
        event: 'refund_succeeded',
        payload: { providerRef: target.providerRef, result },
        userId,
      });

      // Mark invoice as void if it was previously paid — a real accounting
      // system would issue a credit note; MVP keeps it simple.
      const invoice = await this.invoiceRepo.findOne({
        where: { id: invoiceId, workspaceId },
      });
      if (invoice && invoice.status === 'paid') {
        invoice.status = 'void';
        await this.invoiceRepo.save(invoice);
      }

      return [target];
    } catch (err: any) {
      await this.audit({
        workspaceId,
        paymentIntentId: target.id,
        providerCode: provider.code,
        event: 'refund_failed',
        payload: {
          providerRef: target.providerRef,
          error: err?.message ?? String(err),
        },
        userId,
      });
      throw new BadRequestException(
        `Refund failed: ${err?.message ?? 'unknown provider error'}`,
      );
    }
  }

  // ─── Webhook handling ─────────────────────────────────────────────────

  async handleWebhook(
    providerCode: string,
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
    sourceIp: string | null,
  ): Promise<{ ok: true }> {
    const provider = this.providers.byCode(providerCode);

    await this.audit({
      providerCode: provider.code,
      event: 'webhook_received',
      payload: { bytes: rawBody.length },
      sourceIp,
    });

    let event: WebhookEvent;
    try {
      event = provider.verifyAndParseWebhook(rawBody, headers);
    } catch (err: any) {
      await this.audit({
        providerCode: provider.code,
        event: 'webhook_verification_failed',
        payload: { error: err?.message ?? String(err) },
        sourceIp,
      });
      throw new BadRequestException('Webhook signature invalid');
    }

    const intent = event.providerRef
      ? await this.intentRepo.findOne({
          where: {
            providerCode: provider.code,
            providerRef: event.providerRef,
          },
        })
      : null;

    // Feed through the shared applier so mock/real behave identically.
    await this.applyWebhookEvent(
      provider.code,
      event,
      sourceIp,
      intent?.createdBy ?? null,
    );

    return { ok: true };
  }

  private async applyWebhookEvent(
    providerCode: string,
    event: WebhookEvent,
    sourceIp: string | null,
    userId: string | null,
  ): Promise<PaymentIntent> {
    const intent = await this.intentRepo.findOne({
      where: { providerCode, providerRef: event.providerRef },
    });
    if (!intent) {
      throw new NotFoundException(
        `PaymentIntent not found for providerRef=${event.providerRef}`,
      );
    }

    switch (event.kind) {
      case 'payment_succeeded':
        intent.status = 'succeeded';
        intent.confirmedAt = new Date();
        intent.failureReason = null;
        if (event.amountCents) {
          intent.amountCents = event.amountCents;
        }
        await this.intentRepo.save(intent);

        // Push a payment record into the invoice via the billing service,
        // so the invoice's `paid` flip is the same code path as manual.
        if (intent.invoiceId) {
          const savedInvoice = await this.invoiceRepo.findOne({
            where: { id: intent.invoiceId },
          });
          if (savedInvoice && savedInvoice.status !== 'paid') {
            savedInvoice.payments = [
              ...(savedInvoice.payments ?? []),
              {
                id: intent.id,
                amountCents: intent.amountCents,
                currency: intent.currency,
                method: (intent.method as any) ?? 'card',
                reference: intent.providerRef,
                status: 'succeeded',
                occurredAt: new Date().toISOString(),
                notes: `Auto-recorded from ${providerCode} webhook`,
              },
            ];
            const paidTotal = savedInvoice.payments
              .filter((p) => p.status === 'succeeded')
              .reduce((sum, p) => sum + p.amountCents, 0);
            if (paidTotal >= savedInvoice.totalCents) {
              savedInvoice.status = 'paid';
              savedInvoice.paidAt = new Date();
            }
            await this.invoiceRepo.save(savedInvoice);
            await this.audit({
              workspaceId: intent.workspaceId,
              paymentIntentId: intent.id,
              providerCode,
              event: 'invoice_marked_paid',
              payload: { invoiceId: savedInvoice.id },
              sourceIp,
              userId,
            });
          }
        }
        break;

      case 'payment_failed':
        intent.status = 'failed';
        intent.failureReason = event.failureReason ?? 'Payment failed';
        await this.intentRepo.save(intent);
        break;

      case 'refund_succeeded':
        intent.status = 'refunded';
        intent.refundedAt = new Date();
        await this.intentRepo.save(intent);
        break;

      case 'refund_failed':
      case 'unknown':
      default:
        // No state transition — audit only.
        break;
    }

    await this.audit({
      workspaceId: intent.workspaceId,
      paymentIntentId: intent.id,
      providerCode,
      event: 'webhook_applied',
      payload: { kind: event.kind, providerRef: event.providerRef },
      sourceIp,
      userId,
    });

    return intent;
  }

  // ─── Audit ────────────────────────────────────────────────────────────

  async listAudit(
    workspaceId: string,
    userId: string,
    limit = 100,
  ): Promise<PaymentAuditLog[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.auditRepo.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
      take: Math.min(500, Math.max(1, limit)),
    });
  }

  async listIntents(
    workspaceId: string,
    invoiceId: string,
    userId: string,
  ): Promise<PaymentIntent[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.intentRepo.find({
      where: { workspaceId, invoiceId },
      order: { createdAt: 'DESC' },
    });
  }

  private async audit(entry: {
    workspaceId?: string | null;
    paymentIntentId?: string | null;
    providerCode?: string | null;
    event: PaymentAuditEvent;
    payload?: Record<string, unknown> | null;
    sourceIp?: string | null;
    userId?: string | null;
  }): Promise<void> {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          workspaceId: entry.workspaceId ?? null,
          paymentIntentId: entry.paymentIntentId ?? null,
          providerCode: entry.providerCode ?? null,
          event: entry.event,
          payload: entry.payload ?? null,
          sourceIp: entry.sourceIp ?? null,
          userId: entry.userId ?? null,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to write payment audit entry (${entry.event}): ${
          (err as Error)?.message ?? err
        }`,
      );
    }
  }

  private outstanding(invoice: Invoice): number {
    const paid = (invoice.payments ?? [])
      .filter((p) => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amountCents, 0);
    return Math.max(0, invoice.totalCents - paid);
  }

  // Expose which provider is active for the frontend banner.
  async activeProviderInfo() {
    const active = await this.providers.active();
    return {
      code: active.code,
      displayName: active.displayName,
      isLive: active.isLive,
    };
  }
}
