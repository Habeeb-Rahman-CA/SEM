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

export type NoteEntityType =
  | 'player'
  | 'team'
  | 'asset'
  | 'event'
  | 'venue'
  | 'report'
  | 'competition'
  | 'form'
  | 'custom';

@Entity('global_notes')
@Index('idx_global_notes_entity', ['workspaceId', 'entityType', 'entityId'])
export class GlobalNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'user_id' })
  author: User;

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
  entityType: NoteEntityType;

  @Column({ name: 'entity_id', type: 'varchar', length: 255 })
  entityId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'varchar', length: 30, default: 'amber' })
  color: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
