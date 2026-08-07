import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';

export enum ChannelAccessType {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum ChannelPostingPermission {
  ALL_MEMBERS = 'all_members',
  ADMIN_ONLY = 'admin_only_posting',
  READ_ONLY = 'read_only',
}

@Entity('workspace_channels')
@Index('idx_ws_channels_workspace_id', ['workspaceId'])
@Index('idx_ws_channels_slug_ws', ['workspaceId', 'slug'], { unique: true })
export class WorkspaceChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'custom' })
  category: string; // e.g., 'default', 'operations', 'departments', 'custom'

  @Column({ default: 'fi fi-rr-hashtag' })
  icon: string;

  @Column({
    type: 'enum',
    enum: ChannelAccessType,
    default: ChannelAccessType.PUBLIC,
  })
  accessType: ChannelAccessType;

  @Column({
    type: 'enum',
    enum: ChannelPostingPermission,
    default: ChannelPostingPermission.ALL_MEMBERS,
  })
  postingPermission: ChannelPostingPermission;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
