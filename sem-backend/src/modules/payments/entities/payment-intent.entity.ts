import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Invoice } from '../../billing/entities/invoice.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'processing'
  | 'requires_action'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

/**
 * The provider-agnostic record of a single payment attempt.
 *
 * `providerCode` identifies which PaymentProvider handled it (mock/stripe/…)
 * so the refund flow can hand it back to the same one later.
 * `providerRef` is the provider's identifier (e.g. Stripe PaymentIntent id).
 * `metadata` holds anything provider-specific the frontend needs to complete
 * the flow (client secret, checkout URL, redirect params).
 */
@Entity('payment_intents')
@Index('idx_payment_intents_workspace', ['workspaceId'])
@Index('idx_payment_intents_invoice', ['invoiceId'])
@Index('idx_payment_intents_provider_ref', ['providerRef'])
@Index('idx_payment_intents_status', ['status'])
export class PaymentIntent extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  invoiceId: string | null;

  @ManyToOne(() => Invoice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice | null;

  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  subscriptionId: string | null;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription | null;

  @Column({ name: 'provider_code', type: 'varchar', length: 30 })
  providerCode: string;

  /** Provider's own identifier (e.g. Stripe PaymentIntent id). */
  @Column({
    name: 'provider_ref',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  providerRef: string | null;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ type: 'varchar', length: 8, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 40, default: 'requires_payment_method' })
  status: PaymentIntentStatus;

  @Column({ type: 'varchar', length: 40, nullable: true })
  method: string | null;

  /** Additional provider-specific info (client secret, checkout URL). */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({
    name: 'confirmed_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  confirmedAt: Date | null;

  @Column({
    name: 'refunded_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  refundedAt: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;
}
