import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { TransferWindow } from './entities/transfer-window.entity';
import {
  TransferRequest,
  TransferStatus,
  TransferType,
} from './entities/transfer-request.entity';
import { PlayerTransfer } from '../players/entities/player-transfer.entity';
import { Player } from '../players/entities/player.entity';
import { Team } from '../teams/entities/team.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateWindowDto, UpdateWindowDto } from './dto/create-window.dto';
import {
  CreateTransferRequestDto,
  ReviewTransferRequestDto,
} from './dto/create-request.dto';

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(TransferWindow)
    private readonly windowRepo: Repository<TransferWindow>,
    @InjectRepository(TransferRequest)
    private readonly requestRepo: Repository<TransferRequest>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(PlayerTransfer)
    private readonly playerTransferRepo: Repository<PlayerTransfer>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Transfer Windows ────────────────────────────────────────────────────

  async getWindows(
    workspaceId: string,
    userId: string,
  ): Promise<TransferWindow[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.windowRepo.find({
      where: { workspaceId },
      order: { startAt: 'DESC' },
    });
  }

  async createWindow(
    workspaceId: string,
    dto: CreateWindowDto,
    userId: string,
  ): Promise<TransferWindow> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    if (end <= start) {
      throw new BadRequestException('endAt must be after startAt');
    }
    const w = this.windowRepo.create({
      workspaceId,
      name: dto.name,
      description: dto.description || null,
      startAt: start,
      endAt: end,
      isActive: dto.isActive ?? true,
      allowedTypes: dto.allowedTypes || null,
      maxTransfersPerTeam: dto.maxTransfersPerTeam ?? null,
    });
    return this.windowRepo.save(w);
  }

  async updateWindow(
    workspaceId: string,
    id: string,
    dto: UpdateWindowDto,
    userId: string,
  ): Promise<TransferWindow> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const w = await this.windowRepo.findOne({
      where: { id, workspaceId },
    });
    if (!w) throw new NotFoundException('Transfer window not found');
    if (dto.startAt && dto.endAt) {
      const start = new Date(dto.startAt);
      const end = new Date(dto.endAt);
      if (end <= start) {
        throw new BadRequestException('endAt must be after startAt');
      }
    }
    Object.assign(w, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
      ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.allowedTypes !== undefined && {
        allowedTypes: dto.allowedTypes,
      }),
      ...(dto.maxTransfersPerTeam !== undefined && {
        maxTransfersPerTeam: dto.maxTransfersPerTeam,
      }),
    });
    return this.windowRepo.save(w);
  }

  async deleteWindow(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const w = await this.windowRepo.findOne({
      where: { id, workspaceId },
    });
    if (!w) throw new NotFoundException('Transfer window not found');
    await this.windowRepo.remove(w);
  }

  private async findActiveWindow(
    workspaceId: string,
    at: Date = new Date(),
  ): Promise<TransferWindow | null> {
    return this.windowRepo.findOne({
      where: {
        workspaceId,
        isActive: true,
        startAt: LessThanOrEqual(at),
        endAt: MoreThanOrEqual(at),
      },
      order: { endAt: 'ASC' },
    });
  }

  // ─── Requests ────────────────────────────────────────────────────────────

  async getRequests(
    workspaceId: string,
    userId: string,
    filter: {
      status?: TransferStatus;
      teamId?: string;
      playerId?: string;
      windowId?: string;
    } = {},
  ): Promise<TransferRequest[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const where: any = { workspaceId };
    if (filter.status) where.status = filter.status;
    if (filter.playerId) where.playerId = filter.playerId;
    if (filter.windowId) where.windowId = filter.windowId;
    const requests = await this.requestRepo.find({
      where,
      relations: {
        player: { user: true, team: true },
        fromTeam: true,
        toTeam: true,
        submittedBy: true,
        reviewedBy: true,
        window: true,
      },
      order: { createdAt: 'DESC' },
    });
    if (filter.teamId) {
      return requests.filter(
        (r) => r.fromTeamId === filter.teamId || r.toTeamId === filter.teamId,
      );
    }
    return requests;
  }

  async getRequestById(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<TransferRequest> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const req = await this.requestRepo.findOne({
      where: { id, workspaceId },
      relations: {
        player: { user: true, team: true },
        fromTeam: true,
        toTeam: true,
        submittedBy: true,
        reviewedBy: true,
        window: true,
      },
    });
    if (!req) throw new NotFoundException('Transfer request not found');
    return req;
  }

  async submitRequest(
    workspaceId: string,
    dto: CreateTransferRequestDto,
    userId: string,
  ): Promise<TransferRequest> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const player = await this.playerRepo.findOne({
      where: { id: dto.playerId, workspaceId },
      relations: { team: true },
    });
    if (!player) {
      throw new NotFoundException('Player not found in this workspace');
    }
    if (player.teamId === dto.toTeamId) {
      throw new BadRequestException(
        'Destination team is the same as the current team',
      );
    }

    const toTeam = await this.teamRepo.findOne({
      where: { id: dto.toTeamId, workspaceId },
    });
    if (!toTeam) {
      throw new NotFoundException('Destination team not found');
    }

    const transferType: TransferType = dto.transferType || 'permanent';
    if (transferType === 'loan') {
      if (!dto.loanStartDate || !dto.loanEndDate) {
        throw new BadRequestException(
          'Loan transfers require loanStartDate and loanEndDate',
        );
      }
      if (new Date(dto.loanEndDate) <= new Date(dto.loanStartDate)) {
        throw new BadRequestException(
          'loanEndDate must be after loanStartDate',
        );
      }
    }

    // Validate no existing pending request for the same player
    const existingPending = await this.requestRepo.findOne({
      where: {
        workspaceId,
        playerId: dto.playerId,
        status: 'pending',
      },
    });
    if (existingPending) {
      throw new ConflictException(
        'Player already has a pending transfer request',
      );
    }

    // Resolve transfer window
    let windowId: string | null = dto.windowId || null;
    if (windowId) {
      const w = await this.windowRepo.findOne({
        where: { id: windowId, workspaceId },
      });
      if (!w) {
        throw new NotFoundException('Transfer window not found');
      }
      const now = new Date();
      if (!w.isActive || now < w.startAt || now > w.endAt) {
        throw new BadRequestException('Transfer window is not currently open');
      }
      if (w.allowedTypes && !w.allowedTypes.includes(transferType)) {
        throw new BadRequestException(
          `Window "${w.name}" does not allow ${transferType} transfers`,
        );
      }
    } else {
      // Auto-attach to any currently open window (best effort)
      const active = await this.findActiveWindow(workspaceId);
      if (active) {
        if (
          !active.allowedTypes ||
          active.allowedTypes.includes(transferType)
        ) {
          windowId = active.id;
        }
      }
    }

    const request = this.requestRepo.create({
      workspaceId,
      playerId: dto.playerId,
      fromTeamId: player.teamId,
      toTeamId: dto.toTeamId,
      transferType,
      fee: dto.fee != null ? String(dto.fee) : null,
      currency: dto.currency || 'INR',
      loanStartDate: dto.loanStartDate ? new Date(dto.loanStartDate) : null,
      loanEndDate: dto.loanEndDate ? new Date(dto.loanEndDate) : null,
      windowId,
      status: 'pending',
      reason: dto.reason || null,
      submittedById: userId,
    });
    const saved = await this.requestRepo.save(request);
    return this.getRequestById(workspaceId, saved.id, userId);
  }

  async approveRequest(
    workspaceId: string,
    id: string,
    dto: ReviewTransferRequestDto,
    userId: string,
  ): Promise<TransferRequest> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const request = await this.requestRepo.findOne({
      where: { id, workspaceId },
      relations: { toTeam: true, fromTeam: true },
    });
    if (!request) throw new NotFoundException('Transfer request not found');
    if (request.status !== 'pending') {
      throw new ConflictException(
        `Only pending requests can be approved (current: ${request.status})`,
      );
    }

    const player = await this.playerRepo.findOne({
      where: { id: request.playerId, workspaceId },
    });
    if (!player) {
      throw new NotFoundException('Player no longer exists');
    }
    if (player.teamId !== request.fromTeamId) {
      throw new ConflictException(
        "Player's current team no longer matches the request. Please cancel and resubmit.",
      );
    }

    // Enforce per-team cap if defined on the window
    if (request.windowId) {
      const w = await this.windowRepo.findOne({
        where: { id: request.windowId },
      });
      if (w?.maxTransfersPerTeam != null) {
        const count = await this.requestRepo.count({
          where: {
            windowId: request.windowId,
            toTeamId: request.toTeamId,
            status: In(['approved', 'completed']),
          },
        });
        if (count >= w.maxTransfersPerTeam) {
          throw new BadRequestException(
            `Destination team already at the transfer cap (${w.maxTransfersPerTeam}) for this window`,
          );
        }
      }
    }

    // Approve + apply roster change atomically-ish
    request.status = 'approved';
    request.reviewedById = userId;
    request.reviewedAt = new Date();
    request.reviewNotes = dto.reviewNotes || null;
    await this.requestRepo.save(request);

    // Auto-update roster: move Player to destination team
    player.teamId = request.toTeamId;
    await this.playerRepo.save(player);

    // Append to historical PlayerTransfer log
    await this.playerTransferRepo.save(
      this.playerTransferRepo.create({
        userId: player.userId,
        fromTeamId: request.fromTeamId,
        toTeamId: request.toTeamId,
      }),
    );

    request.status = 'completed';
    request.completedAt = new Date();
    await this.requestRepo.save(request);

    return this.getRequestById(workspaceId, request.id, userId);
  }

  async rejectRequest(
    workspaceId: string,
    id: string,
    dto: ReviewTransferRequestDto,
    userId: string,
  ): Promise<TransferRequest> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const request = await this.requestRepo.findOne({
      where: { id, workspaceId },
    });
    if (!request) throw new NotFoundException('Transfer request not found');
    if (request.status !== 'pending') {
      throw new ConflictException(
        `Only pending requests can be rejected (current: ${request.status})`,
      );
    }
    request.status = 'rejected';
    request.reviewedById = userId;
    request.reviewedAt = new Date();
    request.reviewNotes = dto.reviewNotes || null;
    await this.requestRepo.save(request);
    return this.getRequestById(workspaceId, request.id, userId);
  }

  async cancelRequest(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<TransferRequest> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const request = await this.requestRepo.findOne({
      where: { id, workspaceId },
    });
    if (!request) throw new NotFoundException('Transfer request not found');
    if (request.status !== 'pending') {
      throw new ConflictException(
        `Only pending requests can be cancelled (current: ${request.status})`,
      );
    }
    // Submitter can cancel their own; otherwise require workspace.update
    if (request.submittedById !== userId) {
      await this.workspacesService.ensurePermission(
        workspaceId,
        userId,
        'workspace.update',
      );
    }
    request.status = 'cancelled';
    await this.requestRepo.save(request);
    return this.getRequestById(workspaceId, request.id, userId);
  }

  // ─── History ─────────────────────────────────────────────────────────────

  async getPlayerHistory(
    workspaceId: string,
    playerId: string,
    userId: string,
  ) {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const player = await this.playerRepo.findOne({
      where: { id: playerId, workspaceId },
    });
    if (!player) throw new NotFoundException('Player not found');
    const [transfers, requests] = await Promise.all([
      this.playerTransferRepo.find({
        where: { userId: player.userId },
        relations: { fromTeam: true, toTeam: true },
        order: { transferredAt: 'DESC' },
      }),
      this.requestRepo.find({
        where: { workspaceId, playerId },
        relations: { fromTeam: true, toTeam: true, window: true },
        order: { createdAt: 'DESC' },
      }),
    ]);
    return { transfers, requests };
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  async getSummary(workspaceId: string, userId: string) {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const now = new Date();

    const [
      totalRequests,
      pending,
      approved,
      rejected,
      cancelled,
      completed,
      permanent,
      loan,
    ] = await Promise.all([
      this.requestRepo.count({ where: { workspaceId } }),
      this.requestRepo.count({ where: { workspaceId, status: 'pending' } }),
      this.requestRepo.count({ where: { workspaceId, status: 'approved' } }),
      this.requestRepo.count({ where: { workspaceId, status: 'rejected' } }),
      this.requestRepo.count({ where: { workspaceId, status: 'cancelled' } }),
      this.requestRepo.count({ where: { workspaceId, status: 'completed' } }),
      this.requestRepo.count({
        where: { workspaceId, transferType: 'permanent' },
      }),
      this.requestRepo.count({
        where: { workspaceId, transferType: 'loan' },
      }),
    ]);

    const feeAggRaw = await this.requestRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.fee), 0)', 'totalFees')
      .where('r.workspace_id = :workspaceId', { workspaceId })
      .andWhere('r.status = :status', { status: 'completed' })
      .andWhere('r.transfer_type = :type', { type: 'permanent' })
      .getRawOne<{ totalFees: string }>();

    const activeWindow = await this.findActiveWindow(workspaceId, now);
    const upcomingLoanExpiries = await this.requestRepo.count({
      where: {
        workspaceId,
        transferType: 'loan',
        status: 'completed',
        loanEndDate: MoreThanOrEqual(now),
      },
    });

    return {
      totalRequests,
      pending,
      approved,
      rejected,
      cancelled,
      completed,
      permanent,
      loan,
      totalFees: Number(feeAggRaw?.totalFees ?? 0),
      activeWindow: activeWindow
        ? {
            id: activeWindow.id,
            name: activeWindow.name,
            startAt: activeWindow.startAt,
            endAt: activeWindow.endAt,
          }
        : null,
      upcomingLoanExpiries,
      generatedAt: now.toISOString(),
    };
  }
}
