import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StreamSession } from './entities/stream-session.entity';
import { StreamHighlight } from './entities/stream-highlight.entity';
import { StreamViewerSnapshot } from './entities/stream-viewer-snapshot.entity';
import { Match } from '../competitions/entities/match.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import {
  CreateHighlightDto,
  UpdateHighlightDto,
} from './dto/create-highlight.dto';

@Injectable()
export class StreamingService {
  constructor(
    @InjectRepository(StreamSession)
    private readonly sessionRepo: Repository<StreamSession>,
    @InjectRepository(StreamHighlight)
    private readonly highlightRepo: Repository<StreamHighlight>,
    @InjectRepository(StreamViewerSnapshot)
    private readonly snapshotRepo: Repository<StreamViewerSnapshot>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Sessions (workspace-scoped) ─────────────────────────────────────────

  async getSessions(
    workspaceId: string,
    userId: string,
    filter: { status?: string; eventId?: string } = {},
  ): Promise<StreamSession[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const where: any = { workspaceId };
    if (filter.status) where.status = filter.status;
    if (filter.eventId) where.eventId = filter.eventId;
    return this.sessionRepo.find({
      where,
      relations: {
        event: true,
        match: { homeTeam: true, awayTeam: true, stage: true },
        highlights: true,
        createdBy: true,
      },
      order: { scheduledStart: 'DESC', createdAt: 'DESC' },
    });
  }

  async getSessionById(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<StreamSession> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const session = await this.sessionRepo.findOne({
      where: { id, workspaceId },
      relations: {
        event: true,
        match: {
          homeTeam: true,
          awayTeam: true,
          stage: { competition: true },
          venue: true,
        },
        highlights: { createdBy: true },
        viewerSnapshots: true,
        createdBy: true,
      },
    });
    if (!session) throw new NotFoundException('Stream session not found');
    return session;
  }

  async createSession(
    workspaceId: string,
    dto: CreateSessionDto,
    userId: string,
  ): Promise<StreamSession> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    // Validate match belongs to this workspace if provided
    if (dto.matchId) {
      const match = await this.matchRepo.findOne({
        where: { id: dto.matchId },
        relations: { stage: { competition: { event: true } } },
      });
      if (!match) throw new NotFoundException('Match not found');
      if (match.stage?.competition?.event?.workspaceId !== workspaceId) {
        throw new ForbiddenException('Match belongs to a different workspace');
      }
    }

    const session = this.sessionRepo.create({
      workspaceId,
      eventId: dto.eventId || null,
      matchId: dto.matchId || null,
      title: dto.title,
      description: dto.description || null,
      platform: dto.platform,
      streamUrl: dto.streamUrl,
      embedUrl:
        dto.embedUrl || this.deriveEmbedUrl(dto.platform, dto.streamUrl),
      thumbnailUrl: dto.thumbnailUrl || null,
      streamKey: dto.streamKey || null,
      status: 'scheduled',
      scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : null,
      showScoreOverlay: dto.showScoreOverlay ?? true,
      showStats: dto.showStats ?? true,
      showTeamNames: dto.showTeamNames ?? true,
      isPublic: dto.isPublic ?? true,
      overlayColor: dto.overlayColor || null,
      createdById: userId,
    });

    const saved = await this.sessionRepo.save(session);
    return this.getSessionById(workspaceId, saved.id, userId);
  }

  async updateSession(
    workspaceId: string,
    id: string,
    dto: UpdateSessionDto,
    userId: string,
  ): Promise<StreamSession> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const session = await this.sessionRepo.findOne({
      where: { id, workspaceId },
    });
    if (!session) throw new NotFoundException('Stream session not found');

