/**
 * Provider-agnostic payment gateway interface.
 *
 * All state changes ("someone paid the invoice", "refund succeeded") flow
 * through webhooks — the app never trusts the client to tell it a payment
 * succeeded, even in mock mode. That way the same code paths run regardless
 * of provider, and swapping mock ↔ Stripe ↔ Razorpay is a config change.
 */
export interface CreateIntentArgs {
  workspaceId: string;
  invoiceId?: string | null;
  subscriptionId?: string | null;
  amountCents: number;
  currency: string;
  /** Free-form context the provider can pass back on the webhook. */
  metadata?: Record<string, string>;
  /** Where the hosted checkout should redirect after success/cancel. */
  returnUrl?: string;
}

export interface CreatedIntent {
  /** Provider's own identifier (Stripe PI id, mock uuid, etc.). */
  providerRef: string;
  /**
   * Extra data the frontend needs to complete the flow — Stripe client
   * secret, mock confirmation token, Checkout URL, etc.
   */
  metadata: Record<string, unknown>;
}

export interface RefundArgs {
  providerRef: string;
  amountCents?: number; // omit = full refund
  reason?: string;
}

export interface RefundResult {
  providerRef: string;
  status: 'succeeded' | 'pending' | 'failed';
  refundedAmountCents: number;
  raw?: unknown;
}

export type WebhookEventKind =
  | 'payment_succeeded'
  | 'payment_failed'
  | 'refund_succeeded'
  | 'refund_failed'
  | 'unknown';

export interface WebhookEvent {
  kind: WebhookEventKind;
  providerRef: string; // maps back to PaymentIntent.providerRef
  amountCents?: number;
  currency?: string;
  failureReason?: string;
  raw: unknown;
}

/**
 * A payment provider — implementations wrap Stripe / Razorpay / mock / etc.
 * The methods are intentionally minimal; anything gateway-specific gets
 * stashed in the metadata blob and read back on the frontend or in the
 * webhook handler.
 */
export interface PaymentProvider {
  /** Machine-friendly code stored on PaymentIntent.providerCode. */
  readonly code: string;

  /** Human-readable name shown in UI banners. */
  readonly displayName: string;

  /** True when real charges are possible. Mock providers return false. */
  readonly isLive: boolean;

  createIntent(args: CreateIntentArgs): Promise<CreatedIntent>;

  /**
   * Mock/dev-only: forces the intent to succeed immediately. Real providers
   * ignore this or throw — the client-side SDK finalises real intents.
   */
  confirmIntent?(
    providerRef: string,
  ): Promise<{ status: 'succeeded' | 'failed' }>;

  refund(args: RefundArgs): Promise<RefundResult>;

  /**
   * Verify the webhook signature. Returns the parsed body when valid;
   * throws when tampered. Real Stripe uses `Stripe-Signature` header;
   * mock accepts anything.
   */
  verifyAndParseWebhook(
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
  ): WebhookEvent;
}
