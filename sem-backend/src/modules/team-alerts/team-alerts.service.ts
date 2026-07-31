import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import {
  AlertCategory,
  AlertSeverity,
  TeamAlert,
} from './entities/team-alert.entity';
import { TeamAlertPreference } from './entities/alert-preference.entity';
import { Team } from '../teams/entities/team.entity';
import { TransferRequest } from '../transfers/entities/transfer-request.entity';
import { TransferWindow } from '../transfers/entities/transfer-window.entity';
import { PlayerContract } from '../rosters/entities/player-contract.entity';
import { TeamFinancialAccount } from '../finance/entities/financial-account.entity';
import { Payment } from '../finance/entities/payment.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  BroadcastAlertDto,
  UpdateAlertPreferenceDto,
} from './dto/team-alerts.dto';

@Injectable()
export class TeamAlertsService {
  constructor(
    @InjectRepository(TeamAlert)
    private readonly alertRepo: Repository<TeamAlert>,
    @InjectRepository(TeamAlertPreference)
    private readonly prefRepo: Repository<TeamAlertPreference>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(TransferRequest)
    private readonly transferRepo: Repository<TransferRequest>,
    @InjectRepository(TransferWindow)
    private readonly windowRepo: Repository<TransferWindow>,
    @InjectRepository(PlayerContract)
    private readonly contractRepo: Repository<PlayerContract>,
    @InjectRepository(TeamFinancialAccount)
    private readonly accountRepo: Repository<TeamFinancialAccount>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Alerts ──────────────────────────────────────────────────────────

  async getAlerts(
    workspaceId: string,
    userId: string,
    filter: {
      teamId?: string;
      category?: AlertCategory;
      unreadOnly?: boolean;
      limit?: number;
    } = {},
  ): Promise<TeamAlert[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const where: any = { workspaceId };
    if (filter.teamId) where.teamId = filter.teamId;
    if (filter.category) where.category = filter.category;
    if (filter.unreadOnly) where.isRead = false;
    return this.alertRepo.find({
      where,
      relations: { team: true, acknowledgedBy: true },
      order: { createdAt: 'DESC' },
      take: filter.limit ?? 100,
    });
  }

  async broadcast(
    workspaceId: string,
    dto: BroadcastAlertDto,
    userId: string,
  ): Promise<{ sent: number; skipped: number }> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const teams = await this.teamRepo.find({
      where: { id: In(dto.teamIds), workspaceId },
    });
    const category: AlertCategory = dto.category || 'general';

    let sent = 0;
    let skipped = 0;
    const alerts: TeamAlert[] = [];

    for (const team of teams) {
      const pref = await this.getOrCreatePreference(workspaceId, team.id);
      if (!this.categoryEnabled(pref, category)) {
        skipped += 1;
        continue;
      }
      alerts.push(
        this.alertRepo.create({
          workspaceId,
          teamId: team.id,
          category,
          severity: dto.severity || 'info',
          title: dto.title,
          message: dto.message,
          actionUrl: dto.actionUrl || null,
          metadata: dto.metadata || null,
        }),
      );
      sent += 1;
    }
    if (alerts.length > 0) {
      await this.alertRepo.save(alerts);
    }
    return { sent, skipped };
  }

