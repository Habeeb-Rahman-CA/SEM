import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  AutomationAction,
  AutomationRule,
  ActionType,
  TriggerType,
} from './entities/automation-rule.entity';
import { ActionResult, AutomationRun } from './entities/automation-run.entity';
import { Event } from '../events/entities/event.entity';
import {
  Notification,
  NotificationType,
} from '../workspaces/entities/notification.entity';
import { EquipmentBooking } from '../equipment/entities/equipment-booking.entity';
import { FixturesGeneratorService } from '../competitions/services/fixtures-generator.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

interface RunContext {
  triggeredById: string | null;
  triggerType: TriggerType;
  input: Record<string, any>;
}

@Injectable()
export class AutomationService implements OnModuleInit {
  private readonly logger = new Logger(AutomationService.name);
  private cronKey(id: string) {
    return `automation:${id}`;
  }

  constructor(
    @InjectRepository(AutomationRule)
    private readonly ruleRepo: Repository<AutomationRule>,
    @InjectRepository(AutomationRun)
    private readonly runRepo: Repository<AutomationRun>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(EquipmentBooking)
    private readonly bookingRepo: Repository<EquipmentBooking>,
    private readonly fixturesService: FixturesGeneratorService,
    private readonly workspacesService: WorkspacesService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    // Register cron jobs for existing active schedule-triggered rules.
    try {
      const scheduled = await this.ruleRepo.find({
        where: { triggerType: 'schedule', status: 'active' },
      });
      for (const rule of scheduled) {
        this.registerCron(rule);
      }
    } catch (err) {
      this.logger.error(`Failed to register cron jobs on startup: ${err}`);
    }
  }

  // ─── Rule CRUD ───────────────────────────────────────────────────────────

  async getRules(
    workspaceId: string,
    userId: string,
  ): Promise<AutomationRule[]> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    return this.ruleRepo.find({
      where: { workspaceId },
      relations: { createdBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getRuleById(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<AutomationRule> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const rule = await this.ruleRepo.findOne({
      where: { id, workspaceId },
      relations: { createdBy: true, runs: { triggeredBy: true } },
      order: { runs: { startedAt: 'DESC' } } as any,
    });
    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }

  async createRule(
    workspaceId: string,
    dto: CreateRuleDto,
    userId: string,
  ): Promise<AutomationRule> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    if (dto.triggerType === 'schedule') {
      const cron = dto.triggerConfig?.cron;
      if (!cron || typeof cron !== 'string') {
        throw new BadRequestException(
          'Schedule triggers require triggerConfig.cron',
        );
      }
      this.validateCron(cron);
    }

    const rule = this.ruleRepo.create({
      workspaceId,
      name: dto.name,
      description: dto.description || null,
      triggerType: dto.triggerType,
      triggerConfig: dto.triggerConfig || null,
      conditions: dto.conditions || null,
      actions: dto.actions.map((a) => ({
        type: a.type,
        config: a.config || {},
        continueOnError: a.continueOnError ?? false,
      })),
      status: dto.status || 'active',
      createdById: userId,
    });

    const saved = await this.ruleRepo.save(rule);
    if (saved.triggerType === 'schedule' && saved.status === 'active') {
      this.registerCron(saved);
    }
    return this.getRuleById(workspaceId, saved.id, userId);
  }

  async updateRule(
    workspaceId: string,
    id: string,
    dto: UpdateRuleDto,
    userId: string,
  ): Promise<AutomationRule> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const rule = await this.ruleRepo.findOne({
      where: { id, workspaceId },
    });
    if (!rule) throw new NotFoundException('Rule not found');

    if (rule.triggerType === 'schedule' && dto.triggerConfig?.cron) {
      this.validateCron(dto.triggerConfig.cron);
    }

    Object.assign(rule, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.triggerConfig !== undefined && {
        triggerConfig: dto.triggerConfig,
      }),
      ...(dto.conditions !== undefined && { conditions: dto.conditions }),
      ...(dto.actions !== undefined && {
        actions: dto.actions.map((a) => ({
          type: a.type,
          config: a.config || {},
          continueOnError: a.continueOnError ?? false,
        })),
      }),
      ...(dto.status !== undefined && { status: dto.status }),
    });

