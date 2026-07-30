import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubscriptionPlan,
  PlanLimits,
} from './entities/subscription-plan.entity';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { Event } from '../events/entities/event.entity';
import { GalleryPhoto } from '../gallery/entities/gallery-photo.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CommerceConfigService } from '../commerce-config/commerce-config.service';
import { ChangePlanDto } from './dto/change-plan.dto';

/**
 * Injection token BillingService is bound to when the BillingModule is
 * present. Kept as a string token so SubscriptionsService doesn't need a
 * hard type-level import from a sibling module (avoids the risk of
 * circular deps and keeps this module standalone-testable).
 */
export const BILLING_HOOK = Symbol('BILLING_HOOK');

export interface BillingHook {
  generateInvoiceForPlanChange(opts: {
    workspaceId: string;
    subscription: Subscription;
    plan: SubscriptionPlan;
    isTrial: boolean;
    periodStart: Date;
    periodEnd: Date | null;
  }): Promise<unknown>;
}

/**
 * The limit key we're checking. Kept as a string union so callers get
 * compile-time safety when picking a limit to enforce.
 */
export type LimitKey =
  'workspaces' | 'membersPerWorkspace' | 'eventsPerWorkspace' | 'storageMb';

/**
 * A "usage snapshot" for a workspace — the numbers we compare against the
 * plan limits when showing the subscription tab or gating an operation.
 */
