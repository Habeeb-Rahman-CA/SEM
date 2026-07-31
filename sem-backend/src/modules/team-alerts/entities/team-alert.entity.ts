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

export type AlertCategory =
  | 'auction_event'
  | 'auction_bid'
  | 'auction_purchase'
  | 'transfer_submitted'
  | 'transfer_approved'
  | 'transfer_rejected'
  | 'budget_warning'
  | 'budget_exceeded'
  | 'deadline_approaching'
  | 'contract_expiring'
  | 'general';

export type AlertSeverity = 'info' | 'success' | 'warning' | 'critical';

@Entity('team_alerts')
@Index('idx_team_alert_workspace_id', ['workspaceId'])
@Index('idx_team_alert_team_id', ['teamId'])
@Index('idx_team_alert_category', ['category'])
@Index('idx_team_alert_is_read', ['isRead'])
@Index('idx_team_alert_created_at', ['createdAt'])
export class TeamAlert {
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

  @Column({
    type: 'varchar',
    length: 40,
    default: 'general',
  })
  category: AlertCategory;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'info',
  })
  severity: AlertSeverity;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'acknowledged_by_id', type: 'uuid', nullable: true })
  acknowledgedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'acknowledged_by_id' })
  acknowledgedBy: User | null;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date | null;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'action_url', type: 'varchar', length: 500, nullable: true })
  actionUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
