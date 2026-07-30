import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureOverride } from './feature-override.entity';
import {
  FEATURE_CODES,
  FEATURE_REGISTRY,
  FeatureCode,
  QuotaCode,
} from './feature-codes';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CommerceConfigService } from '../commerce-config/commerce-config.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

export interface EntitlementView {
  workspaceId: string;
  enforcementEffective: boolean;
  plan: {
    code: string;
    name: string;
    tier: string;
  };
  features: Record<
    FeatureCode,
    {
      code: FeatureCode;
      displayName: string;
      description: string;
      allowed: boolean;
      source: 'plan' | 'override' | 'default' | 'enforcement-off';
      /** Non-null when an override is in force. */
      overrideExpiresAt: string | null;
    }
  >;
  quotas: Record<
    QuotaCode,
    {
      code: QuotaCode;
      current: number;
      max: number; // -1 == unlimited
    }
  >;
  overrides: Array<{
    id: string;
    featureCode: string;
    enabled: boolean;
    expiresAt: string | null;
    reason: string | null;
  }>;
}

/**
 * The central "can workspace X use feature Y / spend quota Z?" service.
 *
 * Every other module that wants to gate on entitlement should call this
 * instead of poking SubscriptionsService directly. Rationale:
 *
 *   - **Single source of truth** — one place to reason about "why did
 *     this reject?"
 *   - **Overrides** — super-admins can grant/revoke a feature per
 *     workspace without touching the plan or the code
 *   - **Enforcement toggle** — respects CommerceConfig's global switch
 *     and the free-until date so the commerce team can flip billing on
 *     across the platform without touching downstream services
 *   - **Registry-driven** — new features register in feature-codes.ts
 *     and get gates automatically
 */
@Injectable()
export class LicensingService {
  constructor(
    @InjectRepository(FeatureOverride)
    private readonly overrideRepo: Repository<FeatureOverride>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly commerceConfig: CommerceConfigService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Feature checks ──────────────────────────────────────────────

  async canUseFeature(
    workspaceId: string,
    featureCode: FeatureCode,
  ): Promise<boolean> {
    const view = await this.evaluateFeature(workspaceId, featureCode);
    return view.allowed;
  }

  async requireFeature(
    workspaceId: string,
    featureCode: FeatureCode,
  ): Promise<void> {
    const view = await this.evaluateFeature(workspaceId, featureCode);
    if (!view.allowed) {
      throw new ForbiddenException({
        message: `Your current plan doesn't include "${view.displayName}". Upgrade or ask a super-admin to enable it for your workspace.`,
        feature: featureCode,
        source: view.source,
      });
    }
  }

  // ─── Quota checks (delegates to SubscriptionsService.assertLimit) ─

  async assertQuota(
    workspaceId: string,
    quotaCode: QuotaCode,
    delta = 1,
  ): Promise<void> {
    // SubscriptionsService already respects enforcement toggle + free-until.
    // We wrap it so downstream code has a single entry-point.
    await this.subscriptionsService.assertLimit(workspaceId, quotaCode, delta);
  }

  // ─── Bulk entitlement snapshot ──────────────────────────────────

  async getEntitlements(
    workspaceId: string,
    userId: string,
  ): Promise<EntitlementView> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const enforcementEffective =
      await this.commerceConfig.isEnforcementEffective();
    const snap =
      await this.subscriptionsService.getWorkspaceSubscriptionWithUsage(
        workspaceId,
        userId,
      );
    const overrides = await this.loadActiveOverrides(workspaceId);

    const features = {} as EntitlementView['features'];
    for (const code of Object.keys(FEATURE_REGISTRY) as FeatureCode[]) {
      features[code] = await this.evaluateFeature(workspaceId, code, {
        enforcementEffective,
        planLimits: snap.plan.limits,
        overrides,
      });
    }

    const quotas: EntitlementView['quotas'] = {
      workspaces: {
        code: 'workspaces',
        current: 1,
        max: snap.plan.limits.workspaces,
      },
      membersPerWorkspace: {
        code: 'membersPerWorkspace',
        current: snap.usage.members,
        max: snap.plan.limits.membersPerWorkspace,
      },
      eventsPerWorkspace: {
        code: 'eventsPerWorkspace',
        current: snap.usage.events,
        max: snap.plan.limits.eventsPerWorkspace,
      },
      storageMb: {
        code: 'storageMb',
        current: snap.usage.storageMb,
        max: snap.plan.limits.storageMb,
      },
    };

    return {
      workspaceId,
      enforcementEffective,
      plan: {
        code: snap.plan.code,
        name: snap.plan.name,
        tier: snap.plan.tier,
      },
      features,
      quotas,
      overrides: overrides.map((o) => ({
        id: o.id,
        featureCode: o.featureCode,
        enabled: o.enabled,
        expiresAt: o.expiresAt ? o.expiresAt.toISOString() : null,
        reason: o.reason,
      })),
    };
  }

  // ─── Super-admin: overrides ─────────────────────────────────────

