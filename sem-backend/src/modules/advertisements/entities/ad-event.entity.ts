import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Advertisement } from './advertisement.entity';

export type AdEventType = 'impression' | 'click';

/**
 * Append-only trail of ad interactions. One row per served impression
 * and per click. Aggregate counters on the Advertisement row are the
 * primary reporting surface — this table is for time-series drill-down
 * ("clicks per day", "top referrers", etc.) added later.
 */
@Entity('ad_events')
@Index('idx_ad_events_ad_id', ['adId'])
@Index('idx_ad_events_ad_type', ['adId', 'eventType'])
@Index('idx_ad_events_created_at', ['createdAt'])
export class AdEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ad_id', type: 'uuid' })
  adId: string;

  @ManyToOne(() => Advertisement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ad_id' })
  advertisement: Advertisement;

  @Column({ name: 'event_type', type: 'varchar', length: 20 })
  eventType: AdEventType;

  @Column({ name: 'source_ip', type: 'varchar', length: 60, nullable: true })
  sourceIp: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 400, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
