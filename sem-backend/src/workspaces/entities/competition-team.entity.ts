import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Competition } from './competition.entity';
import { Team } from './team.entity';

@Entity('competition_teams')
@Unique(['competitionId', 'teamId'])
export class CompetitionTeam {
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
