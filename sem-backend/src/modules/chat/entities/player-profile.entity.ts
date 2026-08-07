import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('player_profiles')
export class PlayerProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  handle: string;

  @Column()
  name: string;

  @Column()
  jerseyNumber: number;

  @Column()
  position: string;

  @Column()
  teamName: string;

  @Column('float', { default: 9.0 })
  rating: number;

  @Column({ default: 0 })
  matchesPlayed: number;

  @Column({ default: 0 })
  runsOrGoals: number;

  @Column({ default: 0 })
  wicketsOrAssists: number;

  @Column({ default: 95 })
  attendanceRate: number;

  @Column({ nullable: true })
  avatarUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
