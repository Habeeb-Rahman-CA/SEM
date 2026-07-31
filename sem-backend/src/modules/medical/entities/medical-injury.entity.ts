import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { MedicalProfile } from './medical-profile.entity';
import { RecoveryPlan } from './recovery-plan.entity';

@Entity('medical_injuries')
@Index('idx_medical_injury_workspace_id', ['workspaceId'])
@Index('idx_medical_injury_profile_id', ['profileId'])
@Index('idx_medical_injury_status', ['status'])
export class MedicalInjury {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId: string;

  @ManyToOne(() => MedicalProfile, (profile) => profile.injuries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: MedicalProfile;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'body_part', type: 'varchar', length: 100, nullable: true })
  bodyPart: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'minor',
  })
  severity: 'minor' | 'moderate' | 'severe' | 'critical';

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: 'active' | 'recovering' | 'recovered' | 'chronic';

  @Column({ name: 'sustained_date', type: 'timestamp' })
  sustainedDate: Date;

  @Column({ name: 'diagnosis_date', type: 'timestamp', nullable: true })
  diagnosisDate: Date | null;

  @Column({ name: 'reported_by', type: 'uuid', nullable: true })
  reportedBy: string | null;

  @Column({ type: 'text', nullable: true })
  diagnosis: string | null;

  @Column({ type: 'text', nullable: true })
  treatment: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToOne(() => RecoveryPlan, (plan) => plan.injury)
  recoveryPlan: RecoveryPlan | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