  async setOverride(
    workspaceId: string,
    featureCode: FeatureCode,
    enabled: boolean,
    opts: {
      expiresAt?: Date | null;
      reason?: string | null;
      userId?: string | null;
    } = {},
  ): Promise<FeatureOverride> {
    if (!(featureCode in FEATURE_REGISTRY)) {
      throw new NotFoundException(`Unknown feature code: ${featureCode}`);
    }
    let row = await this.overrideRepo.findOne({
      where: { workspaceId, featureCode },
    });
    if (!row) {
      row = this.overrideRepo.create({ workspaceId, featureCode });
    }
    row.enabled = enabled;
    row.expiresAt = opts.expiresAt ?? null;
    row.reason = opts.reason ?? null;
    return this.overrideRepo.save(row);
  }

  async removeOverride(workspaceId: string, overrideId: string): Promise<void> {
    const row = await this.overrideRepo.findOne({
      where: { id: overrideId, workspaceId },
    });
    if (!row) throw new NotFoundException('Override not found');
    row.deletedAt = new Date();
    await this.overrideRepo.save(row);
  }

  async listOverrides(workspaceId: string): Promise<FeatureOverride[]> {
    return this.overrideRepo.find({
      where: { workspaceId },
      order: { updatedAt: 'DESC' },
    });
  }

  // ─── Internals ──────────────────────────────────────────────────

  private async evaluateFeature(
    workspaceId: string,
    featureCode: FeatureCode,
    ctx?: {
      enforcementEffective: boolean;
      planLimits: any;
      overrides: FeatureOverride[];
    },
  ): Promise<{
    code: FeatureCode;
    displayName: string;
    description: string;
    allowed: boolean;
    source: 'plan' | 'override' | 'default' | 'enforcement-off';
    overrideExpiresAt: string | null;
  }> {
    const desc = FEATURE_REGISTRY[featureCode];
    if (!desc) {
      throw new NotFoundException(`Unknown feature code: ${featureCode}`);
    }

    const enforcementEffective =
      ctx?.enforcementEffective ??
      (await this.commerceConfig.isEnforcementEffective());

    // When enforcement is off, everything is allowed regardless of plan —
    // callers can still surface an "override active" pill via the source
    // field. Overrides still win over defaults for the source label.
    if (!enforcementEffective) {
      const override = (
        ctx?.overrides ?? (await this.loadActiveOverrides(workspaceId))
      ).find((o) => o.featureCode === featureCode);
      return {
        code: desc.code,
        displayName: desc.displayName,
        description: desc.description,
        allowed: true,
        source: override ? 'override' : 'enforcement-off',
        overrideExpiresAt: override?.expiresAt
          ? override.expiresAt.toISOString()
          : null,
      };
    }

    // Overrides win outright when enforcement is on.
    const overrides =
      ctx?.overrides ?? (await this.loadActiveOverrides(workspaceId));
    const override = overrides.find((o) => o.featureCode === featureCode);
    if (override) {
      return {
        code: desc.code,
        displayName: desc.displayName,
        description: desc.description,
        allowed: override.enabled,
        source: 'override',
        overrideExpiresAt: override.expiresAt
          ? override.expiresAt.toISOString()
          : null,
      };
    }

    // Plan-driven features: consult plan.limits directly.
    if (desc.planKey) {
      const planLimits =
        ctx?.planLimits ?? (await this.loadPlanLimits(workspaceId));
      const value = planLimits ? planLimits[desc.planKey] : false;
      return {
        code: desc.code,
        displayName: desc.displayName,
        description: desc.description,
        allowed: !!value,
        source: 'plan',
        overrideExpiresAt: null,
      };
    }

    // Reports level — string-typed, treat 'advanced' as truthy.
    if (featureCode === FEATURE_CODES.reportsAdvanced) {
      const planLimits =
        ctx?.planLimits ?? (await this.loadPlanLimits(workspaceId));
      return {
        code: desc.code,
        displayName: desc.displayName,
        description: desc.description,
        allowed: (planLimits?.reportsLevel ?? '') === 'advanced',
        source: 'plan',
        overrideExpiresAt: null,
      };
    }

    // Fallback default.
    return {
      code: desc.code,
      displayName: desc.displayName,
      description: desc.description,
      allowed: desc.defaultWhenUnkeyed,
      source: 'default',
      overrideExpiresAt: null,
    };
  }

  private async loadActiveOverrides(
    workspaceId: string,
  ): Promise<FeatureOverride[]> {
    const rows = await this.overrideRepo.find({ where: { workspaceId } });
    const now = Date.now();
    return rows.filter((r) => !r.expiresAt || r.expiresAt.getTime() > now);
  }

  /**
   * Auth-free plan lookup. Uses SubscriptionsService.getOrProvisionSubscription
   * (already public and unauthenticated) so evaluateFeature can be called
   * from any code path — including background jobs — without threading a
   * userId through every layer.
   */
  private async loadPlanLimits(workspaceId: string): Promise<any> {
    const sub = await this.subscriptionsService
      .getOrProvisionSubscription(workspaceId)
      .catch(() => null);
    if (!sub) return null;
    return sub.plan?.limits ?? null;
  }
}
