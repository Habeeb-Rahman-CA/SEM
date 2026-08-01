import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Team } from '../../teams/entities/team.entity';

@Entity('team_alert_preferences')
@Unique('uq_team_alert_pref', ['teamId'])
@Index('idx_team_alert_pref_workspace_id', ['workspaceId'])
@Index('idx_team_alert_pref_team_id', ['teamId'])
export class TeamAlertPreference {
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

  @Column({ name: 'auction_events', type: 'boolean', default: true })
  auctionEvents: boolean;

  @Column({ name: 'auction_bids', type: 'boolean', default: true })
  auctionBids: boolean;

  @Column({ name: 'auction_purchases', type: 'boolean', default: true })
  auctionPurchases: boolean;

  @Column({ name: 'transfer_updates', type: 'boolean', default: true })
  transferUpdates: boolean;

  @Column({ name: 'budget_alerts', type: 'boolean', default: true })
  budgetAlerts: boolean;

  @Column({ name: 'deadline_alerts', type: 'boolean', default: true })
  deadlineAlerts: boolean;

  @Column({ name: 'contract_expiry_alerts', type: 'boolean', default: true })
  contractExpiryAlerts: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
