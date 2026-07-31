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
import { Player } from '../../players/entities/player.entity';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';

export type ReleaseKind = 'release' | 'replace' | 'contract_ended';

@Entity('roster_releases')
@Index('idx_roster_release_workspace_id', ['workspaceId'])
@Index('idx_roster_release_team_id', ['teamId'])
@Index('idx_roster_release_player_id', ['playerId'])
export class RosterRelease {
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

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'release',
  })
  kind: ReleaseKind;

  @Column({ name: 'released_at', type: 'timestamp' })
  releasedAt: Date;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({
    name: 'replacement_player_id',
    type: 'uuid',
    nullable: true,
  })
  replacementPlayerId: string | null;

  @ManyToOne(() => Player, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'replacement_player_id' })
  replacementPlayer: Player | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  season: string | null;

  @Column({ name: 'performed_by_id', type: 'uuid', nullable: true })
  performedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
