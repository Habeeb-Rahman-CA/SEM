import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Event } from '../../events/entities/event.entity';
import { Sponsor, SponsorTier } from './sponsor.entity';

/**
 * Attaches a workspace-level Sponsor to a specific Event.
 *
 * The per-event `tier` and `displayOrder` allow the same sponsor to be
 * (say) "Gold" for one event and "Silver" for another, or ordered
 * differently within a sponsor strip. When these are null the
 * organizer's defaults on the Sponsor row are used.
 */
@Entity('event_sponsors')
@Unique('uq_event_sponsors_event_sponsor', ['eventId', 'sponsorId'])
@Index('idx_event_sponsors_event_id', ['eventId'])
@Index('idx_event_sponsors_sponsor_id', ['sponsorId'])
export class EventSponsor extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'sponsor_id', type: 'uuid' })
  sponsorId: string;

  @ManyToOne(() => Sponsor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sponsor_id' })
  sponsor: Sponsor;

  /** Optional per-event tier override — falls back to Sponsor.tier when null. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  tier: SponsorTier | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;
}
