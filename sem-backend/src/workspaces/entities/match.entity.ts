import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CompetitionStage } from './competition-stage.entity';
import { Team } from './team.entity';
import { Venue } from './venue.entity';
import { AuditableEntity } from '../../common/auditable.entity';

export enum MatchType {
  MENS_SINGLES = "Men's Singles",
  WOMENS_SINGLES = "Women's Singles",
  MENS_DOUBLES = "Men's Doubles",
  WOMENS_DOUBLES = "Women's Doubles",
  MIXED_DOUBLES = "Mixed Doubles"
}

export enum MatchStatus {
  SCHEDULED = "Scheduled",
  WARM_UP = "WarmUp",
  FIRST_GAME = "FirstGame",
  BREAK = "Break",
  SECOND_GAME = "SecondGame",
  THIRD_GAME = "ThirdGame",
  FINISHED = "Finished",
  WALKOVER = "Walkover",
  RETIRED = "Retired",
  ABANDONED = "Abandoned"
}

export enum RallyResult {
  WINNER = "Winner",
  FORCED_ERROR = "ForcedError",
  UNFORCED_ERROR = "UnforcedError",
  NET_TOUCH = "NetTouch",
  SHUTTLE_OUT = "ShuttleOut",
  DOUBLE_HIT = "DoubleHit",
  CARRIED_SHUTTLE = "CarriedShuttle",
  SERVICE_FAULT = "ServiceFault",
  FOOT_FAULT = "FootFault",
  WRONG_RECEIVER = "WrongReceiver",
  WRONG_SERVER = "WrongServer",
  LET_SHUTTLE_BREAKS = "LetShuttleBreaks",
  LET_RECEIVER_NOT_READY = "LetReceiverNotReady",
  LET_EXTERNAL_INTERRUPTION = "LetExternalInterruption",
  LET_UMPIRE_CALL = "LetUmpireCall"
}

@Entity('matches')
@Index('idx_matches_stage_id', ['stageId'])                         // FK: all matches in a stage (primary access pattern)
@Index('idx_matches_status', ['status'])                            // Filter live/completed matches globally
@Index('idx_matches_stage_status', ['stageId', 'status'])           // Composite: live matches within a stage (hot path)
@Index('idx_matches_home_team_id', ['homeTeamId'])                  // FK: matches involving a team as home
@Index('idx_matches_away_team_id', ['awayTeamId'])                  // FK: matches involving a team as away
@Index('idx_matches_venue_id', ['venueId'])                         // FK: matches at a venue
@Index('idx_matches_created_at', ['createdAt'])                     // Pagination / chronological ordering
export class Match extends AuditableEntity {
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
    // Badminton matchType
    matchType?: MatchType;
  };

  @Column({ type: 'json', nullable: true })
  liveData: any;
}


