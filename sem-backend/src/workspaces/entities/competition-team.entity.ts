import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Competition } from './competition.entity';
import { Team } from './team.entity';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('competition_teams')
@Unique(['competitionId', 'teamId'])
@Index('idx_comp_teams_competition_id', ['competitionId'])  // FK: all teams in a competition
@Index('idx_comp_teams_team_id', ['teamId'])                // FK: all competitions a team is in
export class CompetitionTeam extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'competition_id', type: 'uuid' })
  competitionId: string;

  @ManyToOne(() => Competition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
