import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyConfig } from './entities/policy-config.entity';
import { AuctionPlayer } from '../auctions/entities/auction-player.entity';
import { TransferRequest } from '../transfers/entities/transfer-request.entity';
import { PlayerContract } from '../rosters/entities/player-contract.entity';
import { RosterConfig } from '../rosters/entities/roster-config.entity';
import { TeamFinancialAccount } from '../finance/entities/financial-account.entity';
import { Payment } from '../finance/entities/payment.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { UpdatePolicyDto } from './dto/update-policy.dto';

export interface Violation {
  severity: 'critical' | 'warning' | 'info';
  rule: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(PolicyConfig)
    private readonly policyRepo: Repository<PolicyConfig>,
    @InjectRepository(AuctionPlayer)
    private readonly auctionPlayerRepo: Repository<AuctionPlayer>,
    @InjectRepository(TransferRequest)
    private readonly transferRepo: Repository<TransferRequest>,
    @InjectRepository(PlayerContract)
    private readonly contractRepo: Repository<PlayerContract>,
    @InjectRepository(RosterConfig)
    private readonly rosterConfigRepo: Repository<RosterConfig>,
    @InjectRepository(TeamFinancialAccount)
    private readonly accountRepo: Repository<TeamFinancialAccount>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async getPolicy(workspaceId: string, userId: string): Promise<PolicyConfig> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    let p = await this.policyRepo.findOne({ where: { workspaceId } });
    if (!p) {
      p = this.policyRepo.create({ workspaceId });
      p = await this.policyRepo.save(p);
    }
    return p;
  }

  async updatePolicy(
    workspaceId: string,
    dto: UpdatePolicyDto,
    userId: string,
  ): Promise<PolicyConfig> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    let p = await this.policyRepo.findOne({ where: { workspaceId } });
    if (!p) {
      p = this.policyRepo.create({ workspaceId });
    }
    Object.assign(p, dto);
    return this.policyRepo.save(p);
  }

  /**
   * Scans the workspace against the configured policy and returns a
   * comprehensive violation report. Read-only — never mutates state.
   */
  async validateWorkspace(
    workspaceId: string,
    userId: string,
    season?: string,
  ): Promise<{
    workspaceId: string;
    season: string | null;
    counts: {
      critical: number;
      warning: number;
      info: number;
      total: number;
    };
    violations: Violation[];
    generatedAt: string;
  }> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const policy = await this.getPolicy(workspaceId, userId);
    const violations: Violation[] = [];

    // ─── Duplicate auction registrations ─────────────────────────────
    if (policy.preventDuplicateAuctionRegistration) {
      const rows = await this.auctionPlayerRepo
        .createQueryBuilder('ap')
        .select('ap.playerId', 'playerId')
        .addSelect('ap.auctionId', 'auctionId')
        .addSelect('COUNT(*)', 'count')
        .where('ap.workspace_id = :workspaceId', { workspaceId })
        .groupBy('ap.playerId')
        .addGroupBy('ap.auctionId')
        .having('COUNT(*) > 1')
        .getRawMany<{ playerId: string; auctionId: string; count: string }>();
      for (const r of rows) {
        violations.push({
          severity: 'critical',
          rule: 'duplicate_auction_registration',
          message: `Player ${r.playerId} is registered ${r.count} times in auction ${r.auctionId}`,
          entityType: 'auction_player',
          entityId: r.playerId,
        });
      }
    }

    // ─── Duplicate pending transfer requests per player ──────────────
    if (policy.preventDuplicateTransferRequest) {
      const rows = await this.transferRepo
        .createQueryBuilder('t')
        .select('t.playerId', 'playerId')
        .addSelect('COUNT(*)', 'count')
        .where('t.workspace_id = :workspaceId', { workspaceId })
        .andWhere('t.status = :status', { status: 'pending' })
        .groupBy('t.playerId')
        .having('COUNT(*) > 1')
        .getRawMany<{ playerId: string; count: string }>();
      for (const r of rows) {
        violations.push({
          severity: 'critical',
          rule: 'duplicate_transfer_request',
          message: `Player ${r.playerId} has ${r.count} pending transfer requests`,
          entityType: 'transfer_request',
          entityId: r.playerId,
        });
      }
    }

    // ─── Transfer notice period ──────────────────────────────────────
    if (policy.minTransferNoticeDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + policy.minTransferNoticeDays);
      const late = await this.transferRepo.find({
        where: { workspaceId, status: 'pending' },
      });
      for (const t of late) {
        if (t.window?.endAt && t.window.endAt < cutoff) {
          violations.push({
            severity: 'warning',
            rule: 'transfer_notice_too_short',
            message: `Transfer request ${t.id} window closes within the ${policy.minTransferNoticeDays}-day notice period`,
            entityType: 'transfer_request',
            entityId: t.id,
          });
        }
      }
    }

    // ─── Squad caps on active contracts ──────────────────────────────
    if (policy.enforceSquadCapsOnApprove) {
      const configs = season
        ? await this.rosterConfigRepo.find({ where: { workspaceId, season } })
        : await this.rosterConfigRepo.find({ where: { workspaceId } });
      for (const cfg of configs) {
        const activeContracts = await this.contractRepo.find({
          where: {
            workspaceId,
            teamId: cfg.teamId,
            season: cfg.season,
            status: 'active',
          },
        });
        if (activeContracts.length > cfg.maxSquadSize) {
          violations.push({
            severity: 'critical',
            rule: 'squad_size_exceeded',
            message: `Team ${cfg.teamId} has ${activeContracts.length} active contracts in ${cfg.season} — cap is ${cfg.maxSquadSize}`,
            entityType: 'roster_config',
            entityId: cfg.id,
          });
        }
        if (cfg.maxForeignPlayers != null) {
          const foreign = activeContracts.filter((c) => c.isForeign).length;
          if (foreign > cfg.maxForeignPlayers) {
            violations.push({
              severity: 'critical',
              rule: 'foreign_cap_exceeded',
              message: `Team ${cfg.teamId} has ${foreign} foreign players in ${cfg.season} — cap is ${cfg.maxForeignPlayers}`,
              entityType: 'roster_config',
              entityId: cfg.id,
            });
          }
        }
        if (
          cfg.minStarters != null &&
          activeContracts.length < cfg.minStarters
        ) {
          violations.push({
            severity: 'warning',
            rule: 'below_min_starters',
            message: `Team ${cfg.teamId} has only ${activeContracts.length} active contracts in ${cfg.season} — minimum is ${cfg.minStarters}`,
            entityType: 'roster_config',
            entityId: cfg.id,
          });
        }
      }
    }

    // ─── Unique registration numbers per season ──────────────────────
    if (policy.uniqueRegistrationPerSeason) {
      const rows = await this.contractRepo
        .createQueryBuilder('c')
        .select('c.registrationNumber', 'reg')
        .addSelect('c.season', 'season')
        .addSelect('COUNT(*)', 'count')
        .where('c.workspace_id = :workspaceId', { workspaceId })
        .andWhere('c.registration_number IS NOT NULL')
        .groupBy('c.registrationNumber')
        .addGroupBy('c.season')
        .having('COUNT(*) > 1')
        .getRawMany<{ reg: string; season: string; count: string }>();
      for (const r of rows) {
        violations.push({
          severity: 'critical',
          rule: 'duplicate_registration_number',
          message: `Registration number "${r.reg}" is used ${r.count} times in season ${r.season}`,
          entityType: 'contract',
        });
      }
    }

    // ─── Unique jersey per team per season ───────────────────────────
    if (policy.uniqueJerseyPerTeamSeason) {
      const rows = await this.contractRepo
        .createQueryBuilder('c')
        .select('c.teamId', 'teamId')
        .addSelect('c.season', 'season')
        .addSelect('c.jerseyNumber', 'jersey')
        .addSelect('COUNT(*)', 'count')
        .where('c.workspace_id = :workspaceId', { workspaceId })
        .andWhere('c.status = :status', { status: 'active' })
        .andWhere('c.jersey_number IS NOT NULL')
        .groupBy('c.teamId')
        .addGroupBy('c.season')
        .addGroupBy('c.jerseyNumber')
        .having('COUNT(*) > 1')
        .getRawMany<{
          teamId: string;
          season: string;
          jersey: string;
          count: string;
        }>();
      for (const r of rows) {
        violations.push({
          severity: 'warning',
          rule: 'duplicate_jersey',
          message: `Team ${r.teamId} has jersey #${r.jersey} assigned to ${r.count} active players in ${r.season}`,
          entityType: 'contract',
        });
      }
    }

    // ─── Budget thresholds ───────────────────────────────────────────
    const accounts = season
      ? await this.accountRepo.find({ where: { workspaceId, season } })
      : await this.accountRepo.find({ where: { workspaceId } });
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
      if (policy.blockNegativeBudgets && spent > budget) {
        violations.push({
          severity: 'critical',
          rule: 'negative_budget',
          message: `Team ${acc.teamId} exceeded budget in ${acc.season} — spent ${spent} vs ${budget}`,
          entityType: 'financial_account',
          entityId: acc.id,
        });
      } else if (
        policy.budgetAlertThresholdPct > 0 &&
        budget > 0 &&
        (spent / budget) * 100 >= policy.budgetAlertThresholdPct
      ) {
        violations.push({
          severity: 'warning',
          rule: 'budget_threshold_reached',
          message: `Team ${acc.teamId} has spent ${Math.round((spent / budget) * 100)}% of ${acc.season} budget`,
          entityType: 'financial_account',
          entityId: acc.id,
        });
      }
    }

    // ─── Expired active contracts ────────────────────────────────────
    const now = new Date();
    const staleContracts = await this.contractRepo
      .createQueryBuilder('c')
      .where('c.workspace_id = :workspaceId', { workspaceId })
      .andWhere('c.status = :s', { s: 'active' })
      .andWhere('c.end_date < :now', { now })
      .limit(50)
      .getMany();
    for (const c of staleContracts) {
      violations.push({
        severity: 'info',
        rule: 'contract_past_end',
        message: `Contract ${c.id.slice(0, 8)} is still active but ended on ${c.endDate.toISOString().slice(0, 10)}`,
        entityType: 'contract',
        entityId: c.id,
      });
    }

    const counts = {
      critical: violations.filter((v) => v.severity === 'critical').length,
      warning: violations.filter((v) => v.severity === 'warning').length,
      info: violations.filter((v) => v.severity === 'info').length,
      total: violations.length,
    };

    return {
      workspaceId,
      season: season || null,
      counts,
      violations,
      generatedAt: new Date().toISOString(),
    };
  }
}
