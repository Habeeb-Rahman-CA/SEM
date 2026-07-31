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
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { User } from '../../users/entities/user.entity';
import { AutomationRun } from './automation-run.entity';

export type TriggerType =
  | 'manual'
  | 'schedule'
  | 'event_created'
  | 'event_started'
  | 'event_ended'
  | 'competition_started'
  | 'competition_ended'
  | 'match_completed';

export type ActionType =
  | 'send_notification'
  | 'generate_fixtures'
  | 'allocate_referees'
  | 'reserve_equipment'
  | 'issue_certificates'
  | 'generate_report'
  | 'archive_event';

export interface AutomationAction {
  type: ActionType;
  config: Record<string, any>;
  continueOnError?: boolean;
}

export type RuleStatus = 'active' | 'paused' | 'error';

@Entity('automation_rules')
@Index('idx_automation_rule_workspace_id', ['workspaceId'])
@Index('idx_automation_rule_trigger_type', ['triggerType'])
@Index('idx_automation_rule_status', ['status'])
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'trigger_type',
    type: 'varchar',
    length: 30,
    default: 'manual',
  })
  triggerType: TriggerType;

  @Column({ name: 'trigger_config', type: 'jsonb', nullable: true })
  triggerConfig: {
    cron?: string;
    eventStatus?: string;
    competitionId?: string;
    eventId?: string;
    matchStatus?: string;
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, any> | null;

  @Column({ type: 'jsonb' })
  actions: AutomationAction[];

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: RuleStatus;

  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt: Date | null;

  @Column({
    name: 'last_run_status',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  lastRunStatus: 'success' | 'partial' | 'failed' | null;

  @Column({ name: 'run_count', type: 'int', default: 0 })
  runCount: number;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @OneToMany(() => AutomationRun, (run) => run.rule)
  runs: AutomationRun[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
