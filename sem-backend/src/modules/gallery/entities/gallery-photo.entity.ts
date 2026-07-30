import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Event } from '../../events/entities/event.entity';
import { Competition } from '../../competitions/entities/competition.entity';
import { Match } from '../../competitions/entities/match.entity';

@Entity('gallery_photos')
@Index('idx_gallery_event_id', ['eventId'])
@Index('idx_gallery_competition_id', ['competitionId'])
@Index('idx_gallery_match_id', ['matchId'])
@Index('idx_gallery_event_competition_match', [
  'eventId',
  'competitionId',
  'matchId',
])
export class GalleryPhoto extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'competition_id', type: 'uuid', nullable: true })
  competitionId: string | null;

  @ManyToOne(() => Competition, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition | null;

  @Column({ name: 'match_id', type: 'uuid', nullable: true })
  matchId: string | null;

  @ManyToOne(() => Match, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'match_id' })
  match: Match | null;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ name: 'public_id', type: 'varchar', length: 255, nullable: true })
  publicId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  caption: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
