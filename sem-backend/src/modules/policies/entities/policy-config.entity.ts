import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';

@Entity('policy_configs')
@Unique('uq_policy_config_workspace', ['workspaceId'])
@Index('idx_policy_config_workspace_id', ['workspaceId'])
export class PolicyConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  // Auction policies
  @Column({
    name: 'prevent_duplicate_auction_registration',
    type: 'boolean',
    default: true,
  })
  preventDuplicateAuctionRegistration: boolean;

  @Column({
    name: 'block_auction_bid_over_budget',
    type: 'boolean',
    default: true,
  })
  blockAuctionBidOverBudget: boolean;

  // Transfer policies
  @Column({
    name: 'prevent_duplicate_transfer_request',
    type: 'boolean',
    default: true,
  })
  preventDuplicateTransferRequest: boolean;

  @Column({
    name: 'require_open_window_for_transfers',
    type: 'boolean',
    default: false,
  })
  requireOpenWindowForTransfers: boolean;

  @Column({
    name: 'min_transfer_notice_days',
    type: 'int',
    default: 0,
  })
  minTransferNoticeDays: number;

  // Roster policies
  @Column({
    name: 'enforce_squad_caps_on_approve',
    type: 'boolean',
    default: true,
  })
  enforceSquadCapsOnApprove: boolean;

  @Column({
    name: 'unique_registration_per_season',
    type: 'boolean',
    default: true,
  })
  uniqueRegistrationPerSeason: boolean;

  @Column({
    name: 'unique_jersey_per_team_season',
    type: 'boolean',
    default: true,
  })
  uniqueJerseyPerTeamSeason: boolean;

  // Finance policies
  @Column({
    name: 'budget_alert_threshold_pct',
    type: 'int',
    default: 80,
  })
  budgetAlertThresholdPct: number;

  @Column({
    name: 'block_negative_budgets',
    type: 'boolean',
    default: true,
  })
  blockNegativeBudgets: boolean;

  // Competition policies
  @Column({
    name: 'require_active_contract_for_match',
    type: 'boolean',
    default: true,
  })
  requireActiveContractForMatch: boolean;

  @Column({
    name: 'require_registration_for_match',
    type: 'boolean',
    default: false,
  })
  requireRegistrationForMatch: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
