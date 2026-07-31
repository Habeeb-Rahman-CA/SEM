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

/**
 * One billing profile per workspace — company name, address, tax info.
 * Auto-provisioned lazily on first billing endpoint hit (like Subscription).
 * Snapshotted onto every Invoice at issue time so historical invoices
 * survive future edits.
 */
@Entity('billing_profiles')
@Index('idx_billing_profile_workspace_id', ['workspaceId'], { unique: true })
export class BillingProfile extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({
    name: 'company_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  companyName: string | null;

  @Column({
    name: 'address_line1',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  addressLine1: string | null;

  @Column({
    name: 'address_line2',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  addressLine2: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ name: 'postal_code', type: 'varchar', length: 30, nullable: true })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  /** Tax identifier value (VAT / GST / EIN / etc.) */
  @Column({ name: 'tax_id', type: 'varchar', length: 60, nullable: true })
  taxId: string | null;

  /** Human-readable tax scheme label ("VAT", "GST", "EIN"...). */
  @Column({ name: 'tax_id_type', type: 'varchar', length: 20, nullable: true })
  taxIdType: string | null;

  /** Percent applied to the subtotal when generating invoices. */
  @Column({
    name: 'tax_rate_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  taxRatePercent: number;

  @Column({
    name: 'default_currency',
    type: 'varchar',
    length: 8,
    default: 'USD',
  })
  defaultCurrency: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
