import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommerceConfig } from './commerce-config.entity';

/**
 * Shape of the payload returned to the super-admin UI. Sensitive keys are
 * flattened into `has*` booleans — the raw values never leave the server.
 */
export interface CommerceConfigView {
  id: string;
  subscriptionsEnabled: boolean;
  freeUntilDate: string | null;
  effectiveEnforcement: boolean;
  paymentProvider: 'mock' | 'stripe';
  stripePublishableKey: string | null; // safe to expose
  hasStripeSecretKey: boolean;
  hasStripeWebhookSecret: boolean;
  defaultCurrency: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface UpdateCommerceConfigInput {
  subscriptionsEnabled?: boolean;
  /** ISO date string, empty string to clear, or undefined to leave unchanged. */
  freeUntilDate?: string | null;
  paymentProvider?: 'mock' | 'stripe';
  stripePublishableKey?: string | null;
  /**
   * When present, replaces the stored secret. Pass empty string to clear.
   * Never returned in reads.
   */
  stripeSecretKey?: string | null;
  stripeWebhookSecret?: string | null;
  defaultCurrency?: string;
}

/**
 * Reads and writes the singleton `commerce_config` row.
 *
 * A tiny in-memory cache (5-second TTL) is refreshed on every mutation
 * so hot-path checks (`isEnforcementEffective`, `activeProviderCode`)
 * don't hammer the DB. Multi-instance deployments should treat the
 * 5-second staleness as an acceptable propagation delay for config
 * flips; add pub/sub invalidation if you need sub-second consistency.
 */
@Injectable()
export class CommerceConfigService implements OnModuleInit {
  private readonly logger = new Logger(CommerceConfigService.name);

  private cache: CommerceConfig | null = null;
  private cacheExpiresAt = 0;
  private readonly CACHE_TTL_MS = 5_000;

  constructor(
    @InjectRepository(CommerceConfig)
    private readonly repo: Repository<CommerceConfig>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Ensure the singleton exists — DB migration handles this on manual
    // deploys, but dev environments running with TypeORM synchronize=true
    // won't have the seed insert.
    const existing = await this.repo.findOne({
      where: {},
      order: { updatedAt: 'ASC' },
    });
    if (!existing) {
      this.logger.log('Seeding singleton commerce_config row');
      // Prefer env values on first-run so upgrading deployments preserve
      // the old SUBSCRIPTIONS_ENABLED / PAYMENT_PROVIDER settings.
      const envEnabled =
        String(
          this.configService.get('SUBSCRIPTIONS_ENABLED', 'false'),
        ).toLowerCase() === 'true';
      const envProvider =
        (this.configService.get<string>('PAYMENT_PROVIDER', 'mock') as
          'mock' | 'stripe') === 'stripe'
          ? 'stripe'
          : 'mock';
      await this.repo.save(
        this.repo.create({
          subscriptionsEnabled: envEnabled,
          paymentProvider: envProvider,
          stripeSecretKey:
            this.configService.get<string>('STRIPE_SECRET_KEY') ?? null,
          stripeWebhookSecret:
            this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? null,
          defaultCurrency: 'USD',
        }),
      );
    }
    await this.refreshCache();
  }

  async getRaw(): Promise<CommerceConfig> {
    if (this.cache && Date.now() < this.cacheExpiresAt) {
      return this.cache;
    }
    return this.refreshCache();
  }

  private async refreshCache(): Promise<CommerceConfig> {
    const row = await this.repo.findOne({
      where: {},
      order: { updatedAt: 'ASC' },
    });
    if (!row) {
      // Should never happen after onModuleInit, but keep a safe default.
      const created = this.repo.create({
        subscriptionsEnabled: false,
        paymentProvider: 'mock',
        defaultCurrency: 'USD',
      });
      const saved = await this.repo.save(created);
      this.cache = saved;
    } else {
      this.cache = row;
    }
    this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;
    return this.cache;
  }

  async getView(): Promise<CommerceConfigView> {
    const row = await this.getRaw();
    return {
      id: row.id,
      subscriptionsEnabled: row.subscriptionsEnabled,
      freeUntilDate: row.freeUntilDate ? row.freeUntilDate.toISOString() : null,
      effectiveEnforcement: this.isEffectivelyEnforcing(row),
      paymentProvider: row.paymentProvider,
      stripePublishableKey: row.stripePublishableKey ?? null,
      hasStripeSecretKey: Boolean(
        row.stripeSecretKey && row.stripeSecretKey.length,
      ),
      hasStripeWebhookSecret: Boolean(
        row.stripeWebhookSecret && row.stripeWebhookSecret.length,
      ),
      defaultCurrency: row.defaultCurrency,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    };
  }

  async update(
    input: UpdateCommerceConfigInput,
    userId: string | null,
  ): Promise<CommerceConfigView> {
    const row = await this.getRaw();

    if (input.subscriptionsEnabled !== undefined) {
      row.subscriptionsEnabled = input.subscriptionsEnabled;
    }
    if (input.freeUntilDate !== undefined) {
      row.freeUntilDate = input.freeUntilDate
        ? new Date(input.freeUntilDate)
        : null;
    }
    if (input.paymentProvider !== undefined) {
      row.paymentProvider =
        input.paymentProvider === 'stripe' ? 'stripe' : 'mock';
    }
    if (input.stripePublishableKey !== undefined) {
      row.stripePublishableKey = input.stripePublishableKey || null;
    }
    // Only overwrite secrets when the caller explicitly passes a value —
    // undefined keeps the current stored secret, empty string clears.
    if (input.stripeSecretKey !== undefined) {
      row.stripeSecretKey = input.stripeSecretKey || null;
    }
    if (input.stripeWebhookSecret !== undefined) {
      row.stripeWebhookSecret = input.stripeWebhookSecret || null;
    }
    if (input.defaultCurrency !== undefined) {
      row.defaultCurrency = input.defaultCurrency || 'USD';
    }
    row.updatedBy = userId;

    await this.repo.save(row);
    await this.refreshCache();
    return this.getView();
  }

  // ─── Hot-path helpers (async — see CommerceConfigService.CACHE_TTL) ─

  async isEnforcementEffective(): Promise<boolean> {
    const row = await this.getRaw();
    return this.isEffectivelyEnforcing(row);
  }

  async activeProviderCode(): Promise<'mock' | 'stripe'> {
    const row = await this.getRaw();
    return row.paymentProvider;
  }

  async stripeCredentials(): Promise<{
    secretKey: string | null;
    webhookSecret: string | null;
    publishableKey: string | null;
  }> {
    const row = await this.getRaw();
    return {
      secretKey: row.stripeSecretKey ?? null,
      webhookSecret: row.stripeWebhookSecret ?? null,
      publishableKey: row.stripePublishableKey ?? null,
    };
  }

  async defaultCurrency(): Promise<string> {
    const row = await this.getRaw();
    return row.defaultCurrency;
  }

  private isEffectivelyEnforcing(row: CommerceConfig): boolean {
    if (!row.subscriptionsEnabled) return false;
    if (row.freeUntilDate && row.freeUntilDate.getTime() > Date.now()) {
      // Still inside the free-until grace period.
      return false;
    }
    return true;
  }
}
