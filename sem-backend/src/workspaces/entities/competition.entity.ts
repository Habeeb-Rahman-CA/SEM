import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Sport } from './sport.entity';
import { CompetitionStage } from './competition-stage.entity';

@Entity('competitions')
export class Competition {
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
