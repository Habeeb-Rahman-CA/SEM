import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { MedicalProfile } from './medical-profile.entity';
import { User } from '../../users/entities/user.entity';

@Entity('medical_alerts')
@Index('idx_medical_alert_workspace_id', ['workspaceId'])
@Index('idx_medical_alert_profile_id', ['profileId'])
@Index('idx_medical_alert_status', ['status'])
export class MedicalAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId: string;

  @ManyToOne(() => MedicalProfile, (profile) => profile.alerts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: MedicalProfile;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'info',
  })
  severity: 'info' | 'warning' | 'critical';

  @Column({
    type: 'varchar',
    length: 30,
    default: 'general',
  })
  source:
    'injury' | 'fitness' | 'checkup_due' | 'clearance' | 'allergy' | 'general';

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'open',
  })
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';

  @Column({ name: 'acknowledged_by_id', type: 'uuid', nullable: true })
  acknowledgedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'acknowledged_by_id' })
  acknowledgedBy: User | null;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'source_ref_id', type: 'uuid', nullable: true })
  sourceRefId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