    Object.assign(session, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.matchId !== undefined && { matchId: dto.matchId }),
      ...(dto.eventId !== undefined && { eventId: dto.eventId }),
      ...(dto.embedUrl !== undefined && { embedUrl: dto.embedUrl }),
      ...(dto.thumbnailUrl !== undefined && {
        thumbnailUrl: dto.thumbnailUrl,
      }),
      ...(dto.streamKey !== undefined && { streamKey: dto.streamKey }),
      ...(dto.scheduledStart !== undefined && {
        scheduledStart: dto.scheduledStart
          ? new Date(dto.scheduledStart)
          : null,
      }),
      ...(dto.showScoreOverlay !== undefined && {
        showScoreOverlay: dto.showScoreOverlay,
      }),
      ...(dto.showStats !== undefined && { showStats: dto.showStats }),
      ...(dto.showTeamNames !== undefined && {
        showTeamNames: dto.showTeamNames,
      }),
      ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      ...(dto.overlayColor !== undefined && {
        overlayColor: dto.overlayColor,
      }),
    });

    const saved = await this.sessionRepo.save(session);
    return this.getSessionById(workspaceId, saved.id, userId);
  }

  async goLive(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<StreamSession> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const session = await this.sessionRepo.findOne({
      where: { id, workspaceId },
    });
    if (!session) throw new NotFoundException('Stream session not found');
    session.status = 'live';
    session.actualStart = session.actualStart ?? new Date();
    session.endedAt = null;
    await this.sessionRepo.save(session);
    return this.getSessionById(workspaceId, id, userId);
  }

  async endStream(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<StreamSession> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const session = await this.sessionRepo.findOne({
      where: { id, workspaceId },
    });
    if (!session) throw new NotFoundException('Stream session not found');
    session.status = 'ended';
    session.endedAt = new Date();
    await this.sessionRepo.save(session);
    return this.getSessionById(workspaceId, id, userId);
  }

  async updateViewerCount(
    workspaceId: string,
    id: string,
    viewerCount: number,
    userId: string,
  ): Promise<StreamSession> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const session = await this.sessionRepo.findOne({
      where: { id, workspaceId },
    });
    if (!session) throw new NotFoundException('Stream session not found');
    session.viewerCount = viewerCount;
    if (viewerCount > session.viewerCountPeak) {
      session.viewerCountPeak = viewerCount;
    }
    await this.sessionRepo.save(session);

    // Log snapshot
    await this.snapshotRepo.save(
      this.snapshotRepo.create({
        workspaceId,
        sessionId: id,
        snapshotAt: new Date(),
        viewerCount,
        source: 'manual',
      }),
    );

    return session;
  }

  async deleteSession(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const session = await this.sessionRepo.findOne({
      where: { id, workspaceId },
    });
    if (!session) throw new NotFoundException('Stream session not found');
    await this.sessionRepo.remove(session);
  }

  // ─── Highlights ──────────────────────────────────────────────────────────

  async createHighlight(
    workspaceId: string,
    dto: CreateHighlightDto,
    userId: string,
  ): Promise<StreamHighlight> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const session = await this.sessionRepo.findOne({
      where: { id: dto.sessionId, workspaceId },
    });
    if (!session) throw new NotFoundException('Stream session not found');

    const highlight = this.highlightRepo.create({
      workspaceId,
      sessionId: dto.sessionId,
      title: dto.title,
      description: dto.description || null,
      timestampSec: dto.timestampSec,
      durationSec: dto.durationSec ?? null,
      clipUrl: dto.clipUrl || null,
      thumbnailUrl: dto.thumbnailUrl || null,
      tags: dto.tags || null,
      clipType: dto.clipType || 'moment',
      createdById: userId,
    });
    return this.highlightRepo.save(highlight);
  }

  async updateHighlight(
    workspaceId: string,
    highlightId: string,
    dto: UpdateHighlightDto,
    userId: string,
  ): Promise<StreamHighlight> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const highlight = await this.highlightRepo.findOne({
      where: { id: highlightId, workspaceId },
    });
    if (!highlight) throw new NotFoundException('Highlight not found');

    Object.assign(highlight, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.timestampSec !== undefined && {
        timestampSec: dto.timestampSec,
      }),
      ...(dto.durationSec !== undefined && { durationSec: dto.durationSec }),
      ...(dto.clipUrl !== undefined && { clipUrl: dto.clipUrl }),
      ...(dto.thumbnailUrl !== undefined && {
        thumbnailUrl: dto.thumbnailUrl,
      }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
      ...(dto.clipType !== undefined && { clipType: dto.clipType }),
    });
    return this.highlightRepo.save(highlight);
  }

  async deleteHighlight(
    workspaceId: string,
    highlightId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const h = await this.highlightRepo.findOne({
      where: { id: highlightId, workspaceId },
    });
    if (!h) throw new NotFoundException('Highlight not found');
    await this.highlightRepo.remove(h);
  }

  // ─── Overlay & Public spectator endpoints ────────────────────────────────

  /**
   * Live overlay JSON — cacheable, no auth. Used by broadcaster tools
   * (OBS browser source, spectator portal) to render score/team overlays.
   */
  async getOverlayData(sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, isPublic: true },
      relations: {
        match: {
          homeTeam: true,
          awayTeam: true,
          stage: { competition: { sport: true } },
        },
        event: true,
      },
    });
    if (!session) throw new NotFoundException('Stream session not found');

    const match = session.match;
    return {
      sessionId: session.id,
      status: session.status,
      title: session.title,
      showScoreOverlay: session.showScoreOverlay,
      showStats: session.showStats,
      showTeamNames: session.showTeamNames,
      overlayColor: session.overlayColor,
      viewerCount: session.viewerCount,
      event: session.event
        ? { id: session.event.id, name: session.event.name }
        : null,
      match: match
        ? {
            id: match.id,
            status: match.status,
            scheduledAt: match.scheduledAt,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            homeTeam: match.homeTeam
              ? {
                  id: match.homeTeam.id,
                  name: match.homeTeam.name,
                  code: match.homeTeam.code,
                  logoUrl: match.homeTeam.logoUrl,
                }
              : null,
            awayTeam: match.awayTeam
              ? {
                  id: match.awayTeam.id,
                  name: match.awayTeam.name,
                  code: match.awayTeam.code,
                  logoUrl: match.awayTeam.logoUrl,
                }
              : null,
            competition: match.stage?.competition
              ? {
                  id: match.stage.competition.id,
                  name: match.stage.competition.name,
                  sport: match.stage.competition.sport
                    ? {
                        id: match.stage.competition.sport.id,
                        name: match.stage.competition.sport.name,
                        code: match.stage.competition.sport.code,
                      }
                    : null,
                }
              : null,
            liveData: match.liveData,
          }
        : null,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Public: list live + recent sessions across workspaces. */
  async getPublicLiveSessions() {
    return this.sessionRepo.find({
      where: [
        { status: 'live', isPublic: true },
        { status: 'scheduled', isPublic: true },
      ],
      relations: {
        match: {
          homeTeam: true,
          awayTeam: true,
          stage: { competition: true },
        },
        event: true,
      },
      order: { status: 'ASC', scheduledStart: 'ASC', createdAt: 'DESC' },
      take: 100,
    });
  }

  /** Public: view a session (embed URL + latest highlights). */
  async getPublicSession(sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, isPublic: true },
      relations: {
        match: {
          homeTeam: true,
          awayTeam: true,
          stage: { competition: true },
        },
        event: true,
        highlights: true,
      },
      order: { highlights: { timestampSec: 'DESC' } } as any,
    });
    if (!session) throw new NotFoundException('Stream session not found');
    return session;
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  async getSummary(workspaceId: string, userId: string) {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const [total, live, scheduled, ended, totalHighlights] = await Promise.all([
      this.sessionRepo.count({ where: { workspaceId } }),
      this.sessionRepo.count({ where: { workspaceId, status: 'live' } }),
      this.sessionRepo.count({ where: { workspaceId, status: 'scheduled' } }),
      this.sessionRepo.count({ where: { workspaceId, status: 'ended' } }),
      this.highlightRepo.count({ where: { workspaceId } }),
    ]);

    const currentViewerTotalRaw = await this.sessionRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.viewer_count), 0)', 'total')
      .where('s.workspace_id = :workspaceId', { workspaceId })
      .andWhere('s.status = :status', { status: 'live' })
      .getRawOne<{ total: string }>();

    return {
      total,
      live,
      scheduled,
      ended,
      totalHighlights,
      currentViewers: Number(currentViewerTotalRaw?.total ?? 0),
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private deriveEmbedUrl(platform: string, url: string): string | null {
    try {
      const u = new URL(url);
      if (platform === 'youtube') {
        // youtu.be/<id> or watch?v=<id>
        const id = u.hostname.includes('youtu.be')
          ? u.pathname.slice(1)
          : u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (platform === 'twitch') {
        const parts = u.pathname.split('/').filter(Boolean);
        const channel = parts[0];
        if (channel) {
          return `https://player.twitch.tv/?channel=${channel}&parent=localhost`;
        }
      }
      if (platform === 'vimeo') {
        const parts = u.pathname.split('/').filter(Boolean);
        const id = parts[parts.length - 1];
        if (id && /^\d+$/.test(id)) {
          return `https://player.vimeo.com/video/${id}`;
        }
      }
    } catch {
      /* not a URL — fall through */
    }
    return null;
  }
}
