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
import { StreamSession } from './stream-session.entity';

@Entity('stream_viewer_snapshots')
@Index('idx_viewer_snap_session_id', ['sessionId'])
@Index('idx_viewer_snap_snapshot_at', ['snapshotAt'])
export class StreamViewerSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => StreamSession, (s) => s.viewerSnapshots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: StreamSession;

  @Column({ name: 'snapshot_at', type: 'timestamp' })
  snapshotAt: Date;

  @Column({ name: 'viewer_count', type: 'int' })
  viewerCount: number;

  @Column({ type: 'varchar', length: 20, default: 'manual' })
  source: 'manual' | 'api' | 'poll';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
