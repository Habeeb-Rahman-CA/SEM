import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';

export type PaymentCategory =
  | 'auction_purchase'
  | 'transfer_fee'
  | 'salary'
  | 'signing_bonus'
  | 'penalty'
  | 'refund'
  | 'other';

export type PaymentDirection = 'outgoing' | 'incoming';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type PaymentReferenceType =
  'transfer_request' | 'contract' | 'auction' | 'manual';

@Entity('finance_payments')
@Index('idx_finance_payment_workspace_id', ['workspaceId'])
@Index('idx_finance_payment_team_id', ['teamId'])
@Index('idx_finance_payment_season', ['season'])
@Index('idx_finance_payment_category', ['category'])
@Index('idx_finance_payment_status', ['status'])
@Index('idx_finance_payment_reference', ['referenceType', 'referenceId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ type: 'varchar', length: 20, nullable: true })
  season: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'other',
  })
  category: PaymentCategory;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'outgoing',
  })
  direction: PaymentDirection;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: PaymentStatus;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 30,
    default: 'manual',
  })
  referenceType: PaymentReferenceType;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({
    name: 'counterparty_team_id',
    type: 'uuid',
    nullable: true,
  })
  counterpartyTeamId: string | null;

  @ManyToOne(() => Team, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'counterparty_team_id' })
  counterpartyTeam: Team | null;

  @Column({ type: 'varchar', length: 200 })
  description: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'recorded_by_id', type: 'uuid', nullable: true })
  recordedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'recorded_by_id' })
  recordedBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
