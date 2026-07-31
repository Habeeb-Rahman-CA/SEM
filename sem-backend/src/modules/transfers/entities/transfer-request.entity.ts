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
import { Player } from '../../players/entities/player.entity';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { TransferWindow } from './transfer-window.entity';

export type TransferType = 'permanent' | 'loan';
export type TransferStatus =
  'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

@Entity('transfer_requests')
@Index('idx_transfer_req_workspace_id', ['workspaceId'])
@Index('idx_transfer_req_player_id', ['playerId'])
@Index('idx_transfer_req_from_team_id', ['fromTeamId'])
@Index('idx_transfer_req_to_team_id', ['toTeamId'])
@Index('idx_transfer_req_status', ['status'])
@Index('idx_transfer_req_window_id', ['windowId'])
export class TransferRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ name: 'from_team_id', type: 'uuid' })
  fromTeamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_team_id' })
  fromTeam: Team;

  @Column({ name: 'to_team_id', type: 'uuid' })
  toTeamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_team_id' })
  toTeam: Team;

  @Column({
    name: 'transfer_type',
    type: 'varchar',
    length: 20,
    default: 'permanent',
  })
  transferType: TransferType;

  @Column({ name: 'fee', type: 'bigint', nullable: true })
  fee: string | null;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({ name: 'loan_start_date', type: 'timestamp', nullable: true })
  loanStartDate: Date | null;

  @Column({ name: 'loan_end_date', type: 'timestamp', nullable: true })
  loanEndDate: Date | null;

  @Column({ name: 'window_id', type: 'uuid', nullable: true })
  windowId: string | null;

  @ManyToOne(() => TransferWindow, (w) => w.requests, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'window_id' })
  window: TransferWindow | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: TransferStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'submitted_by_id', type: 'uuid', nullable: true })
  submittedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'submitted_by_id' })
  submittedBy: User | null;

  @Column({ name: 'reviewed_by_id', type: 'uuid', nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
