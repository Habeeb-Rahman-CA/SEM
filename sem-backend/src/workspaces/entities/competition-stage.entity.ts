import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Competition } from './competition.entity';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('competition_stages')
@Index('idx_stages_competition_id', ['competitionId'])                     // FK: all stages for a competition
@Index('idx_stages_competition_sequence', ['competitionId', 'sequence'])   // Composite: ordered stage list per competition
@Index('idx_stages_type', ['type'])                                        // Filter by stage type
export class CompetitionStage extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string; // e.g. "Group Stage", "Main Tournament"

  @Column({ type: 'varchar', length: 30 })
  type: 'league' | 'group' | 'knockout' | 'group_knockout';

  @Column({ type: 'int', default: 1 })
  sequence: number; // Order of stage in the competition

  @Column({ name: 'competition_id', type: 'uuid' })
  competitionId: string;

  @ManyToOne(() => Competition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition;

  @Column({ type: 'json', nullable: true })
  config: {
    // Group / League Stage config
    winPoint?: number;
    drawPoint?: number;
    gamesPerTeam?: number;

    // Knockout config
    twoLegged?: boolean; // 2 leg (true) or 1 leg KO (false)
    legs?: number; // 1 or 2 legs

    // Group & Knockout config
    groupsCount?: number; // How many groups
    advancingCount?: number; // How many from each group advance (e.g. top 2)
    groupKnockoutSubtype?: 'single_group' | 'multiple_groups';
    advancingType?: 'winner' | 'winner_and_runner';
    singleGroupAdvancing?: number; // 2 or 4
  };
}