  async markRead(
    workspaceId: string,
    alertId: string,
    userId: string,
  ): Promise<TeamAlert> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const alert = await this.alertRepo.findOne({
      where: { id: alertId, workspaceId },
    });
    if (!alert) throw new NotFoundException('Alert not found');
    alert.isRead = true;
    if (!alert.acknowledgedAt) {
      alert.acknowledgedAt = new Date();
      alert.acknowledgedById = userId;
    }
    return this.alertRepo.save(alert);
  }

  async markAllRead(
    workspaceId: string,
    userId: string,
    teamId?: string,
  ): Promise<{ updated: number }> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const where: any = { workspaceId, isRead: false };
    if (teamId) where.teamId = teamId;
    const result = await this.alertRepo.update(where, {
      isRead: true,
      acknowledgedAt: new Date(),
      acknowledgedById: userId,
    });
    return { updated: result.affected ?? 0 };
  }

  async deleteAlert(
    workspaceId: string,
    alertId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const alert = await this.alertRepo.findOne({
      where: { id: alertId, workspaceId },
    });
    if (!alert) throw new NotFoundException('Alert not found');
    await this.alertRepo.remove(alert);
  }

  // ─── Preferences ─────────────────────────────────────────────────────

  async getPreferences(
    workspaceId: string,
    userId: string,
  ): Promise<TeamAlertPreference[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.prefRepo.find({
      where: { workspaceId },
      relations: { team: true },
      order: { createdAt: 'ASC' },
    });
  }

  async updatePreference(
    workspaceId: string,
    teamId: string,
    dto: UpdateAlertPreferenceDto,
    userId: string,
  ): Promise<TeamAlertPreference> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    let pref = await this.prefRepo.findOne({
      where: { workspaceId, teamId },
    });
    if (!pref) {
      const team = await this.teamRepo.findOne({
        where: { id: teamId, workspaceId },
      });
      if (!team) throw new NotFoundException('Team not found');
      pref = this.prefRepo.create({ workspaceId, teamId });
    }
    Object.assign(pref, dto);
    return this.prefRepo.save(pref);
  }

  private async getOrCreatePreference(
    workspaceId: string,
    teamId: string,
  ): Promise<TeamAlertPreference> {
    let pref = await this.prefRepo.findOne({
      where: { workspaceId, teamId },
    });
    if (!pref) {
      pref = this.prefRepo.create({ workspaceId, teamId });
      pref = await this.prefRepo.save(pref);
    }
    return pref;
  }

  private categoryEnabled(
    pref: TeamAlertPreference,
    category: AlertCategory,
  ): boolean {
    switch (category) {
      case 'auction_event':
        return pref.auctionEvents;
      case 'auction_bid':
        return pref.auctionBids;
      case 'auction_purchase':
        return pref.auctionPurchases;
      case 'transfer_submitted':
      case 'transfer_approved':
      case 'transfer_rejected':
        return pref.transferUpdates;
      case 'budget_warning':
      case 'budget_exceeded':
        return pref.budgetAlerts;
      case 'deadline_approaching':
        return pref.deadlineAlerts;
      case 'contract_expiring':
        return pref.contractExpiryAlerts;
      case 'general':
      default:
        return true;
    }
  }

  // ─── Automated scan ──────────────────────────────────────────────────

  /**
   * Sweeps the workspace and generates alerts for: transfer-window deadlines
   * closing soon, contracts expiring soon, and team budgets past a threshold.
   * Called manually today; can be attached to a scheduled job later.
   */
  async runScan(
    workspaceId: string,
    userId: string,
    opts: {
      season?: string;
      budgetThresholdPct?: number;
      windowNoticeDays?: number;
      contractNoticeDays?: number;
    } = {},
  ): Promise<{ created: number }> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const budgetPct = opts.budgetThresholdPct ?? 80;
    const windowDays = opts.windowNoticeDays ?? 3;
    const contractDays = opts.contractNoticeDays ?? 14;
    const now = new Date();
    const cutoffWindows = new Date(now.getTime() + windowDays * 86400000);
    const cutoffContracts = new Date(now.getTime() + contractDays * 86400000);

    const created: TeamAlert[] = [];

    // ─── Transfer windows closing soon ───────────────────────────────
    const closingWindows = await this.windowRepo.find({
      where: {
        workspaceId,
        isActive: true,
        endAt: LessThanOrEqual(cutoffWindows),
      },
    });
    for (const w of closingWindows) {
      if (w.endAt < now) continue;
      const teams = await this.teamRepo.find({ where: { workspaceId } });
      for (const team of teams) {
        const dedup = await this.alertRepo.findOne({
          where: {
            workspaceId,
            teamId: team.id,
            category: 'deadline_approaching',
            referenceType: 'transfer_window',
            referenceId: w.id,
          },
        });
        if (dedup) continue;
        const pref = await this.getOrCreatePreference(workspaceId, team.id);
        if (!pref.deadlineAlerts) continue;
        created.push(
          this.alertRepo.create({
            workspaceId,
            teamId: team.id,
            category: 'deadline_approaching',
            severity: 'warning',
            title: `Transfer window "${w.name}" closes soon`,
            message: `Window closes on ${w.endAt.toISOString().slice(0, 10)}. Submit any pending transfer requests now.`,
            referenceType: 'transfer_window',
            referenceId: w.id,
          }),
        );
      }
    }

    // ─── Contracts expiring soon ─────────────────────────────────────
    const expiring = await this.contractRepo.find({
      where: {
        workspaceId,
        status: 'active',
        endDate: LessThanOrEqual(cutoffContracts),
      },
    });
    for (const c of expiring) {
      if (c.endDate < now) continue;
      const dedup = await this.alertRepo.findOne({
        where: {
          workspaceId,
          teamId: c.teamId,
          category: 'contract_expiring',
          referenceType: 'contract',
          referenceId: c.id,
        },
      });
      if (dedup) continue;
      const pref = await this.getOrCreatePreference(workspaceId, c.teamId);
      if (!pref.contractExpiryAlerts) continue;
      created.push(
        this.alertRepo.create({
          workspaceId,
          teamId: c.teamId,
          category: 'contract_expiring',
          severity: 'warning',
          title: `Contract expires on ${c.endDate.toISOString().slice(0, 10)}`,
          message: `A player contract in season ${c.season} ends soon — renew or replace to keep the roster intact.`,
          referenceType: 'contract',
          referenceId: c.id,
        }),
      );
    }

    // ─── Budget threshold alerts ─────────────────────────────────────
    const accountWhere: any = { workspaceId };
    if (opts.season) accountWhere.season = opts.season;
    const accounts = await this.accountRepo.find({ where: accountWhere });
    for (const acc of accounts) {
      const outgoing = await this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.workspace_id = :workspaceId', { workspaceId })
        .andWhere('p.team_id = :teamId', { teamId: acc.teamId })
        .andWhere('p.season = :season', { season: acc.season })
        .andWhere('p.direction = :dir', { dir: 'outgoing' })
        .andWhere('p.status = :s', { s: 'paid' })
        .getRawOne<{ total: string }>();
      const spent = Number(outgoing?.total ?? 0);
      const budget = Number(acc.initialBudget ?? 0);
      if (budget <= 0) continue;
      const pct = (spent / budget) * 100;
      if (spent > budget) {
        const dedup = await this.alertRepo.findOne({
          where: {
            workspaceId,
            teamId: acc.teamId,
            category: 'budget_exceeded',
            referenceType: 'financial_account',
            referenceId: acc.id,
          },
        });
        if (dedup) continue;
        const pref = await this.getOrCreatePreference(workspaceId, acc.teamId);
        if (!pref.budgetAlerts) continue;
        created.push(
          this.alertRepo.create({
            workspaceId,
            teamId: acc.teamId,
            category: 'budget_exceeded',
            severity: 'critical',
            title: `Budget exceeded in ${acc.season}`,
            message: `Team has spent ${Math.round(pct)}% of its budget (₹${spent.toLocaleString()} of ₹${budget.toLocaleString()}).`,
            referenceType: 'financial_account',
            referenceId: acc.id,
            metadata: { spent, budget, pct },
          }),
        );
      } else if (pct >= budgetPct) {
        const dedup = await this.alertRepo.findOne({
          where: {
            workspaceId,
            teamId: acc.teamId,
            category: 'budget_warning',
            referenceType: 'financial_account',
            referenceId: acc.id,
          },
        });
        if (dedup) continue;
        const pref = await this.getOrCreatePreference(workspaceId, acc.teamId);
        if (!pref.budgetAlerts) continue;
        created.push(
          this.alertRepo.create({
            workspaceId,
            teamId: acc.teamId,
            category: 'budget_warning',
            severity: 'warning',
            title: `Budget alert in ${acc.season}`,
            message: `Team has spent ${Math.round(pct)}% of its budget — remaining ₹${(budget - spent).toLocaleString()}.`,
            referenceType: 'financial_account',
            referenceId: acc.id,
            metadata: { spent, budget, pct },
          }),
        );
      }
    }

    if (created.length > 0) {
      await this.alertRepo.save(created);
    }
    return { created: created.length };
  }

  // ─── Summary ─────────────────────────────────────────────────────────

  async getSummary(workspaceId: string, userId: string) {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const [total, unread, critical, byCategoryRaw] = await Promise.all([
      this.alertRepo.count({ where: { workspaceId } }),
      this.alertRepo.count({ where: { workspaceId, isRead: false } }),
      this.alertRepo.count({
        where: { workspaceId, severity: 'critical', isRead: false },
      }),
      this.alertRepo
        .createQueryBuilder('a')
        .select('a.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('a.workspace_id = :workspaceId', { workspaceId })
        .andWhere('a.is_read = false')
        .groupBy('a.category')
        .getRawMany<{ category: string; count: string }>(),
    ]);

    const upcomingWindows = await this.transferRepo
      .createQueryBuilder('t')
      .select('COUNT(*)', 'count')
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.status = :s', { s: 'pending' })
      .getRawOne<{ count: string }>();

    return {
      total,
      unread,
      critical,
      byCategory: byCategoryRaw.map((r) => ({
        category: r.category,
        count: Number(r.count),
      })),
      pendingTransfers: Number(upcomingWindows?.count ?? 0),
      generatedAt: new Date().toISOString(),
    };
  }
}
