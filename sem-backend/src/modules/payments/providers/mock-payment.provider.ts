import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CreateIntentArgs,
  CreatedIntent,
  PaymentProvider,
  RefundArgs,
  RefundResult,
  WebhookEvent,
} from './payment-provider.interface';

/**
 * The mock provider is intentionally the *default* — it lets the app run
 * end-to-end (create intent → pay → webhook → invoice marked paid) with
 * zero external dependencies. Perfect for local dev, CI, and demoing the
 * billing centre before wiring a real gateway.
 *
 * Never marks itself as live, so the UI can hide "Pay with card" if
 * organizers shouldn't see a fake checkout form.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);
  readonly code = 'mock';
  readonly displayName = 'Mock (development)';
  readonly isLive = false;

  async createIntent(args: CreateIntentArgs): Promise<CreatedIntent> {
    const providerRef = `mock_pi_${randomUUID()}`;
    this.logger.log(
      `Created mock intent ${providerRef} for workspace=${args.workspaceId} amount=${args.amountCents}`,
    );
    return {
      providerRef,
      metadata: {
        clientSecret: `mock_secret_${randomUUID()}`,
        // Frontend uses this to know it's OK to render the fake checkout
        mockMode: true,
      },
    };
  }

  async confirmIntent(
    providerRef: string,
  ): Promise<{ status: 'succeeded' | 'failed' }> {
    this.logger.log(`Confirming mock intent ${providerRef} → succeeded`);
    return { status: 'succeeded' };
  }

  async refund(args: RefundArgs): Promise<RefundResult> {
    this.logger.log(
      `Mock refund on ${args.providerRef} amount=${args.amountCents ?? 'full'}`,
    );
    return {
      providerRef: args.providerRef,
      status: 'succeeded',
      refundedAmountCents: args.amountCents ?? 0,
    };
  }

  verifyAndParseWebhook(
    rawBody: Buffer | string,
    _headers: Record<string, string | string[] | undefined>,
  ): WebhookEvent {
    // Mock accepts JSON bodies of shape:
    //   { kind, providerRef, amountCents?, currency?, failureReason? }
    // Signature verification is a no-op.
    const parsed = JSON.parse(
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8'),
    );
    if (!parsed?.providerRef || !parsed?.kind) {
      throw new Error('Mock webhook missing providerRef or kind');
    }
    return {
      kind: parsed.kind,
      providerRef: parsed.providerRef,
      amountCents: parsed.amountCents,
      currency: parsed.currency,
      failureReason: parsed.failureReason,
      raw: parsed,
    };
  }
}
