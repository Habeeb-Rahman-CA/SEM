import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../teams/entities/team.entity';
import { Player } from '../players/entities/player.entity';
import { Event } from '../events/entities/event.entity';
import { Sport } from '../workspaces/entities/sport.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  CURRENCIES_SEED,
  CONTRACT_TYPES_SEED,
  TRANSFER_TYPES_SEED,
  ACCESS_LEVELS_SEED,
} from './data';

@Injectable()
export class BootstrapService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Sport)
    private readonly sportRepo: Repository<Sport>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  /**
   * Reference-data bundle: static or slow-changing data safe to cache
   * aggressively on the client (long TTL). Not workspace-scoped.
   */
  async getReferenceData() {
    const sports = await this.sportRepo.find({ order: { name: 'ASC' } });
    return {
      sports: sports.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
      })),
      currencies: CURRENCIES_SEED,
      contractTypes: CONTRACT_TYPES_SEED,
      transferTypes: TRANSFER_TYPES_SEED,
      accessLevels: ACCESS_LEVELS_SEED,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Workspace bootstrap bundle — everything the workspace-detail shell needs
   * on first load, in one round-trip. Callers should still lazy-load
   * heavyweight per-tab data as tabs open.
   *
   * Payload is intentionally trimmed:
   *   - teams: first 200 (id, name, code, logoUrl)
   *   - players: first 300 (id, userId, teamId, position, jerseyNumber, user summary)
   *   - events: first 50 (id, name, status, startDate, endDate)
   *
   * For unbounded lists callers still use the dedicated paginated endpoints.
   */
  async getWorkspaceBootstrap(workspaceId: string, userId: string) {
    // Auth check delegated to workspacesService.findOne
    const [workspace, members, roles, sports] = await Promise.all([
      this.workspacesService.findOne(workspaceId, userId),
      this.workspacesService.getMembers(workspaceId, userId),
      this.workspacesService.getRoles(workspaceId, userId),
      this.workspacesService.getSports(),
    ]);

    const [teams, players, events] = await Promise.all([
      this.teamRepo.find({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          code: true,
          logoUrl: true,
        } as any,
        order: { name: 'ASC' },
        take: 200,
      }),
      this.playerRepo.find({
        where: { workspaceId },
        relations: { user: true, team: true },
        order: { createdAt: 'DESC' },
        take: 300,
      }),
      this.eventRepo.find({
        where: { workspaceId },
        order: { startDate: 'DESC' } as any,
        take: 50,
      }),
    ]);

    // Compute the current user's role & permissions in this workspace
    const currentMember = (members as any[]).find(
      (m: any) => m.userId === userId,
    );
    const currentRole = currentMember?.role || null;
    const currentPermissions: string[] =
      currentRole?.permissions?.map((p: any) => p.slug) || [];

    return {
      workspace,
      currentUser: {
        userId,
        roleSlug: currentRole?.slug || null,
        roleName: currentRole?.name || null,
        permissions: currentPermissions,
      },
      members,
      roles,
      sports: sports.map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code,
      })),
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        logoUrl: t.logoUrl,
      })),
      players: players.map((p) => ({
        id: p.id,
        userId: p.userId,
        teamId: p.teamId,
        jerseyNumber: p.jerseyNumber,
        position: p.position,
        user: p.user
          ? {
              id: p.user.id,
              username: p.user.username,
              avatarUrl: p.user.avatarUrl,
            }
          : null,
        team: p.team ? { id: p.team.id, name: p.team.name } : null,
      })),
      events: events.map((e) => ({
        id: e.id,
        name: e.name,
        status: e.status,
        startDate: e.startDate,
        endDate: e.endDate,
        logoUrl: e.logoUrl,
      })),
      counts: {
        teams: teams.length,
        players: players.length,
        events: events.length,
        members: (members as any[]).length,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
