import { Injectable, NotFoundException } from '@nestjs/common';
import { MockPaymentProvider } from './mock-payment.provider';
import { StripePaymentProvider } from './stripe-payment.provider';
import { PaymentProvider } from './payment-provider.interface';
import { CommerceConfigService } from '../../commerce-config/commerce-config.service';

/**
 * Runtime lookup for the active PaymentProvider(s).
 *
 * `active()` returns the provider selected by the CommerceConfig row
 * (managed via the super-admin UI). Reads are cheap — CommerceConfig
 * uses a short-TTL in-memory cache.
 *
 * `byCode()` resolves any provider by code — used by the webhook handler
 * since a workspace can have historical intents from a previous provider
 * after a config change.
 */
@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: Map<string, PaymentProvider>;

  constructor(
    mock: MockPaymentProvider,
    stripe: StripePaymentProvider,
    private readonly commerceConfig: CommerceConfigService,
  ) {
    this.providers = new Map<string, PaymentProvider>([
      [mock.code, mock],
      [stripe.code, stripe],
    ]);
  }

  async active(): Promise<PaymentProvider> {
    const code = await this.commerceConfig.activeProviderCode();
    return this.providers.get(code) ?? this.providers.get('mock')!;
  }

  byCode(code: string): PaymentProvider {
    const p = this.providers.get(code);
    if (!p) throw new NotFoundException(`Unknown payment provider: ${code}`);
    return p;
  }

  listSupported(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }
}
