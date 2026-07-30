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

export type BillingContactRole = 'primary' | 'secondary' | 'finance' | 'legal';

/**
 * A person to CC on invoices / payment receipts. Multiple contacts per
 * workspace so a finance team can loop in AP + legal + the workspace
 * owner without any one of them missing an email.
 */
@Entity('billing_contacts')
@Index('idx_billing_contacts_workspace_id', ['workspaceId'])
export class BillingContact extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 30, default: 'primary' })
  role: BillingContactRole;

  @Column({ name: 'receives_invoices', type: 'boolean', default: true })
  receivesInvoices: boolean;
}
