import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Event } from '../../events/entities/event.entity';
import { Sponsor } from '../../sponsors/entities/sponsor.entity';

/**
 * Where a creative is allowed to render. Each placement corresponds to
 * a specific slot in the public frontend — see AdBannerComponent's
 * `placement` input.
 */
export type AdPlacement =
  | 'public-portal' // /events browse page
  | 'public-event' // /public/events/:id (below hero)
  | 'live-hub' // /live top strip
  | 'live-match'; // live scoreboard modal + /public/matches/:id

/**
 * Advertisement — a paid banner creative with schedule, placement scope,
 * and optional link to a Sponsor for the "sponsor-first" priority rule.
 *
 * Impression / click counters are aggregated on the row for fast
 * dashboard reads; per-event AdEvent rows hold the detailed trail
 * (source IP, user-agent, occurredAt) for campaign reporting.
 */
@Entity('advertisements')
@Index('idx_ads_workspace_id', ['workspaceId'])
@Index('idx_ads_placement', ['placement'])
@Index('idx_ads_workspace_active_placement', [
  'workspaceId',
  'isActive',
  'placement',
])
@Index('idx_ads_event_id', ['eventId'])
@Index('idx_ads_sponsor_id', ['sponsorId'])
export class Advertisement extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  /** Internal reference name — never shown publicly. */
  @Column({ type: 'varchar', length: 200 })
  name: string;

  /**
   * Public-facing headline (used for alt text / screen-reader label).
   * Falls back to `name` when empty.
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ name: 'target_url', type: 'varchar', length: 500 })
  targetUrl: string;

  @Column({ type: 'varchar', length: 30 })
  placement: AdPlacement;

  /** Optional event scope — when set, the ad only renders on that event's page. */
  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => Event, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: Event | null;

  /**
   * When linked, the ad is treated as a sponsor-owned creative — it gets
   * priority in the rotation (see AdvertisementsService.serveForPlacement)
   * as long as the sponsor is active and inside its visibility window.
   */
  @Column({ name: 'sponsor_id', type: 'uuid', nullable: true })
  sponsorId: string | null;

  @ManyToOne(() => Sponsor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sponsor_id' })
  sponsor: Sponsor | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'start_date',
    type: 'timestamp without time zone',
    nullable: true,
  })
  startDate: Date | null;

  @Column({
    name: 'end_date',
    type: 'timestamp without time zone',
    nullable: true,
  })
  endDate: Date | null;

  /**
   * Rotation weight — higher wins more often when multiple ads share the
   * same slot. Ignored when sponsor-first priority kicks in.
   */
  @Column({ type: 'int', default: 1 })
  weight: number;

  @Column({ name: 'impression_count', type: 'int', default: 0 })
  impressionCount: number;

  @Column({ name: 'click_count', type: 'int', default: 0 })
  clickCount: number;
}
