import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Auction } from './entities/auction.entity';
import { AuctionCategory } from './entities/auction-category.entity';
import { AuctionPlayer } from './entities/auction-player.entity';
import { AuctionBid } from './entities/auction-bid.entity';
import { AuctionTeamBudget } from './entities/auction-team-budget.entity';
import { Player } from '../players/entities/player.entity';
import { Team } from '../teams/entities/team.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateAuctionDto, UpdateAuctionDto } from './dto/create-auction.dto';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/create-category.dto';
import {
  RegisterPlayersDto,
  UpdateAuctionPlayerDto,
} from './dto/register-players.dto';
import { PlaceBidDto, StartBiddingDto } from './dto/place-bid.dto';
import { UpsertTeamBudgetDto } from './dto/team-budget.dto';

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepo: Repository<Auction>,
    @InjectRepository(AuctionCategory)
    private readonly categoryRepo: Repository<AuctionCategory>,
    @InjectRepository(AuctionPlayer)
    private readonly auctionPlayerRepo: Repository<AuctionPlayer>,
    @InjectRepository(AuctionBid)
    private readonly bidRepo: Repository<AuctionBid>,
    @InjectRepository(AuctionTeamBudget)
    private readonly budgetRepo: Repository<AuctionTeamBudget>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Auctions ────────────────────────────────────────────────────────────

  async getAuctions(workspaceId: string, userId: string): Promise<Auction[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.auctionRepo.find({
      where: { workspaceId },
      relations: { event: true, competition: true, createdBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getAuctionById(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<Auction> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const auction = await this.auctionRepo.findOne({
      where: { id, workspaceId },
      relations: {
        event: true,
        competition: true,
        categories: true,
        players: {
          player: { user: true, team: true },
          category: true,
          soldToTeam: true,
        },
        teamBudgets: { team: true },
        createdBy: true,
      },
      order: {
        categories: { orderIndex: 'ASC' } as any,
        players: { orderIndex: 'ASC' } as any,
      },
    });
    if (!auction) throw new NotFoundException('Auction not found');
    return auction;
  }

  async createAuction(
    workspaceId: string,
    dto: CreateAuctionDto,
    userId: string,
  ): Promise<Auction> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const auction = this.auctionRepo.create({
      workspaceId,
      eventId: dto.eventId || null,
      competitionId: dto.competitionId || null,
      name: dto.name,
      description: dto.description || null,
      currency: dto.currency || 'INR',
      budgetPerTeam: String(dto.budgetPerTeam ?? 0),
      bidIncrement: dto.bidIncrement ?? 100,
      bidWindowSec: dto.bidWindowSec ?? 30,
      scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : null,
      status: 'draft',
      createdById: userId,
    });
    const saved = await this.auctionRepo.save(auction);
    return this.getAuctionById(workspaceId, saved.id, userId);
  }

  async updateAuction(
    workspaceId: string,
    id: string,
    dto: UpdateAuctionDto,
    userId: string,
  ): Promise<Auction> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const auction = await this.auctionRepo.findOne({
      where: { id, workspaceId },
    });
    if (!auction) throw new NotFoundException('Auction not found');

    Object.assign(auction, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.eventId !== undefined && { eventId: dto.eventId }),
      ...(dto.competitionId !== undefined && {
        competitionId: dto.competitionId,
      }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.budgetPerTeam !== undefined && {
        budgetPerTeam: String(dto.budgetPerTeam),
      }),
      ...(dto.bidIncrement !== undefined && {
        bidIncrement: dto.bidIncrement,
      }),
      ...(dto.bidWindowSec !== undefined && {
        bidWindowSec: dto.bidWindowSec,
      }),
      ...(dto.scheduledStart !== undefined && {
        scheduledStart: dto.scheduledStart
          ? new Date(dto.scheduledStart)
          : null,
      }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
    if (dto.status === 'live' && !auction.actualStart) {
      auction.actualStart = new Date();
    }
    if (dto.status === 'completed' && !auction.endedAt) {
      auction.endedAt = new Date();
    }
    await this.auctionRepo.save(auction);
    return this.getAuctionById(workspaceId, auction.id, userId);
  }

  async deleteAuction(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const auction = await this.auctionRepo.findOne({
      where: { id, workspaceId },
    });
    if (!auction) throw new NotFoundException('Auction not found');
    await this.auctionRepo.remove(auction);
  }

  // ─── Categories ──────────────────────────────────────────────────────────

  async createCategory(
    workspaceId: string,
    auctionId: string,
    dto: CreateCategoryDto,
    userId: string,
  ): Promise<AuctionCategory> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    await this.ensureAuction(workspaceId, auctionId);
    const cat = this.categoryRepo.create({
      workspaceId,
      auctionId,
      name: dto.name,
      description: dto.description || null,
      basePrice: String(dto.basePrice ?? 0),
      orderIndex: dto.orderIndex ?? 0,
      color: dto.color || null,
    });
    return this.categoryRepo.save(cat);
  }

  async updateCategory(
    workspaceId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
    userId: string,
  ): Promise<AuctionCategory> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const cat = await this.categoryRepo.findOne({
      where: { id: categoryId, workspaceId },
    });
    if (!cat) throw new NotFoundException('Category not found');
    Object.assign(cat, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.basePrice !== undefined && {
        basePrice: String(dto.basePrice),
      }),
      ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
      ...(dto.color !== undefined && { color: dto.color }),
    });
    return this.categoryRepo.save(cat);
  }

  async deleteCategory(
    workspaceId: string,
    categoryId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const cat = await this.categoryRepo.findOne({
      where: { id: categoryId, workspaceId },
    });
    if (!cat) throw new NotFoundException('Category not found');
    await this.categoryRepo.remove(cat);
  }

  // ─── Players ─────────────────────────────────────────────────────────────

  async registerPlayers(
    workspaceId: string,
    auctionId: string,
    dto: RegisterPlayersDto,
    userId: string,
  ): Promise<AuctionPlayer[]> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    await this.ensureAuction(workspaceId, auctionId);

    const playerIds = dto.players.map((p) => p.playerId);
    const found = await this.playerRepo.find({
      where: { id: In(playerIds), workspaceId },
    });
    if (found.length !== playerIds.length) {
      throw new BadRequestException(
        'One or more players not found in this workspace',
      );
    }

    const existing = await this.auctionPlayerRepo.find({
      where: { auctionId, playerId: In(playerIds) },
    });
    const existingIds = new Set(existing.map((e) => e.playerId));

    const toCreate = dto.players
      .filter((p) => !existingIds.has(p.playerId))
      .map((p) =>
        this.auctionPlayerRepo.create({
          workspaceId,
          auctionId,
          playerId: p.playerId,
          categoryId: p.categoryId || null,
          customBasePrice:
            p.customBasePrice != null ? String(p.customBasePrice) : null,
          orderIndex: p.orderIndex ?? 0,
          status: 'available',
          notes: p.notes || null,
        }),
      );
    return this.auctionPlayerRepo.save(toCreate);
  }

  async updateAuctionPlayer(
    workspaceId: string,
    auctionPlayerId: string,
    dto: UpdateAuctionPlayerDto,
    userId: string,
  ): Promise<AuctionPlayer> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const ap = await this.auctionPlayerRepo.findOne({
      where: { id: auctionPlayerId, workspaceId },
    });
    if (!ap) throw new NotFoundException('Auction player not found');
    if (ap.status === 'sold') {
      throw new ConflictException('Cannot modify a sold auction player');
    }
    Object.assign(ap, {
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      ...(dto.customBasePrice !== undefined && {
        customBasePrice:
          dto.customBasePrice != null ? String(dto.customBasePrice) : null,
      }),
      ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });
    return this.auctionPlayerRepo.save(ap);
  }

  async removeAuctionPlayer(
    workspaceId: string,
    auctionPlayerId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const ap = await this.auctionPlayerRepo.findOne({
      where: { id: auctionPlayerId, workspaceId },
    });
    if (!ap) throw new NotFoundException('Auction player not found');
    if (ap.status === 'sold') {
      throw new ConflictException('Cannot remove a sold auction player');
    }
    await this.auctionPlayerRepo.remove(ap);
  }

  // ─── Team Budgets ────────────────────────────────────────────────────────

  async upsertTeamBudget(
    workspaceId: string,
    auctionId: string,
    dto: UpsertTeamBudgetDto,
    userId: string,
  ): Promise<AuctionTeamBudget> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const auction = await this.ensureAuction(workspaceId, auctionId);
    const team = await this.teamRepo.findOne({
      where: { id: dto.teamId, workspaceId },
    });
    if (!team) throw new NotFoundException('Team not found in this workspace');

    let budget = await this.budgetRepo.findOne({
      where: { auctionId, teamId: dto.teamId },
    });
    const initial = String(dto.initialBudget ?? auction.budgetPerTeam);
    if (budget) {
      budget.initialBudget = initial;
    } else {
      budget = this.budgetRepo.create({
        workspaceId,
        auctionId,
        teamId: dto.teamId,
        initialBudget: initial,
        spent: '0',
        playersBought: 0,
      });
    }
    return this.budgetRepo.save(budget);
  }

  async removeTeamBudget(
    workspaceId: string,
    budgetId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const b = await this.budgetRepo.findOne({
      where: { id: budgetId, workspaceId },
    });
    if (!b) throw new NotFoundException('Budget entry not found');
    if (Number(b.spent) > 0) {
      throw new ConflictException(
        'Cannot remove a team budget that already has purchases',
      );
    }
    await this.budgetRepo.remove(b);
  }

  // ─── Bidding Lifecycle ───────────────────────────────────────────────────

  async startBidding(
    workspaceId: string,
    auctionId: string,
    dto: StartBiddingDto,
    userId: string,
  ): Promise<Auction> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const auction = await this.ensureAuction(workspaceId, auctionId);
    if (auction.status !== 'live') {
      throw new ConflictException(
        `Auction must be live to start bidding (current status: ${auction.status})`,
      );
    }
    if (auction.currentPlayerId) {
      throw new ConflictException(
        'Another player is already in bidding. Close their round first.',
      );
    }
    const ap = await this.auctionPlayerRepo.findOne({
      where: { id: dto.auctionPlayerId, auctionId, workspaceId },
    });
    if (!ap) throw new NotFoundException('Auction player not found');
    if (ap.status !== 'available') {
      throw new ConflictException(
        `Player is not available for bidding (status: ${ap.status})`,
      );
    }

    ap.status = 'in_bidding';
    await this.auctionPlayerRepo.save(ap);

    auction.currentPlayerId = ap.id;
    auction.currentRoundEndsAt = new Date(
      Date.now() + auction.bidWindowSec * 1000,
    );
    await this.auctionRepo.save(auction);

    return this.getAuctionById(workspaceId, auction.id, userId);
  }

  async placeBid(
    workspaceId: string,
    auctionId: string,
    dto: PlaceBidDto,
    userId: string,
  ): Promise<AuctionBid> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const auction = await this.ensureAuction(workspaceId, auctionId);
    if (auction.status !== 'live') {
      throw new ConflictException('Auction is not live');
    }
    if (!auction.currentPlayerId) {
      throw new ConflictException('No player is currently in bidding');
    }
    const ap = await this.auctionPlayerRepo.findOne({
      where: {
        id: auction.currentPlayerId,
        auctionId,
        workspaceId,
      },
    });
    if (!ap || ap.status !== 'in_bidding') {
      throw new ConflictException('Current player is not accepting bids');
    }

    // Get current highest bid
    const currentWinning = await this.bidRepo.findOne({
      where: { auctionPlayerId: ap.id, status: 'winning' },
      order: { amount: 'DESC' },
    });
    const basePrice = Number(
      ap.customBasePrice ??
        (
          await this.categoryRepo.findOne({
            where: { id: ap.categoryId || '' },
          })
        )?.basePrice ??
        0,
    );

    const minAmount = currentWinning
      ? Number(currentWinning.amount) + auction.bidIncrement
      : Math.max(basePrice, auction.bidIncrement);
    if (dto.amount < minAmount) {
      throw new BadRequestException(
        `Bid must be at least ${minAmount} (current: ${
          currentWinning ? Number(currentWinning.amount) : basePrice
        } + increment ${auction.bidIncrement})`,
      );
    }

    // Verify team budget
    const budget = await this.budgetRepo.findOne({
      where: { auctionId, teamId: dto.teamId },
    });
    if (!budget) {
      throw new BadRequestException(
        'Team does not have a budget registered for this auction',
      );
    }
    const remaining = Number(budget.initialBudget) - Number(budget.spent);
    if (dto.amount > remaining) {
      throw new BadRequestException(
        `Bid exceeds team's remaining budget of ${remaining}`,
      );
    }

    // Mark previous winning bid as outbid
    if (currentWinning) {
      currentWinning.status = 'outbid';
      await this.bidRepo.save(currentWinning);
    }

    const bid = this.bidRepo.create({
      workspaceId,
      auctionId,
      auctionPlayerId: ap.id,
      teamId: dto.teamId,
      amount: String(dto.amount),
      status: 'winning',
      placedAt: new Date(),
      placedById: userId,
    });
    const saved = await this.bidRepo.save(bid);

    // Extend round window on new bid so late bids don't get cut off
    auction.currentRoundEndsAt = new Date(
      Date.now() + auction.bidWindowSec * 1000,
    );
    await this.auctionRepo.save(auction);

    return saved;
  }

  /**
   * Close the current bidding round — auto-assigns the player to the highest
   * bidder, or marks unsold if no bids were placed.
   */
  async closeBidding(
    workspaceId: string,
    auctionId: string,
    userId: string,
  ): Promise<AuctionPlayer> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const auction = await this.ensureAuction(workspaceId, auctionId);
    if (!auction.currentPlayerId) {
      throw new ConflictException('No player is currently in bidding');
    }

    const ap = await this.auctionPlayerRepo.findOne({
      where: {
        id: auction.currentPlayerId,
        auctionId,
        workspaceId,
      },
    });
    if (!ap) throw new NotFoundException('Auction player not found');

    const winning = await this.bidRepo.findOne({
      where: { auctionPlayerId: ap.id, status: 'winning' },
    });

    if (winning) {
      ap.status = 'sold';
      ap.soldToTeamId = winning.teamId;
      ap.soldPrice = winning.amount;
      ap.soldAt = new Date();

      // Update team budget
      const budget = await this.budgetRepo.findOne({
        where: { auctionId, teamId: winning.teamId },
      });
      if (budget) {
        budget.spent = String(Number(budget.spent) + Number(winning.amount));
        budget.playersBought += 1;
        await this.budgetRepo.save(budget);
      }
    } else {
      ap.status = 'unsold';
    }
    await this.auctionPlayerRepo.save(ap);

    auction.currentPlayerId = null;
    auction.currentRoundEndsAt = null;
    await this.auctionRepo.save(auction);

    return this.auctionPlayerRepo.findOne({
      where: { id: ap.id },
      relations: {
        player: { user: true, team: true },
        soldToTeam: true,
        category: true,
      },
    }) as Promise<AuctionPlayer>;
  }

  async cancelCurrentRound(
    workspaceId: string,
    auctionId: string,
    userId: string,
  ): Promise<Auction> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const auction = await this.ensureAuction(workspaceId, auctionId);
    if (!auction.currentPlayerId) {
      throw new ConflictException('No player is currently in bidding');
    }
    const ap = await this.auctionPlayerRepo.findOne({
      where: { id: auction.currentPlayerId, auctionId },
    });
    if (ap && ap.status === 'in_bidding') {
      ap.status = 'available';
      await this.auctionPlayerRepo.save(ap);
      // Withdraw all bids on this player
      await this.bidRepo.update(
        { auctionPlayerId: ap.id, status: In(['winning', 'active']) },
        { status: 'withdrawn' },
      );
    }
    auction.currentPlayerId = null;
    auction.currentRoundEndsAt = null;
    await this.auctionRepo.save(auction);
    return this.getAuctionById(workspaceId, auction.id, userId);
  }

  // ─── Live status polling ─────────────────────────────────────────────────

  async getLiveStatus(workspaceId: string, auctionId: string, userId: string) {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId, workspaceId },
    });
    if (!auction) throw new NotFoundException('Auction not found');

    let currentPlayer: AuctionPlayer | null = null;
    let bids: AuctionBid[] = [];

    if (auction.currentPlayerId) {
      currentPlayer = await this.auctionPlayerRepo.findOne({
        where: { id: auction.currentPlayerId },
        relations: {
          player: { user: true, team: true },
          category: true,
        },
      });
      bids = await this.bidRepo.find({
        where: { auctionPlayerId: auction.currentPlayerId },
        relations: { team: true, placedBy: true },
        order: { placedAt: 'DESC' },
        take: 30,
      });
    }

    const teamBudgets = await this.budgetRepo.find({
      where: { auctionId },
      relations: { team: true },
    });

    return {
      auction: {
        id: auction.id,
        status: auction.status,
        currency: auction.currency,
        bidIncrement: auction.bidIncrement,
        bidWindowSec: auction.bidWindowSec,
        currentPlayerId: auction.currentPlayerId,
        currentRoundEndsAt: auction.currentRoundEndsAt,
        budgetPerTeam: auction.budgetPerTeam,
      },
      currentPlayer,
      bids,
      teamBudgets: teamBudgets.map((b) => ({
        id: b.id,
        teamId: b.teamId,
        teamName: b.team?.name,
        initialBudget: b.initialBudget,
        spent: b.spent,
        remaining: String(Number(b.initialBudget) - Number(b.spent)),
        playersBought: b.playersBought,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Summary / Report ────────────────────────────────────────────────────

  async getSummary(workspaceId: string, auctionId: string, userId: string) {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const auction = await this.getAuctionById(workspaceId, auctionId, userId);

    const totalPlayers = auction.players?.length ?? 0;
    const sold = auction.players?.filter((p) => p.status === 'sold') ?? [];
    const unsold = auction.players?.filter((p) => p.status === 'unsold') ?? [];
    const remaining =
      auction.players?.filter((p) => p.status === 'available') ?? [];

    const totalSpend = sold.reduce(
      (sum, p) => sum + Number(p.soldPrice ?? 0),
      0,
    );
    const avgPrice = sold.length > 0 ? Math.round(totalSpend / sold.length) : 0;

    // Highest-priced player
    let topPlayer: AuctionPlayer | null = null;
    for (const p of sold) {
      if (
        !topPlayer ||
        Number(p.soldPrice ?? 0) > Number(topPlayer.soldPrice ?? 0)
      ) {
        topPlayer = p;
      }
    }

    // Per-team breakdown
    const perTeam: Record<
      string,
      { teamId: string; teamName: string; count: number; spent: number }
    > = {};
    for (const p of sold) {
      const key = p.soldToTeamId || 'unknown';
      if (!perTeam[key]) {
        perTeam[key] = {
          teamId: key,
          teamName: p.soldToTeam?.name || 'Unknown',
          count: 0,
          spent: 0,
        };
      }
      perTeam[key].count += 1;
      perTeam[key].spent += Number(p.soldPrice ?? 0);
    }

    // Per-category breakdown
    const perCategory: Record<
      string,
      {
        categoryId: string;
        name: string;
        soldCount: number;
        unsoldCount: number;
        spent: number;
      }
    > = {};
    for (const p of auction.players || []) {
      const key = p.categoryId || 'uncategorized';
      const name = p.category?.name || 'Uncategorized';
      if (!perCategory[key]) {
        perCategory[key] = {
          categoryId: key,
          name,
          soldCount: 0,
          unsoldCount: 0,
          spent: 0,
        };
      }
      if (p.status === 'sold') {
        perCategory[key].soldCount += 1;
        perCategory[key].spent += Number(p.soldPrice ?? 0);
      } else if (p.status === 'unsold') {
        perCategory[key].unsoldCount += 1;
      }
    }

    return {
      auctionId,
      status: auction.status,
      currency: auction.currency,
      totalPlayers,
      soldCount: sold.length,
      unsoldCount: unsold.length,
      remainingCount: remaining.length,
      totalSpend,
      avgPrice,
      topPlayer: topPlayer
        ? {
            id: topPlayer.id,
            playerName: topPlayer.player?.user?.username || 'Unknown',
            soldToTeam: topPlayer.soldToTeam?.name,
            soldPrice: topPlayer.soldPrice,
          }
        : null,
      perTeam: Object.values(perTeam).sort((a, b) => b.spent - a.spent),
      perCategory: Object.values(perCategory),
      generatedAt: new Date().toISOString(),
    };
  }

  async getWorkspaceSummary(workspaceId: string, userId: string) {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const [total, draft, live, completed] = await Promise.all([
      this.auctionRepo.count({ where: { workspaceId } }),
      this.auctionRepo.count({ where: { workspaceId, status: 'draft' } }),
      this.auctionRepo.count({ where: { workspaceId, status: 'live' } }),
      this.auctionRepo.count({
        where: { workspaceId, status: 'completed' },
      }),
    ]);
    return {
      total,
      draft,
      live,
      completed,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async ensureAuction(
    workspaceId: string,
    auctionId: string,
  ): Promise<Auction> {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId, workspaceId },
    });
    if (!auction) throw new NotFoundException('Auction not found');
    return auction;
  }
}
