import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { AuditableEntity } from '../../../common/entities/auditable.entity';

@Entity('teams')
@Index('idx_teams_workspace_id', ['workspaceId']) // FK: all teams in a workspace
@Index('idx_teams_workspace_name', ['workspaceId', 'name']) // Composite: search teams by name within workspace
@Index('idx_teams_code', ['code']) // Unique code lookup
export class Team extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  code: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({
    name: 'primary_color',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  primaryColor: string | null;

  @Column({
    name: 'secondary_color',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  secondaryColor: string | null;

  @Column({ name: 'coaches', type: 'jsonb', nullable: true })
  coaches: Array<{
    id: string;
    name: string;
    role?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
  }> | null;

  @Column({ name: 'achievements', type: 'jsonb', nullable: true })
  achievements: Array<{
    id: string;
    title: string;
    year?: number | null;
    competitionName?: string | null;
    description?: string | null;
  }> | null;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;
}
