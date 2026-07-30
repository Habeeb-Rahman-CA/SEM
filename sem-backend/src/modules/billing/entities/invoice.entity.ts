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
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { SubscriptionPlan } from '../../subscriptions/entities/subscription-plan.entity';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'void';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

export interface InvoicePaymentRecord {
  id: string;
  amountCents: number;
  currency: string;
  method: 'card' | 'bank_transfer' | 'manual' | 'other';
  reference?: string | null;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  occurredAt: string;
  notes?: string | null;
}

/**
 * Snapshot of the workspace's billing profile at the time an invoice
 * was issued — kept on the invoice row so future edits to the profile
 * never rewrite historical documents.
 */
export interface InvoiceBillToSnapshot {
  companyName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  taxId: string | null;
  taxIdType: string | null;
  contacts: Array<{ name: string; email: string; role: string }>;
}

@Entity('invoices')
@Index('idx_invoices_workspace_id', ['workspaceId'])
@Index('idx_invoices_number', ['invoiceNumber'], { unique: true })
@Index('idx_invoices_status', ['status'])
@Index('idx_invoices_issued_at', ['issuedAt'])
@Index('idx_invoices_workspace_status', ['workspaceId', 'status'])
export class Invoice extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  subscriptionId: string | null;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription | null;

  @Column({ name: 'plan_id', type: 'uuid', nullable: true })
  planId: string | null;

  @ManyToOne(() => SubscriptionPlan, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan | null;

  @Column({ name: 'invoice_number', type: 'varchar', length: 40 })
  invoiceNumber: string;

  @Column({ type: 'varchar', length: 20, default: 'issued' })
  status: InvoiceStatus;

  @Column({
    name: 'issued_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  issuedAt: Date | null;

  @Column({
    name: 'due_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  dueAt: Date | null;

  @Column({
    name: 'paid_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  paidAt: Date | null;

  @Column({
    name: 'period_start',
    type: 'timestamp without time zone',
    nullable: true,
  })
  periodStart: Date | null;

  @Column({
    name: 'period_end',
    type: 'timestamp without time zone',
    nullable: true,
  })
  periodEnd: Date | null;

  @Column({ name: 'subtotal_cents', type: 'int', default: 0 })
  subtotalCents: number;

  @Column({ name: 'tax_cents', type: 'int', default: 0 })
  taxCents: number;

  @Column({ name: 'total_cents', type: 'int', default: 0 })
  totalCents: number;

  @Column({ type: 'varchar', length: 8, default: 'USD' })
  currency: string;

  @Column({ name: 'line_items', type: 'jsonb', default: () => "'[]'::jsonb" })
  lineItems: InvoiceLineItem[];

  @Column({ name: 'payments', type: 'jsonb', default: () => "'[]'::jsonb" })
  payments: InvoicePaymentRecord[];

  @Column({ name: 'bill_to', type: 'jsonb', nullable: true })
  billTo: InvoiceBillToSnapshot | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
