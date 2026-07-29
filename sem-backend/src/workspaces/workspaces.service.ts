import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { Team } from './entities/team.entity';
import { Player } from './entities/player.entity';
import { Event } from './entities/event.entity';
import { Sport } from './entities/sport.entity';
import { Competition } from './entities/competition.entity';
import { CompetitionStage } from './entities/competition-stage.entity';
import { Match } from './entities/match.entity';
import { MatchPlayer } from './entities/match-player.entity';
import { AuditLog } from './entities/audit-log.entity';
import { SystemConfig } from './entities/system-config.entity';
import { Notification, NotificationType } from './entities/notification.entity';
import { UsersService } from '../users/users.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

import { NotificationsService } from './notifications/notifications.service';
import { AuditLogsService } from './audit-logs/audit-logs.service';
import { SystemConfigService } from './system-config/system-config.service';
import { RolesPermissionsService } from './roles-permissions/roles-permissions.service';
import { WorkspaceMembersService } from './members/members.service';

@Injectable()
export class WorkspacesService implements OnModuleInit {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Sport)
    private readonly sportRepo: Repository<Sport>,
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(CompetitionStage)
    private readonly stageRepo: Repository<CompetitionStage>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayerRepo: Repository<MatchPlayer>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepo: Repository<SystemConfig>,
    private readonly usersService: UsersService,

    // Injected Extracted Services (SRP alignment)
    private readonly notificationsService: NotificationsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly systemConfigService: SystemConfigService,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly workspaceMembersService: WorkspaceMembersService,
  ) {}

  async onModuleInit() {
    const defaultSports = [
      {
        name: 'Football',
        code: 'football',
        description: 'Association football/soccer',
      },
      {
        name: 'Cricket',
        code: 'cricket',
        description: 'Bat-and-ball game played between two teams',
      },
      {
        name: 'Badminton',
        code: 'badminton',
        description: 'Racket sport played with shuttlecocks',
      },
      {
        name: 'Volleyball',
        code: 'volleyball',
        description: 'Team sport played over a net',
      },
      {
        name: 'Basketball',
        code: 'basketball',
        description: 'Court game where teams shoot a ball into a hoop',
      },
      {
        name: 'Athletics',
        code: 'athletics',
        description: 'Track and field events',
      },
      {
        name: 'Table Tennis',
        code: 'table_tennis',
        description: 'Racket sport played on a flat table split by a net',
      },
      {
        name: 'Chess',
        code: 'chess',
        description: 'Board game of strategic skill for two players',
      },
      {
        name: 'Kabaddi',
        code: 'kabaddi',
        description: 'Contact sport played between two teams of seven players',
      },
      {
        name: 'Throwball',
        code: 'throwball',
        description: 'Non-contact ball sport played over a net',
      },
    ];

    for (const s of defaultSports) {
      const existing = await this.sportRepo.findOne({
        where: { code: s.code },
      });
      if (!existing) {
        await this.sportRepo.save(this.sportRepo.create(s));
      }
    }

    const defaultPermissions = [
      {
        slug: 'workspace.read',
        name: 'Read Workspace',
        description: 'View workspace details, events, and members',
      },
      {
        slug: 'workspace.update',
        name: 'Update Workspace',
        description: 'Modify workspace name, description, and configurations',
      },
      {
        slug: 'workspace.delete',
        name: 'Delete Workspace',
        description: 'Permanently remove the workspace and all its data',
      },
      {
        slug: 'member.invite',
        name: 'Invite Members',
        description: 'Send invitations to new users to join the workspace',
      },
      {
        slug: 'member.update',
        name: 'Update Members',
        description: 'Update workspace member roles',
      },
      {
        slug: 'member.remove',
        name: 'Remove Members',
        description: 'Remove members from the workspace',
      },
      {
        slug: 'role.manage',
        name: 'Manage Roles',
        description:
          'Create, modify, and delete custom workspace roles and map permissions',
      },
      {
        slug: 'team.manage',
        name: 'Manage Teams',
        description: 'Create, edit, and delete teams inside the workspace',
      },
      {
        slug: 'player.manage',
        name: 'Manage Players',
        description: 'Add, update, or remove players in teams',
      },
      {
        slug: 'event.manage',
        name: 'Manage Events',
        description: 'Create, update, and close events',
      },
      {
        slug: 'competition.manage',
        name: 'Manage Competitions',
        description: 'Create and configure competitions for events',
      },
      {
        slug: 'match.score',
        name: 'Score Matches',
        description: 'Record, edit, and finalise scores for match fixtures',
      },
    ];

    const seededPermissions: Record<string, Permission> = {};
    for (const p of defaultPermissions) {
      let existing = await this.permissionRepo.findOne({
        where: { slug: p.slug },
      });
      if (!existing) {
        existing = await this.permissionRepo.save(
          this.permissionRepo.create(p),
        );
      }
      seededPermissions[p.slug] = existing;
    }

    const defaultRoles = [
      {
        slug: 'owner',
        name: 'Owner',
        description: 'Full control — delete workspace, manage all',
        isSystem: true,
      },
      {
        slug: 'administrator',
        name: 'Administrator',
        description: 'Manage members, events, settings',
        isSystem: true,
      },
      {
        slug: 'event_manager',
        name: 'Event Manager',
        description: 'Create/edit events and competitions',
        isSystem: true,
      },
      {
        slug: 'competition_manager',
        name: 'Competition Manager',
        description: 'Manage brackets, fixtures, results',
        isSystem: true,
      },
      {
        slug: 'referee',
        name: 'Referee',
        description: 'Enter match scores, manage assigned fixtures',
        isSystem: true,
      },
      {
        slug: 'statistician',
        name: 'Statistician',
        description: 'Enter/edit player & match statistics',
        isSystem: true,
      },
      {
        slug: 'media_team',
        name: 'Media Team',
        description: 'Upload photos, announcements',
        isSystem: true,
      },
      {
        slug: 'viewer',
        name: 'Viewer',
        description: 'Read-only access to all workspace data',
        isSystem: true,
      },
    ];

    const rolePermissionMapping: Record<string, string[]> = {
      owner: [
        'workspace.read',
        'workspace.update',
        'workspace.delete',
        'member.invite',
        'member.update',
        'member.remove',
        'role.manage',
        'team.manage',
        'player.manage',
        'event.manage',
        'competition.manage',
        'match.score',
      ],
      administrator: [
        'workspace.read',
        'workspace.update',
        'member.invite',
        'member.update',
        'member.remove',
        'role.manage',
        'team.manage',
        'player.manage',
        'event.manage',
        'competition.manage',
        'match.score',
      ],
      event_manager: [
        'workspace.read',
        'team.manage',
        'player.manage',
        'event.manage',
        'competition.manage',
      ],
      competition_manager: [
        'workspace.read',
        'competition.manage',
        'match.score',
      ],
      referee: ['workspace.read', 'match.score'],
      statistician: ['workspace.read', 'match.score'],
      media_team: ['workspace.read'],
      viewer: ['workspace.read'],
    };

    for (const r of defaultRoles) {
      let existing = await this.roleRepo.findOne({
        where: { slug: r.slug, isSystem: true },
        relations: { permissions: true },
      });
      if (!existing) {
        existing = await this.roleRepo.save(this.roleRepo.create(r));
        existing.permissions = [];
      }

      const requiredSlugs = rolePermissionMapping[r.slug] || [];
      const currentSlugs = existing.permissions?.map((p) => p.slug) || [];
      const needsUpdate =
        requiredSlugs.some((slug) => !currentSlugs.includes(slug)) ||
        currentSlugs.some((slug) => !requiredSlugs.includes(slug));

      if (needsUpdate || !existing.permissions) {
        existing.permissions = requiredSlugs
          .map((slug) => seededPermissions[slug])
          .filter(Boolean);
        await this.roleRepo.save(existing);
      }
    }
  }

  // ─── Workspace CRUD ───────────────────────────────────────────────────────

  async create(dto: CreateWorkspaceDto, ownerId: string): Promise<Workspace> {
    const baseSlug =
      dto.slug ?? this.rolesPermissionsService.generateSlug(dto.name);
    let slug = baseSlug;
    let counter = 1;
    while (await this.workspaceRepo.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    if (dto.slug && slug !== dto.slug) {
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    const workspace = this.workspaceRepo.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      logoUrl: dto.logoUrl ?? null,
      ownerId,
    });

    const savedWorkspace = await this.workspaceRepo.save(workspace);

    const ownerRole = await this.rolesPermissionsService.findRoleBySlug(
      'owner',
      null,
    );
    const ownerMember = this.memberRepo.create({
      workspaceId: savedWorkspace.id,
      userId: ownerId,
      roleId: ownerRole.id,
      status: 'joined',
    });
    await this.memberRepo.save(ownerMember);

    await this.notificationsService.sendNotification(
      ownerId,
      NotificationType.WORKSPACE_CREATED,
      `Welcome! Your workspace ${savedWorkspace.name} has been created successfully.`,
      savedWorkspace.id,
      { workspaceName: savedWorkspace.name },
    );

    return savedWorkspace;
  }

  async findAllForUser(userId: string): Promise<Workspace[]> {
    const memberships = await this.memberRepo.find({
      where: { userId, status: 'joined' },
      relations: { workspace: true },
    });
    return memberships.map((m) => m.workspace).filter(Boolean);
  }

  async findOne(id: string, userId: string): Promise<Workspace> {
    await this.workspaceMembersService.ensureMember(id, userId);
    const workspace = await this.workspaceRepo.findOne({
      where: { id },
      relations: { members: { user: true } },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async findBySlug(slug: string, userId: string): Promise<Workspace> {
    const workspace = await this.workspaceRepo.findOne({
      where: { slug },
      relations: { members: { user: true } },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    await this.workspaceMembersService.ensureMember(workspace.id, userId);
    return workspace;
  }

  async update(
    id: string,
    dto: UpdateWorkspaceDto,
    userId: string,
  ): Promise<Workspace> {
    await this.workspaceMembersService.ensurePermission(
      id,
      userId,
      'workspace.update',
    );

    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    if (dto.slug && dto.slug !== workspace.slug) {
      const existing = await this.workspaceRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existing)
        throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    Object.assign(workspace, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
    });

    const saved = await this.workspaceRepo.save(workspace);
    const memberIds =
      await this.workspaceMembersService.getWorkspaceMemberUserIds(id, userId);
    await this.notificationsService.sendNotificationToMany(
      memberIds,
      NotificationType.WORKSPACE_UPDATED,
      `Workspace ${saved.name} settings have been updated.`,
      id,
      { workspaceName: saved.name },
    );
    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.workspaceMembersService.ensurePermission(
      id,
      userId,
      'workspace.delete',
    );
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const memberIds =
      await this.workspaceMembersService.getWorkspaceMemberUserIds(id, userId);
    await this.notificationsService.sendNotificationToMany(
      memberIds,
      NotificationType.WORKSPACE_DELETED,
      `The workspace ${workspace.name} has been deleted by the owner.`,
      null,
      { workspaceName: workspace.name },
    );

    workspace.deletedAt = new Date();
    await this.workspaceRepo.save(workspace);
  }

  // ─── Dashboard Standings Aggregator ───────────────────────────────────────

  async getDashboardOverview(userId: string): Promise<any> {
    const memberships = await this.memberRepo.find({
      where: { userId, status: 'joined' },
      relations: { workspace: true },
    });
    const workspaces = memberships.map((m) => m.workspace).filter(Boolean);
    const workspaceIds = workspaces.map((w) => w.id);

    if (workspaceIds.length === 0) {
      return {
        workspaces: [],
        liveMatches: [],
        upcomingMatches: [],
        runningCompetitions: [],
        topScorers: [],
        topRatedPlayers: [],
        statsSummary: {
          totalWorkspaces: 0,
          totalEvents: 0,
          totalTeams: 0,
          totalPlayers: 0,
          totalLiveMatches: 0,
        },
      };
    }

    const events = await this.eventRepo.find({
      where: { workspaceId: In(workspaceIds) },
    });
    const eventIds = events.map((e) => e.id);

    let competitions: Competition[] = [];
    if (eventIds.length > 0) {
      competitions = await this.competitionRepo.find({
        where: { eventId: In(eventIds) },
        relations: { sport: true, event: true },
      });
    }
    const competitionIds = competitions.map((c) => c.id);

    let stages: CompetitionStage[] = [];
    if (competitionIds.length > 0) {
      stages = await this.stageRepo.find({
        where: { competitionId: In(competitionIds) },
      });
    }
    const stageIds = stages.map((s) => s.id);

    let liveMatches: Match[] = [];
    if (stageIds.length > 0) {
      liveMatches = await this.matchRepo.find({
        where: { stageId: In(stageIds), status: 'live' },
        relations: {
          homeTeam: true,
          awayTeam: true,
          venue: true,
          stage: { competition: { event: true, sport: true } },
        },
        order: { updatedAt: 'DESC' },
      });
    }

    let upcomingMatches: Match[] = [];
    if (stageIds.length > 0) {
      upcomingMatches = await this.matchRepo.find({
        where: { stageId: In(stageIds), status: 'scheduled' },
        relations: {
          homeTeam: true,
          awayTeam: true,
          venue: true,
          stage: { competition: { event: true, sport: true } },
        },
        order: { createdAt: 'ASC' },
        take: 8,
      });
    }

    let completedMatches: Match[] = [];
    if (stageIds.length > 0) {
      completedMatches = await this.matchRepo.find({
        where: { stageId: In(stageIds), status: 'completed' },
        relations: {
          homeTeam: true,
          awayTeam: true,
          venue: true,
          stage: { competition: { event: true, sport: true } },
        },
        order: { updatedAt: 'DESC' },
        take: 8,
      });
    }

    const runningCompetitions: any[] = [];
    for (const comp of competitions) {
      const compStages = stages.filter((s) => s.competitionId === comp.id);
      const compStageIds = compStages.map((s) => s.id);
      if (compStageIds.length === 0) continue;

      const compMatches = await this.matchRepo.find({
        where: { stageId: In(compStageIds) },
        relations: { homeTeam: true, awayTeam: true },
      });

      if (compMatches.length === 0) continue;

      const standingsMap = new Map<string, any>();
      for (const m of compMatches) {
        if (m.status !== 'completed' && m.status !== 'live') continue;
        if (!m.homeTeamId || !m.awayTeamId) continue;

        if (!standingsMap.has(m.homeTeamId)) {
          standingsMap.set(m.homeTeamId, {
            teamId: m.homeTeamId,
            teamName: m.homeTeam?.name ?? 'Home',
            teamLogoUrl: m.homeTeam?.logoUrl,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
          });
        }
        if (!standingsMap.has(m.awayTeamId)) {
          standingsMap.set(m.awayTeamId, {
            teamId: m.awayTeamId,
            teamName: m.awayTeam?.name ?? 'Away',
            teamLogoUrl: m.awayTeam?.logoUrl,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
          });
        }

        const h = standingsMap.get(m.homeTeamId);
        const a = standingsMap.get(m.awayTeamId);

        h.played++;
        a.played++;
        const hScore = m.homeScore ?? 0;
        const aScore = m.awayScore ?? 0;
        h.gf += hScore;
        h.ga += aScore;
        a.gf += aScore;
        a.ga += hScore;

        if (hScore > aScore) {
          h.won++;
          h.pts += 3;
          a.lost++;
        } else if (hScore < aScore) {
          a.won++;
          a.pts += 3;
          h.lost++;
        } else {
          h.drawn++;
          h.pts += 1;
          a.drawn++;
          a.pts += 1;
        }
        h.gd = h.gf - h.ga;
        a.gd = a.gf - a.ga;
      }

      const standings = Array.from(standingsMap.values()).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      });

      runningCompetitions.push({
        id: comp.id,
        name: comp.name,
        status: comp.status,
        sport: comp.sport,
        eventId: comp.eventId,
        eventName: comp.event?.name,
        workspaceId: comp.event?.workspaceId,
        standings,
      });
    }

    let topRatedPlayers: any[] = [];
    let topScorers: any[] = [];

    if (stageIds.length > 0) {
      const allMatches = await this.matchRepo.find({
        where: { stageId: In(stageIds) },
      });
      const matchIds = allMatches.map((m) => m.id);

      if (matchIds.length > 0) {
        const allMatchPlayers = await this.matchPlayerRepo.find({
          where: { matchId: In(matchIds), isPlaying: true },
          relations: { player: { user: true }, team: true },
        });

        const ratingsMap = new Map<
          string,
          {
            playerId: string;
            playerName: string;
            teamName: string;
            ratings: number[];
          }
        >();
        for (const mp of allMatchPlayers) {
          if (mp.rating !== null && mp.rating !== undefined) {
            const playerName =
              mp.player?.user?.username ??
              mp.player?.jerseyNumber?.toString() ??
              'Player';
            const teamName = mp.team?.name ?? 'Team';
            let item = ratingsMap.get(mp.playerId);
            if (!item) {
              item = {
                playerId: mp.playerId,
                playerName,
                teamName,
                ratings: [],
              };
              ratingsMap.set(mp.playerId, item);
            }
            item.ratings.push(Number(mp.rating));
          }
        }

        topRatedPlayers = Array.from(ratingsMap.values())
          .map((r) => ({
            playerId: r.playerId,
            playerName: r.playerName,
            teamName: r.teamName,
            avgRating:
              Math.round(
                (r.ratings.reduce((a, b) => a + b, 0) / r.ratings.length) * 10,
              ) / 10,
            appearances: r.ratings.length,
          }))
          .sort((a, b) => b.avgRating - a.avgRating)
          .slice(0, 5);

        const scorersMap = new Map<
          string,
          {
            playerId: string;
            playerName: string;
            teamName: string;
            score: number;
          }
        >();
        for (const m of allMatches) {
          const eventsList = m.liveData?.events;
          if (Array.isArray(eventsList)) {
            for (const ev of eventsList) {
              if (
                ev.type === 'goal' &&
                ev.goalType !== 'own_goal' &&
                ev.playerUserId
              ) {
                const mp = allMatchPlayers.find(
                  (p) => p.player?.userId === ev.playerUserId,
                );
                const pId = mp?.playerId ?? ev.playerUserId;
                const pName = mp?.player?.user?.username ?? ev.playerUserId;
                const tName = mp?.team?.name ?? 'Team';

                let item = scorersMap.get(pId);
                if (!item) {
                  item = {
                    playerId: pId,
                    playerName: pName,
                    teamName: tName,
                    score: 0,
                  };
                  scorersMap.set(pId, item);
                }
                item.score++;
              }
            }
          }
        }

        topScorers = Array.from(scorersMap.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      }
    }

    const totalTeams = await this.teamRepo.count({
      where: { workspaceId: In(workspaceIds) },
    });
    const totalPlayers = await this.playerRepo.count({
      where: { workspaceId: In(workspaceIds) },
    });

    return {
      workspaces,
      liveMatches,
      upcomingMatches,
      completedMatches,
      runningCompetitions,
      topScorers,
      topRatedPlayers,
      statsSummary: {
        totalWorkspaces: workspaces.length,
        totalEvents: events.length,
        totalTeams,
        totalPlayers,
        totalLiveMatches: liveMatches.length,
      },
    };
  }

  // ─── User Profile Aggregator ──────────────────────────────────────────────

  async getUserProfileDetails(userId: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const memberships = await this.memberRepo.find({
      where: { userId, status: 'joined' },
      relations: { workspace: true, role: true },
    });

    const players = await this.playerRepo.find({
      where: { userId },
      relations: { team: true, workspace: true },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      workspaces: memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: {
          slug: m.role.slug,
          name: m.role.name,
        },
      })),
      teams: players.map((p) => ({
        id: p.team.id,
        name: p.team.name,
        code: p.team.code,
        logoUrl: p.team.logoUrl,
        jerseyNumber: p.jerseyNumber,
        workspace: {
          id: p.workspace.id,
          name: p.workspace.name,
        },
      })),
    };
  }

  // ─── FACADE / DELEGATION WRAPPERS (Maintains backward compatibility) ──────

  async findRoleBySlug(slug: string, workspaceId: string | null) {
    return this.rolesPermissionsService.findRoleBySlug(slug, workspaceId);
  }

  async getRoles(workspaceId: string, userId: string) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);
    return this.rolesPermissionsService.getRoles(workspaceId);
  }

  async createRole(workspaceId: string, dto: any, userId: string) {
    await this.workspaceMembersService.ensurePermission(
      workspaceId,
      userId,
      'role.manage',
    );
    return this.rolesPermissionsService.createRole(workspaceId, dto);
  }

  async removeRole(workspaceId: string, roleId: string, userId: string) {
    await this.workspaceMembersService.ensurePermission(
      workspaceId,
      userId,
      'role.manage',
    );
    return this.rolesPermissionsService.removeRole(workspaceId, roleId);
  }

  async getGlobalRoles() {
    return this.rolesPermissionsService.getGlobalRoles();
  }

  async createGlobalRole(dto: any) {
    return this.rolesPermissionsService.createGlobalRole(dto);
  }

  async updateGlobalRole(roleId: string, dto: any) {
    return this.rolesPermissionsService.updateGlobalRole(roleId, dto);
  }

  async removeGlobalRole(roleId: string) {
    return this.rolesPermissionsService.removeGlobalRole(roleId);
  }

  async getGlobalPermissions() {
    return this.rolesPermissionsService.getGlobalPermissions();
  }

  async createPermission(dto: any) {
    return this.rolesPermissionsService.createPermission(dto);
  }

  async updatePermission(permissionId: string, dto: any) {
    return this.rolesPermissionsService.updatePermission(permissionId, dto);
  }

  async deletePermission(permissionId: string) {
    return this.rolesPermissionsService.deletePermission(permissionId);
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    return this.rolesPermissionsService.updateRolePermissions(
      roleId,
      permissionIds,
    );
  }

  async ensureMember(workspaceId: string, userId: string) {
    return this.workspaceMembersService.ensureMember(workspaceId, userId);
  }

  async ensurePermission(
    workspaceId: string,
    userId: string,
    permissionSlug: string,
  ) {
    return this.workspaceMembersService.ensurePermission(
      workspaceId,
      userId,
      permissionSlug,
    );
  }

  async getSports() {
    return this.rolesPermissionsService.getSports();
  }

  async createSport(dto: any) {
    return this.rolesPermissionsService.createSport(dto);
  }

  async updateSport(sportId: string, dto: any) {
    return this.rolesPermissionsService.updateSport(sportId, dto);
  }

  async deleteSport(sportId: string) {
    return this.rolesPermissionsService.deleteSport(sportId);
  }

  async getMembers(workspaceId: string, userId: string) {
    return this.workspaceMembersService.getMembers(workspaceId, userId);
  }

  async inviteMember(workspaceId: string, dto: any, requesterId: string) {
    return this.workspaceMembersService.inviteMember(
      workspaceId,
      dto,
      requesterId,
    );
  }

  async bulkImportMembers(workspaceId: string, dto: any, requesterId: string) {
    return this.workspaceMembersService.bulkImportMembers(
      workspaceId,
      dto,
      requesterId,
    );
  }

  async joinWorkspace(workspaceId: string, userId: string) {
    return this.workspaceMembersService.joinWorkspace(workspaceId, userId);
  }

  async getPendingInvitations(userId: string) {
    return this.workspaceMembersService.getPendingInvitations(userId);
  }

  async acceptInvitation(workspaceId: string, userId: string) {
    return this.workspaceMembersService.acceptInvitation(workspaceId, userId);
  }

  async rejectInvitation(workspaceId: string, userId: string) {
    return this.workspaceMembersService.rejectInvitation(workspaceId, userId);
  }

  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    dto: any,
    requesterId: string,
  ) {
    return this.workspaceMembersService.updateMemberRole(
      workspaceId,
      targetUserId,
      dto,
      requesterId,
    );
  }

  async removeMember(
    workspaceId: string,
    targetUserId: string,
    requesterId: string,
  ) {
    return this.workspaceMembersService.removeMember(
      workspaceId,
      targetUserId,
      requesterId,
    );
  }

  async getWorkspaceMemberUserIds(workspaceId: string, excludeUserId?: string) {
    return this.workspaceMembersService.getWorkspaceMemberUserIds(
      workspaceId,
      excludeUserId,
    );
  }

  async sendNotification(
    userId: string,
    type: any,
    message: string,
    workspaceId?: string | null,
    metadata?: any,
  ) {
    return this.notificationsService.sendNotification(
      userId,
      type,
      message,
      workspaceId,
      metadata,
    );
  }

  async sendNotificationToMany(
    userIds: string[],
    type: any,
    message: string,
    workspaceId?: string | null,
    metadata?: any,
  ) {
    return this.notificationsService.sendNotificationToMany(
      userIds,
      type,
      message,
      workspaceId,
      metadata,
    );
  }

  async getNotifications(userId: string) {
    return this.notificationsService.getNotifications(userId);
  }

  async markNotificationsRead(userId: string) {
    return this.notificationsService.markNotificationsRead(userId);
  }

  async logAudit(
    action: string,
    category?: string,
    entityType?: string,
    entityId?: string,
    performedById?: string,
    performedByName?: string,
    details?: string,
    status?: string,
  ) {
    return this.auditLogsService.logAudit(
      action,
      category,
      entityType,
      entityId,
      performedById,
      performedByName,
      details,
      status,
    );
  }

  async getAuditLogs(category?: string, limit?: number) {
    return this.auditLogsService.getAuditLogs(category, limit);
  }

  async clearAuditLogs() {
    return this.auditLogsService.clearAuditLogs();
  }

  async getSystemMetrics() {
    return this.systemConfigService.getSystemMetrics();
  }

  async getSystemConfigs() {
    return this.systemConfigService.getSystemConfigs();
  }

  async updateSystemConfig(
    key: string,
    value: string,
    userId?: string,
    userName?: string,
  ) {
    return this.systemConfigService.updateSystemConfig(
      key,
      value,
      userId,
      userName,
    );
  }

  async getTeamPlayerUserIds(teamId: string): Promise<string[]> {
    const players = await this.playerRepo.find({
      where: { teamId },
      select: { userId: true },
    });
    return players.map((p) => p.userId).filter(Boolean);
  }

  async getTeamsPlayerUserIds(teamIds: string[]): Promise<string[]> {
    if (teamIds.length === 0) return [];
    const players = await this.playerRepo.find({
      where: { teamId: In(teamIds) },
      select: { userId: true },
    });
    return [...new Set(players.map((p) => p.userId).filter(Boolean))];
  }
}
