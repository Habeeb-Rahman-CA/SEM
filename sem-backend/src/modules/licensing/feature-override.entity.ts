import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AuditableEntity } from '../../common/entities/auditable.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';

/**
 * Per-workspace override on a feature code. Lets super-admins grant a
 * feature that the plan wouldn't normally include (e.g. give a Free-plan
 * workspace `customBranding` for 30 days as a promo) or revoke one that
 * the plan does include (very rare — usually only for enforcement of
 * platform policy violations).
 *
 * `expiresAt=null` means "no expiry — stays in force until manually
 * removed". Non-null values are honoured by LicensingService at
 * evaluation time so no cron is needed to clean them up.
 */
@Entity('feature_overrides')
@Unique('uq_feature_overrides_workspace_feature', [
  'workspaceId',
  'featureCode',
])
@Index('idx_feature_overrides_workspace', ['workspaceId'])
export class FeatureOverride extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column({ name: 'feature_code', type: 'varchar', length: 60 })
  featureCode: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({
    name: 'expires_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  expiresAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;
}
