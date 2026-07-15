import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Match } from './match.entity';
import { Player } from './player.entity';
import { Team } from './team.entity';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('match_players')
@Unique(['matchId', 'playerId'])
@Index('idx_match_players_match_id', ['matchId'])
@Index('idx_match_players_player_id', ['playerId'])
export class MatchPlayer extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId: string;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'is_playing', type: 'boolean', default: false })
  isPlaying: boolean;

  @Column({ name: 'is_goalkeeper', type: 'boolean', default: false })
  isGoalkeeper: boolean;

  /**
   * Per-match player rating (5.0–10.0).
   * NULL = not yet rated (match not completed or auto-rating not run).
   * Set automatically when match status transitions to 'completed',
   * or manually overridden by an admin.
   */
  @Column({
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
    default: null,
  })
  rating: number | null;
}
