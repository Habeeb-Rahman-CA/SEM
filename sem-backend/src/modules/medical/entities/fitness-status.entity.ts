import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { MedicalProfile } from './medical-profile.entity';
import { User } from '../../users/entities/user.entity';

@Entity('fitness_statuses')
@Index('idx_fitness_status_workspace_id', ['workspaceId'])
@Index('idx_fitness_status_profile_id', ['profileId'])
@Index('idx_fitness_status_assessed_at', ['assessedAt'])
export class FitnessStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId: string;

  @ManyToOne(() => MedicalProfile, (profile) => profile.fitnessHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: MedicalProfile;

  @Column({ name: 'assessed_at', type: 'timestamp' })
  assessedAt: Date;

  @Column({ name: 'assessed_by_id', type: 'uuid', nullable: true })
  assessedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assessed_by_id' })
  assessedBy: User | null;

  @Column({
    name: 'fitness_level',
    type: 'varchar',
    length: 20,
    default: 'fit',
  })
  fitnessLevel: 'fit' | 'limited' | 'unfit' | 'injured';

  @Column({ name: 'cardio_score', type: 'int', nullable: true })
  cardioScore: number | null;

  @Column({ name: 'strength_score', type: 'int', nullable: true })
  strengthScore: number | null;

  @Column({ name: 'flexibility_score', type: 'int', nullable: true })
  flexibilityScore: number | null;

  @Column({ name: 'endurance_score', type: 'int', nullable: true })
  enduranceScore: number | null;

  @Column({ name: 'resting_heart_rate', type: 'int', nullable: true })
  restingHeartRate: number | null;

  @Column({ name: 'body_fat_percent', type: 'int', nullable: true })
  bodyFatPercent: number | null;

  @Column({ name: 'cleared_to_play', type: 'boolean', default: true })
  clearedToPlay: boolean;

  @Column({ type: 'text', nullable: true })
  restrictions: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
