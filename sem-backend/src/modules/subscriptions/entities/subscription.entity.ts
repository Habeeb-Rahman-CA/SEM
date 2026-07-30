import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

export type SubscriptionStatus =
  'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';

@Entity('subscriptions')
@Index('idx_subscriptions_workspace_id', ['workspaceId'], { unique: true })
@Index('idx_subscriptions_plan_id', ['planId'])
@Index('idx_subscriptions_status', ['status'])
export class Subscription extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => SubscriptionPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: SubscriptionStatus;

  @Column({
    name: 'current_period_start',
    type: 'timestamp without time zone',
    nullable: true,
  })
  currentPeriodStart: Date | null;

  @Column({
    name: 'current_period_end',
    type: 'timestamp without time zone',
    nullable: true,
  })
  currentPeriodEnd: Date | null;

  @Column({
    name: 'trial_ends_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  trialEndsAt: Date | null;

  @Column({ name: 'cancel_at_period_end', type: 'boolean', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({
    name: 'cancelled_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  cancelledAt: Date | null;
}
