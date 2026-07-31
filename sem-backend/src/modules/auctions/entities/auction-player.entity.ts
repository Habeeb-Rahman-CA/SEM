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
import { Auction } from './auction.entity';
import { AuctionCategory } from './auction-category.entity';
import { Player } from '../../players/entities/player.entity';
import { Team } from '../../teams/entities/team.entity';

export type AuctionPlayerStatus =
  'available' | 'in_bidding' | 'sold' | 'unsold' | 'withdrawn';

@Entity('auction_players')
@Unique('uq_auction_player', ['auctionId', 'playerId'])
@Index('idx_auction_player_workspace_id', ['workspaceId'])
@Index('idx_auction_player_auction_id', ['auctionId'])
@Index('idx_auction_player_status', ['status'])
export class AuctionPlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'auction_id', type: 'uuid' })
  auctionId: string;

  @ManyToOne(() => Auction, (a) => a.players, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auction_id' })
  auction: Auction;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => AuctionCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: AuctionCategory | null;

  @Column({ name: 'custom_base_price', type: 'bigint', nullable: true })
  customBasePrice: string | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'available',
  })
  status: AuctionPlayerStatus;

  @Column({ name: 'sold_to_team_id', type: 'uuid', nullable: true })
  soldToTeamId: string | null;

  @ManyToOne(() => Team, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sold_to_team_id' })
  soldToTeam: Team | null;

  @Column({ name: 'sold_price', type: 'bigint', nullable: true })
  soldPrice: string | null;

  @Column({ name: 'sold_at', type: 'timestamp', nullable: true })
  soldAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
