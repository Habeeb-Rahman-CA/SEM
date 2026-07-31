import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingProfile } from './entities/billing-profile.entity';
import { BillingContact } from './entities/billing-contact.entity';
import {
  Invoice,
  InvoiceBillToSnapshot,
  InvoiceLineItem,
  InvoicePaymentRecord,
} from './entities/invoice.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  RecordPaymentDto,
  UpdateBillingProfileDto,
  UpsertBillingContactDto,
} from './dto/update-billing-profile.dto';

/**
 * Workspace billing centre.
 *
 * Owns billing profile (company/tax), billing contacts (invoice CCs), and
 * invoices. Auto-generates invoices when the SubscriptionsService reports
 * a plan change. When enforcement is disabled (SUBSCRIPTIONS_ENABLED=false)
 * invoices still get generated so admins can preview what real customers
 * would see — they just aren't tied to any payment provider.
 */
@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(BillingProfile)
    private readonly profileRepo: Repository<BillingProfile>,
    @InjectRepository(BillingContact)
    private readonly contactRepo: Repository<BillingContact>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Profile ─────────────────────────────────────────────────────────

  async getOrProvisionProfile(workspaceId: string): Promise<BillingProfile> {
    const existing = await this.profileRepo.findOne({ where: { workspaceId } });
    if (existing) return existing;
    const created = this.profileRepo.create({
      workspaceId,
      defaultCurrency: 'USD',
      taxRatePercent: 0,
    });
    return this.profileRepo.save(created);
  }

  async getProfile(workspaceId: string, userId: string) {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.getOrProvisionProfile(workspaceId);
  }

  async updateProfile(
    workspaceId: string,
    dto: UpdateBillingProfileDto,
    userId: string,
  ): Promise<BillingProfile> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );
    const profile = await this.getOrProvisionProfile(workspaceId);
    Object.assign(profile, {
      ...(dto.companyName !== undefined && { companyName: dto.companyName }),
      ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
      ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.taxId !== undefined && { taxId: dto.taxId }),
      ...(dto.taxIdType !== undefined && { taxIdType: dto.taxIdType }),
      ...(dto.taxRatePercent !== undefined && {
        taxRatePercent: dto.taxRatePercent,
      }),
      ...(dto.defaultCurrency !== undefined && {
        defaultCurrency: dto.defaultCurrency,
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });
    return this.profileRepo.save(profile);
  }

  // ─── Contacts ────────────────────────────────────────────────────────

  async listContacts(
    workspaceId: string,
    userId: string,
  ): Promise<BillingContact[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.contactRepo.find({
      where: { workspaceId },
      order: { role: 'ASC', createdAt: 'ASC' },
    });
  }

  async createContact(
    workspaceId: string,
    dto: UpsertBillingContactDto,
    userId: string,
  ): Promise<BillingContact> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );
    const contact = this.contactRepo.create({
      workspaceId,
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      role: dto.role ?? 'primary',
      receivesInvoices: dto.receivesInvoices ?? true,
    });
    return this.contactRepo.save(contact);
  }

  async updateContact(
    workspaceId: string,
    contactId: string,
    dto: UpsertBillingContactDto,
    userId: string,
  ): Promise<BillingContact> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );
    const contact = await this.contactRepo.findOne({
      where: { id: contactId, workspaceId },
    });
    if (!contact) throw new NotFoundException('Billing contact not found');
    Object.assign(contact, {
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      role: dto.role ?? contact.role,
      receivesInvoices:
        dto.receivesInvoices !== undefined
          ? dto.receivesInvoices
          : contact.receivesInvoices,
    });
    return this.contactRepo.save(contact);
  }

  async removeContact(
    workspaceId: string,
    contactId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );
    const contact = await this.contactRepo.findOne({
      where: { id: contactId, workspaceId },
    });
    if (!contact) throw new NotFoundException('Billing contact not found');
    contact.deletedAt = new Date();
    await this.contactRepo.save(contact);
  }

  // ─── Invoices ────────────────────────────────────────────────────────

  async listInvoices(workspaceId: string, userId: string): Promise<Invoice[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.invoiceRepo.find({
      where: { workspaceId },
      order: { issuedAt: 'DESC', createdAt: 'DESC' },
      relations: { plan: true },
    });
  }

  async getInvoice(
    workspaceId: string,
    invoiceId: string,
    userId: string,
  ): Promise<Invoice> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, workspaceId },
      relations: { plan: true, subscription: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async recordPayment(
    workspaceId: string,
    invoiceId: string,
    dto: RecordPaymentDto,
    userId: string,
  ): Promise<Invoice> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, workspaceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'void') {
      throw new BadRequestException(
        'Cannot record payment on a voided invoice',
      );
    }

    const payment: InvoicePaymentRecord = {
      id: this.newId(),
      amountCents: dto.amountCents,
      currency: invoice.currency,
      method: dto.method ?? 'manual',
      reference: dto.reference ?? null,
      status: 'succeeded',
      occurredAt: new Date().toISOString(),
      notes: dto.notes ?? null,
    };
    invoice.payments = [...(invoice.payments ?? []), payment];

    const paidTotal = invoice.payments
      .filter((p) => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amountCents, 0);
    if (paidTotal >= invoice.totalCents) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
    }

    return this.invoiceRepo.save(invoice);
  }

  async voidInvoice(
    workspaceId: string,
    invoiceId: string,
    userId: string,
  ): Promise<Invoice> {
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
      throw new BadRequestException(
        'Cannot void a paid invoice — issue a credit note instead',
      );
    }
    invoice.status = 'void';
    return this.invoiceRepo.save(invoice);
  }

  /**
   * Called by SubscriptionsService whenever the workspace switches to a
   * paid plan. Free-plan changes don't produce an invoice. Trial starts
   * generate an issued-but-zero invoice acting as the trial receipt so the
   * ledger stays complete.
   */
  async generateInvoiceForPlanChange(opts: {
    workspaceId: string;
    subscription: Subscription;
    plan: SubscriptionPlan;
    isTrial: boolean;
    periodStart: Date;
    periodEnd: Date | null;
  }): Promise<Invoice | null> {
    // Free tier changes don't generate invoices — no revenue, no document.
    if (opts.plan.priceCents === 0 && !opts.isTrial) return null;

    const profile = await this.getOrProvisionProfile(opts.workspaceId);
    const contacts = await this.contactRepo.find({
      where: { workspaceId: opts.workspaceId },
    });

    const subtotalCents = opts.isTrial ? 0 : opts.plan.priceCents;
    const taxCents = Math.round(
      (subtotalCents * Number(profile.taxRatePercent ?? 0)) / 100,
    );
    const totalCents = subtotalCents + taxCents;

    const currency = opts.plan.currency || profile.defaultCurrency || 'USD';
    const lineItem: InvoiceLineItem = {
      id: this.newId(),
      description: opts.isTrial
        ? `${opts.plan.name} — trial period`
        : `${opts.plan.name} plan · ${opts.plan.billingInterval}ly`,
      quantity: 1,
      unitPriceCents: subtotalCents,
      amountCents: subtotalCents,
    };

    const billTo: InvoiceBillToSnapshot = {
      companyName: profile.companyName,
      addressLine1: profile.addressLine1,
      addressLine2: profile.addressLine2,
      city: profile.city,
      state: profile.state,
      postalCode: profile.postalCode,
      country: profile.country,
      taxId: profile.taxId,
      taxIdType: profile.taxIdType,
      contacts: contacts
        .filter((c) => c.receivesInvoices)
        .map((c) => ({ name: c.name, email: c.email, role: c.role })),
    };

    const invoiceNumber = await this.nextInvoiceNumber(opts.periodStart);
    const now = new Date();

    const invoice = this.invoiceRepo.create({
      workspaceId: opts.workspaceId,
      subscriptionId: opts.subscription.id,
      planId: opts.plan.id,
      invoiceNumber,
      status: opts.isTrial || totalCents === 0 ? 'paid' : 'issued',
      issuedAt: now,
      dueAt: opts.isTrial
        ? null
        : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      paidAt: opts.isTrial || totalCents === 0 ? now : null,
      periodStart: opts.periodStart,
      periodEnd: opts.periodEnd,
      subtotalCents,
      taxCents,
      totalCents,
      currency,
      lineItems: [lineItem],
      payments: [],
      billTo,
      notes: opts.isTrial ? 'Trial period — no charge.' : null,
    });

    return this.invoiceRepo.save(invoice);
  }

  private async nextInvoiceNumber(periodStart: Date): Promise<string> {
    const year = periodStart.getFullYear();
    // Count invoices this year and increment. Not concurrency-safe under
    // heavy load — a real deploy should use a sequence or Postgres advisory
    // lock. Fine for MVP.
    const count = await this.invoiceRepo
      .createQueryBuilder('inv')
      .where('EXTRACT(YEAR FROM inv.createdAt) = :year', { year })
      .getCount();
    const seq = String(count + 1).padStart(6, '0');
    return `INV-${year}-${seq}`;
  }

  private newId(): string {
    // Prefer crypto.randomUUID when available (Node 16.14+). This module
    // runs in Node, so it always is.

    const { randomUUID } = require('crypto');
    return randomUUID();
  }
}
