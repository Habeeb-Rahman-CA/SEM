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

export interface PositionRule {
  position: string;
  min?: number;
  max?: number;
}

@Entity('roster_configs')
@Unique('uq_roster_config_team_season', ['teamId', 'season'])
@Index('idx_roster_config_workspace_id', ['workspaceId'])
@Index('idx_roster_config_team_id', ['teamId'])
@Index('idx_roster_config_season', ['season'])
export class RosterConfig {
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

  @Column({ type: 'varchar', length: 20 })
  season: string;

  @Column({ name: 'max_squad_size', type: 'int', default: 25 })
  maxSquadSize: number;

  @Column({
    name: 'max_foreign_players',
    type: 'int',
    nullable: true,
  })
  maxForeignPlayers: number | null;

  @Column({ name: 'min_starters', type: 'int', nullable: true })
  minStarters: number | null;

  @Column({ name: 'max_substitutes', type: 'int', nullable: true })
  maxSubstitutes: number | null;

  @Column({ name: 'position_rules', type: 'jsonb', nullable: true })
  positionRules: PositionRule[] | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
