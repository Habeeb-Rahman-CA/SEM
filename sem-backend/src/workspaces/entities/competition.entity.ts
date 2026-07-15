import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Sport } from './sport.entity';
import { CompetitionStage } from './competition-stage.entity';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('competitions')
@Index('idx_competitions_event_id', ['eventId'])                          // FK: all competitions for an event
@Index('idx_competitions_sport_id', ['sportId'])                          // FK: competitions by sport
@Index('idx_competitions_event_status', ['eventId', 'status'])            // Composite: filter competitions by status within event
export class Competition extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string; // e.g. "Under 19 Football Cup"

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'sport_id', type: 'uuid' })
  sportId: string;

  @ManyToOne(() => Sport, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sport_id' })
  sport: Sport;

  @Column({ type: 'varchar', length: 20, default: 'upcoming' })
  status: string; // 'upcoming' | 'ongoing' | 'completed' | 'cancelled'

  @Column({ name: 'points_config', type: 'jsonb', nullable: true })
  pointsConfig: Array<{ position: number; label: string; points: number }> | null;

  @OneToMany(() => CompetitionStage, (stage) => stage.competition, { cascade: true })
  stages: CompetitionStage[];
}
