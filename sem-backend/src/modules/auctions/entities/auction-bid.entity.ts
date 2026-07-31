import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Auction } from './auction.entity';
import { AuctionPlayer } from './auction-player.entity';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';

export type BidStatus = 'active' | 'winning' | 'outbid' | 'withdrawn';

@Entity('auction_bids')
@Index('idx_auction_bid_workspace_id', ['workspaceId'])
@Index('idx_auction_bid_auction_id', ['auctionId'])
@Index('idx_auction_bid_auction_player_id', ['auctionPlayerId'])
@Index('idx_auction_bid_team_id', ['teamId'])
@Index('idx_auction_bid_placed_at', ['placedAt'])
export class AuctionBid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'auction_id', type: 'uuid' })
  auctionId: string;

  @ManyToOne(() => Auction, (a) => a.bids, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auction_id' })
  auction: Auction;

  @Column({ name: 'auction_player_id', type: 'uuid' })
  auctionPlayerId: string;

  @ManyToOne(() => AuctionPlayer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auction_player_id' })
  auctionPlayer: AuctionPlayer;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: BidStatus;

  @Column({ name: 'placed_at', type: 'timestamp' })
  placedAt: Date;

  @Column({ name: 'placed_by_id', type: 'uuid', nullable: true })
  placedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'placed_by_id' })
  placedBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
