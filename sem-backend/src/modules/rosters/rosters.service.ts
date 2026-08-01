import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RosterConfig } from './entities/roster-config.entity';
import {
  PlayerContract,
  ContractStatus,
} from './entities/player-contract.entity';
import { RosterRelease } from './entities/roster-release.entity';
import { Player } from '../players/entities/player.entity';
import { Team } from '../teams/entities/team.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { UpsertRosterConfigDto } from './dto/roster-config.dto';
import {
  CreateContractDto,
  UpdateContractDto,
} from './dto/create-contract.dto';
import {
  CarryForwardDto,
  CheckEligibilityDto,
  ReleasePlayerDto,
  ReplacePlayerDto,
} from './dto/release.dto';

export interface EligibilityReason {
  rule: string;
  message: string;
  severity: 'blocker' | 'warning';
}

@Injectable()
export class RostersService {
  constructor(
    @InjectRepository(RosterConfig)
    private readonly configRepo: Repository<RosterConfig>,
    @InjectRepository(PlayerContract)
    private readonly contractRepo: Repository<PlayerContract>,
    @InjectRepository(RosterRelease)
    private readonly releaseRepo: Repository<RosterRelease>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Roster configs ──────────────────────────────────────────────────

  async getConfigs(
    workspaceId: string,
    userId: string,
    filter: { teamId?: string; season?: string } = {},
  ): Promise<RosterConfig[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const where: any = { workspaceId };
    if (filter.teamId) where.teamId = filter.teamId;
    if (filter.season) where.season = filter.season;
    return this.configRepo.find({
      where,
      relations: { team: true },
      order: { season: 'DESC' },
    });
  }

  async upsertConfig(
    workspaceId: string,
    teamId: string,
    dto: UpsertRosterConfigDto,
    userId: string,
  ): Promise<RosterConfig> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const team = await this.teamRepo.findOne({
      where: { id: teamId, workspaceId },
    });
    if (!team) throw new NotFoundException('Team not found');

    let cfg = await this.configRepo.findOne({
      where: { workspaceId, teamId, season: dto.season },
    });
    if (cfg) {
      Object.assign(cfg, {
        ...(dto.maxSquadSize !== undefined && {
          maxSquadSize: dto.maxSquadSize,
        }),
        ...(dto.maxForeignPlayers !== undefined && {
          maxForeignPlayers: dto.maxForeignPlayers,
        }),
        ...(dto.minStarters !== undefined && { minStarters: dto.minStarters }),
        ...(dto.maxSubstitutes !== undefined && {
          maxSubstitutes: dto.maxSubstitutes,
        }),
        ...(dto.positionRules !== undefined && {
          positionRules: dto.positionRules,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      });
    } else {
      cfg = this.configRepo.create({
        workspaceId,
        teamId,
        season: dto.season,
        maxSquadSize: dto.maxSquadSize ?? 25,
        maxForeignPlayers: dto.maxForeignPlayers ?? null,
        minStarters: dto.minStarters ?? null,
        maxSubstitutes: dto.maxSubstitutes ?? null,
        positionRules: dto.positionRules ?? null,
        notes: dto.notes || null,
      });
    }
    return this.configRepo.save(cfg);
  }

  async deleteConfig(
    workspaceId: string,
    configId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const cfg = await this.configRepo.findOne({
      where: { id: configId, workspaceId },
    });
    if (!cfg) throw new NotFoundException('Roster config not found');
    await this.configRepo.remove(cfg);
  }

  // ─── Contracts ───────────────────────────────────────────────────────

  async getContracts(
    workspaceId: string,
    userId: string,
    filter: {
      teamId?: string;
      playerId?: string;
      season?: string;
      status?: ContractStatus;
    } = {},
  ): Promise<PlayerContract[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const where: any = { workspaceId };
    if (filter.teamId) where.teamId = filter.teamId;
    if (filter.playerId) where.playerId = filter.playerId;
    if (filter.season) where.season = filter.season;
    if (filter.status) where.status = filter.status;
    return this.contractRepo.find({
      where,
      relations: {
        player: { user: true },
        team: true,
      },
      order: { season: 'DESC', createdAt: 'DESC' },
    });
  }

  async createContract(
    workspaceId: string,
    dto: CreateContractDto,
    userId: string,
  ): Promise<PlayerContract> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const player = await this.playerRepo.findOne({
      where: { id: dto.playerId, workspaceId },
    });
    if (!player) throw new NotFoundException('Player not found');

    const team = await this.teamRepo.findOne({
      where: { id: dto.teamId, workspaceId },
    });
    if (!team) throw new NotFoundException('Team not found');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    // Enforce squad-size cap
    await this.enforceSquadRules(workspaceId, dto.teamId, dto.season, {
      addingContract: true,
      contractType: dto.contractType || 'full_time',
      isForeign: dto.isForeign ?? false,
      registrationNumber: dto.registrationNumber || null,
      excludeContractId: null,
    });

    const contract = this.contractRepo.create({
      workspaceId,
      playerId: dto.playerId,
      teamId: dto.teamId,
      season: dto.season,
      contractType: dto.contractType || 'full_time',
      startDate: start,
      endDate: end,
      salary: String(dto.salary ?? 0),
      currency: dto.currency || 'INR',
      jerseyNumber: dto.jerseyNumber || null,
      registrationNumber: dto.registrationNumber || null,
      isForeign: dto.isForeign ?? false,
      status: 'active',
      notes: dto.notes || null,
    });
    return this.contractRepo.save(contract);
  }

  async updateContract(
    workspaceId: string,
    contractId: string,
    dto: UpdateContractDto,
    userId: string,
  ): Promise<PlayerContract> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const c = await this.contractRepo.findOne({
      where: { id: contractId, workspaceId },
    });
    if (!c) throw new NotFoundException('Contract not found');

    if (dto.startDate && dto.endDate) {
      const s = new Date(dto.startDate);
      const e = new Date(dto.endDate);
      if (e <= s)
        throw new BadRequestException('endDate must be after startDate');
    }

    // If flipping foreign / registration / status back to active, re-check squad
    if (
      (dto.isForeign !== undefined && dto.isForeign !== c.isForeign) ||
      (dto.status === 'active' && c.status !== 'active') ||
      dto.registrationNumber !== undefined
    ) {
      await this.enforceSquadRules(workspaceId, c.teamId, c.season, {
        addingContract: dto.status === 'active' && c.status !== 'active',
        contractType: c.contractType,
        isForeign: dto.isForeign ?? c.isForeign,
        registrationNumber:
          dto.registrationNumber !== undefined
            ? dto.registrationNumber
            : c.registrationNumber,
        excludeContractId: c.id,
      });
    }

    Object.assign(c, {
      ...(dto.contractType !== undefined && { contractType: dto.contractType }),
      ...(dto.startDate !== undefined && {
        startDate: new Date(dto.startDate),
      }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      ...(dto.salary !== undefined && { salary: String(dto.salary) }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.jerseyNumber !== undefined && { jerseyNumber: dto.jerseyNumber }),
      ...(dto.registrationNumber !== undefined && {
        registrationNumber: dto.registrationNumber,
      }),
      ...(dto.isForeign !== undefined && { isForeign: dto.isForeign }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.suspensionReason !== undefined && {
        suspensionReason: dto.suspensionReason,
      }),
      ...(dto.suspensionEndsAt !== undefined && {
        suspensionEndsAt: dto.suspensionEndsAt
          ? new Date(dto.suspensionEndsAt)
          : null,
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });
    return this.contractRepo.save(c);
  }

  async deleteContract(
    workspaceId: string,
    contractId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const c = await this.contractRepo.findOne({
      where: { id: contractId, workspaceId },
    });
    if (!c) throw new NotFoundException('Contract not found');
    await this.contractRepo.remove(c);
  }

  private async enforceSquadRules(
    workspaceId: string,
    teamId: string,
    season: string,
    ctx: {
      addingContract: boolean;
      contractType: string;
      isForeign: boolean;
      registrationNumber: string | null;
      excludeContractId: string | null;
    },
  ) {
    const cfg = await this.configRepo.findOne({
      where: { workspaceId, teamId, season },
    });
    if (!cfg) return;

    const activeContracts = await this.contractRepo.find({
      where: { workspaceId, teamId, season, status: 'active' },
    });
    const others = ctx.excludeContractId
      ? activeContracts.filter((c) => c.id !== ctx.excludeContractId)
      : activeContracts;

    const projected = ctx.addingContract ? others.length + 1 : others.length;
    if (cfg.maxSquadSize && projected > cfg.maxSquadSize) {
      throw new BadRequestException(
        `Squad size would exceed the cap of ${cfg.maxSquadSize}`,
      );
    }
    if (cfg.maxForeignPlayers != null && ctx.isForeign) {
      const foreignCount = others.filter((c) => c.isForeign).length;
      const projFor = ctx.addingContract ? foreignCount + 1 : foreignCount;
      if (projFor > cfg.maxForeignPlayers) {
        throw new BadRequestException(
          `Foreign player count would exceed the cap of ${cfg.maxForeignPlayers}`,
        );
      }
    }
    // Registration number uniqueness within season
    if (ctx.registrationNumber) {
      const dup = await this.contractRepo.findOne({
        where: {
          workspaceId,
          season,
          registrationNumber: ctx.registrationNumber,
        },
      });
      if (dup && dup.id !== ctx.excludeContractId) {
        throw new ConflictException(
          `Registration number ${ctx.registrationNumber} is already used in season ${season}`,
        );
      }
    }
  }

  // ─── Release / replace ───────────────────────────────────────────────

  async releasePlayer(
    workspaceId: string,
    teamId: string,
    dto: ReleasePlayerDto,
    userId: string,
  ): Promise<RosterRelease> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const player = await this.playerRepo.findOne({
      where: { id: dto.playerId, workspaceId },
    });
    if (!player) throw new NotFoundException('Player not found');

    // Terminate any active contracts for this player on this team (in-season)
    const where: any = {
      workspaceId,
      teamId,
      playerId: dto.playerId,
      status: 'active',
    };
    if (dto.season) where.season = dto.season;
    const activeContracts = await this.contractRepo.find({ where });
    for (const c of activeContracts) {
      c.status = 'terminated';
      c.endDate = new Date();
    }
    if (activeContracts.length > 0) {
      await this.contractRepo.save(activeContracts);
    }

    const release = this.releaseRepo.create({
      workspaceId,
      teamId,
      playerId: dto.playerId,
      kind: 'release',
      releasedAt: new Date(),
      reason: dto.reason || null,
      season: dto.season || null,
      performedById: userId,
    });
    return this.releaseRepo.save(release);
  }

  async replacePlayer(
    workspaceId: string,
    dto: ReplacePlayerDto,
    userId: string,
  ): Promise<{ release: RosterRelease; newContract: PlayerContract }> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    // First release the outgoing player (terminates their in-season contracts)
    const release = await this.releasePlayer(
      workspaceId,
      dto.teamId,
      {
        playerId: dto.outgoingPlayerId,
        reason: dto.reason,
        season: dto.season,
      },
      userId,
    );
    // Mark this release as a replacement, linked to the incoming player
    release.kind = 'replace';
    release.replacementPlayerId = dto.incomingPlayerId;
    await this.releaseRepo.save(release);

    // Create the new contract for the incoming player (subject to squad rules)
    const newContract = await this.createContract(
      workspaceId,
      {
        playerId: dto.incomingPlayerId,
        teamId: dto.teamId,
        season: dto.season,
        startDate: dto.contractStartDate,
        endDate: dto.contractEndDate,
        salary: dto.salary,
        jerseyNumber: dto.jerseyNumber,
      },
      userId,
    );

    return { release, newContract };
  }

  async getReleases(
    workspaceId: string,
    userId: string,
    filter: { teamId?: string; playerId?: string } = {},
  ): Promise<RosterRelease[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const where: any = { workspaceId };
    if (filter.teamId) where.teamId = filter.teamId;
    if (filter.playerId) where.playerId = filter.playerId;
    return this.releaseRepo.find({
      where,
      relations: {
        team: true,
        player: { user: true },
        replacementPlayer: { user: true },
        performedBy: true,
      },
      order: { releasedAt: 'DESC' },
    });
  }

  // ─── Roster view ─────────────────────────────────────────────────────

  async getTeamRoster(
    workspaceId: string,
    teamId: string,
    season: string,
    userId: string,
  ) {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const team = await this.teamRepo.findOne({
      where: { id: teamId, workspaceId },
    });
    if (!team) throw new NotFoundException('Team not found');

    const [config, contracts] = await Promise.all([
      this.configRepo.findOne({
        where: { workspaceId, teamId, season },
      }),
      this.contractRepo.find({
        where: { workspaceId, teamId, season },
        relations: { player: { user: true } },
        order: { status: 'ASC', jerseyNumber: 'ASC' },
      }),
    ]);

    const active = contracts.filter((c) => c.status === 'active');
    const foreignActive = active.filter((c) => c.isForeign);

    return {
      team: { id: team.id, name: team.name, code: team.code || null },
      season,
      config,
      contracts,
      activeCount: active.length,
      foreignCount: foreignActive.length,
      remainingSlots: config
        ? Math.max(0, config.maxSquadSize - active.length)
        : null,
      remainingForeignSlots: config?.maxForeignPlayers
        ? Math.max(0, config.maxForeignPlayers - foreignActive.length)
        : null,
    };
  }

  // ─── Eligibility ─────────────────────────────────────────────────────

  async checkEligibility(
    workspaceId: string,
    dto: CheckEligibilityDto,
    userId: string,
  ) {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const player = await this.playerRepo.findOne({
      where: { id: dto.playerId, workspaceId },
      relations: { user: true, team: true },
    });
    if (!player) throw new NotFoundException('Player not found');

    const teamId = dto.teamId || player.teamId;
    const at = dto.matchDate ? new Date(dto.matchDate) : new Date();

    const contract = await this.contractRepo.findOne({
      where: {
        workspaceId,
        playerId: dto.playerId,
        teamId,
        season: dto.season,
      },
      order: { createdAt: 'DESC' },
    });

    const reasons: EligibilityReason[] = [];

    if (!contract) {
      reasons.push({
        rule: 'no_contract',
        severity: 'blocker',
        message: `Player has no contract for team in season ${dto.season}`,
      });
      return this.buildEligibilityResult(player, teamId, dto.season, reasons);
    }

    if (contract.status === 'terminated') {
      reasons.push({
        rule: 'contract_terminated',
        severity: 'blocker',
        message: 'Contract is terminated',
      });
    }
    if (contract.status === 'expired') {
      reasons.push({
        rule: 'contract_expired',
        severity: 'blocker',
        message: 'Contract is expired',
      });
    }
    if (contract.status === 'suspended') {
      reasons.push({
        rule: 'contract_suspended',
        severity: 'blocker',
        message: contract.suspensionReason
          ? `Suspended: ${contract.suspensionReason}`
          : 'Player is suspended',
      });
      if (contract.suspensionEndsAt && at >= contract.suspensionEndsAt) {
        // Auto-lift expired suspension: warning, not blocker
        reasons.pop();
        reasons.push({
          rule: 'suspension_ended',
          severity: 'warning',
          message:
            'Suspension end date has passed; consider reactivating contract',
        });
      }
    }

    if (contract.startDate && at < contract.startDate) {
      reasons.push({
        rule: 'contract_not_yet_started',
        severity: 'blocker',
        message: `Contract starts on ${contract.startDate.toISOString().slice(0, 10)}`,
      });
    }
    if (contract.endDate && at > contract.endDate) {
      reasons.push({
        rule: 'contract_ended',
        severity: 'blocker',
        message: `Contract ended on ${contract.endDate.toISOString().slice(0, 10)}`,
      });
    }

    if (!contract.registrationNumber) {
      reasons.push({
        rule: 'not_registered',
        severity: 'warning',
        message: 'Player has no registration number for this season',
      });
    }

    return this.buildEligibilityResult(
      player,
      teamId,
      dto.season,
      reasons,
      contract,
    );
  }

  private buildEligibilityResult(
    player: Player,
    teamId: string,
    season: string,
    reasons: EligibilityReason[],
    contract?: PlayerContract,
  ) {
    const blockers = reasons.filter((r) => r.severity === 'blocker');
    return {
      playerId: player.id,
      playerName: player.user?.username || 'Unknown',
      teamId,
      season,
      eligible: blockers.length === 0,
      reasons,
      contract: contract
        ? {
            id: contract.id,
            contractType: contract.contractType,
            startDate: contract.startDate,
            endDate: contract.endDate,
            status: contract.status,
            registrationNumber: contract.registrationNumber,
            jerseyNumber: contract.jerseyNumber,
          }
        : null,
      checkedAt: new Date().toISOString(),
    };
  }

  // ─── Carry forward ───────────────────────────────────────────────────

  async carryForward(
    workspaceId: string,
    dto: CarryForwardDto,
    userId: string,
  ): Promise<{ created: number; skipped: number; failed: number }> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    if (dto.fromSeason === dto.toSeason) {
      throw new BadRequestException(
        'fromSeason and toSeason must be different',
      );
    }
    const newStart = new Date(dto.newStartDate);
    const newEnd = new Date(dto.newEndDate);
    if (newEnd <= newStart) {
      throw new BadRequestException('newEndDate must be after newStartDate');
    }

    const where: any = {
      workspaceId,
      season: dto.fromSeason,
      status: 'active',
    };
    if (dto.teamId) where.teamId = dto.teamId;
    const source = await this.contractRepo.find({ where });

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const c of source) {
      // Skip if a contract already exists for the same player+team+toSeason
      const existing = await this.contractRepo.findOne({
        where: {
          workspaceId,
          playerId: c.playerId,
          teamId: c.teamId,
          season: dto.toSeason,
        },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
      try {
        await this.createContract(
          workspaceId,
          {
            playerId: c.playerId,
            teamId: c.teamId,
            season: dto.toSeason,
            contractType: c.contractType,
            startDate: dto.newStartDate,
            endDate: dto.newEndDate,
            salary: Number(c.salary || 0),
            currency: c.currency,
            jerseyNumber: c.jerseyNumber || undefined,
            isForeign: c.isForeign,
          },
          userId,
        );
        created += 1;
      } catch {
        failed += 1;
      }
    }

    return { created, skipped, failed };
  }

  // ─── Summary ─────────────────────────────────────────────────────────

  async getSummary(workspaceId: string, userId: string, season?: string) {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const contractWhere: any = { workspaceId };
    if (season) contractWhere.season = season;

    const [
      totalContracts,
      activeContracts,
      terminatedContracts,
      suspendedContracts,
      expiredContracts,
      totalReleases,
    ] = await Promise.all([
      this.contractRepo.count({ where: contractWhere }),
      this.contractRepo.count({
        where: { ...contractWhere, status: 'active' },
      }),
      this.contractRepo.count({
        where: { ...contractWhere, status: 'terminated' },
      }),
      this.contractRepo.count({
        where: { ...contractWhere, status: 'suspended' },
      }),
      this.contractRepo.count({
        where: { ...contractWhere, status: 'expired' },
      }),
      this.releaseRepo.count({ where: { workspaceId } }),
    ]);

    const seasonsRaw = await this.contractRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.season', 'season')
      .where('c.workspace_id = :workspaceId', { workspaceId })
      .orderBy('c.season', 'DESC')
      .getRawMany<{ season: string }>();

    return {
      season,
      totalContracts,
      activeContracts,
      terminatedContracts,
      suspendedContracts,
      expiredContracts,
      totalReleases,
      seasons: seasonsRaw.map((s) => s.season).filter(Boolean),
      generatedAt: new Date().toISOString(),
    };
  }
}
