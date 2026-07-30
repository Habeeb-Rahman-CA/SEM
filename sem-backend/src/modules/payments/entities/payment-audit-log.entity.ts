import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { PaymentIntent } from './payment-intent.entity';

export type PaymentAuditEvent =
  | 'intent_created'
  | 'intent_confirmed'
  | 'intent_failed'
  | 'intent_cancelled'
  | 'webhook_received'
  | 'webhook_verification_failed'
  | 'webhook_applied'
  | 'refund_requested'
  | 'refund_succeeded'
  | 'refund_failed'
  | 'invoice_marked_paid'
  | 'other';

/**
 * Append-only audit trail of every provider interaction. Never soft-deleted;
 * useful for chargeback disputes and compliance evidence long after the
 * PaymentIntent it references may have been archived.
 *
 * Distinct from AuditableEntity — this is an event log, not a mutable row.
 */
@Entity('payment_audit_logs')
@Index('idx_payment_audit_workspace', ['workspaceId'])
@Index('idx_payment_audit_intent', ['paymentIntentId'])
@Index('idx_payment_audit_event', ['event'])
@Index('idx_payment_audit_created_at', ['createdAt'])
export class PaymentAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string | null;

  @ManyToOne(() => Workspace, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace | null;

  @Column({ name: 'payment_intent_id', type: 'uuid', nullable: true })
  paymentIntentId: string | null;

  @ManyToOne(() => PaymentIntent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'payment_intent_id' })
  paymentIntent: PaymentIntent | null;

  @Column({
    name: 'provider_code',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  providerCode: string | null;

  @Column({ type: 'varchar', length: 40 })
  event: PaymentAuditEvent;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: 'source_ip', type: 'varchar', length: 60, nullable: true })
  sourceIp: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
