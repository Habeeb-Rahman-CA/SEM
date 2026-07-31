import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Event } from '../../events/entities/event.entity';
import { Match } from '../../competitions/entities/match.entity';
import { User } from '../../users/entities/user.entity';
import { StreamHighlight } from './stream-highlight.entity';
import { StreamViewerSnapshot } from './stream-viewer-snapshot.entity';

export type StreamPlatform =
  'youtube' | 'twitch' | 'facebook' | 'vimeo' | 'custom';

export type StreamStatus = 'scheduled' | 'live' | 'ended' | 'error';

@Entity('stream_sessions')
@Index('idx_stream_workspace_id', ['workspaceId'])
@Index('idx_stream_match_id', ['matchId'])
@Index('idx_stream_event_id', ['eventId'])
@Index('idx_stream_status', ['status'])
export class StreamSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => Event, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: Event | null;

  @Column({ name: 'match_id', type: 'uuid', nullable: true })
  matchId: string | null;

  @ManyToOne(() => Match, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'match_id' })
  match: Match | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'custom',
  })
  platform: StreamPlatform;

  @Column({ name: 'stream_url', type: 'varchar', length: 500 })
  streamUrl: string;

  @Column({ name: 'embed_url', type: 'varchar', length: 500, nullable: true })
  embedUrl: string | null;

  @Column({
    name: 'thumbnail_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  thumbnailUrl: string | null;

  @Column({ name: 'stream_key', type: 'varchar', length: 200, nullable: true })
  streamKey: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'scheduled',
  })
  status: StreamStatus;

  @Column({ name: 'scheduled_start', type: 'timestamp', nullable: true })
  scheduledStart: Date | null;

  @Column({ name: 'actual_start', type: 'timestamp', nullable: true })
  actualStart: Date | null;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'viewer_count', type: 'int', default: 0 })
  viewerCount: number;

  @Column({ name: 'viewer_count_peak', type: 'int', default: 0 })
  viewerCountPeak: number;

  @Column({ name: 'show_score_overlay', type: 'boolean', default: true })
  showScoreOverlay: boolean;

  @Column({ name: 'show_stats', type: 'boolean', default: true })
  showStats: boolean;

  @Column({ name: 'show_team_names', type: 'boolean', default: true })
  showTeamNames: boolean;

  @Column({ name: 'is_public', type: 'boolean', default: true })
  isPublic: boolean;

  @Column({
    name: 'overlay_color',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  overlayColor: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @OneToMany(() => StreamHighlight, (h) => h.session)
  highlights: StreamHighlight[];

  @OneToMany(() => StreamViewerSnapshot, (s) => s.session)
  viewerSnapshots: StreamViewerSnapshot[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
