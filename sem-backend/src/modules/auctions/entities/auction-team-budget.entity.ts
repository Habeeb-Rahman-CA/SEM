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
import { Team } from '../../teams/entities/team.entity';

@Entity('auction_team_budgets')
@Unique('uq_auction_team_budget', ['auctionId', 'teamId'])
@Index('idx_auction_budget_workspace_id', ['workspaceId'])
@Index('idx_auction_budget_auction_id', ['auctionId'])
@Index('idx_auction_budget_team_id', ['teamId'])
export class AuctionTeamBudget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'auction_id', type: 'uuid' })
  auctionId: string;

  @ManyToOne(() => Auction, (a) => a.teamBudgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auction_id' })
  auction: Auction;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'initial_budget', type: 'bigint' })
  initialBudget: string;

  @Column({ name: 'spent', type: 'bigint', default: 0 })
  spent: string;

  @Column({ name: 'players_bought', type: 'int', default: 0 })
  playersBought: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
