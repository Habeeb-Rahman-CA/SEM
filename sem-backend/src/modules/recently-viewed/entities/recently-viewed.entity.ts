import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { User } from '../../users/entities/user.entity';

export type RecentEntityType =
  | 'player'
  | 'event'
  | 'report'
  | 'invoice'
  | 'team'
  | 'venue'
  | 'form'
  | 'competition'
  | 'custom';

@Entity('user_recently_viewed')
@Index('idx_user_recently_viewed_user_workspace', ['userId', 'workspaceId'])
@Index('idx_user_recently_viewed_entity', [
  'userId',
  'workspaceId',
  'entityType',
  'entityId',
])
export class UserRecentlyViewed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({
    name: 'entity_type',
    type: 'varchar',
    length: 50,
    default: 'custom',
  })
  entityType: RecentEntityType;

  @Column({ name: 'entity_id', type: 'varchar', length: 255 })
  entityId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subtitle: string | null;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 100, default: 'fi fi-rr-time-past' })
  icon: string;

  @UpdateDateColumn({ name: 'viewed_at' })
  viewedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
