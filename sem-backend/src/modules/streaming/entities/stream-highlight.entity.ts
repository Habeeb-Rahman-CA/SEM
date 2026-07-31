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
import { StreamSession } from './stream-session.entity';
import { User } from '../../users/entities/user.entity';

@Entity('stream_highlights')
@Index('idx_highlight_workspace_id', ['workspaceId'])
@Index('idx_highlight_session_id', ['sessionId'])
export class StreamHighlight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => StreamSession, (s) => s.highlights, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: StreamSession;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'timestamp_sec', type: 'int', default: 0 })
  timestampSec: number;

  @Column({ name: 'duration_sec', type: 'int', nullable: true })
  durationSec: number | null;

  @Column({ name: 'clip_url', type: 'varchar', length: 500, nullable: true })
  clipUrl: string | null;

  @Column({
    name: 'thumbnail_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  thumbnailUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[] | null;

  @Column({ name: 'clip_type', type: 'varchar', length: 30, default: 'moment' })
  clipType: 'moment' | 'goal' | 'save' | 'card' | 'wicket' | 'try' | 'other';

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
