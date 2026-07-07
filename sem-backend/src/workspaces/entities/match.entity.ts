import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CompetitionStage } from './competition-stage.entity';
import { Team } from './team.entity';
import { Venue } from './venue.entity';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stage_id', type: 'uuid' })
  stageId: string;

  @ManyToOne(() => CompetitionStage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stage_id' })
  stage: CompetitionStage;

  @Column({ name: 'home_team_id', type: 'uuid', nullable: true })
  homeTeamId: string | null;

  @ManyToOne(() => Team, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'home_team_id' })
  homeTeam: Team | null;

  @Column({ name: 'away_team_id', type: 'uuid', nullable: true })
  awayTeamId: string | null;

  @ManyToOne(() => Team, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'away_team_id' })
  awayTeam: Team | null;

  @Column({ name: 'venue_id', type: 'uuid', nullable: true })
  venueId: string | null;

  @ManyToOne(() => Venue, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'venue_id' })
  venue: Venue | null;

  @Column({ name: 'home_score', type: 'int', default: 0 })
  homeScore: number;

  @Column({ name: 'away_score', type: 'int', default: 0 })
  awayScore: number;

  @Column({ type: 'varchar', length: 30, default: 'scheduled' })
  status: 'scheduled' | 'live' | 'completed';

  @Column({ type: 'json', nullable: true })
  config: {
    // Football: timerDuration (e.g. 90)
    timerDuration?: number;
    // Cricket: overs (e.g. 20)
    overs?: number;
    // Badminton: setsToWin (e.g. 2 means best of 3 sets)
    setsToWin?: number;
  };

  @Column({ type: 'json', nullable: true })
  liveData: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