export interface WorkspaceUsage {
  members: number;
  events: number;
  storageMb: number;
}

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(GalleryPhoto)
    private readonly galleryRepo: Repository<GalleryPhoto>,
    private readonly workspacesService: WorkspacesService,
    private readonly commerceConfig: CommerceConfigService,
    @Optional()
    @Inject(BILLING_HOOK)
    private readonly billingHook?: BillingHook,
  ) {}

  /**
   * Enforcement flag. False when subscriptions are disabled OR when the
   * platform is still inside the "free-until" grace period configured in
   * the admin UI. Reads from the singleton CommerceConfig row (short TTL
   * cache), so a super-admin toggle takes effect within seconds without
   * a redeploy.
   */
  async isEnforcementEnabled(): Promise<boolean> {
    return this.commerceConfig.isEnforcementEffective();
  }

  // ─── Plan catalog ─────────────────────────────────────────────────────

  async onModuleInit() {
    // Idempotent seed so the four plans always exist even when running with
    // TypeORM synchronize=true (which won't run our SQL migration files).
    const count = await this.planRepo.count();
    if (count > 0) return;

    this.logger.log('Seeding subscription plan catalog (empty table detected)');
    const plans: Array<Partial<SubscriptionPlan>> = [
      {
        code: 'free',
        name: 'Free',
        tier: 'free',
        description:
          'Perfect for a one-off tournament or a first tryout of the platform.',
        priceCents: 0,
        currency: 'USD',
        billingInterval: 'month',
        trialDays: 0,
        sortOrder: 1,
        isActive: true,
        limits: {
          workspaces: 1,
          membersPerWorkspace: 10,
          eventsPerWorkspace: 3,
          storageMb: 250,
          reportsLevel: 'basic',
          publicPortal: true,
          liveScoring: true,
          customBranding: false,
          apiAccess: false,
          prioritySupport: false,
        },
      },
      {
        code: 'standard',
        name: 'Standard',
        tier: 'standard',
        description:
          'For active clubs and small leagues running regular events.',
        priceCents: 1900,
        currency: 'USD',
        billingInterval: 'month',
        trialDays: 14,
        sortOrder: 2,
        isActive: true,
        limits: {
          workspaces: 3,
          membersPerWorkspace: 50,
          eventsPerWorkspace: 25,
          storageMb: 5000,
          reportsLevel: 'standard',
          publicPortal: true,
          liveScoring: true,
          customBranding: false,
          apiAccess: false,
          prioritySupport: false,
        },
      },
      {
        code: 'professional',
        name: 'Professional',
        tier: 'professional',
        description: 'For federations, academies and multi-league organizers.',
        priceCents: 4900,
        currency: 'USD',
        billingInterval: 'month',
        trialDays: 14,
        sortOrder: 3,
        isActive: true,
        limits: {
          workspaces: 10,
          membersPerWorkspace: 250,
          eventsPerWorkspace: -1,
          storageMb: 50000,
          reportsLevel: 'advanced',
          publicPortal: true,
          liveScoring: true,
          customBranding: true,
          apiAccess: true,
          prioritySupport: false,
        },
      },
      {
        code: 'enterprise',
        name: 'Enterprise',
        tier: 'enterprise',
        description:
          'For governing bodies and rights-holders that need unlimited scale.',
        priceCents: 0,
        currency: 'USD',
        billingInterval: 'month',
        trialDays: 30,
        sortOrder: 4,
        isActive: true,
        limits: {
          workspaces: -1,
          membersPerWorkspace: -1,
          eventsPerWorkspace: -1,
          storageMb: -1,
          reportsLevel: 'advanced',
          publicPortal: true,
          liveScoring: true,
          customBranding: true,
          apiAccess: true,
          prioritySupport: true,
        },
      },
    ];
    await this.planRepo.save(this.planRepo.create(plans));
  }

  listPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async getPlanByCode(code: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({
      where: { code, isActive: true },
    });
    if (!plan) throw new NotFoundException(`Plan "${code}" not found`);
    return plan;
  }

  // ─── Workspace subscription ───────────────────────────────────────────

  /**
   * Fetch the workspace's subscription, auto-provisioning a Free row if
   * one doesn't exist yet. Ensures every workspace always has a valid
   * plan reference regardless of when the workspace was created.
   */
  async getOrProvisionSubscription(workspaceId: string): Promise<Subscription> {
    const existing = await this.subRepo.findOne({
      where: { workspaceId },
      relations: { plan: true },
    });
    if (existing) return existing;

    const freePlan = await this.getPlanByCode('free');
    const now = new Date();
    const sub = this.subRepo.create({
      workspaceId,
      planId: freePlan.id,
      plan: freePlan,
      status: 'active' as SubscriptionStatus,
      currentPeriodStart: now,
      currentPeriodEnd: null, // free = no billing cycle
    });
    return this.subRepo.save(sub);
  }

  async getWorkspaceSubscriptionWithUsage(
    workspaceId: string,
    userId: string,
  ): Promise<{
    subscription: Subscription;
    plan: SubscriptionPlan;
    usage: WorkspaceUsage;
    enforcementEnabled: boolean;
  }> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const sub = await this.getOrProvisionSubscription(workspaceId);
    const plan =
      sub.plan ?? (await this.planRepo.findOne({ where: { id: sub.planId } }))!;
    const usage = await this.computeUsage(workspaceId);
    return {
      subscription: sub,
      plan,
      usage,
      enforcementEnabled: await this.isEnforcementEnabled(),
    };
  }

  async computeUsage(workspaceId: string): Promise<WorkspaceUsage> {
    const [members, events, galleryPhotos] = await Promise.all([
      this.memberRepo.count({ where: { workspaceId } }),
      this.eventRepo.count({ where: { workspaceId } }),
      this.galleryRepo
        .createQueryBuilder('gp')
        .innerJoin('gp.event', 'event')
        .where('event.workspaceId = :workspaceId', { workspaceId })
        .andWhere('gp.deletedAt IS NULL')
        .getCount(),
    ]);
    // We don't track per-file bytes yet; approximate storage at ~0.5 MB
    // per gallery photo. Refine when a real size column is added.
    const storageMb = Math.round(galleryPhotos * 0.5);
    return { members, events, storageMb };
  }

  // ─── Plan changes ──────────────────────────────────────────────────────

  async changePlan(
    workspaceId: string,
    dto: ChangePlanDto,
    userId: string,
  ): Promise<Subscription> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );

    const targetPlan = await this.getPlanByCode(dto.planCode);
    const sub = await this.getOrProvisionSubscription(workspaceId);

    // If we're gating on limits, don't allow a downgrade to a plan whose
    // limits the workspace is already exceeding — force the org to shrink
    // first. When enforcement is off, allow anything (dev-friendly).
    if (await this.isEnforcementEnabled()) {
      const usage = await this.computeUsage(workspaceId);
      const violations = this.findViolations(targetPlan.limits, usage);
      if (violations.length > 0) {
        throw new BadRequestException({
          message:
            'Cannot switch to this plan — usage exceeds the new plan limits.',
          violations,
        });
      }
    }

    const now = new Date();
    sub.planId = targetPlan.id;
    sub.plan = targetPlan;
    sub.cancelAtPeriodEnd = false;
    sub.cancelledAt = null;
    sub.currentPeriodStart = now;

    if (dto.startTrial && targetPlan.trialDays > 0) {
      sub.status = 'trialing';
      sub.trialEndsAt = new Date(
        now.getTime() + targetPlan.trialDays * 24 * 60 * 60 * 1000,
      );
      sub.currentPeriodEnd = sub.trialEndsAt;
    } else {
      sub.status = 'active';
      sub.trialEndsAt = null;
      sub.currentPeriodEnd =
        targetPlan.priceCents > 0
          ? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
          : null;
    }

    const saved = await this.subRepo.save(sub);

    // Auto-invoice on paid plans / trial starts. Free-plan changes emit
    // nothing. Failures here are logged but never bubble — a plan change
    // should never fail because invoicing hiccuped.
    if (this.billingHook) {
      try {
        await this.billingHook.generateInvoiceForPlanChange({
          workspaceId,
          subscription: saved,
          plan: targetPlan,
          isTrial: saved.status === 'trialing',
          periodStart: saved.currentPeriodStart ?? now,
          periodEnd: saved.currentPeriodEnd,
        });
      } catch (err) {
        this.logger.warn(
          `Auto-invoice generation failed for workspace ${workspaceId}: ${
            (err as Error)?.message ?? err
          }`,
        );
      }
    }

    return saved;
  }

  async cancelSubscription(
    workspaceId: string,
    userId: string,
  ): Promise<Subscription> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );
    const sub = await this.getOrProvisionSubscription(workspaceId);
    sub.cancelAtPeriodEnd = true;
    sub.cancelledAt = new Date();
    return this.subRepo.save(sub);
  }

  async resumeSubscription(
    workspaceId: string,
    userId: string,
  ): Promise<Subscription> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.manage',
    );
    const sub = await this.getOrProvisionSubscription(workspaceId);
    sub.cancelAtPeriodEnd = false;
    sub.cancelledAt = null;
    return this.subRepo.save(sub);
  }

  // ─── Enforcement ──────────────────────────────────────────────────────

  /**
   * Assert that adding `delta` more units of `limit` to `workspaceId` is
   * still within-plan. No-ops when enforcement is disabled.
   *
   * Never runs a DB query when disabled — cheap enough to call from every
   * mutating endpoint.
   */
  async assertLimit(
    workspaceId: string,
    limit: LimitKey,
    delta = 1,
  ): Promise<void> {
    if (!(await this.isEnforcementEnabled())) return;

    const sub = await this.getOrProvisionSubscription(workspaceId);
    const plan =
      sub.plan ?? (await this.planRepo.findOne({ where: { id: sub.planId } }))!;
    const max = plan.limits[limit];
    if (max === -1) return; // unlimited

    const usage = await this.computeUsage(workspaceId);
    const currentByKey: Record<LimitKey, number> = {
      workspaces: 1, // per-workspace check; org-level workspace count is a separate call
      membersPerWorkspace: usage.members,
      eventsPerWorkspace: usage.events,
      storageMb: usage.storageMb,
    };
    if (currentByKey[limit] + delta > max) {
      throw new ForbiddenException({
        message: `Plan limit reached (${limit}: ${currentByKey[limit]} / ${max}). Upgrade to add more.`,
        limit,
        current: currentByKey[limit],
        max,
        planCode: plan.code,
      });
    }
  }

  async assertWorkspaceCountForOwner(
    ownerId: string,
    plan: SubscriptionPlan,
    delta = 1,
  ): Promise<void> {
    if (!(await this.isEnforcementEnabled())) return;
    const max = plan.limits.workspaces;
    if (max === -1) return;
    const count = await this.workspaceRepo.count({ where: { ownerId } });
    if (count + delta > max) {
      throw new ForbiddenException({
        message: `Plan limit reached (workspaces: ${count} / ${max}). Upgrade to create more.`,
        limit: 'workspaces',
        current: count,
        max,
        planCode: plan.code,
      });
    }
  }

  private findViolations(
    limits: PlanLimits,
    usage: WorkspaceUsage,
  ): Array<{ limit: string; current: number; max: number }> {
    const violations: Array<{ limit: string; current: number; max: number }> =
      [];
    const check = (limit: string, current: number, max: number) => {
      if (max !== -1 && current > max) {
        violations.push({ limit, current, max });
      }
    };
    check('membersPerWorkspace', usage.members, limits.membersPerWorkspace);
    check('eventsPerWorkspace', usage.events, limits.eventsPerWorkspace);
    check('storageMb', usage.storageMb, limits.storageMb);
    return violations;
  }
}
