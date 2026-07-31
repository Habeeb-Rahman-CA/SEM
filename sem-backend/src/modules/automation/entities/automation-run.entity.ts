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
import { AutomationRule } from './automation-rule.entity';
import type { TriggerType } from './automation-rule.entity';
import { User } from '../../users/entities/user.entity';

export type RunStatus =
  'running' | 'success' | 'partial' | 'failed' | 'skipped';

export interface ActionResult {
  actionType: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  data?: any;
}

@Entity('automation_runs')
@Index('idx_automation_run_workspace_id', ['workspaceId'])
@Index('idx_automation_run_rule_id', ['ruleId'])
@Index('idx_automation_run_started_at', ['startedAt'])
export class AutomationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'rule_id', type: 'uuid' })
  ruleId: string;

  @ManyToOne(() => AutomationRule, (r) => r.runs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule: AutomationRule;

  @Column({ name: 'trigger_type', type: 'varchar', length: 30 })
  triggerType: TriggerType;

  @Column({ name: 'triggered_by_id', type: 'uuid', nullable: true })
  triggeredById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'triggered_by_id' })
  triggeredBy: User | null;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'running',
  })
  status: RunStatus;

  @Column({ name: 'action_results', type: 'jsonb', nullable: true })
  actionResults: ActionResult[] | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'trigger_context', type: 'jsonb', nullable: true })
  triggerContext: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
