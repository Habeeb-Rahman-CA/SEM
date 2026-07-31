import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Player } from '../../players/entities/player.entity';
import { MedicalInjury } from './medical-injury.entity';
import { FitnessStatus } from './fitness-status.entity';
import { MedicalAlert } from './medical-alert.entity';

@Entity('medical_profiles')
@Unique('uq_medical_profile_player', ['workspaceId', 'playerId'])
@Index('idx_medical_profile_workspace_id', ['workspaceId'])
@Index('idx_medical_profile_player_id', ['playerId'])
export class MedicalProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ name: 'blood_group', type: 'varchar', length: 10, nullable: true })
  bloodGroup: string | null;

  @Column({ name: 'height_cm', type: 'int', nullable: true })
  heightCm: number | null;

  @Column({ name: 'weight_kg', type: 'int', nullable: true })
  weightKg: number | null;

  @Column({ type: 'jsonb', nullable: true })
  allergies: string[] | null;

  @Column({ name: 'chronic_conditions', type: 'jsonb', nullable: true })
  chronicConditions: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  medications: string[] | null;

  @Column({
    name: 'emergency_contact_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  emergencyContactName: string | null;

  @Column({
    name: 'emergency_contact_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  emergencyContactPhone: string | null;

  @Column({
    name: 'emergency_contact_relation',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  emergencyContactRelation: string | null;

  @Column({
    name: 'physician_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  physicianName: string | null;

  @Column({
    name: 'physician_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  physicianPhone: string | null;

  @Column({
    name: 'insurance_provider',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  insuranceProvider: string | null;

  @Column({
    name: 'insurance_policy_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  insurancePolicyNumber: string | null;

  @Column({ name: 'last_checkup_date', type: 'timestamp', nullable: true })
  lastCheckupDate: Date | null;

  @Column({ name: 'next_checkup_date', type: 'timestamp', nullable: true })
  nextCheckupDate: Date | null;

  @Column({
    name: 'fitness_level',
    type: 'varchar',
    length: 20,
    default: 'fit',
  })
  fitnessLevel: 'fit' | 'limited' | 'unfit' | 'injured';

  @Column({ name: 'cleared_to_play', type: 'boolean', default: true })
  clearedToPlay: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => MedicalInjury, (injury) => injury.profile)
  injuries: MedicalInjury[];

  @OneToMany(() => FitnessStatus, (fitness) => fitness.profile)
  fitnessHistory: FitnessStatus[];

  @OneToMany(() => MedicalAlert, (alert) => alert.profile)
  alerts: MedicalAlert[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
