import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workspace } from './workspace.entity';
import { Role } from './role.entity';
import { AuditableEntity } from '../../common/auditable.entity';

export enum WorkspaceRole {
  // ── System Roles Slugs ──────────────────────────────
  OWNER              = 'owner',
  ADMINISTRATOR      = 'administrator',
  EVENT_MANAGER      = 'event_manager',
  COMPETITION_MANAGER = 'competition_manager',
  REFEREE            = 'referee',
  STATISTICIAN       = 'statistician',
  MEDIA_TEAM         = 'media_team',
  VIEWER             = 'viewer',
}

/** Slugs of roles that have write/management privileges */
export const MANAGEMENT_ROLES: string[] = [
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMINISTRATOR,
];

/** Slugs of roles that can perform operational tasks */
export const OPERATIONAL_ROLES: string[] = [
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMINISTRATOR,
  WorkspaceRole.EVENT_MANAGER,
  WorkspaceRole.COMPETITION_MANAGER,
  WorkspaceRole.REFEREE,
  WorkspaceRole.STATISTICIAN,
  WorkspaceRole.MEDIA_TEAM,
];

@Entity('workspace_members')
@Unique(['workspaceId', 'userId'])
@Index('idx_members_workspace_id', ['workspaceId'])         // FK: all members in a workspace
@Index('idx_members_user_id', ['userId'])                   // FK: all workspaces a user belongs to
@Index('idx_members_role_id', ['roleId'])                   // FK: members by role
@Index('idx_members_workspace_user', ['workspaceId', 'userId'])  // Composite: permission check (hot path)
export class WorkspaceMember extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Workspace, (workspace) => workspace.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'joined' })
  status: string; // 'pending' | 'joined' | 'rejected'

  @Column({ name: 'invited_by_id', type: 'uuid', nullable: true })
  invitedById: string;
}
