import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  CreateIntentArgs,
  CreatedIntent,
  PaymentProvider,
  RefundArgs,
  RefundResult,
  WebhookEvent,
  WebhookEventKind,
} from './payment-provider.interface';
import { CommerceConfigService } from '../../commerce-config/commerce-config.service';

/**
 * Stripe payment provider — skeleton only.
 *
 * The methods here are intentionally not calling the Stripe SDK: pulling in
 * the `stripe` npm package is left for the deployment that toggles
 * paymentProvider=stripe in the super-admin UI. Each method has a clear
 * TODO(stripe) marking the line that becomes an SDK call.
 *
 * The webhook signature verification is a faithful, standalone
 * implementation of Stripe's HMAC-SHA256 signing scheme — it works with a
 * real Stripe webhook secret today, no SDK required.
 *
 * All credentials are read from the CommerceConfigService (database), so
 * a super-admin can rotate keys from the UI without a redeploy.
 */
@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(StripePaymentProvider.name);
  readonly code = 'stripe';
  readonly displayName = 'Stripe';
  // "Is a real charge possible" — for Stripe, this is determined at request
  // time by whether the secret key is set. The UI treats Stripe as a live
  // provider and shows a "not configured yet" banner if keys are missing.
  readonly isLive = true;

  /**
   * Mirror of the webhook secret. verifyAndParseWebhook is synchronous
   * (part of the PaymentProvider contract), so we keep this hot-cached
   * and refresh it opportunistically. First-request-after-boot may see
   * `null` and reject the webhook — Stripe retries with backoff so this
   * self-corrects.
   */
  private cachedWebhookSecret: string | null = null;

  constructor(private readonly commerceConfig: CommerceConfigService) {
    // Warm the cache on startup so first-webhook verification usually works.
    void this.commerceConfig
      .stripeCredentials()
      .then((c) => {
        this.cachedWebhookSecret = c.webhookSecret ?? null;
        if (!c.secretKey) {
          this.logger.warn(
            'Stripe selected but no secret key configured — set it via Admin → System settings → Commerce.',
          );
        }
      })
      .catch(() => undefined);
  }

  async createIntent(_args: CreateIntentArgs): Promise<CreatedIntent> {
    const { secretKey } = await this.commerceConfig.stripeCredentials();
    if (!secretKey) {
      throw new Error(
        'Stripe secret key not configured — open Admin → System settings → Commerce to set it.',
      );
    }
    // TODO(stripe): replace with `stripe.paymentIntents.create({...})`
    //   const pi = await stripe.paymentIntents.create({
    //     amount: args.amountCents,
    //     currency: args.currency.toLowerCase(),
    //     metadata: { workspaceId: args.workspaceId, invoiceId: args.invoiceId ?? '' },
    //     automatic_payment_methods: { enabled: true },
    //   });
    //   return { providerRef: pi.id, metadata: { clientSecret: pi.client_secret } };
    throw new Error(
      'Stripe SDK not installed. Add the `stripe` package and remove this stub.',
    );
  }

  async refund(_args: RefundArgs): Promise<RefundResult> {
    const { secretKey } = await this.commerceConfig.stripeCredentials();
    if (!secretKey) {
      throw new Error('Stripe secret key not configured');
    }
    // TODO(stripe): stripe.refunds.create({ payment_intent: args.providerRef, amount: args.amountCents })
    throw new Error('Stripe SDK not installed.');
  }

  verifyAndParseWebhook(
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
  ): WebhookEvent {
    // Fire-and-forget refresh so the next request uses the latest secret.
    void this.commerceConfig
      .stripeCredentials()
      .then((c) => {
        this.cachedWebhookSecret = c.webhookSecret ?? null;
      })
      .catch(() => undefined);

    const secret = this.cachedWebhookSecret;
    if (!secret) {
      throw new Error(
        'Stripe webhook secret not configured — set it in Admin → System settings → Commerce.',
      );
    }

    // Stripe sends `Stripe-Signature: t=timestamp,v1=hex_hmac`.
    const sigHeaderRaw = headers['stripe-signature'];
    const sigHeader = Array.isArray(sigHeaderRaw)
      ? sigHeaderRaw[0]
      : sigHeaderRaw;
    if (!sigHeader) throw new Error('Missing Stripe-Signature header');

    const parts = Object.fromEntries(
      sigHeader.split(',').map((p) => {
        const [k, v] = p.split('=');
        return [k?.trim(), v?.trim()];
      }),
    );
    const timestamp = parts['t'];
    const signature = parts['v1'];
    if (!timestamp || !signature) {
      throw new Error('Malformed Stripe-Signature header');
    }

    const payload =
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    const signedPayload = `${timestamp}.${payload}`;
    const expected = createHmac('sha256', secret)
      .update(signedPayload, 'utf-8')
      .digest('hex');

    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error('Stripe signature mismatch');
    }

    const event = JSON.parse(payload);
    const kind = this.mapStripeEventType(event.type);
    const obj = event.data?.object ?? {};
    return {
      kind,
      providerRef: obj.id ?? obj.payment_intent ?? '',
      amountCents:
        obj.amount_received ?? obj.amount_refunded ?? obj.amount ?? undefined,
      currency: obj.currency ? String(obj.currency).toUpperCase() : undefined,
      failureReason: obj.last_payment_error?.message ?? undefined,
      raw: event,
    };
  }

  private mapStripeEventType(type: string): WebhookEventKind {
    switch (type) {
      case 'payment_intent.succeeded':
      case 'checkout.session.completed':
        return 'payment_succeeded';
      case 'payment_intent.payment_failed':
        return 'payment_failed';
      case 'charge.refunded':
      case 'refund.succeeded':
        return 'refund_succeeded';
      case 'refund.failed':
        return 'refund_failed';
      default:
        return 'unknown';
    }
  }
}
