import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Singleton row (id-uuid, but the service treats it as `first-or-create`)
 * for platform-wide commerce settings — the same configuration formerly
 * held in `SUBSCRIPTIONS_ENABLED` / `PAYMENT_PROVIDER` / `STRIPE_*` env
 * vars. Moving these into the DB lets super-admins flip billing on/off
 * without a redeploy and edit Stripe keys from the UI.
 *
 * Sensitive fields (`stripeSecretKey`, `stripeWebhookSecret`) are stored
 * in plain text but NEVER returned in API responses — the read endpoint
 * returns them as boolean `has*` flags. This matches how Stripe's own
 * dashboard treats restricted keys.
 */
@Entity('commerce_config')
export class CommerceConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Master switch. When false, no plan limits are enforced anywhere.
   * When true, enforcement kicks in on / after `freeUntilDate`.
   */
  @Column({ name: 'subscriptions_enabled', type: 'boolean', default: false })
  subscriptionsEnabled: boolean;

  /**
   * "Everything is free for everyone until" — while `now() < freeUntilDate`,
   * enforcement stays off even when `subscriptionsEnabled=true`. Lets the
   * platform announce the switch in advance so organizers can pick a plan
   * before the wall goes up.
   *
   * NULL means "no free period" — enforcement is effective immediately
   * once `subscriptionsEnabled=true`.
   */
  @Column({
    name: 'free_until_date',
    type: 'timestamp without time zone',
    nullable: true,
  })
  freeUntilDate: Date | null;

  @Column({
    name: 'payment_provider',
    type: 'varchar',
    length: 30,
    default: 'mock',
  })
  paymentProvider: 'mock' | 'stripe';

  @Column({ name: 'stripe_publishable_key', type: 'text', nullable: true })
  stripePublishableKey: string | null;

  @Column({ name: 'stripe_secret_key', type: 'text', nullable: true })
  stripeSecretKey: string | null;

  @Column({ name: 'stripe_webhook_secret', type: 'text', nullable: true })
  stripeWebhookSecret: string | null;

  @Column({
    name: 'default_currency',
    type: 'varchar',
    length: 8,
    default: 'USD',
  })
  defaultCurrency: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}
