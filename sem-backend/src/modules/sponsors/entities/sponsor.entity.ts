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

/**
 * Sponsorship tier — shared vocabulary across sports/leagues. Free-form
 * `category` (financial, apparel, media, hospitality, …) is separate so
 * organizers can group sponsors independent of tier.
 */
export type SponsorTier =
  'title' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'partner';

/**
 * Workspace-scoped sponsor. Reusable across events via the EventSponsor
 * join table — organizers create sponsors once, then attach them to each
 * event they run.
 *
 * Coexists with the legacy `Event.sponsors` JSONB column (kept for
 * backwards compatibility). The public event page unions both sources
 * and dedupes by name.
 */
@Entity('sponsors')
@Index('idx_sponsors_workspace_id', ['workspaceId'])
@Index('idx_sponsors_workspace_active', ['workspaceId', 'isActive'])
@Index('idx_sponsors_tier', ['tier'])
export class Sponsor extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ name: 'website_url', type: 'varchar', length: 500, nullable: true })
  websiteUrl: string | null;

  /** Free-form label — 'financial', 'apparel', 'media', 'hospitality', …. */
  @Column({ type: 'varchar', length: 60, nullable: true })
  category: string | null;

  /** Default sponsorship level; can be overridden per-event on EventSponsor. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  tier: SponsorTier | null;

  @Column({
    name: 'contact_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  contactName: string | null;

  @Column({
    name: 'contact_email',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  contactEmail: string | null;

  /**
   * Master visibility switch. When false, the sponsor doesn't render
   * publicly on any event regardless of individual EventSponsor rows.
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Sponsorship window. NULL start means "always active from creation",
   * NULL end means "no end date". The public sponsor list filters by
   * `now BETWEEN start AND end` (with null-safe fallbacks).
   */
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

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
