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
import { MedicalInjury } from './medical-injury.entity';

export interface RecoveryMilestone {
  id: string;
  title: string;
  targetDate?: string | null;
  completedAt?: string | null;
  notes?: string | null;
}

@Entity('recovery_plans')
@Index('idx_recovery_plan_workspace_id', ['workspaceId'])
@Index('idx_recovery_plan_injury_id', ['injuryId'])
export class RecoveryPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'injury_id', type: 'uuid', unique: true })
  injuryId: string;

  @OneToOne(() => MedicalInjury, (injury) => injury.recoveryPlan, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'injury_id' })
  injury: MedicalInjury;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  protocol: string | null;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'expected_return_date', type: 'timestamp', nullable: true })
  expectedReturnDate: Date | null;

  @Column({ name: 'actual_return_date', type: 'timestamp', nullable: true })
  actualReturnDate: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  milestones: RecoveryMilestone[] | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'in_progress',
  })
  status: 'in_progress' | 'on_track' | 'delayed' | 'completed' | 'cancelled';

  @Column({ name: 'progress_percent', type: 'int', default: 0 })
  progressPercent: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
