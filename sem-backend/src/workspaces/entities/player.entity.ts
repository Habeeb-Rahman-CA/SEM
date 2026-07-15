import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { Team } from './team.entity';
import { User } from '../../users/entities/user.entity';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('players')
@Unique(['teamId', 'userId'])
@Index('idx_players_workspace_id', ['workspaceId'])      // FK: all players in a workspace
@Index('idx_players_team_id', ['teamId'])                // FK: all players in a team
@Index('idx_players_user_id', ['userId'])                // FK: player profile for a user
export class Player extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'jersey_number', type: 'varchar', length: 20, nullable: true })
  jerseyNumber: string | null;

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
}
