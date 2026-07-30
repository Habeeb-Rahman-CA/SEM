import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';

export type SubscriptionTier =
  'free' | 'standard' | 'professional' | 'enterprise';

/**
 * Plan catalog — one row per tier we sell. Limits are stored as JSONB so
 * we can evolve the shape without a migration each time we tune numbers.
 *
 * -1 means "unlimited". 0 means "not available on this tier".
 */
export interface PlanLimits {
  workspaces: number;
  membersPerWorkspace: number;
  eventsPerWorkspace: number;
  storageMb: number; // total gallery + logo storage per workspace
  reportsLevel: 'basic' | 'standard' | 'advanced';
  publicPortal: boolean;
  liveScoring: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

@Entity('subscription_plans')
@Index('idx_plans_code', ['code'], { unique: true })
@Index('idx_plans_tier', ['tier'])
export class SubscriptionPlan extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stable machine-friendly identifier (e.g. 'free', 'standard', ...). */
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  tier: SubscriptionTier;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb' })
  limits: PlanLimits;

  /** Price in the smallest currency unit (cents/paise). 0 == free. */
  @Column({ name: 'price_cents', type: 'int', default: 0 })
  priceCents: number;

  @Column({ type: 'varchar', length: 8, default: 'USD' })
  currency: string;

  @Column({
    name: 'billing_interval',
    type: 'varchar',
    length: 20,
    default: 'month',
  })
  billingInterval: 'month' | 'year';

  @Column({ name: 'trial_days', type: 'int', default: 0 })
  trialDays: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
