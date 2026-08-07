import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('match_fixtures')
export class MatchFixtureEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  matchId: string;

  @Column()
  workspaceId: string;

  @Column()
  sportType: string;

  @Column()
  title: string;

  @Column()
  teamA: string;

  @Column()
  teamB: string;

  @Column({ nullable: true })
  scoreA?: string;

  @Column({ nullable: true })
  scoreB?: string;

  @Column()
  venue: string;

  @Column()
  matchTime: string;

  @Column({ default: 'SCHEDULED' })
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED';

  @Column({ nullable: true })
  refereeName?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