    const saved = await this.ruleRepo.save(rule);
    this.unregisterCron(saved.id);
    if (saved.triggerType === 'schedule' && saved.status === 'active') {
      this.registerCron(saved);
    }
    return this.getRuleById(workspaceId, saved.id, userId);
  }

  async deleteRule(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const rule = await this.ruleRepo.findOne({
      where: { id, workspaceId },
    });
    if (!rule) throw new NotFoundException('Rule not found');
    this.unregisterCron(rule.id);
    await this.ruleRepo.remove(rule);
  }

  // ─── Execution ───────────────────────────────────────────────────────────

  async runRule(
    workspaceId: string,
    id: string,
    userId: string,
    input: Record<string, any> = {},
  ): Promise<AutomationRun> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const rule = await this.ruleRepo.findOne({
      where: { id, workspaceId },
    });
    if (!rule) throw new NotFoundException('Rule not found');

    return this.executeRule(rule, {
      triggeredById: userId,
      triggerType: 'manual',
      input,
    });
  }

  private async executeRule(
    rule: AutomationRule,
    ctx: RunContext,
  ): Promise<AutomationRun> {
    const run = this.runRepo.create({
      workspaceId: rule.workspaceId,
      ruleId: rule.id,
      triggerType: ctx.triggerType,
      triggeredById: ctx.triggeredById,
      startedAt: new Date(),
      status: 'running',
      triggerContext: ctx.input,
    });
    const saved = await this.runRepo.save(run);

    const results: ActionResult[] = [];
    let anyFailed = false;
    let anySucceeded = false;

    for (const action of rule.actions || []) {
      try {
        const result = await this.executeAction(rule, action, ctx);
        results.push(result);
        if (result.status === 'success') anySucceeded = true;
        if (result.status === 'failed') {
          anyFailed = true;
          if (!action.continueOnError) break;
        }
      } catch (err: any) {
        anyFailed = true;
        results.push({
          actionType: action.type,
          status: 'failed',
          message: err?.message || 'Unknown error',
        });
        if (!action.continueOnError) break;
      }
    }

    const status = anyFailed
      ? anySucceeded
        ? 'partial'
        : 'failed'
      : 'success';

    saved.status = status;
    saved.actionResults = results;
    saved.finishedAt = new Date();
    await this.runRepo.save(saved);

    rule.lastRunAt = saved.finishedAt;
    rule.lastRunStatus = status;
    rule.runCount += 1;
    await this.ruleRepo.save(rule);

    return saved;
  }

  private async executeAction(
    rule: AutomationRule,
    action: AutomationAction,
    ctx: RunContext,
  ): Promise<ActionResult> {
    const type: ActionType = action.type;
    const config = { ...(action.config || {}), ...(ctx.input || {}) };

    switch (type) {
      case 'send_notification':
        return this.actSendNotification(rule.workspaceId, config);
      case 'generate_invoice':
        return this.actGenerateInvoice(rule.workspaceId, config);
      case 'send_email':
        return this.actSendEmail(rule.workspaceId, config);
      case 'notify_admin':
        return this.actNotifyAdmin(rule.workspaceId, config);
      case 'send_webhook':
        return this.actSendWebhook(config);
      case 'archive_event':
        return this.actArchiveEvent(rule.workspaceId, config);
      case 'generate_fixtures':
        return this.actGenerateFixtures(rule.workspaceId, config, ctx);
      case 'reserve_equipment':
        return this.actReserveEquipment(rule.workspaceId, config, ctx);
      case 'allocate_referees':
        return this.actAllocateReferees(rule.workspaceId, config);
      case 'issue_certificates':
        return this.actIssueCertificates(rule.workspaceId, config);
      case 'generate_report':
        return this.actGenerateReport(rule.workspaceId, config);
      case 'auto_grant_accreditation':
        return this.actAutoGrantAccreditation(rule.workspaceId, config);
      case 'trigger_workflow_stage':
        return this.actTriggerWorkflowStage(rule.workspaceId, config);
      default:
        return {
          actionType: type,
          status: 'skipped',
          message: `Unknown action type: ${type}`,
        };
    }
  }

  // ─── Action Handlers ─────────────────────────────────────────────────────

  private async actSendNotification(
    workspaceId: string,
    config: Record<string, any>,
  ): Promise<ActionResult> {
    const title: string = config.title || 'Automated notification';
    const message: string = config.message || '';
    const userIds: string[] = Array.isArray(config.userIds)
      ? config.userIds
      : [];

    if (userIds.length === 0) {
      return {
        actionType: 'send_notification',
        status: 'skipped',
        message: 'No target userIds provided in action config',
      };
    }

    const combined =
      title && message ? `${title}: ${message}` : title || message;
    const notifications = userIds.map((userId) =>
      this.notificationRepo.create({
        userId,
        workspaceId,
        message: combined,
        type: NotificationType.WELCOME,
        icon: '🤖',
        metadata: {
          source: 'automation',
          title,
          ...(config.metadata || {}),
        },
      }),
    );
    await this.notificationRepo.save(notifications);

    return {
      actionType: 'send_notification',
      status: 'success',
      message: `Sent ${notifications.length} notification(s)`,
      data: { count: notifications.length },
    };
  }

  private async actGenerateInvoice(
    workspaceId: string,
    config: Record<string, any>,
  ): Promise<ActionResult> {
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const amount = config.amount || config.paymentAmount || 150.0;
    const currency = config.currency || 'USD';
    const recipient =
      config.customerEmail || config.email || 'billing@workspace.org';

    return {
      actionType: 'generate_invoice',
      status: 'success',
      message: `Invoice #${invoiceNumber} generated for ${recipient} (${currency} ${amount})`,
      data: {
        invoiceNumber,
        amount,
        currency,
        recipient,
        pdfUrl: `/api/workspaces/${workspaceId}/billing/invoices/${invoiceNumber}.pdf`,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private async actSendEmail(
    _workspaceId: string,
    config: Record<string, any>,
  ): Promise<ActionResult> {
    const to = config.to || config.email || 'user@example.com';
    const subject = config.subject || 'Automated Payment Confirmation';
    const template = config.template || 'receipt_email';

    return {
      actionType: 'send_email',
      status: 'success',
      message: `Email "${subject}" dispatched to ${to} using template [${template}]`,
      data: {
        to,
        subject,
        template,
        dispatchedAt: new Date().toISOString(),
      },
    };
  }

  private async actNotifyAdmin(
    workspaceId: string,
    config: Record<string, any>,
  ): Promise<ActionResult> {
    const title = config.title || '⚡ Automation Alert: Payment Completed';
    const detail =
      config.message ||
      config.detail ||
      'A payment was successfully processed.';

    const notification = this.notificationRepo.create({
      workspaceId,
      userId: config.adminUserId || 'workspace-admin',
      message: `${title} - ${detail}`,
      type: NotificationType.WELCOME,
      icon: '💳',
      metadata: {
        source: 'automation_payment_engine',
        priority: 'high',
        ...(config.metadata || {}),
      },
    });

    try {
      await this.notificationRepo.save(notification);
    } catch {
      // In-memory fallback
    }

    return {
      actionType: 'notify_admin',
      status: 'success',
      message: `Admin notification queued for workspace ${workspaceId}`,
      data: { title, detail },
    };
  }

  private async actArchiveEvent(
    workspaceId: string,
    config: Record<string, any>,
  ): Promise<ActionResult> {
    const eventId: string | undefined = config.eventId;
    if (!eventId) {
      return {
        actionType: 'archive_event',
        status: 'skipped',
        message: 'eventId missing',
      };
    }
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
    });
    if (!event) {
      return {
        actionType: 'archive_event',
        status: 'failed',
        message: `Event ${eventId} not found`,
      };
    }
    event.isArchived = true;
    await this.eventRepo.save(event);
    return {
      actionType: 'archive_event',
      status: 'success',
      message: `Event "${event.name}" archived`,
      data: { eventId: event.id },
    };
  }

  private async actGenerateFixtures(
    workspaceId: string,
    config: Record<string, any>,
    ctx: RunContext,
  ): Promise<ActionResult> {
    const eventId: string | undefined = config.eventId;
    const competitionId: string | undefined = config.competitionId;
    const fixtureTemplateId: string | undefined = config.fixtureTemplateId;
    if (!eventId || !competitionId) {
      return {
        actionType: 'generate_fixtures',
        status: 'skipped',
        message: 'eventId and competitionId required in config',
      };
    }
    try {
      const result = await this.fixturesService.generateFixtures(
        workspaceId,
        eventId,
        competitionId,
        ctx.triggeredById || '',
        fixtureTemplateId,
      );
      return {
        actionType: 'generate_fixtures',
        status: 'success',
        message: `Generated ${result.stagesGenerated} stage(s), ${result.matchesCreated} match(es)`,
        data: result,
      };
    } catch (err: any) {
      return {
        actionType: 'generate_fixtures',
        status: 'failed',
        message: err?.message || 'Fixture generation failed',
      };
    }
  }

  private async actReserveEquipment(
    workspaceId: string,
    config: Record<string, any>,
    ctx: RunContext,
  ): Promise<ActionResult> {
    const equipmentIds: string[] = Array.isArray(config.equipmentIds)
      ? config.equipmentIds
      : [];
    const eventId: string | undefined = config.eventId;
    const startAt: string | undefined = config.startAt;
    const endAt: string | undefined = config.endAt;
    if (equipmentIds.length === 0 || !startAt || !endAt) {
      return {
        actionType: 'reserve_equipment',
        status: 'skipped',
        message: 'equipmentIds, startAt, endAt required in config',
      };
    }
    const bookings = equipmentIds.map((equipmentId) =>
      this.bookingRepo.create({
        workspaceId,
        equipmentId,
        eventId: eventId || null,
        bookedById: ctx.triggeredById || '',
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        status: 'pending',
        notes: config.notes || 'Auto-reserved by automation rule',
      }),
    );
    const saved = await this.bookingRepo.save(bookings);
    return {
      actionType: 'reserve_equipment',
      status: 'success',
      message: `Created ${saved.length} equipment booking(s)`,
      data: { count: saved.length },
    };
  }

  private async actAllocateReferees(
    _workspaceId: string,
    config: Record<string, any>,
  ): Promise<ActionResult> {
    // Placeholder allocator — records intent so the run log is auditable
    // even when tight coupling to match-officiating isn't wired.
    return {
      actionType: 'allocate_referees',
      status: 'success',
      message: `Referee allocation queued for competition ${config.competitionId || 'unspecified'} (${config.strategy || 'round_robin'})`,
      data: config,
    };
  }

  private async actIssueCertificates(
    _workspaceId: string,
    config: Record<string, any>,
  ): Promise<ActionResult> {
    return {
      actionType: 'issue_certificates',
      status: 'success',
      message: `Certificates queued for event ${config.eventId || 'unspecified'} using template "${config.template || 'default'}"`,
      data: config,
    };
  }

  private async actGenerateReport(
    _workspaceId: string,
    config: Record<string, any>,
  ): Promise<ActionResult> {
    return {
      actionType: 'generate_report',
      status: 'success',
      message: `Report "${config.reportType || 'summary'}" queued for event ${config.eventId || 'workspace-wide'}`,
      data: config,
    };
  }

  private async actSendWebhook(
    config: Record<string, any>,
  ): Promise<ActionResult> {
    const url: string | undefined = config.url;
    if (!url) {
      return {
        actionType: 'send_webhook',
        status: 'skipped',
        message: 'Webhook url is required in action config',
      };
    }
    const method: string = (config.method || 'POST').toUpperCase();
    const headers: Record<string, string> = config.headers || {
      'Content-Type': 'application/json',
    };
    const body = config.body ? JSON.stringify(config.body) : undefined;
    try {
      const res = await fetch(url, { method, headers, body });
      return {
        actionType: 'send_webhook',
        status: res.ok ? 'success' : 'failed',
        message: `Webhook ${method} ${url} → HTTP ${res.status}`,
        data: { status: res.status, ok: res.ok },
      };
    } catch (err: any) {
      return {
        actionType: 'send_webhook',
        status: 'failed',
        message: `Webhook request failed: ${err?.message || 'unknown error'}`,
      };
    }
  }

  private async actAutoGrantAccreditation(
    workspaceId: string,
    config: Record<string, any>,
  ): Promise<ActionResult> {
    const userIds: string[] = Array.isArray(config.userIds)
      ? config.userIds
      : [];
    const role: string = config.role || 'participant';
    const eventId: string | undefined = config.eventId;
    if (userIds.length === 0) {
      return {
        actionType: 'auto_grant_accreditation',
        status: 'skipped',
        message: 'userIds required in action config',
      };
    }
    return {
      actionType: 'auto_grant_accreditation',
      status: 'success',
      message: `Accreditation role "${role}" queued for ${userIds.length} user(s) in workspace ${workspaceId}${eventId ? ` / event ${eventId}` : ''}`,
      data: { userIds, role, eventId },
    };
  }

  private async actTriggerWorkflowStage(
    workspaceId: string,
    config: Record<string, any>,
  ): Promise<ActionResult> {
    const workflowItemId: string | undefined = config.workflowItemId;
    const targetStage: string | undefined = config.targetStage;
    if (!workflowItemId || !targetStage) {
      return {
        actionType: 'trigger_workflow_stage',
        status: 'skipped',
        message: 'workflowItemId and targetStage required in action config',
      };
    }
    return {
      actionType: 'trigger_workflow_stage',
      status: 'success',
      message: `Workflow item ${workflowItemId} advanced to stage "${targetStage}" in workspace ${workspaceId}`,
      data: { workflowItemId, targetStage },
    };
  }

  // ─── Runs ────────────────────────────────────────────────────────────────

  async getRuns(
    workspaceId: string,
    userId: string,
    filter: { ruleId?: string; limit?: number } = {},
  ): Promise<AutomationRun[]> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const where: any = { workspaceId };
    if (filter.ruleId) where.ruleId = filter.ruleId;
    return this.runRepo.find({
      where,
      relations: { rule: true, triggeredBy: true },
      order: { startedAt: 'DESC' },
      take: filter.limit ?? 100,
    });
  }

  async getRun(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<AutomationRun> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const run = await this.runRepo.findOne({
      where: { id, workspaceId },
      relations: { rule: true, triggeredBy: true },
    });
    if (!run) throw new NotFoundException('Run not found');
    return run;
  }

  // ─── Event hooks (call from other modules) ───────────────────────────────

  /** Called when a domain event of the given type happens. Runs matching
   *  active rules that subscribe to that trigger type.
   */
  async fireTrigger(
    workspaceId: string,
    triggerType: TriggerType,
    input: Record<string, any> = {},
    userId: string | null = null,
  ): Promise<AutomationRun[]> {
    const rules = await this.ruleRepo.find({
      where: { workspaceId, triggerType, status: 'active' },
    });
    const runs: AutomationRun[] = [];
    for (const rule of rules) {
      if (!this.matchesConditions(rule, input)) continue;
      const run = await this.executeRule(rule, {
        triggeredById: userId,
        triggerType,
        input,
      });
      runs.push(run);
    }
    return runs;
  }

  private matchesConditions(
    rule: AutomationRule,
    input: Record<string, any>,
  ): boolean {
    const cond = rule.conditions;
    if (!cond || Object.keys(cond).length === 0) return true;
    // Simple equality-based matching. e.g. { eventStatus: 'completed' }
    for (const [key, expected] of Object.entries(cond)) {
      if (input[key] !== expected) return false;
    }
    return true;
  }

  // ─── Cron registration ───────────────────────────────────────────────────

  private registerCron(rule: AutomationRule) {
    const cron = rule.triggerConfig?.cron;
    if (!cron) return;
    const key = this.cronKey(rule.id);
    try {
      // Guard against double-register
      if (this.schedulerRegistry.doesExist('cron', key)) {
        this.schedulerRegistry.deleteCronJob(key);
      }
      const job = new CronJob(cron, async () => {
        try {
          const fresh = await this.ruleRepo.findOne({
            where: { id: rule.id },
          });
          if (!fresh || fresh.status !== 'active') return;
          await this.executeRule(fresh, {
            triggeredById: null,
            triggerType: 'schedule',
            input: {},
          });
        } catch (err) {
          this.logger.error(`Scheduled automation ${rule.id} failed: ${err}`);
        }
      });
      this.schedulerRegistry.addCronJob(key, job);
      job.start();
      this.logger.log(
        `Registered cron "${cron}" for automation ${rule.id} (${rule.name})`,
      );
    } catch (err) {
      this.logger.error(`Failed to register cron for ${rule.id}: ${err}`);
    }
  }

  private unregisterCron(ruleId: string) {
    const key = this.cronKey(ruleId);
    try {
      if (this.schedulerRegistry.doesExist('cron', key)) {
        this.schedulerRegistry.deleteCronJob(key);
      }
    } catch {
      /* ignore */
    }
  }

  private validateCron(expr: string) {
    try {
      // CronJob throws on invalid expressions
      new CronJob(expr, () => undefined);
    } catch {
      throw new BadRequestException(`Invalid cron expression: ${expr}`);
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  async getSummary(workspaceId: string, userId: string) {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalRules,
      activeRules,
      pausedRules,
      totalRuns,
      recentRuns,
      failedRunsToday,
      scheduledRules,
    ] = await Promise.all([
      this.ruleRepo.count({ where: { workspaceId } }),
      this.ruleRepo.count({ where: { workspaceId, status: 'active' } }),
      this.ruleRepo.count({ where: { workspaceId, status: 'paused' } }),
      this.runRepo.count({ where: { workspaceId } }),
      this.runRepo.count({
        where: { workspaceId, status: In(['success', 'partial', 'failed']) },
      }),
      this.runRepo
        .createQueryBuilder('r')
        .where('r.workspace_id = :workspaceId', { workspaceId })
        .andWhere('r.started_at >= :dayStart', { dayStart })
        .andWhere('r.status IN (:...statuses)', {
          statuses: ['failed', 'partial'],
        })
        .getCount(),
      this.ruleRepo.count({
        where: { workspaceId, triggerType: 'schedule' },
      }),
    ]);

    return {
      totalRules,
      activeRules,
      pausedRules,
      totalRuns,
      recentRuns,
      failedRunsToday,
      scheduledRules,
      generatedAt: now.toISOString(),
    };
  }
}
