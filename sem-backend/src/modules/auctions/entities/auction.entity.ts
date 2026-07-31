import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Event } from '../../events/entities/event.entity';
import { Competition } from '../../competitions/entities/competition.entity';
import { User } from '../../users/entities/user.entity';
import { AuctionCategory } from './auction-category.entity';
import { AuctionPlayer } from './auction-player.entity';
import { AuctionBid } from './auction-bid.entity';
import { AuctionTeamBudget } from './auction-team-budget.entity';

export type AuctionStatus =
  'draft' | 'scheduled' | 'live' | 'paused' | 'completed' | 'cancelled';

@Entity('auctions')
@Index('idx_auction_workspace_id', ['workspaceId'])
@Index('idx_auction_event_id', ['eventId'])
@Index('idx_auction_competition_id', ['competitionId'])
@Index('idx_auction_status', ['status'])
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => Event, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: Event | null;

  @Column({ name: 'competition_id', type: 'uuid', nullable: true })
  competitionId: string | null;

  @ManyToOne(() => Competition, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition | null;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status: AuctionStatus;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @Column({ name: 'budget_per_team', type: 'bigint', default: 0 })
  budgetPerTeam: string; // bigint returned as string

  @Column({ name: 'bid_increment', type: 'int', default: 100 })
  bidIncrement: number;

  @Column({ name: 'bid_window_sec', type: 'int', default: 30 })
  bidWindowSec: number;

  @Column({ name: 'scheduled_start', type: 'timestamp', nullable: true })
  scheduledStart: Date | null;

  @Column({ name: 'actual_start', type: 'timestamp', nullable: true })
  actualStart: Date | null;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({
    name: 'current_player_id',
    type: 'uuid',
    nullable: true,
  })
  currentPlayerId: string | null;

  @Column({ name: 'current_round_ends_at', type: 'timestamp', nullable: true })
  currentRoundEndsAt: Date | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @OneToMany(() => AuctionCategory, (c) => c.auction)
  categories: AuctionCategory[];

  @OneToMany(() => AuctionPlayer, (p) => p.auction)
  players: AuctionPlayer[];

  @OneToMany(() => AuctionBid, (b) => b.auction)
  bids: AuctionBid[];

  @OneToMany(() => AuctionTeamBudget, (b) => b.auction)
  teamBudgets: AuctionTeamBudget[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
