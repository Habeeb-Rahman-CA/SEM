import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamFinancialAccount } from './entities/financial-account.entity';
import {
  Payment,
  PaymentCategory,
  PaymentStatus,
} from './entities/payment.entity';
import { AuctionTeamBudget } from '../auctions/entities/auction-team-budget.entity';
import { AuctionPlayer } from '../auctions/entities/auction-player.entity';
import { TransferRequest } from '../transfers/entities/transfer-request.entity';
import { PlayerContract } from '../rosters/entities/player-contract.entity';
import { Team } from '../teams/entities/team.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { UpsertAccountDto } from './dto/account.dto';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payment.dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(TeamFinancialAccount)
    private readonly accountRepo: Repository<TeamFinancialAccount>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(AuctionTeamBudget)
    private readonly auctionBudgetRepo: Repository<AuctionTeamBudget>,
    @InjectRepository(AuctionPlayer)
    private readonly auctionPlayerRepo: Repository<AuctionPlayer>,
    @InjectRepository(TransferRequest)
    private readonly transferRepo: Repository<TransferRequest>,
    @InjectRepository(PlayerContract)
    private readonly contractRepo: Repository<PlayerContract>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Accounts ────────────────────────────────────────────────────────

  async getAccounts(
    workspaceId: string,
    userId: string,
    filter: { teamId?: string; season?: string } = {},
  ): Promise<TeamFinancialAccount[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const where: any = { workspaceId };
    if (filter.teamId) where.teamId = filter.teamId;
    if (filter.season) where.season = filter.season;
    return this.accountRepo.find({
      where,
      relations: { team: true },
      order: { season: 'DESC' },
    });
  }

  async upsertAccount(
    workspaceId: string,
    dto: UpsertAccountDto,
    userId: string,
  ): Promise<TeamFinancialAccount> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const team = await this.teamRepo.findOne({
      where: { id: dto.teamId, workspaceId },
    });
    if (!team) throw new NotFoundException('Team not found');

    let acc = await this.accountRepo.findOne({
      where: { workspaceId, teamId: dto.teamId, season: dto.season },
    });
    if (acc) {
      Object.assign(acc, {
        ...(dto.initialBudget !== undefined && {
          initialBudget: String(dto.initialBudget),
        }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      });
    } else {
      acc = this.accountRepo.create({
        workspaceId,
        teamId: dto.teamId,
        season: dto.season,
        initialBudget: String(dto.initialBudget ?? 0),
        currency: dto.currency || 'INR',
        notes: dto.notes || null,
      });
    }
    return this.accountRepo.save(acc);
  }

  async deleteAccount(
    workspaceId: string,
    accountId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const acc = await this.accountRepo.findOne({
      where: { id: accountId, workspaceId },
    });
    if (!acc) throw new NotFoundException('Account not found');
    await this.accountRepo.remove(acc);
  }

  // ─── Payments ────────────────────────────────────────────────────────

  async getPayments(
    workspaceId: string,
    userId: string,
    filter: {
      teamId?: string;
      season?: string;
      category?: PaymentCategory;
      status?: PaymentStatus;
    } = {},
  ): Promise<Payment[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const where: any = { workspaceId };
    if (filter.teamId) where.teamId = filter.teamId;
    if (filter.season) where.season = filter.season;
    if (filter.category) where.category = filter.category;
    if (filter.status) where.status = filter.status;
    return this.paymentRepo.find({
      where,
      relations: { team: true, counterpartyTeam: true, recordedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createPayment(
    workspaceId: string,
    dto: CreatePaymentDto,
    userId: string,
  ): Promise<Payment> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const team = await this.teamRepo.findOne({
      where: { id: dto.teamId, workspaceId },
    });
    if (!team) throw new NotFoundException('Team not found');

    if (dto.counterpartyTeamId) {
      const cp = await this.teamRepo.findOne({
        where: { id: dto.counterpartyTeamId, workspaceId },
      });
      if (!cp) throw new NotFoundException('Counterparty team not found');
    }

    const status = dto.status || 'pending';
    const paidAt =
      dto.paidAt || (status === 'paid' ? new Date().toISOString() : null);

    const payment = this.paymentRepo.create({
      workspaceId,
      teamId: dto.teamId,
      season: dto.season || null,
      category: dto.category || 'other',
      direction: dto.direction || 'outgoing',
      amount: String(dto.amount),
      currency: dto.currency || 'INR',
      status,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      paidAt: paidAt ? new Date(paidAt) : null,
      referenceType: dto.referenceType || 'manual',
      referenceId: dto.referenceId || null,
      counterpartyTeamId: dto.counterpartyTeamId || null,
      description: dto.description,
      notes: dto.notes || null,
      recordedById: userId,
    });
    return this.paymentRepo.save(payment);
  }

  async updatePayment(
    workspaceId: string,
    paymentId: string,
    dto: UpdatePaymentDto,
    userId: string,
  ): Promise<Payment> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const p = await this.paymentRepo.findOne({
      where: { id: paymentId, workspaceId },
    });
    if (!p) throw new NotFoundException('Payment not found');

    Object.assign(p, {
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.amount !== undefined && { amount: String(dto.amount) }),
      ...(dto.dueDate !== undefined && {
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      }),
      ...(dto.paidAt !== undefined && {
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
      }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    // Auto-stamp paidAt when flipping to 'paid'
    if (dto.status === 'paid' && !p.paidAt) {
      p.paidAt = new Date();
    }

    return this.paymentRepo.save(p);
  }

  async deletePayment(
    workspaceId: string,
    paymentId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const p = await this.paymentRepo.findOne({
      where: { id: paymentId, workspaceId },
    });
    if (!p) throw new NotFoundException('Payment not found');
    await this.paymentRepo.remove(p);
  }

  // ─── Team financial report ───────────────────────────────────────────

  async getTeamReport(
    workspaceId: string,
    teamId: string,
    season: string,
    userId: string,
  ) {
    await this.workspacesService.ensureMember(workspaceId, userId);
    if (!season) {
      throw new BadRequestException('season query parameter is required');
    }

    const team = await this.teamRepo.findOne({
      where: { id: teamId, workspaceId },
    });
    if (!team) throw new NotFoundException('Team not found');

    const account = await this.accountRepo.findOne({
      where: { workspaceId, teamId, season },
    });

    // Auction spend (all-time; auctions aren't season-tagged)
    const auctionBudgets = await this.auctionBudgetRepo.find({
      where: { workspaceId, teamId },
      relations: { auction: true },
    });
    const auctionSpend = auctionBudgets.reduce(
      (sum, b) => sum + Number(b.spent || 0),
      0,
    );
    const auctionPlayersBought = auctionBudgets.reduce(
      (sum, b) => sum + b.playersBought,
      0,
    );

    // Auction wins (per-player, for report detail)
    const auctionWins = await this.auctionPlayerRepo.find({
      where: {
        workspaceId,
        soldToTeamId: teamId,
        status: 'sold',
      },
      relations: { player: { user: true } },
    });

    // Transfer fees paid (as buyer) and received (as seller) — completed only
    const incomingTransfers = await this.transferRepo.find({
      where: { workspaceId, toTeamId: teamId, status: 'completed' },
      relations: { fromTeam: true, player: { user: true } },
    });
    const outgoingTransfers = await this.transferRepo.find({
      where: { workspaceId, fromTeamId: teamId, status: 'completed' },
      relations: { toTeam: true, player: { user: true } },
    });
    const transferFeesPaid = incomingTransfers.reduce(
      (sum, t) => sum + Number(t.fee || 0),
      0,
    );
    const transferFeesReceived = outgoingTransfers.reduce(
      (sum, t) => sum + Number(t.fee || 0),
      0,
    );

    // Salary commitments (season, active contracts)
    const activeContracts = await this.contractRepo.find({
      where: { workspaceId, teamId, season, status: 'active' },
      relations: { player: { user: true } },
    });
    const salaryCommitment = activeContracts.reduce(
      (sum, c) => sum + Number(c.salary || 0),
      0,
    );

    // Manual payments (season-scoped)
    const payments = await this.paymentRepo.find({
      where: { workspaceId, teamId, season },
      relations: { counterpartyTeam: true },
      order: { createdAt: 'DESC' },
    });
    const outgoingPaid = payments
      .filter((p) => p.direction === 'outgoing' && p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const outgoingPending = payments
      .filter(
        (p) =>
          p.direction === 'outgoing' &&
          (p.status === 'pending' || p.status === 'overdue'),
      )
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const incomingPaid = payments
      .filter((p) => p.direction === 'incoming' && p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Category breakdown across payments
    const byCategory: Record<
      string,
      { category: string; outgoing: number; incoming: number; count: number }
    > = {};
    for (const p of payments) {
      const key = p.category;
      if (!byCategory[key]) {
        byCategory[key] = {
          category: key,
          outgoing: 0,
          incoming: 0,
          count: 0,
        };
      }
      const amt = Number(p.amount || 0);
      if (p.direction === 'outgoing') byCategory[key].outgoing += amt;
      else byCategory[key].incoming += amt;
      byCategory[key].count += 1;
    }

    const initialBudget = Number(account?.initialBudget ?? 0);
    const totalOutgoing =
      auctionSpend + transferFeesPaid + outgoingPaid + outgoingPending;
    const totalIncoming = transferFeesReceived + incomingPaid;
    const totalPaidOutgoing = auctionSpend + transferFeesPaid + outgoingPaid;
    const remainingBudget = initialBudget - totalPaidOutgoing + incomingPaid;
    const projectedRemaining = initialBudget - totalOutgoing + totalIncoming;

    return {
      team: { id: team.id, name: team.name, code: team.code || null },
      season,
      currency: account?.currency || 'INR',
      account: account
        ? {
            id: account.id,
            initialBudget: account.initialBudget,
            notes: account.notes,
          }
        : null,
      summary: {
        initialBudget,
        auctionSpend,
        auctionPlayersBought,
        transferFeesPaid,
        transferFeesReceived,
        salaryCommitment,
        outgoingPaid,
        outgoingPending,
        incomingPaid,
        totalOutgoing,
        totalIncoming,
        remainingBudget,
        projectedRemaining,
      },
      auctionWins: auctionWins.map((a) => ({
        id: a.id,
        auctionId: a.auctionId,
        playerName: a.player?.user?.username || 'Unknown',
        soldPrice: a.soldPrice,
        soldAt: a.soldAt,
      })),
      transfers: {
        incoming: incomingTransfers.map((t) => ({
          id: t.id,
          playerName: t.player?.user?.username || 'Unknown',
          fromTeam: t.fromTeam?.name,
          fee: t.fee,
          transferType: t.transferType,
          completedAt: t.completedAt,
        })),
        outgoing: outgoingTransfers.map((t) => ({
          id: t.id,
          playerName: t.player?.user?.username || 'Unknown',
          toTeam: t.toTeam?.name,
          fee: t.fee,
          transferType: t.transferType,
          completedAt: t.completedAt,
        })),
      },
      contracts: activeContracts.map((c) => ({
        id: c.id,
        playerName: c.player?.user?.username || 'Unknown',
        contractType: c.contractType,
        salary: c.salary,
        endDate: c.endDate,
      })),
      payments,
      byCategory: Object.values(byCategory),
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Workspace summary ───────────────────────────────────────────────

  async getWorkspaceSummary(
    workspaceId: string,
    userId: string,
    season?: string,
  ) {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const accountsWhere: any = { workspaceId };
    if (season) accountsWhere.season = season;
    const accounts = await this.accountRepo.find({
      where: accountsWhere,
      relations: { team: true },
    });
    const totalInitialBudget = accounts.reduce(
      (sum, a) => sum + Number(a.initialBudget || 0),
      0,
    );

    const paymentsWhere: any = { workspaceId };
    if (season) paymentsWhere.season = season;
    const payments = await this.paymentRepo.find({ where: paymentsWhere });

    const outgoingPaid = payments
      .filter((p) => p.direction === 'outgoing' && p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const outgoingPending = payments
      .filter(
        (p) =>
          p.direction === 'outgoing' &&
          (p.status === 'pending' || p.status === 'overdue'),
      )
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const incomingPaid = payments
      .filter((p) => p.direction === 'incoming' && p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const overdueCount = payments.filter((p) => p.status === 'overdue').length;

    // Aggregate auction spend across the workspace
    const auctionBudgets = await this.auctionBudgetRepo.find({
      where: { workspaceId },
    });
    const totalAuctionSpend = auctionBudgets.reduce(
      (sum, b) => sum + Number(b.spent || 0),
      0,
    );

    // Total completed transfer fees (workspace-wide)
    const completedTransfers = await this.transferRepo.find({
      where: { workspaceId, status: 'completed' },
    });
    const totalTransferFees = completedTransfers.reduce(
      (sum, t) => sum + Number(t.fee || 0),
      0,
    );

    // Per-team spend leaderboard (top 10 by paid outgoing this season)
    const perTeamMap: Record<
      string,
      {
        teamId: string;
        teamName: string;
        paidOutgoing: number;
        pendingOutgoing: number;
        incoming: number;
      }
    > = {};
    for (const p of payments) {
      const key = p.teamId;
      if (!perTeamMap[key]) {
        const team = accounts.find((a) => a.teamId === p.teamId)?.team;
        perTeamMap[key] = {
          teamId: p.teamId,
          teamName: team?.name || 'Unknown',
          paidOutgoing: 0,
          pendingOutgoing: 0,
          incoming: 0,
        };
      }
      const amt = Number(p.amount || 0);
      if (p.direction === 'outgoing') {
        if (p.status === 'paid') perTeamMap[key].paidOutgoing += amt;
        else if (p.status === 'pending' || p.status === 'overdue')
          perTeamMap[key].pendingOutgoing += amt;
      } else if (p.status === 'paid') {
        perTeamMap[key].incoming += amt;
      }
    }
    const perTeam = Object.values(perTeamMap).sort(
      (a, b) => b.paidOutgoing - a.paidOutgoing,
    );

    return {
      season: season || null,
      accountsCount: accounts.length,
      totalInitialBudget,
      totalAuctionSpend,
      totalTransferFees,
      outgoingPaid,
      outgoingPending,
      incomingPaid,
      overdueCount,
      netCash:
        totalInitialBudget - outgoingPaid - totalAuctionSpend + incomingPaid,
      perTeam: perTeam.slice(0, 20),
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Bulk import helpers ─────────────────────────────────────────────

  /**
   * Materializes completed transfer fees & active contract salaries into
   * Payment ledger entries so they show up in the finance dashboard alongside
   * manual payments. Skips entries that already have a payment referencing
   * the same source id.
   */
  async syncFromSources(
    workspaceId: string,
    season: string,
    userId: string,
  ): Promise<{ createdTransferFees: number; createdSalaries: number }> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    let createdTransferFees = 0;
    let createdSalaries = 0;

    // Completed transfers with non-zero fee
    const transfers = await this.transferRepo.find({
      where: { workspaceId, status: 'completed' },
    });
    for (const t of transfers) {
      const fee = Number(t.fee || 0);
      if (fee <= 0) continue;
      const existingBuy = await this.paymentRepo.findOne({
        where: {
          workspaceId,
          referenceType: 'transfer_request',
          referenceId: t.id,
          teamId: t.toTeamId,
        },
      });
      if (!existingBuy) {
        await this.paymentRepo.save(
          this.paymentRepo.create({
            workspaceId,
            teamId: t.toTeamId,
            counterpartyTeamId: t.fromTeamId,
            season,
            category: 'transfer_fee',
            direction: 'outgoing',
            amount: String(fee),
            currency: t.currency,
            status: 'paid',
            paidAt: t.completedAt || new Date(),
            referenceType: 'transfer_request',
            referenceId: t.id,
            description: `Transfer fee (buyer) — request ${t.id.slice(0, 8)}`,
            recordedById: userId,
          }),
        );
        createdTransferFees += 1;
      }
      const existingSell = await this.paymentRepo.findOne({
        where: {
          workspaceId,
          referenceType: 'transfer_request',
          referenceId: t.id,
          teamId: t.fromTeamId,
        },
      });
      if (!existingSell) {
        await this.paymentRepo.save(
          this.paymentRepo.create({
            workspaceId,
            teamId: t.fromTeamId,
            counterpartyTeamId: t.toTeamId,
            season,
            category: 'transfer_fee',
            direction: 'incoming',
            amount: String(fee),
            currency: t.currency,
            status: 'paid',
            paidAt: t.completedAt || new Date(),
            referenceType: 'transfer_request',
            referenceId: t.id,
            description: `Transfer fee (seller) — request ${t.id.slice(0, 8)}`,
            recordedById: userId,
          }),
        );
        createdTransferFees += 1;
      }
    }

    // Salary commitments for active season contracts
    const contracts = await this.contractRepo.find({
      where: { workspaceId, season, status: 'active' },
    });
    for (const c of contracts) {
      const salary = Number(c.salary || 0);
      if (salary <= 0) continue;
      const existing = await this.paymentRepo.findOne({
        where: {
          workspaceId,
          referenceType: 'contract',
          referenceId: c.id,
        },
      });
      if (existing) continue;
      await this.paymentRepo.save(
        this.paymentRepo.create({
          workspaceId,
          teamId: c.teamId,
          season,
          category: 'salary',
          direction: 'outgoing',
          amount: String(salary),
          currency: c.currency,
          status: 'pending',
          dueDate: c.endDate,
          referenceType: 'contract',
          referenceId: c.id,
          description: `Salary commitment — contract ${c.id.slice(0, 8)}`,
          recordedById: userId,
        }),
      );
      createdSalaries += 1;
    }

    return { createdTransferFees, createdSalaries };
  }
}
