import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember, WorkspaceRole, MANAGEMENT_ROLES } from './entities/workspace-member.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { Team } from './entities/team.entity';
import { Player } from './entities/player.entity';
import { Event } from './entities/event.entity';
import { Sport } from './entities/sport.entity';
import { Competition } from './entities/competition.entity';
import { CompetitionStage } from './entities/competition-stage.entity';
import { Match, MatchType } from './entities/match.entity';
import { CompetitionTeam } from './entities/competition-team.entity';
import { Venue } from './entities/venue.entity';
import { Notification, NotificationType, NOTIFICATION_ICONS } from './entities/notification.entity';
import { MatchPlayer } from './entities/match-player.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { UsersService } from '../users/users.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { BulkImportMembersDto } from './dto/bulk-import-members.dto';
import { RateMatchPlayerItemDto } from './dto/rate-match-players.dto';

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
    @InjectRepository(CompetitionTeam)
    private readonly competitionTeamRepo: Repository<CompetitionTeam>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayerRepo: Repository<MatchPlayer>,
    private readonly usersService: UsersService,
  ) { }

  async onModuleInit() {
    const defaultSports = [
      { name: 'Football', code: 'football', description: 'Association football/soccer' },
      { name: 'Cricket', code: 'cricket', description: 'Bat-and-ball game played between two teams' },
      { name: 'Badminton', code: 'badminton', description: 'Racket sport played with shuttlecocks' },
    ];

    for (const s of defaultSports) {
      const existing = await this.sportRepo.findOne({ where: { code: s.code } });
      if (!existing) {
        await this.sportRepo.save(this.sportRepo.create(s));
      }
    }

    const defaultPermissions = [
      { slug: 'workspace.read', name: 'Read Workspace', description: 'View workspace details, events, and members' },
      { slug: 'workspace.update', name: 'Update Workspace', description: 'Modify workspace name, description, and configurations' },
      { slug: 'workspace.delete', name: 'Delete Workspace', description: 'Permanently remove the workspace and all its data' },
      { slug: 'member.invite', name: 'Invite Members', description: 'Send invitations to new users to join the workspace' },
      { slug: 'member.update', name: 'Update Members', description: 'Update workspace member roles' },
      { slug: 'member.remove', name: 'Remove Members', description: 'Remove members from the workspace' },
      { slug: 'role.manage', name: 'Manage Roles', description: 'Create, modify, and delete custom workspace roles and map permissions' },
      { slug: 'team.manage', name: 'Manage Teams', description: 'Create, edit, and delete teams inside the workspace' },
      { slug: 'player.manage', name: 'Manage Players', description: 'Add, update, or remove players in teams' },
      { slug: 'event.manage', name: 'Manage Events', description: 'Create, update, and close events' },
      { slug: 'competition.manage', name: 'Manage Competitions', description: 'Create and configure competitions for events' },
      { slug: 'match.score', name: 'Score Matches', description: 'Record, edit, and finalise scores for match fixtures' },
    ];

    const seededPermissions: Record<string, Permission> = {};
    for (const p of defaultPermissions) {
      let existing = await this.permissionRepo.findOne({ where: { slug: p.slug } });
      if (!existing) {
        existing = await this.permissionRepo.save(this.permissionRepo.create(p));
      }
      seededPermissions[p.slug] = existing;
    }

    const defaultRoles = [
      { slug: 'owner', name: 'Owner', description: 'Full control — delete workspace, manage all', isSystem: true },
      { slug: 'administrator', name: 'Administrator', description: 'Manage members, events, settings', isSystem: true },
      { slug: 'event_manager', name: 'Event Manager', description: 'Create/edit events and competitions', isSystem: true },
      { slug: 'competition_manager', name: 'Competition Manager', description: 'Manage brackets, fixtures, results', isSystem: true },
      { slug: 'referee', name: 'Referee', description: 'Enter match scores, manage assigned fixtures', isSystem: true },
      { slug: 'statistician', name: 'Statistician', description: 'Enter/edit player & match statistics', isSystem: true },
      { slug: 'media_team', name: 'Media Team', description: 'Upload photos, announcements', isSystem: true },
      { slug: 'viewer', name: 'Viewer', description: 'Read-only access to all workspace data', isSystem: true },
    ];

    const rolePermissionMapping: Record<string, string[]> = {
      owner: ['workspace.read', 'workspace.update', 'workspace.delete', 'member.invite', 'member.update', 'member.remove', 'role.manage', 'team.manage', 'player.manage', 'event.manage', 'competition.manage', 'match.score'],
      administrator: ['workspace.read', 'workspace.update', 'member.invite', 'member.update', 'member.remove', 'role.manage', 'team.manage', 'player.manage', 'event.manage', 'competition.manage', 'match.score'],
      event_manager: ['workspace.read', 'team.manage', 'player.manage', 'event.manage', 'competition.manage'],
      competition_manager: ['workspace.read', 'competition.manage', 'match.score'],
      referee: ['workspace.read', 'match.score'],
      statistician: ['workspace.read', 'match.score'],
      media_team: ['workspace.read'],
      viewer: ['workspace.read'],
    };

    for (const r of defaultRoles) {
      let existing = await this.roleRepo.findOne({ where: { slug: r.slug, isSystem: true }, relations: { permissions: true } });
      if (!existing) {
        existing = await this.roleRepo.save(this.roleRepo.create(r));
        existing.permissions = [];
      }

      const requiredSlugs = rolePermissionMapping[r.slug] || [];
      const currentSlugs = existing.permissions?.map(p => p.slug) || [];
      const needsUpdate = requiredSlugs.some(slug => !currentSlugs.includes(slug)) || currentSlugs.some(slug => !requiredSlugs.includes(slug));

      if (needsUpdate || !existing.permissions) {
        existing.permissions = requiredSlugs.map(slug => seededPermissions[slug]).filter(Boolean);
        await this.roleRepo.save(existing);
      }
    }
  }

  async findRoleBySlug(slug: string, workspaceId: string | null): Promise<Role> {
    let role = null;
    if (workspaceId) {
      role = await this.roleRepo.findOne({ where: { slug, workspaceId } });
    }
    if (!role) {
      role = await this.roleRepo.findOne({ where: { slug, isSystem: true } });
    }
    if (!role) {
      throw new NotFoundException(`Role "${slug}" not found`);
    }
    return role;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────


  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (await this.workspaceRepo.findOne({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateWorkspaceDto, ownerId: string): Promise<Workspace> {
    const baseSlug = dto.slug ?? this.generateSlug(dto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    // Check slug conflict if user manually provided one
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

    // Auto-add owner as a OWNER-role member
    const ownerRole = await this.findRoleBySlug('owner', null);
    const ownerMember = this.memberRepo.create({
      workspaceId: savedWorkspace.id,
      userId: ownerId,
      roleId: ownerRole.id,
    });
    await this.memberRepo.save(ownerMember);

    // 1.1 — Notify the creator
    await this.sendNotification(
      ownerId,
      NotificationType.WORKSPACE_CREATED,
      `Welcome! Your workspace ${savedWorkspace.name} has been created successfully.`,
      savedWorkspace.id,
      { workspaceName: savedWorkspace.name },
    );

    return savedWorkspace;
  }

  // ─── Find all workspaces for a user ───────────────────────────────────────

  async findAllForUser(userId: string): Promise<Workspace[]> {
    const memberships = await this.memberRepo.find({
      where: { userId, status: 'joined' },
      relations: { workspace: true },
    });
    return memberships.map((m) => m.workspace);
  }

  // ─── Find one ─────────────────────────────────────────────────────────────

  async findOne(id: string, userId: string): Promise<Workspace> {
    await this.ensureMember(id, userId);
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
    await this.ensureMember(workspace.id, userId);
    return workspace;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateWorkspaceDto, userId: string): Promise<Workspace> {
    await this.ensurePermission(id, userId, 'workspace.update');

    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    if (dto.slug && dto.slug !== workspace.slug) {
      const existing = await this.workspaceRepo.findOne({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    Object.assign(workspace, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
    });

    return this.workspaceRepo.save(workspace).then(async (saved) => {
      // 1.2 — Notify all workspace members
      const memberIds = await this.getWorkspaceMemberUserIds(id, userId);
      await this.sendNotificationToMany(
        memberIds,
        NotificationType.WORKSPACE_UPDATED,
        `Workspace ${saved.name} settings have been updated.`,
        id,
        { workspaceName: saved.name },
      );
      return saved;
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(id: string, userId: string): Promise<void> {
    await this.ensurePermission(id, userId, 'workspace.delete');
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    // 1.3 — Notify all members (except owner) before deleting
    const memberIds = await this.getWorkspaceMemberUserIds(id, userId);
    await this.sendNotificationToMany(
      memberIds,
      NotificationType.WORKSPACE_DELETED,
      `The workspace ${workspace.name} has been deleted by the owner.`,
      null,
      { workspaceName: workspace.name },
    );

    await this.workspaceRepo.remove(workspace);
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  async getMembers(workspaceId: string, userId: string): Promise<WorkspaceMember[]> {
    await this.ensureMember(workspaceId, userId);
    return this.memberRepo.find({
      where: { workspaceId, status: 'joined' },
      relations: { user: true, role: { permissions: true } },
      order: { joinedAt: 'ASC' },
    });
  }

  async inviteMember(
    workspaceId: string,
    dto: InviteMemberDto,
    requesterId: string,
  ): Promise<WorkspaceMember> {
    await this.ensurePermission(workspaceId, requesterId, 'member.invite');

    const user = await this.usersService.findOneByUsername(dto.username);
    if (!user) {
      throw new NotFoundException(`User "${dto.username}" not found`);
    }

    const existing = await this.memberRepo.findOne({
      where: { workspaceId, userId: user.id },
    });
    if (existing) {
      if (existing.status === 'pending') {
        throw new ConflictException('User already has a pending invitation');
      }
      throw new ConflictException('User is already a member of this workspace');
    }

    const role = await this.findRoleBySlug(dto.role, workspaceId);
    if (role.slug === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot invite a user as Owner');
    }

    const member = this.memberRepo.create({
      workspaceId,
      userId: user.id,
      roleId: role.id,
      status: 'pending',
      invitedById: requesterId,
    });
    const saved = await this.memberRepo.save(member);
    saved.user = user;
    saved.role = role;

    // 2.1 — Notify invited user
    const workspace = await this.workspaceRepo.findOne({ where: { id: workspaceId } });
    await this.sendNotification(
      user.id,
      NotificationType.MEMBER_INVITED,
      `You've been invited to join ${workspace?.name ?? 'a workspace'} as ${role.name}.`,
      workspaceId,
      { role: role.name, invitedBy: requesterId },
    );

    return saved;
  }

  async bulkImportMembers(
    workspaceId: string,
    dto: BulkImportMembersDto,
    requesterId: string,
  ): Promise<{ success: any[]; failed: any[] }> {
    await this.ensurePermission(workspaceId, requesterId, 'member.invite');

    const success = [];
    const failed = [];

    for (const item of dto.members) {
      try {
        let user = await this.usersService.findOneByUsername(item.username);
        let isNew = false;
        if (!user) {
          user = await this.usersService.create(item.username, dto.password, true);
          isNew = true;
        }

        const existing = await this.memberRepo.findOne({
          where: { workspaceId, userId: user.id },
        });

        if (existing) {
          failed.push({
            username: item.username,
            error: 'User is already a member of this workspace',
          });
          continue;
        }

        const roleSlug = item.role || 'viewer';
        const role = await this.findRoleBySlug(roleSlug, workspaceId);
        if (role.slug === WorkspaceRole.OWNER) {
          failed.push({
            username: item.username,
            error: 'Cannot import a user as Owner',
          });
          continue;
        }

        const member = this.memberRepo.create({
          workspaceId,
          userId: user.id,
          roleId: role.id,
          status: 'joined',
          invitedById: requesterId,
        });

        const saved = await this.memberRepo.save(member);
        success.push({
          username: item.username,
          isNew,
          memberId: saved.id,
          role: role.name,
        });
      } catch (err) {
        failed.push({
          username: item.username,
          error: err.message || 'Import failed',
        });
      }
    }

    // 2.8 / 2.9 / 2.10 — Bulk import notifications
    const workspace = await this.workspaceRepo.findOne({ where: { id: workspaceId } });
    const wsName = workspace?.name ?? 'the workspace';
    for (const item of success) {
      const user = await this.usersService.findOneByUsername(item.username);
      if (user) {
        if (item.isNew) {
          // 2.8 — New user: welcome + change password
          await this.sendNotification(
            user.id,
            NotificationType.BULK_IMPORT_CHANGE_PASSWORD,
            `Welcome to SEM! You've been added to ${wsName}. Please change your default password for security.`,
            workspaceId,
            { workspaceName: wsName, role: item.role },
          );
        } else {
          // 2.9 — Existing user added
          await this.sendNotification(
            user.id,
            NotificationType.BULK_IMPORT_USER,
            `You've been added to ${wsName} as ${item.role}.`,
            workspaceId,
            { workspaceName: wsName, role: item.role },
          );
        }
      }
    }
    // 2.10 — Notify the admin who ran the import
    await this.sendNotification(
      requesterId,
      NotificationType.BULK_IMPORT_COMPLETED,
      `Bulk import completed: ${success.length} added, ${failed.length} failed.`,
      workspaceId,
      { successCount: success.length, failedCount: failed.length },
    );

    return { success, failed };
  }

  async joinWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    const workspace = await this.workspaceRepo.findOne({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const existing = await this.memberRepo.findOne({
      where: { workspaceId, userId },
      relations: { user: true, role: true },
    });
    if (existing) {
      if (existing.status === 'pending') {
        existing.status = 'joined';
        return this.memberRepo.save(existing);
      }
      return existing;
    }

    const role = await this.findRoleBySlug('viewer', workspaceId);

    const member = this.memberRepo.create({
      workspaceId,
      userId,
      roleId: role.id,
      status: 'joined',
    });
    const saved = await this.memberRepo.save(member);

    const fullMember = await this.memberRepo.findOne({
      where: { id: saved.id },
      relations: { user: true, role: true },
    });

    // 2.5 — Notify workspace admins/owner that a user joined
    const adminIds = await this.getWorkspaceAdminUserIds(workspaceId);
    await this.sendNotificationToMany(
      adminIds.filter((id) => id !== userId),
      NotificationType.MEMBER_JOINED,
      `${fullMember!.user.username} joined ${workspace.name}.`,
      workspaceId,
      { username: fullMember!.user.username },
    );

    return fullMember!;
  }

  async getPendingInvitations(userId: string): Promise<WorkspaceMember[]> {
    return this.memberRepo.find({
      where: { userId, status: 'pending' },
      relations: { workspace: true },
    });
  }

  async acceptInvitation(workspaceId: string, userId: string): Promise<WorkspaceMember> {
    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId, status: 'pending' },
      relations: { user: true, role: true, workspace: true },
    });
    if (!member) {
      throw new NotFoundException('Invitation not found or already accepted/rejected');
    }
    member.status = 'joined';
    const saved = await this.memberRepo.save(member);

    // 2.3 — Notify the user who joined
    await this.sendNotification(
      userId,
      NotificationType.INVITATION_ACCEPTED,
      `You joined the ${member.workspace.name} workspace.`,
      workspaceId,
      { workspaceName: member.workspace.name },
    );

    // 2.2 — Notify the inviter
    if (member.invitedById) {
      await this.sendNotification(
        member.invitedById,
        NotificationType.INVITATION_ACCEPTED,
        `${member.user.username} accepted your invitation to the ${member.workspace.name} workspace.`,
        workspaceId,
        { username: member.user.username, workspaceName: member.workspace.name },
      );
    }

    return saved;
  }

  async rejectInvitation(workspaceId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId, status: 'pending' },
      relations: { user: true, workspace: true },
    });
    if (!member) {
      throw new NotFoundException('Invitation not found or already accepted/rejected');
    }

    // 2.4 — Notify the inviter
    if (member.invitedById) {
      await this.sendNotification(
        member.invitedById,
        NotificationType.INVITATION_REJECTED,
        `${member.user.username} rejected your invitation to the ${member.workspace.name} workspace.`,
        workspaceId,
        { username: member.user.username, workspaceName: member.workspace.name },
      );
    }

    await this.memberRepo.remove(member);
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markNotificationsRead(userId: string): Promise<void> {
    await this.notificationRepo.update({ userId, isRead: false }, { isRead: true });
  }

  // ─── Notification Helpers ────────────────────────────────────────────────────

  /**
   * Send a single notification to one user.
   */
  private async sendNotification(
    userId: string,
    type: NotificationType,
    message: string,
    workspaceId?: string | null,
    metadata?: Record<string, any> | null,
  ): Promise<void> {
    const notification = this.notificationRepo.create({
      userId,
      type,
      message,
      icon: NOTIFICATION_ICONS[type] || null,
      workspaceId: workspaceId ?? null,
      metadata: metadata ?? null,
    });
    await this.notificationRepo.save(notification);
  }

  /**
   * Send the same notification to multiple users at once.
   */
  private async sendNotificationToMany(
    userIds: string[],
    type: NotificationType,
    message: string,
    workspaceId?: string | null,
    metadata?: Record<string, any> | null,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const uniqueIds = [...new Set(userIds)];
    const notifications = uniqueIds.map((uid) =>
      this.notificationRepo.create({
        userId: uid,
        type,
        message,
        icon: NOTIFICATION_ICONS[type] || null,
        workspaceId: workspaceId ?? null,
        metadata: metadata ?? null,
      }),
    );
    await this.notificationRepo.save(notifications);
  }

  /**
   * Get all member user IDs for a workspace (status = 'joined').
   */
  private async getWorkspaceMemberUserIds(workspaceId: string, excludeUserId?: string): Promise<string[]> {
    const members = await this.memberRepo.find({
      where: { workspaceId, status: 'joined' },
      select: { userId: true },
    });
    const ids = members.map((m) => m.userId);
    if (excludeUserId) return ids.filter((id) => id !== excludeUserId);
    return ids;
  }

  /**
   * Get admin/owner user IDs for a workspace.
   */
  private async getWorkspaceAdminUserIds(workspaceId: string): Promise<string[]> {
    const members = await this.memberRepo.find({
      where: { workspaceId, status: 'joined' },
      relations: { role: true },
    });
    return members
      .filter((m) => MANAGEMENT_ROLES.includes(m.role.slug))
      .map((m) => m.userId);
  }

  /**
   * Get all player user IDs for a given team.
   */
  private async getTeamPlayerUserIds(teamId: string): Promise<string[]> {
    const players = await this.playerRepo.find({
      where: { teamId },
      select: { userId: true },
    });
    return players.map((p) => p.userId);
  }

  /**
   * Get player user IDs for multiple teams.
   */
  private async getTeamsPlayerUserIds(teamIds: string[]): Promise<string[]> {
    if (teamIds.length === 0) return [];
    const players = await this.playerRepo.find({
      where: { teamId: In(teamIds) },
      select: { userId: true },
    });
    return [...new Set(players.map((p) => p.userId))];
  }

  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
    requesterId: string,
  ): Promise<WorkspaceMember> {
    await this.ensurePermission(workspaceId, requesterId, 'member.update');

    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId: targetUserId },
      relations: { user: true, role: true },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role.slug === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot change the role of the workspace Owner');
    }

    const role = await this.findRoleBySlug(dto.role, workspaceId);
    if (role.slug === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot set a member role to Owner');
    }

    member.roleId = role.id;
    member.role = role;
    const saved = await this.memberRepo.save(member);

    // 2.6 — Notify the affected member
    const workspace = await this.workspaceRepo.findOne({ where: { id: workspaceId } });
    await this.sendNotification(
      targetUserId,
      NotificationType.MEMBER_ROLE_CHANGED,
      `Your role in ${workspace?.name ?? 'the workspace'} has been changed to ${role.name}.`,
      workspaceId,
      { newRole: role.name, workspaceName: workspace?.name },
    );

    return saved;
  }

  async removeMember(
    workspaceId: string,
    targetUserId: string,
    requesterId: string,
  ): Promise<void> {
    await this.ensurePermission(workspaceId, requesterId, 'member.remove');

    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId: targetUserId },
      relations: { role: true },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role.slug === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot remove the workspace owner');
    }

    // 2.7 — Notify the removed member
    const workspace = await this.workspaceRepo.findOne({ where: { id: workspaceId } });
    await this.sendNotification(
      targetUserId,
      NotificationType.MEMBER_REMOVED,
      `You have been removed from the ${workspace?.name ?? 'workspace'} workspace.`,
      null,
      { workspaceName: workspace?.name },
    );

    await this.memberRepo.remove(member);
  }

  // ─── Roles Management ──────────────────────────────────────────────────────

  async getRoles(workspaceId: string, userId: string): Promise<Role[]> {
    await this.ensureMember(workspaceId, userId);
    return this.roleRepo.find({
      where: [
        { isSystem: true },
        { workspaceId },
      ],
      relations: { permissions: true },
      order: { isSystem: 'DESC', name: 'ASC' },
    });
  }

  async createRole(workspaceId: string, dto: CreateRoleDto, userId: string): Promise<Role> {
    await this.ensurePermission(workspaceId, userId, 'role.manage');
    const slug = this.generateSlug(dto.name);

    // check slug conflict
    const existing = await this.roleRepo.findOne({
      where: [
        { slug, workspaceId },
        { slug, isSystem: true },
      ],
    });
    if (existing) {
      throw new ConflictException(`Role with name "${dto.name}" already exists`);
    }

    const role = this.roleRepo.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      isSystem: false,
      workspaceId,
    });
    return this.roleRepo.save(role);
  }

  async removeRole(workspaceId: string, roleId: string, userId: string): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'role.manage');
    const role = await this.roleRepo.findOne({ where: { id: roleId, workspaceId } });
    if (!role) {
      throw new NotFoundException('Role not found or is a system role');
    }

    // Check if any member has this role assigned
    const assigned = await this.memberRepo.findOne({ where: { roleId } });
    if (assigned) {
      throw new ForbiddenException('Cannot delete role as it is assigned to members');
    }

    await this.roleRepo.remove(role);
  }

  // ─── Global System Roles Management ────────────────────────────────────────

  async getGlobalRoles(): Promise<Role[]> {
    return this.roleRepo.find({
      where: { workspaceId: IsNull() },
      relations: { permissions: true },
      order: { isSystem: 'DESC', name: 'ASC' },
    });
  }

  async createGlobalRole(dto: CreateRoleDto): Promise<Role> {
    const slug = this.generateSlug(dto.name);
    const existing = await this.roleRepo.findOne({
      where: { slug, workspaceId: IsNull() },
    });
    if (existing) {
      throw new ConflictException(`Global role with name "${dto.name}" already exists`);
    }

    const role = this.roleRepo.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      isSystem: true,
      workspaceId: null,
    });
    return this.roleRepo.save(role);
  }

  async removeGlobalRole(roleId: string): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id: roleId, workspaceId: IsNull() } });
    if (!role) {
      throw new NotFoundException('Global role not found');
    }

    // Check if any member has this role assigned
    const assigned = await this.memberRepo.findOne({ where: { roleId } });
    if (assigned) {
      throw new ForbiddenException('Cannot delete role as it is assigned to members');
    }

    await this.roleRepo.remove(role);
  }

  // ─── Global System Permissions Management ──────────────────────────────────

  async getGlobalPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find({
      order: { name: 'ASC' },
    });
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (!permissionIds || permissionIds.length === 0) {
      role.permissions = [];
    } else {
      const permissions = await this.permissionRepo.find({
        where: permissionIds.map(id => ({ id })),
      });
      role.permissions = permissions;
    }

    return this.roleRepo.save(role);
  }

  // ─── Access Guards ────────────────────────────────────────────────────────


  async ensureMember(workspaceId: string, userId: string): Promise<WorkspaceMember> {
    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId, status: 'joined' },
      relations: { role: true },
    });
    if (!member) throw new ForbiddenException('You are not a member of this workspace');
    return member;
  }

  private async ensureAdminOrOwner(workspaceId: string, userId: string): Promise<void> {
    const member = await this.ensureMember(workspaceId, userId);
    if (!MANAGEMENT_ROLES.includes(member.role.slug)) {
      throw new ForbiddenException('Only administrators and owners can perform this action');
    }
  }

  private async ensureOwner(workspaceId: string, userId: string): Promise<void> {
    const member = await this.ensureMember(workspaceId, userId);
    if (member.role.slug !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Only the workspace owner can perform this action');
    }
  }

  private async ensurePermission(workspaceId: string, userId: string, permissionSlug: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId, status: 'joined' },
      relations: { role: { permissions: true } },
    });
    if (!member) throw new ForbiddenException('You are not a member of this workspace');
    const hasPerm = member.role?.permissions?.some(p => p.slug === permissionSlug) ?? false;
    if (!hasPerm) {
      throw new ForbiddenException(`Permission denied: requires '${permissionSlug}'`);
    }
  }

  private async validateCompetitionContext(
    workspaceId: string,
    eventId: string,
    competitionId: string,
  ): Promise<Competition> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found in this workspace`);
    }
    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
      relations: { sport: true },
    });
    if (!competition) {
      throw new NotFoundException(`Competition "${competitionId}" not found in this event`);
    }
    return competition;
  }

  private async validateStageContext(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
  ): Promise<CompetitionStage> {
    await this.validateCompetitionContext(workspaceId, eventId, competitionId);
    const stage = await this.stageRepo.findOne({ where: { id: stageId, competitionId } });
    if (!stage) {
      throw new NotFoundException(`Stage "${stageId}" not found in this competition`);
    }
    return stage;
  }

  // ─── Teams Management ──────────────────────────────────────────────────────

  async getTeams(workspaceId: string, userId: string): Promise<Team[]> {
    await this.ensureMember(workspaceId, userId);
    return this.teamRepo.find({
      where: { workspaceId },
      order: { name: 'ASC' },
    });
  }

  async createTeam(workspaceId: string, dto: CreateTeamDto, userId: string): Promise<Team> {
    await this.ensurePermission(workspaceId, userId, 'team.manage');

    let code = dto.code;
    if (!code) {
      // Auto-generate code if not provided (e.g. WAR423)
      const prefix = (dto.name || 'TEM').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'T');
      code = prefix + Math.floor(100 + Math.random() * 900);
    }

    // Check code uniqueness
    let existing = await this.teamRepo.findOne({ where: { code } });
    if (existing) {
      if (dto.code) {
        throw new ConflictException(`Team code "${code}" is already taken`);
      } else {
        // Regenerate unique one
        const prefix = (dto.name || 'TEM').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'T');
        code = prefix + Math.floor(1000 + Math.random() * 9000);
      }
    }

    const team = this.teamRepo.create({
      name: dto.name,
      code,
      description: dto.description ?? null,
      logoUrl: dto.logoUrl ?? null,
      primaryColor: dto.primaryColor ?? null,
      secondaryColor: dto.secondaryColor ?? null,
      workspaceId,
    });
    const saved = await this.teamRepo.save(team);

    // 3.4 — Notify workspace members
    const memberIds = await this.getWorkspaceMemberUserIds(workspaceId, userId);
    await this.sendNotificationToMany(
      memberIds,
      NotificationType.TEAM_CREATED,
      `New team ${saved.name} has been created.`,
      workspaceId,
      { teamName: saved.name, teamId: saved.id },
    );

    return saved;
  }

  async updateTeam(
    workspaceId: string,
    teamId: string,
    dto: UpdateTeamDto,
    userId: string,
  ): Promise<Team> {
    await this.ensurePermission(workspaceId, userId, 'team.manage');
    const team = await this.teamRepo.findOne({ where: { id: teamId, workspaceId } });
    if (!team) {
      throw new NotFoundException('Team not found in this workspace');
    }

    // Check code uniqueness if changing
    if (dto.code && dto.code !== team.code) {
      const existing = await this.teamRepo.findOne({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException(`Team code "${dto.code}" is already taken`);
      }
    }

    Object.assign(team, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
      ...(dto.secondaryColor !== undefined && { secondaryColor: dto.secondaryColor }),
    });

    return this.teamRepo.save(team);
  }

  async removeTeam(workspaceId: string, teamId: string, userId: string): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'team.manage');
    const team = await this.teamRepo.findOne({ where: { id: teamId, workspaceId } });
    if (!team) {
      throw new NotFoundException('Team not found in this workspace');
    }
    // 3.5 — Notify team players before deleting
    const playerUserIds = await this.getTeamPlayerUserIds(teamId);
    await this.sendNotificationToMany(
      playerUserIds,
      NotificationType.TEAM_DELETED,
      `Team ${team.name} has been deleted.`,
      workspaceId,
      { teamName: team.name },
    );

    await this.teamRepo.remove(team);
  }

  async getTeamStats(workspaceId: string, teamId: string, userId: string) {
    await this.ensureMember(workspaceId, userId);

    const team = await this.teamRepo.findOne({ where: { id: teamId, workspaceId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // 1. Find all competitions this team is registered in
    const compTeams = await this.memberRepo.manager.find(CompetitionTeam, {
      where: { teamId },
      relations: {
        competition: {
          sport: true
        }
      }
    });

    const competitionIds = compTeams.map(ct => ct.competitionId);

    // 2. Fetch squad/players of this team
    const squad = await this.playerRepo.find({
      where: { teamId },
      relations: { user: true }
    });
    const squadPlayerIds = squad.map(p => p.id);
    const squadUserIds = squad.map(p => p.userId);
    const squadUsernames = squad.map(p => p.user?.username).filter(Boolean) as string[];

    // 3. Fetch completed matches involving this team
    const matches = await this.matchRepo.find({
      where: [
        { homeTeamId: teamId, status: 'completed' },
        { awayTeamId: teamId, status: 'completed' }
      ],
      relations: {
        stage: {
          competition: {
            sport: true
          }
        },
        homeTeam: true,
        awayTeam: true
      }
    });

    const matchIds = matches.map(m => m.id);

    // 4. Fetch all rated match players from our team in these matches
    let squadMatchPlayers: MatchPlayer[] = [];
    if (matchIds.length > 0 && squadPlayerIds.length > 0) {
      squadMatchPlayers = await this.matchPlayerRepo.find({
        where: { matchId: In(matchIds), playerId: In(squadPlayerIds), isPlaying: true },
        relations: { player: { user: true } }
      });
    }

    // Calculate maximum rating for each match in the completed matches to find MVPs
    const maxRatings = new Map<string, number>();
    if (matchIds.length > 0) {
      const allMatchPlayersInMatches = await this.matchPlayerRepo.find({
        where: { matchId: In(matchIds), isPlaying: true }
      });
      for (const amp of allMatchPlayersInMatches) {
        if (amp.rating !== null) {
          const rVal = Number(amp.rating);
          const currentMax = maxRatings.get(amp.matchId) ?? -1;
          if (rVal > currentMax) {
            maxRatings.set(amp.matchId, rVal);
          }
        }
      }
    }

    // Career totals
    let allTimeGoals = 0;
    let allTimeAssists = 0;
    let allTimeRuns = 0;
    let allTimeWickets = 0;
    let allTimeRalliesWon = 0;
    let allTimeRalliesLost = 0;
    let allTimeMvps = 0;

    // Process goals & other stats from matches
    for (const m of matches) {
      const sport = m.stage?.competition?.sport?.code ?? 'football';
      const liveData = m.liveData || {};

      if (sport === 'football') {
        const isHome = m.homeTeamId === teamId;
        allTimeGoals += isHome ? m.homeScore : m.awayScore;

        const events = liveData.events || [];
        for (const ev of events) {
          const isSelfAssist = (ev.assistPlayerUserId && squadUserIds.includes(ev.assistPlayerUserId)) ||
            (ev.assistPlayerId && squadPlayerIds.includes(ev.assistPlayerId));
          if (ev.type === 'goal' && ev.goalType !== 'own_goal' && isSelfAssist) {
            allTimeAssists++;
          } else if (ev.type === 'assist' && isSelfAssist) {
            allTimeAssists++;
          }
        }
      } else if (sport === 'cricket') {
        const inningsList = liveData.inningsData || [];
        for (const inn of inningsList) {
          const batStats = inn.batsmanStats || {};
          for (const username of Object.keys(batStats)) {
            if (squadUsernames.includes(username)) {
              allTimeRuns += batStats[username]?.runs ?? 0;
            }
          }
          const bowlStats = inn.bowlerStats || {};
          for (const username of Object.keys(bowlStats)) {
            if (squadUsernames.includes(username)) {
              allTimeWickets += bowlStats[username]?.wickets ?? 0;
            }
          }
        }
      } else if (sport === 'badminton') {
        const rallies = liveData.rallies || [];
        const isHome = m.homeTeamId === teamId;
        for (const r of rallies) {
          if (r.winnerSide === 'none') continue;
          if (isHome) {
            if (r.winnerSide === 'home') allTimeRalliesWon++;
            else allTimeRalliesLost++;
          } else {
            if (r.winnerSide === 'away') allTimeRalliesWon++;
            else allTimeRalliesLost++;
          }
        }
      }
    }

    // Tally squad MVPs count
    for (const smp of squadMatchPlayers) {
      if (smp.rating !== null) {
        const rVal = Number(smp.rating);
        const maxR = maxRatings.get(smp.matchId);
        if (maxR !== undefined && rVal === maxR) {
          allTimeMvps++;
        }
      }
    }

    // Best player of this club in each sport
    // Group squadMatchPlayers by sport
    const sportRatings = new Map<string, Map<string, { ratings: number[]; player: Player }>>();
    for (const smp of squadMatchPlayers) {
      const matchObj = matches.find(m => m.id === smp.matchId);
      const sport = matchObj?.stage?.competition?.sport?.code ?? 'football';
      if (smp.rating === null) continue;

      if (!sportRatings.has(sport)) {
        sportRatings.set(sport, new Map());
      }
      const playersInSport = sportRatings.get(sport)!;
      if (!playersInSport.has(smp.playerId)) {
        playersInSport.set(smp.playerId, { ratings: [], player: smp.player! });
      }
      playersInSport.get(smp.playerId)!.ratings.push(Number(smp.rating));
    }

    const bestPlayers: Record<string, { playerId: string; playerName: string; avatarUrl?: string | null; avgRating: number; appearances: number } | null> = {
      football: null,
      cricket: null,
      badminton: null
    };

    for (const [sport, playersMap] of sportRatings.entries()) {
      let topAvgRating = -1;
      let topPlayerInfo: any = null;

      for (const [playerId, data] of playersMap.entries()) {
        const avg = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
        if (avg > topAvgRating) {
          topAvgRating = avg;
          topPlayerInfo = {
            playerId,
            playerName: data.player.user?.username ?? data.player.jerseyNumber?.toString() ?? 'Player',
            avatarUrl: data.player.user?.avatarUrl,
            avgRating: Math.round(avg * 100) / 100,
            appearances: data.ratings.length
          };
        }
      }
      bestPlayers[sport] = topPlayerInfo;
    }

    // Statistics by Competition
    const competitionsStatsList: any[] = [];
    for (const ct of compTeams) {
      const comp = ct.competition;
      const compMatches = matches.filter(m => m.stage?.competitionId === comp.id);

      let compGoals = 0;
      let compAssists = 0;
      let compRuns = 0;
      let compWickets = 0;
      let compRalliesWon = 0;
      let compRalliesLost = 0;
      let compMvps = 0;

      for (const m of compMatches) {
        const liveData = m.liveData || {};
        if (comp.sport?.code === 'football') {
          const isHome = m.homeTeamId === teamId;
          compGoals += isHome ? m.homeScore : m.awayScore;

          const events = liveData.events || [];
          for (const ev of events) {
            const isSelfAssist = (ev.assistPlayerUserId && squadUserIds.includes(ev.assistPlayerUserId)) ||
              (ev.assistPlayerId && squadPlayerIds.includes(ev.assistPlayerId));
            if (ev.type === 'goal' && ev.goalType !== 'own_goal' && isSelfAssist) {
              compAssists++;
            } else if (ev.type === 'assist' && isSelfAssist) {
              compAssists++;
            }
          }
        } else if (comp.sport?.code === 'cricket') {
          const inningsList = liveData.inningsData || [];
          for (const inn of inningsList) {
            const batStats = inn.batsmanStats || {};
            for (const username of Object.keys(batStats)) {
              if (squadUsernames.includes(username)) {
                compRuns += batStats[username]?.runs ?? 0;
              }
            }
            const bowlStats = inn.bowlerStats || {};
            for (const username of Object.keys(bowlStats)) {
              if (squadUsernames.includes(username)) {
                compWickets += bowlStats[username]?.wickets ?? 0;
              }
            }
          }
        } else if (comp.sport?.code === 'badminton') {
          const rallies = liveData.rallies || [];
          const isHome = m.homeTeamId === teamId;
          for (const r of rallies) {
            if (r.winnerSide === 'none') continue;
            if (isHome) {
              if (r.winnerSide === 'home') compRalliesWon++;
              else compRalliesLost++;
            } else {
              if (r.winnerSide === 'away') compRalliesWon++;
              else compRalliesLost++;
            }
          }
        }
      }

      // Tally MVPs for this competition
      const compMatchIds = compMatches.map(m => m.id);
      const compSquadMatchPlayers = squadMatchPlayers.filter(smp => compMatchIds.includes(smp.matchId));
      for (const smp of compSquadMatchPlayers) {
        if (smp.rating !== null) {
          const rVal = Number(smp.rating);
          const maxR = maxRatings.get(smp.matchId);
          if (maxR !== undefined && rVal === maxR) {
            compMvps++;
          }
        }
      }

      // Best player for this team in this competition
      const compPlayerRatings = new Map<string, { ratings: number[]; player: Player }>();
      for (const smp of compSquadMatchPlayers) {
        if (smp.rating === null) continue;
        if (!compPlayerRatings.has(smp.playerId)) {
          compPlayerRatings.set(smp.playerId, { ratings: [], player: smp.player! });
        }
        compPlayerRatings.get(smp.playerId)!.ratings.push(Number(smp.rating));
      }

      let compBestPlayer: any = null;
      let compTopAvgRating = -1;
      for (const [playerId, data] of compPlayerRatings.entries()) {
        const avg = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
        if (avg > compTopAvgRating) {
          compTopAvgRating = avg;
          compBestPlayer = {
            playerId,
            playerName: data.player.user?.username ?? data.player.jerseyNumber?.toString() ?? 'Player',
            avatarUrl: data.player.user?.avatarUrl,
            avgRating: Math.round(avg * 100) / 100,
            appearances: data.ratings.length
          };
        }
      }

      competitionsStatsList.push({
        competitionId: comp.id,
        competitionName: comp.name,
        sportCode: comp.sport?.code ?? 'football',
        gamesPlayed: compMatches.length,
        goals: compGoals,
        assists: compAssists,
        runs: compRuns,
        wickets: compWickets,
        ralliesWon: compRalliesWon,
        ralliesLost: compRalliesLost,
        mvps: compMvps,
        bestPlayer: compBestPlayer
      });
    }

    return {
      team: {
        id: team.id,
        name: team.name,
        code: team.code,
        logoUrl: team.logoUrl,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        createdAt: team.createdAt
      },
      allTime: {
        participations: competitionIds.length,
        totalGames: matches.length,
        goals: allTimeGoals,
        assists: allTimeAssists,
        runs: allTimeRuns,
        wickets: allTimeWickets,
        ralliesWon: allTimeRalliesWon,
        ralliesLost: allTimeRalliesLost,
        mvps: allTimeMvps
      },
      bestPlayers,
      competitions: competitionsStatsList,
      squad: squad.map(p => ({
        id: p.id,
        jerseyNumber: p.jerseyNumber,
        user: {
          id: p.user?.id,
          username: p.user?.username,
          avatarUrl: p.user?.avatarUrl
        }
      }))
    };
  }

  async getPlayerStats(workspaceId: string, playerId: string, userId: string) {
    await this.ensureMember(workspaceId, userId);

    const player = await this.playerRepo.findOne({
      where: { id: playerId, workspaceId },
      relations: { user: true, team: true }
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // 1. Find all competitions this team is registered in
    const compTeams = await this.memberRepo.manager.find(CompetitionTeam, {
      where: { teamId: player.teamId },
      relations: {
        competition: {
          sport: true
        }
      }
    });

    const competitionIds = compTeams.map(ct => ct.competitionId);

    // 2. Fetch all completed match-player entries for this player
    const completedMatchPlayers = await this.matchPlayerRepo.find({
      where: { playerId, isPlaying: true, match: { status: 'completed' } },
      relations: {
        match: {
          stage: {
            competition: {
              sport: true
            }
          },
          homeTeam: true,
          awayTeam: true
        }
      }
    });

    const matchIds = completedMatchPlayers.map(mp => mp.matchId);

    // 3. Fetch all ratings in these matches to calculate MVPs
    const maxRatings = new Map<string, number>();
    if (matchIds.length > 0) {
      const allMatchPlayersInMatches = await this.matchPlayerRepo.find({
        where: { matchId: In(matchIds), isPlaying: true }
      });
      for (const amp of allMatchPlayersInMatches) {
        if (amp.rating !== null) {
          const rVal = Number(amp.rating);
          const currentMax = maxRatings.get(amp.matchId) ?? -1;
          if (rVal > currentMax) {
            maxRatings.set(amp.matchId, rVal);
          }
        }
      }
    }

    // Career totals
    let allTimeGames = completedMatchPlayers.length;
    let allTimeGoals = 0;
    let allTimeAssists = 0;
    let allTimeYellowCards = 0;
    let allTimeRedCards = 0;
    let allTimeRuns = 0;
    let allTimeWickets = 0;
    let allTimeRalliesWon = 0;
    let allTimeRalliesLost = 0;
    let allTimeMvps = 0;

    // Ratings variables
    let totalRatingPoints = 0;
    let ratedMatchesCount = 0;

    // Process all-time stats
    for (const cmp of completedMatchPlayers) {
      const m = cmp.match;
      if (!m) continue;
      const sport = m.stage?.competition?.sport?.code ?? 'football';
      const liveData = m.liveData || {};

      // MVP calculation
      if (cmp.rating !== null) {
        const rVal = Number(cmp.rating);
        totalRatingPoints += rVal;
        ratedMatchesCount++;

        const maxR = maxRatings.get(cmp.matchId);
        if (maxR !== undefined && rVal === maxR) {
          allTimeMvps++;
        }
      }

      if (sport === 'football') {
        const events = liveData.events || [];
        for (const ev of events) {
          const isSelfScorer = (ev.playerUserId === player.userId) || (ev.playerId === player.id);
          const isSelfAssist = (ev.assistPlayerUserId === player.userId) || (ev.assistPlayerId === player.id);

          if (ev.type === 'goal' && ev.goalType !== 'own_goal' && isSelfScorer) {
            allTimeGoals++;
          }
          if ((ev.type === 'goal' && ev.goalType !== 'own_goal' && isSelfAssist) || (ev.type === 'assist' && isSelfAssist)) {
            allTimeAssists++;
          }
          if (ev.type === 'card' && isSelfScorer) {
            if (ev.cardType === 'yellow') {
              allTimeYellowCards++;
            } else if (ev.cardType === 'red' || ev.cardType === 'second_yellow') {
              allTimeRedCards++;
            }
          }
        }
      } else if (sport === 'cricket') {
        const inningsList = liveData.inningsData || [];
        for (const inn of inningsList) {
          const batStats = inn.batsmanStats || {};
          if (player.user?.username && batStats[player.user.username]) {
            allTimeRuns += batStats[player.user.username]?.runs ?? 0;
          }
          const bowlStats = inn.bowlerStats || {};
          if (player.user?.username && bowlStats[player.user.username]) {
            allTimeWickets += bowlStats[player.user.username]?.wickets ?? 0;
          }
        }
      } else if (sport === 'badminton') {
        const rallies = liveData.rallies || [];
        const isHome = m.homeTeamId === player.teamId;
        for (const r of rallies) {
          if (r.winnerSide === 'none') continue;
          if (isHome) {
            if (r.winnerSide === 'home') allTimeRalliesWon++;
            else allTimeRalliesLost++;
          } else {
            if (r.winnerSide === 'away') allTimeRalliesWon++;
            else allTimeRalliesLost++;
          }
        }
      }
    }

    const allTimeAvgRating = ratedMatchesCount > 0 ? Math.round((totalRatingPoints / ratedMatchesCount) * 100) / 100 : null;

    // Statistics by Competition
    const competitionsStatsList: any[] = [];
    for (const ct of compTeams) {
      const comp = ct.competition;
      const compMatchPlayers = completedMatchPlayers.filter(cmp => cmp.match?.stage?.competitionId === comp.id);

      let compGoals = 0;
      let compAssists = 0;
      let compYellowCards = 0;
      let compRedCards = 0;
      let compRuns = 0;
      let compWickets = 0;
      let compRalliesWon = 0;
      let compRalliesLost = 0;
      let compMvps = 0;
      let compTotalRatingPoints = 0;
      let compRatedMatchesCount = 0;

      for (const cmp of compMatchPlayers) {
        const m = cmp.match;
        if (!m) continue;
        const liveData = m.liveData || {};

        if (cmp.rating !== null) {
          const rVal = Number(cmp.rating);
          compTotalRatingPoints += rVal;
          compRatedMatchesCount++;

          const maxR = maxRatings.get(cmp.matchId);
          if (maxR !== undefined && rVal === maxR) {
            compMvps++;
          }
        }

        if (comp.sport?.code === 'football') {
          const events = liveData.events || [];
          for (const ev of events) {
            const isSelfScorer = (ev.playerUserId === player.userId) || (ev.playerId === player.id);
            const isSelfAssist = (ev.assistPlayerUserId === player.userId) || (ev.assistPlayerId === player.id);

            if (ev.type === 'goal' && ev.goalType !== 'own_goal' && isSelfScorer) {
              compGoals++;
            }
            if ((ev.type === 'goal' && ev.goalType !== 'own_goal' && isSelfAssist) || (ev.type === 'assist' && isSelfAssist)) {
              compAssists++;
            }
            if (ev.type === 'card' && isSelfScorer) {
              if (ev.cardType === 'yellow') {
                compYellowCards++;
              } else if (ev.cardType === 'red' || ev.cardType === 'second_yellow') {
                compRedCards++;
              }
            }
          }
        } else if (comp.sport?.code === 'cricket') {
          const inningsList = liveData.inningsData || [];
          for (const inn of inningsList) {
            const batStats = inn.batsmanStats || {};
            if (player.user?.username && batStats[player.user.username]) {
              compRuns += batStats[player.user.username]?.runs ?? 0;
            }
            const bowlStats = inn.bowlerStats || {};
            if (player.user?.username && bowlStats[player.user.username]) {
              compWickets += bowlStats[player.user.username]?.wickets ?? 0;
            }
          }
        } else if (comp.sport?.code === 'badminton') {
          const rallies = liveData.rallies || [];
          const isHome = m.homeTeamId === player.teamId;
          for (const r of rallies) {
            if (r.winnerSide === 'none') continue;
            if (isHome) {
              if (r.winnerSide === 'home') compRalliesWon++;
              else compRalliesLost++;
            } else {
              if (r.winnerSide === 'away') compRalliesWon++;
              else compRalliesLost++;
            }
          }
        }
      }

      const compAvgRating = compRatedMatchesCount > 0 ? Math.round((compTotalRatingPoints / compRatedMatchesCount) * 100) / 100 : null;

      competitionsStatsList.push({
        competitionId: comp.id,
        competitionName: comp.name,
        sportCode: comp.sport?.code ?? 'football',
        gamesPlayed: compMatchPlayers.length,
        goals: compGoals,
        assists: compAssists,
        yellowCards: compYellowCards,
        redCards: compRedCards,
        runs: compRuns,
        wickets: compWickets,
        ralliesWon: compRalliesWon,
        ralliesLost: compRalliesLost,
        mvps: compMvps,
        avgRating: compAvgRating
      });
    }

    return {
      player: {
        id: player.id,
        jerseyNumber: player.jerseyNumber,
        createdAt: player.createdAt,
        user: {
          id: player.user?.id,
          username: player.user?.username,
          avatarUrl: player.user?.avatarUrl
        },
        team: {
          id: player.team?.id,
          name: player.team?.name,
          code: player.team?.code,
          logoUrl: player.team?.logoUrl,
          primaryColor: player.team?.primaryColor,
          secondaryColor: player.team?.secondaryColor
        }
      },
      allTime: {
        participations: competitionIds.length,
        totalGames: allTimeGames,
        goals: allTimeGoals,
        assists: allTimeAssists,
        yellowCards: allTimeYellowCards,
        redCards: allTimeRedCards,
        runs: allTimeRuns,
        wickets: allTimeWickets,
        ralliesWon: allTimeRalliesWon,
        ralliesLost: allTimeRalliesLost,
        mvps: allTimeMvps,
        avgRating: allTimeAvgRating
      },
      competitions: competitionsStatsList
    };
  }

  async getPlayers(workspaceId: string, userId: string): Promise<Player[]> {
    await this.ensureMember(workspaceId, userId);
    return this.playerRepo.find({
      where: { workspaceId },
      relations: { team: true, user: true },
      order: { user: { username: 'ASC' } },
    });
  }

  async createPlayer(workspaceId: string, dto: CreatePlayerDto, userId: string): Promise<Player> {
    await this.ensurePermission(workspaceId, userId, 'player.manage');
    const team = await this.teamRepo.findOne({ where: { id: dto.teamId, workspaceId } });
    if (!team) {
      throw new NotFoundException('Team not found in this workspace');
    }

    const user = await this.usersService.findOneById(dto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.playerRepo.findOne({ where: { teamId: dto.teamId, userId: dto.userId } });
    if (existing) {
      throw new ConflictException('This user is already registered as a player in this team');
    }

    const player = this.playerRepo.create({
      userId: dto.userId,
      jerseyNumber: dto.jerseyNumber ?? null,
      teamId: dto.teamId,
      workspaceId,
    });
    const saved = await this.playerRepo.save(player);
    saved.team = team;
    saved.user = user;

    // 3.1 — Notify the player
    const jerseyText = dto.jerseyNumber ? ` with jersey #${dto.jerseyNumber}` : '';
    await this.sendNotification(
      dto.userId,
      NotificationType.PLAYER_ADDED_TO_TEAM,
      `You've been added to team ${team.name}${jerseyText}.`,
      workspaceId,
      { teamName: team.name, teamId: team.id, jerseyNumber: dto.jerseyNumber },
    );

    return saved;
  }

  async updatePlayer(
    workspaceId: string,
    playerId: string,
    dto: UpdatePlayerDto,
    userId: string,
  ): Promise<Player> {
    await this.ensurePermission(workspaceId, userId, 'player.manage');
    const player = await this.playerRepo.findOne({ where: { id: playerId, workspaceId }, relations: { team: true, user: true } });
    if (!player) {
      throw new NotFoundException('Player not found in this workspace');
    }

    // 3.3 — If team changed, notify player of transfer
    const oldTeamName = player.team?.name;
    const isTransfer = dto.teamId !== undefined && dto.teamId !== player.teamId;

    if (dto.teamId !== undefined) {
      const team = await this.teamRepo.findOne({ where: { id: dto.teamId, workspaceId } });
      if (!team) {
        throw new NotFoundException('Team not found in this workspace');
      }

      const existing = await this.playerRepo.findOne({ where: { teamId: dto.teamId, userId: player.userId } });
      if (existing && existing.id !== player.id) {
        throw new ConflictException('This user is already registered as a player in the target team');
      }

      player.teamId = dto.teamId;
      player.team = team;
    }

    Object.assign(player, {
      ...(dto.jerseyNumber !== undefined && { jerseyNumber: dto.jerseyNumber }),
    });

    const saved = await this.playerRepo.save(player);

    if (isTransfer) {
      await this.sendNotification(
        player.userId,
        NotificationType.PLAYER_TRANSFERRED,
        `You've been transferred from ${oldTeamName} to ${player.team.name}.`,
        workspaceId,
        { oldTeam: oldTeamName, newTeam: player.team.name },
      );
    }

    return saved;
  }

  async removePlayer(workspaceId: string, playerId: string, userId: string): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'player.manage');
    const player = await this.playerRepo.findOne({ where: { id: playerId, workspaceId } });
    if (!player) {
      throw new NotFoundException('Player not found in this workspace');
    }

    // 3.2 — Notify the player
    const team = await this.teamRepo.findOne({ where: { id: player.teamId } });
    await this.sendNotification(
      player.userId,
      NotificationType.PLAYER_REMOVED_FROM_TEAM,
      `You've been removed from team ${team?.name ?? 'Unknown'}.`,
      workspaceId,
      { teamName: team?.name },
    );

    await this.playerRepo.remove(player);
  }

  // ─── Events Management ─────────────────────────────────────────────────────

  async getEvents(workspaceId: string, userId: string): Promise<Event[]> {
    await this.ensureMember(workspaceId, userId);
    return this.eventRepo.find({
      where: { workspaceId },
      relations: { teams: true },
      order: { name: 'ASC' },
    });
  }

  async createEvent(workspaceId: string, dto: CreateEventDto, userId: string): Promise<Event> {
    await this.ensurePermission(workspaceId, userId, 'event.manage');
    let teams: Team[] = [];
    if (dto.teamIds && dto.teamIds.length > 0) {
      teams = await this.teamRepo.findBy({ id: In(dto.teamIds), workspaceId });
      if (teams.length !== dto.teamIds.length) {
        throw new BadRequestException('Some teams were not found or do not belong to this workspace');
      }
    }
    const event = this.eventRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      status: dto.status ?? 'upcoming',
      logoUrl: dto.logoUrl ?? null,
      workspaceId,
      teams,
    });
    const saved = await this.eventRepo.save(event);

    // 4.1 — Notify workspace members of new event
    const memberIds = await this.getWorkspaceMemberUserIds(workspaceId, userId);
    await this.sendNotificationToMany(
      memberIds,
      NotificationType.EVENT_CREATED,
      `New event "${saved.name}" has been created.`,
      workspaceId,
      { eventId: saved.id, eventName: saved.name },
    );

    return saved;
  }

  async updateEvent(
    workspaceId: string,
    eventId: string,
    dto: UpdateEventDto,
    userId: string,
  ): Promise<Event> {
    await this.ensurePermission(workspaceId, userId, 'event.manage');
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
      relations: { teams: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found in this workspace');
    }

    const oldStatus = event.status;

    if (dto.teamIds !== undefined) {
      if (dto.teamIds.length > 0) {
        event.teams = await this.teamRepo.findBy({ id: In(dto.teamIds), workspaceId });
        if (event.teams.length !== dto.teamIds.length) {
          throw new BadRequestException('Some teams were not found or do not belong to this workspace');
        }
      } else {
        event.teams = [];
      }
    }

    Object.assign(event, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
      ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
    });

    const saved = await this.eventRepo.save(event);

    // 4.2 / 4.3 / 4.4 / 4.5 / 4.6 — Notify about status changes
    if (dto.status !== undefined && dto.status !== oldStatus) {
      const memberIds = await this.getWorkspaceMemberUserIds(workspaceId, userId);
      if (dto.status === 'ongoing') {
        await this.sendNotificationToMany(
          memberIds,
          NotificationType.EVENT_STARTED,
          `Event "${saved.name}" has started!`,
          workspaceId,
          { eventId: saved.id, eventName: saved.name },
        );
      } else if (dto.status === 'cancelled') {
        await this.sendNotificationToMany(
          memberIds,
          NotificationType.EVENT_CANCELLED,
          `Event "${saved.name}" has been cancelled.`,
          workspaceId,
          { eventId: saved.id, eventName: saved.name },
        );
      } else if (dto.status === 'completed') {
        await this.sendNotificationToMany(
          memberIds,
          NotificationType.EVENT_COMPLETED,
          `Event "${saved.name}" has been completed!`,
          workspaceId,
          { eventId: saved.id, eventName: saved.name },
        );

        // 4.5 & 4.6 — Determine Event Champions
        try {
          const standings = await this.getEventStandings(workspaceId, eventId, userId);
          if (standings && standings.length > 0) {
            const champion = standings[0];
            // Announcement to all
            await this.sendNotificationToMany(
              memberIds,
              NotificationType.EVENT_CHAMPION_ANNOUNCEMENT,
              `🏆 ${champion.teamName} has won the ${saved.name} event with ${champion.points} points!`,
              workspaceId,
              { eventId: saved.id, eventName: saved.name, championTeamId: champion.teamId, championTeamName: champion.teamName, points: champion.points },
            );
            // Notify winning team players
            const winningPlayers = await this.getTeamPlayerUserIds(champion.teamId);
            await this.sendNotificationToMany(
              winningPlayers,
              NotificationType.EVENT_CHAMPION,
              `🏆 Congratulations! Your team ${champion.teamName} is the overall champion of ${saved.name}!`,
              workspaceId,
              { eventId: saved.id, eventName: saved.name, points: champion.points },
            );
          }
        } catch (e) {
          // Ignore error silently to prevent blocking the event completion save
        }
      }
    }

    return saved;
  }

  async removeEvent(workspaceId: string, eventId: string, userId: string): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'event.manage');
    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
      throw new NotFoundException('Event not found in this workspace');
    }
    await this.eventRepo.remove(event);
  }

  async getEventStandings(workspaceId: string, eventId: string, userId: string): Promise<any> {
    await this.ensureMember(workspaceId, userId);
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
      relations: { teams: true, competitions: { stages: true } }
    });
    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found in this workspace`);
    }

    const teams = event.teams || [];
    const competitions = event.competitions || [];
    const completedCompetitions = competitions.filter(c => c.status === 'completed');

    const teamPointsMap = new Map<string, { points: number; breakdown: any[] }>();

    for (const team of teams) {
      teamPointsMap.set(team.id, { points: 0, breakdown: [] });
    }

    for (const comp of completedCompetitions) {
      const rankings = await this.getCompetitionRankings(comp.id);
      const pointsConfig = comp.pointsConfig || [];

      for (const team of teams) {
        const pos = rankings.get(team.id) || null;
        let pointsEarned = 0;
        if (pos !== null) {
          const configEntry = pointsConfig.find(entry => entry.position === pos);
          if (configEntry) {
            pointsEarned = configEntry.points;
          }
        }

        const teamData = teamPointsMap.get(team.id);
        if (teamData) {
          teamData.points += pointsEarned;
          teamData.breakdown.push({
            competitionId: comp.id,
            competitionName: comp.name,
            position: pos,
            points: pointsEarned,
          });
        }
      }
    }

    return teams.map(team => {
      const data = teamPointsMap.get(team.id) || { points: 0, breakdown: [] };
      return {
        teamId: team.id,
        teamName: team.name,
        teamLogoUrl: team.logoUrl || null,
        points: data.points,
        breakdown: data.breakdown,
      };
    }).sort((a, b) => b.points - a.points);
  }

  async getCompetitionRankings(competitionId: string): Promise<Map<string, number>> {
    const rankings = new Map<string, number>();
    const comp = await this.competitionRepo.findOne({
      where: { id: competitionId },
      relations: { stages: true }
    });
    if (!comp || comp.stages.length === 0) return rankings;

    const sortedStages = [...comp.stages].sort((a, b) => a.sequence - b.sequence);
    const lastStage = sortedStages[sortedStages.length - 1];

    const matches = await this.matchRepo.find({
      where: { stageId: lastStage.id },
      relations: { homeTeam: true, awayTeam: true }
    });
    if (matches.length === 0) return rankings;

    if (lastStage.type === 'league' || lastStage.type === 'group') {
      const winPoint = lastStage.config?.winPoint ?? 3;
      const drawPoint = lastStage.config?.drawPoint ?? 1;

      const teamStats = new Map<string, { teamId: string; group?: string; pts: number; gd: number; gf: number; ga: number }>();
      for (const m of matches) {
        if (!m.homeTeamId || !m.awayTeamId) continue;
        const g = (m.config as any)?.round || 'Group Stage';

        if (!teamStats.has(m.homeTeamId)) {
          teamStats.set(m.homeTeamId, { teamId: m.homeTeamId, group: g, pts: 0, gd: 0, gf: 0, ga: 0 });
        }
        if (!teamStats.has(m.awayTeamId)) {
          teamStats.set(m.awayTeamId, { teamId: m.awayTeamId, group: g, pts: 0, gd: 0, gf: 0, ga: 0 });
        }

        if (m.status !== 'completed') continue;

        const hStats = teamStats.get(m.homeTeamId)!;
        const aStats = teamStats.get(m.awayTeamId)!;
        const hScore = m.homeScore ?? 0;
        const aScore = m.awayScore ?? 0;

        hStats.gf += hScore;
        hStats.ga += aScore;
        aStats.gf += aScore;
        aStats.ga += hScore;

        if (hScore > aScore) {
          hStats.pts += winPoint;
        } else if (aScore > hScore) {
          aStats.pts += winPoint;
        } else {
          hStats.pts += drawPoint;
          aStats.pts += drawPoint;
        }
      }

      for (const stats of teamStats.values()) {
        stats.gd = stats.gf - stats.ga;
      }

      const groupTeams = new Map<string, string[]>();
      const uniqueGroups = new Set<string>();
      for (const stats of teamStats.values()) {
        if (stats.group) uniqueGroups.add(stats.group);
      }

      for (const g of uniqueGroups) {
        const teamsInGroup = Array.from(teamStats.values())
          .filter(s => s.group === g)
          .sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
          })
          .map(s => s.teamId);
        groupTeams.set(g, teamsInGroup);
      }

      const maxTeamsInGroup = Math.max(...Array.from(groupTeams.values()).map(arr => arr.length), 0);
      const overallSorted: string[] = [];
      for (let pos = 0; pos < maxTeamsInGroup; pos++) {
        const posTeams: string[] = [];
        for (const g of uniqueGroups) {
          const arr = groupTeams.get(g)!;
          if (pos < arr.length) {
            posTeams.push(arr[pos]);
          }
        }
        posTeams.sort((a, b) => {
          const statsA = teamStats.get(a)!;
          const statsB = teamStats.get(b)!;
          if (statsB.pts !== statsA.pts) return statsB.pts - statsA.pts;
          if (statsB.gd !== statsA.gd) return statsB.gd - statsA.gd;
          return statsB.gf - statsA.gf;
        });
        overallSorted.push(...posTeams);
      }

      overallSorted.forEach((teamId, index) => {
        rankings.set(teamId, index + 1);
      });

    } else if (lastStage.type === 'knockout' || lastStage.type === 'group_knockout') {
      const groupMatches = matches.filter((m: any) => {
        const r = (m.config as any)?.round || '';
        return r.toLowerCase().includes('group') || r.toLowerCase().includes('league');
      });
      const knockoutMatches = matches.filter((m: any) => {
        const r = (m.config as any)?.round || '';
        return !r.toLowerCase().includes('group') && !r.toLowerCase().includes('league');
      });

      const teamHighestRound = new Map<string, string>();
      const teamFinalStatus = new Map<string, 'won_final' | 'lost_final' | 'won_third' | 'lost_third' | 'lost'>();

      const allTeamIds = new Set<string>();
      for (const m of matches) {
        if (m.homeTeamId) allTeamIds.add(m.homeTeamId);
        if (m.awayTeamId) allTeamIds.add(m.awayTeamId);
      }

      const finalMatch = knockoutMatches.find((m: any) => (m.config as any)?.round?.toLowerCase() === 'final');
      if (finalMatch && finalMatch.status === 'completed') {
        const hScore = finalMatch.homeScore ?? 0;
        const aScore = finalMatch.awayScore ?? 0;
        if (hScore > aScore) {
          teamFinalStatus.set(finalMatch.homeTeamId!, 'won_final');
          teamFinalStatus.set(finalMatch.awayTeamId!, 'lost_final');
        } else if (aScore > hScore) {
          teamFinalStatus.set(finalMatch.awayTeamId!, 'won_final');
          teamFinalStatus.set(finalMatch.homeTeamId!, 'lost_final');
        }
      }

      const thirdPlaceMatch = knockoutMatches.find((m: any) => {
        const r = (m.config as any)?.round?.toLowerCase() || '';
        return r.includes('third') || r.includes('3rd') || r.includes('bronze');
      });
      if (thirdPlaceMatch && thirdPlaceMatch.status === 'completed') {
        const hScore = thirdPlaceMatch.homeScore ?? 0;
        const aScore = thirdPlaceMatch.awayScore ?? 0;
        if (hScore > aScore) {
          teamFinalStatus.set(thirdPlaceMatch.homeTeamId!, 'won_third');
          teamFinalStatus.set(thirdPlaceMatch.awayTeamId!, 'lost_third');
        } else if (aScore > hScore) {
          teamFinalStatus.set(thirdPlaceMatch.awayTeamId!, 'won_third');
          teamFinalStatus.set(thirdPlaceMatch.homeTeamId!, 'lost_third');
        }
      }

      const getRoundRankWeight = (roundName: string): number => {
        const r = roundName.toLowerCase();
        if (r === 'final') return 10;
        if (r.includes('third') || r.includes('3rd') || r.includes('bronze')) return 9;
        if (r.includes('semi')) return 8;
        if (r.includes('quarter')) return 7;
        if (r.includes('round of 16') || r.includes('1/8')) return 6;
        if (r.includes('round of 32') || r.includes('1/16')) return 5;
        return 1;
      };

      for (const m of knockoutMatches) {
        const r = (m.config as any)?.round || '';
        if (m.homeTeamId) {
          const prev = teamHighestRound.get(m.homeTeamId);
          if (!prev || getRoundRankWeight(r) > getRoundRankWeight(prev)) {
            teamHighestRound.set(m.homeTeamId, r);
          }
        }
        if (m.awayTeamId) {
          const prev = teamHighestRound.get(m.awayTeamId);
          if (!prev || getRoundRankWeight(r) > getRoundRankWeight(prev)) {
            teamHighestRound.set(m.awayTeamId, r);
          }
        }
      }

      const winner = Array.from(allTeamIds).find(id => teamFinalStatus.get(id) === 'won_final');
      const runner = Array.from(allTeamIds).find(id => teamFinalStatus.get(id) === 'lost_final');
      const third = Array.from(allTeamIds).find(id => teamFinalStatus.get(id) === 'won_third');
      const fourth = Array.from(allTeamIds).find(id => teamFinalStatus.get(id) === 'lost_third');

      if (winner) rankings.set(winner, 1);
      if (runner) rankings.set(runner, 2);
      if (third) rankings.set(third, 3);
      if (fourth) rankings.set(fourth, 4);

      const semiLosers = Array.from(allTeamIds).filter(id => {
        const hr = teamHighestRound.get(id)?.toLowerCase() || '';
        return hr.includes('semi') && id !== winner && id !== runner && id !== third && id !== fourth;
      });
      const semiPos = third ? 4 : 3;
      semiLosers.forEach(id => rankings.set(id, semiPos));

      const quarterLosers = Array.from(allTeamIds).filter(id => {
        const hr = teamHighestRound.get(id)?.toLowerCase() || '';
        return hr.includes('quarter');
      });
      quarterLosers.forEach(id => rankings.set(id, 5));

      const r16Losers = Array.from(allTeamIds).filter(id => {
        const hr = teamHighestRound.get(id)?.toLowerCase() || '';
        return hr.includes('round of 16') || hr.includes('1/8');
      });
      r16Losers.forEach(id => rankings.set(id, 9));

      const groupOnlyTeams = Array.from(allTeamIds).filter(id => !teamHighestRound.has(id));
      if (groupOnlyTeams.length > 0 && groupMatches.length > 0) {
        const winPoint = lastStage.config?.winPoint ?? 3;
        const drawPoint = lastStage.config?.drawPoint ?? 1;

        const groupStats = new Map<string, { teamId: string; pts: number; gd: number; gf: number; ga: number }>();
        for (const id of groupOnlyTeams) {
          groupStats.set(id, { teamId: id, pts: 0, gd: 0, gf: 0, ga: 0 });
        }

        for (const m of groupMatches) {
          if (!m.homeTeamId || !m.awayTeamId) continue;
          if (m.status !== 'completed') continue;

          const hStats = groupStats.get(m.homeTeamId);
          const aStats = groupStats.get(m.awayTeamId);
          const hScore = m.homeScore ?? 0;
          const aScore = m.awayScore ?? 0;

          if (hStats) {
            hStats.gf += hScore;
            hStats.ga += aScore;
            if (hScore > aScore) hStats.pts += winPoint;
            else if (hScore === aScore) hStats.pts += drawPoint;
          }
          if (aStats) {
            aStats.gf += aScore;
            aStats.ga += hScore;
            if (aScore > hScore) aStats.pts += winPoint;
            else if (hScore === aScore) aStats.pts += drawPoint;
          }
        }

        for (const stats of groupStats.values()) {
          stats.gd = stats.gf - stats.ga;
        }

        const sortedGroupOnly = Array.from(groupStats.values()).sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if (b.gd !== a.gd) return b.gd - a.gd;
          return b.gf - a.gf;
        });

        const startPos = 17;
        sortedGroupOnly.forEach((s, idx) => {
          rankings.set(s.teamId, startPos + idx);
        });
      }

      // Rank remaining teams who only played in previous stage (Stage 1)
      if (lastStage.type === 'knockout') {
        const prevStage = sortedStages[sortedStages.indexOf(lastStage) - 1];
        if (prevStage && (prevStage.type === 'group' || prevStage.type === 'league')) {
          const prevRankings = await this.getStageRankings(prevStage);
          const groupOnlyTeams = prevRankings.filter(id => !allTeamIds.has(id));

          let nextRank = 5;
          for (const r of rankings.values()) {
            if (r >= nextRank) nextRank = r + 1;
          }

          groupOnlyTeams.forEach(id => {
            rankings.set(id, nextRank++);
          });
        }
      }
    }

    return rankings;
  }

  private async checkAndAutoCompleteCompetition(competitionId: string): Promise<void> {
    const comp = await this.competitionRepo.findOne({
      where: { id: competitionId },
      relations: { stages: true, event: true }
    });
    if (!comp || comp.stages.length === 0) return;

    const sortedStages = [...comp.stages].sort((a, b) => a.sequence - b.sequence);
    const lastStage = sortedStages[sortedStages.length - 1];

    const matches = await this.matchRepo.find({ where: { stageId: lastStage.id } });
    if (matches && matches.length > 0) {
      const allCompleted = matches.every((m: any) => m.status === 'completed');
      if (allCompleted && comp.status !== 'completed') {
        comp.status = 'completed';
        const savedComp = await this.competitionRepo.save(comp);
        const workspaceId = comp.event.workspaceId;

        // 5.6 — Notify competing players of completion
        const compTeams = await this.competitionTeamRepo.find({ where: { competitionId } });
        const teamIds = compTeams.map(ct => ct.teamId);
        const allCompetingPlayers = await this.getTeamsPlayerUserIds(teamIds);
        await this.sendNotificationToMany(
          allCompetingPlayers,
          NotificationType.COMPETITION_COMPLETED,
          `Competition "${savedComp.name}" has been completed!`,
          workspaceId,
          { competitionId, competitionName: savedComp.name }
        );

        // 5.7 / 5.8 / 5.9 — Champions & Runner-Up
        try {
          const rankings = await this.getCompetitionRankings(competitionId);
          let championTeamId: string | null = null;
          let runnerUpTeamId: string | null = null;
          for (const [tId, pos] of rankings.entries()) {
            if (pos === 1) championTeamId = tId;
            if (pos === 2) runnerUpTeamId = tId;
          }

          if (championTeamId) {
            const championTeam = await this.teamRepo.findOne({ where: { id: championTeamId } });
            if (championTeam) {
              // 5.8 - Announcement to all workspace members
              const memberIds = await this.getWorkspaceMemberUserIds(workspaceId);
              await this.sendNotificationToMany(
                memberIds,
                NotificationType.COMPETITION_CHAMPION_ANNOUNCEMENT,
                `🥇 ${championTeam.name} has won the ${savedComp.name} competition!`,
                workspaceId,
                { competitionId, competitionName: savedComp.name, championTeamId, championTeamName: championTeam.name }
              );

              // 5.7 - Notify players of winning team
              const winningPlayers = await this.getTeamPlayerUserIds(championTeamId);
              await this.sendNotificationToMany(
                winningPlayers,
                NotificationType.COMPETITION_CHAMPION,
                `🥇 Congratulations! Your team ${championTeam.name} won ${savedComp.name}!`,
                workspaceId,
                { competitionId, competitionName: savedComp.name }
              );
            }
          }

          if (runnerUpTeamId) {
            const runnerUpTeam = await this.teamRepo.findOne({ where: { id: runnerUpTeamId } });
            if (runnerUpTeam) {
              // 5.9 - Notify players of 2nd place team
              const runnerUpPlayers = await this.getTeamPlayerUserIds(runnerUpTeamId);
              await this.sendNotificationToMany(
                runnerUpPlayers,
                NotificationType.COMPETITION_RUNNER_UP,
                `🥈 Great performance! Your team ${runnerUpTeam.name} finished as runner-up in ${savedComp.name}.`,
                workspaceId,
                { competitionId, competitionName: savedComp.name }
              );
            }
          }
        } catch (e) {
          // ignore rankings error
        }

        // 5.10 / 5.11 — Best Player of Tournament
        try {
          const workspace = await this.workspaceRepo.findOne({ where: { id: workspaceId } });
          const ownerId = workspace?.ownerId ?? '';
          const bestPlayerData = await this.getCompetitionBestPlayer(workspaceId, comp.eventId, competitionId, ownerId);
          if (bestPlayerData && bestPlayerData.bestPlayer) {
            const bestPlayer = bestPlayerData.bestPlayer;
            const playerName = bestPlayer.player?.user?.username ?? 'a player';
            const teamName = bestPlayer.team?.name ?? 'their team';
            const rating = bestPlayer.rating;

            // 5.10 - Notify the best player
            await this.sendNotification(
              bestPlayer.player.userId,
              NotificationType.BEST_PLAYER_OF_TOURNAMENT,
              `⭐ You've been named the Best Player of ${savedComp.name} with a rating of ${rating}!`,
              workspaceId,
              { competitionId, competitionName: savedComp.name, rating }
            );

            // 5.11 - Announcement to all
            const memberIds = await this.getWorkspaceMemberUserIds(workspaceId);
            await this.sendNotificationToMany(
              memberIds,
              NotificationType.BEST_PLAYER_ANNOUNCEMENT,
              `⭐ ${playerName} (${teamName}) is the Best Player of ${savedComp.name}!`,
              workspaceId,
              { competitionId, competitionName: savedComp.name, playerId: bestPlayer.playerId, playerName, teamName, rating }
            );
          }
        } catch (e) {
          // ignore best player error
        }
      }
    }
  }

  // ─── Sports Master Data ───────────────────────────────────────────────────

  async getSports(): Promise<Sport[]> {
    return await this.sportRepo.find({ order: { name: 'ASC' } });
  }

  // ─── Competitions CRUD ────────────────────────────────────────────────────

  async getCompetitions(workspaceId: string, eventId: string, userId: string): Promise<Competition[]> {
    await this.ensureMember(workspaceId, userId);

    // Single query: scope event to workspace via join, then load competitions
    const eventExists = await this.eventRepo.exists({ where: { id: eventId, workspaceId } });
    if (!eventExists) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }

    const competitions = await this.competitionRepo.find({
      where: { eventId },
      relations: { sport: true, stages: true },
      order: { name: 'ASC' },
    });

    // Single IN query for ALL matches across all stages (eliminates N+1)
    const allStageIds = competitions.flatMap(c => (c.stages ?? []).map(s => s.id));
    const allMatchesMap = new Map<string, any[]>();

    if (allStageIds.length > 0) {
      const allMatches = await this.matchRepo.find({
        where: { stageId: In(allStageIds) },
        relations: { homeTeam: true, awayTeam: true },
      });
      for (const m of allMatches) {
        if (!allMatchesMap.has(m.stageId)) allMatchesMap.set(m.stageId, []);
        allMatchesMap.get(m.stageId)!.push(m);
      }
    }

    return competitions.map(comp => {
      const compJson = JSON.parse(JSON.stringify(comp));
      for (const stage of compJson.stages ?? []) {
        stage.matches = allMatchesMap.get(stage.id) ?? [];
      }
      return compJson;
    });
  }

  async createCompetition(
    workspaceId: string,
    eventId: string,
    dto: CreateCompetitionDto,
    userId: string,
  ): Promise<Competition> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');

    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }

    const sport = await this.sportRepo.findOne({ where: { id: dto.sportId } });
    if (!sport) {
      throw new NotFoundException(`Sport with ID "${dto.sportId}" not found`);
    }

    const competition = this.competitionRepo.create({
      name: dto.name,
      eventId,
      sportId: dto.sportId,
      status: dto.status || 'upcoming',
      pointsConfig: dto.pointsConfig ?? null,
    });

    const saved = await this.competitionRepo.save(competition);
    const found = await this.competitionRepo.findOne({ where: { id: saved.id }, relations: { sport: true } });
    if (!found) {
      throw new NotFoundException(`Competition "${saved.id}" not found`);
    }

    // 5.1 — Notify workspace members of new competition
    const memberIds = await this.getWorkspaceMemberUserIds(workspaceId, userId);
    await this.sendNotificationToMany(
      memberIds,
      NotificationType.COMPETITION_CREATED,
      `New competition "${found.name}" added to ${event.name}.`,
      workspaceId,
      { eventId, competitionId: found.id, competitionName: found.name, eventName: event.name },
    );

    return found;
  }

  async updateCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    dto: UpdateCompetitionDto,
    userId: string,
  ): Promise<Competition> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');

    // Single exist check instead of loading the full event entity
    const eventExists = await this.eventRepo.exists({ where: { id: eventId, workspaceId } });
    if (!eventExists) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }

    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
      relations: { sport: true },
    });
    if (!competition) {
      throw new NotFoundException(`Competition "${competitionId}" not found in event`);
    }

    if (dto.sportId) {
      const sport = await this.sportRepo.findOne({ where: { id: dto.sportId } });
      if (!sport) {
        throw new NotFoundException(`Sport with ID "${dto.sportId}" not found`);
      }
      competition.sportId = dto.sportId;
      competition.sport = sport; // attach in-memory, avoid re-fetch
    }

    if (dto.name !== undefined) competition.name = dto.name;
    if (dto.status !== undefined) competition.status = dto.status;
    if (dto.pointsConfig !== undefined) competition.pointsConfig = dto.pointsConfig ?? null;

    return this.competitionRepo.save(competition);
  }

  async removeCompetition(workspaceId: string, eventId: string, competitionId: string, userId: string): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');
    // Validate event belongs to workspace cheaply
    const eventExists = await this.eventRepo.exists({ where: { id: eventId, workspaceId } });
    if (!eventExists) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }

    const competition = await this.competitionRepo.findOne({ where: { id: competitionId, eventId } });
    if (!competition) {
      throw new NotFoundException(`Competition "${competitionId}" not found in event`);
    }

    await this.competitionRepo.remove(competition);
  }

  // ─── Competition Stages ───────────────────────────────────────────────────

  async getStages(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<CompetitionStage[]> {
    await this.ensureMember(workspaceId, userId);
    // Scope validation: verify competition belongs to the event+workspace in one query
    const compExists = await this.competitionRepo
      .createQueryBuilder('c')
      .innerJoin('c.event', 'e', 'e.id = :eventId AND e.workspaceId = :workspaceId', { eventId, workspaceId })
      .where('c.id = :competitionId', { competitionId })
      .getExists();
    if (!compExists) {
      throw new NotFoundException(`Competition "${competitionId}" not found in event`);
    }

    return this.stageRepo.find({
      where: { competitionId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });
  }

  async createStage(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    dto: CreateStageDto,
    userId: string,
  ): Promise<CompetitionStage> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');
    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }
    const competition = await this.competitionRepo.findOne({ where: { id: competitionId, eventId } });
    if (!competition) {
      throw new NotFoundException(`Competition "${competitionId}" not found in event`);
    }

    const sequence = dto.sequence ?? (await this.stageRepo.count({ where: { competitionId } })) + 1;

    const stage = this.stageRepo.create({
      name: dto.name,
      type: dto.type,
      sequence,
      competitionId,
      config: dto.config ?? {},
    });

    return this.stageRepo.save(stage);
  }

  async updateStage(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    dto: UpdateStageDto,
    userId: string,
  ): Promise<CompetitionStage> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');
    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }
    const competition = await this.competitionRepo.findOne({ where: { id: competitionId, eventId } });
    if (!competition) {
      throw new NotFoundException(`Competition "${competitionId}" not found in event`);
    }

    const stage = await this.stageRepo.findOne({ where: { id: stageId, competitionId } });
    if (!stage) {
      throw new NotFoundException(`Stage "${stageId}" not found in competition`);
    }

    if (dto.name !== undefined) stage.name = dto.name;
    if (dto.type !== undefined) stage.type = dto.type;
    if (dto.sequence !== undefined) stage.sequence = dto.sequence;
    if (dto.config !== undefined) {
      stage.config = { ...stage.config, ...dto.config };
    }

    return this.stageRepo.save(stage);
  }

  async removeStage(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    userId: string,
  ): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');
    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }
    const competition = await this.competitionRepo.findOne({ where: { id: competitionId, eventId } });
    if (!competition) {
      throw new NotFoundException(`Competition "${competitionId}" not found in event`);
    }

    const stage = await this.stageRepo.findOne({ where: { id: stageId, competitionId } });
    if (!stage) {
      throw new NotFoundException(`Stage "${stageId}" not found in competition`);
    }

    await this.stageRepo.remove(stage);
  }

  async resetStagesAndFixtures(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');
    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }
    const competition = await this.competitionRepo.findOne({ where: { id: competitionId, eventId } });
    if (!competition) {
      throw new NotFoundException(`Competition "${competitionId}" not found in event`);
    }

    const stages = await this.stageRepo.find({ where: { competitionId } });
    if (stages.length > 0) {
      await this.stageRepo.remove(stages);
    }

    // 5.5 — Notify competing team players that fixtures for this competition have been reset
    const compTeams = await this.competitionTeamRepo.find({ where: { competitionId } });
    const teamIds = compTeams.map((ct) => ct.teamId);
    const players = await this.getTeamsPlayerUserIds(teamIds);
    await this.sendNotificationToMany(
      players,
      NotificationType.FIXTURES_RESET,
      `Fixtures for competition "${competition.name}" have been reset.`,
      workspaceId,
      { competitionId, competitionName: competition.name },
    );
  }

  // ─── Matches ──────────────────────────────────────────────────────────────

  async getMatches(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    userId: string,
  ): Promise<Match[]> {
    await this.ensureMember(workspaceId, userId);
    const stage = await this.validateStageContext(workspaceId, eventId, competitionId, stageId);

    // Self-healing progression checks
    try {
      if (stage.type === 'knockout') {
        const stages = await this.stageRepo.find({
          where: { competitionId },
          order: { sequence: 'ASC', createdAt: 'ASC' }
        });
        const idx = stages.findIndex(s => s.id === stageId);
        if (idx > 0) {
          const prevStage = stages[idx - 1];
          await this.advanceTeamsBetweenStages(prevStage);
        }
      } else if (stage.type === 'group_knockout') {
        await this.advanceGroupStageWinners(stage);
      }
    } catch (err) {
      console.error('Self-healing stage advancement failed:', err);
    }

    const matches = await this.matchRepo.find({
      where: { stageId },
      relations: { homeTeam: true, awayTeam: true, venue: true },
      order: { createdAt: 'ASC' },
    });

    const completedMatches = matches.filter(m => m.status === 'completed');
    if (completedMatches.length > 0) {
      const matchIds = completedMatches.map(m => m.id);
      const matchPlayers = await this.matchPlayerRepo.find({
        where: { matchId: In(matchIds), isPlaying: true },
        relations: { player: { user: true }, team: true },
      });

      const playersByMatch = new Map<string, MatchPlayer[]>();
      for (const mp of matchPlayers) {
        if (!playersByMatch.has(mp.matchId)) {
          playersByMatch.set(mp.matchId, []);
        }
        playersByMatch.get(mp.matchId)!.push(mp);
      }

      for (const m of matches) {
        if (m.status !== 'completed') continue;
        const players = playersByMatch.get(m.id) ?? [];
        let maxRating = -1;
        let mvpMp: MatchPlayer | null = null;
        for (const mp of players) {
          if (mp.rating !== null) {
            const r = Number(mp.rating);
            if (r > maxRating) {
              maxRating = r;
              mvpMp = mp;
            }
          }
        }
        if (mvpMp && maxRating >= 5.0) {
          const playerName = mvpMp.player?.user?.username ?? mvpMp.player?.jerseyNumber?.toString() ?? 'Player';
          (m as any).mvp = {
            playerId: mvpMp.playerId,
            playerName,
            teamName: mvpMp.team?.name ?? 'Unknown',
            rating: maxRating,
          };
        }
      }
    }

    const statusWeight = {
      'live': 1,
      'scheduled': 2,
      'completed': 3,
    };

    return matches.sort((a, b) => {
      const wA = statusWeight[a.status] || 99;
      const wB = statusWeight[b.status] || 99;
      if (wA !== wB) return wA - wB;
      const timeA = a.createdAt?.getTime() || 0;
      const timeB = b.createdAt?.getTime() || 0;
      return timeA - timeB;
    });
  }

  async createMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    dto: CreateMatchDto,
    userId: string,
  ): Promise<Match> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');
    const stage = await this.validateStageContext(workspaceId, eventId, competitionId, stageId);

    const comp = await this.competitionRepo.findOne({
      where: { id: competitionId },
      relations: { sport: true },
    });
    if (!comp) {
      throw new NotFoundException(`Competition "${competitionId}" not found`);
    }

    const sportCode = comp.sport?.code ?? 'football';

    // Set defaults based on sport
    const config = dto.config ?? {};
    let liveData: any = {};

    if (sportCode === 'football') {
      if (!config.timerDuration) config.timerDuration = 90;
      liveData = {
        elapsedSeconds: 0,
        timerRunning: false,
        events: [],
      };
    } else if (sportCode === 'cricket') {
      if (!config.overs) config.overs = 20;
      liveData = {
        tossWinnerId: null,
        tossChoice: null,
        currentInnings: 1,
        inningsData: [
          {
            battingTeamId: dto.homeTeamId,
            bowlingTeamId: dto.awayTeamId,
            runs: 0,
            wickets: 0,
            overs: 0,
            balls: 0,
            batsmanStats: {},
            bowlerStats: {},
            extraRuns: 0,
            completed: false,
          },
        ],
      };
    } else if (sportCode === 'badminton') {
      if (!config.setsToWin) config.setsToWin = 2; // Best of 3
      if (!config.matchType) config.matchType = MatchType.MENS_SINGLES;
      liveData = {
        currentSet: 1,
        setsScore: [{ home: 0, away: 0 }],
        homeSetsWon: 0,
        awaySetsWon: 0,
        matchStatus: 'Scheduled',
        rallies: [],
      };
    }

    const match = this.matchRepo.create({
      stageId,
      homeTeamId: dto.homeTeamId,
      awayTeamId: dto.awayTeamId,
      venueId: dto.venueId ?? null,
      homeScore: 0,
      awayScore: 0,
      status: 'scheduled',
      config,
      liveData,
    });

    const saved = await this.matchRepo.save(match);
    const populated = (await this.matchRepo.findOne({
      where: { id: saved.id },
      relations: { homeTeam: true, awayTeam: true, venue: true },
    }))!;

    // 6.1 — Notify players of both teams that a match has been scheduled
    if (populated.homeTeamId && populated.awayTeamId) {
      const homePlayers = await this.getTeamPlayerUserIds(populated.homeTeamId);
      const awayPlayers = await this.getTeamPlayerUserIds(populated.awayTeamId);
      const allPlayers = [...homePlayers, ...awayPlayers];
      await this.sendNotificationToMany(
        allPlayers,
        NotificationType.MATCH_SCHEDULED,
        `New match scheduled: ${populated.homeTeam?.name ?? 'Home'} vs ${populated.awayTeam?.name ?? 'Away'} in ${comp.name}.`,
        workspaceId,
        { matchId: populated.id, competitionId, competitionName: comp.name, homeTeamName: populated.homeTeam?.name, awayTeamName: populated.awayTeam?.name },
      );
    }

    return populated;
  }

  async updateMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    dto: UpdateMatchDto,
    userId: string,
  ): Promise<Match> {
    await this.ensurePermission(workspaceId, userId, 'match.score');
    await this.validateStageContext(workspaceId, eventId, competitionId, stageId);
    const match = await this.matchRepo.findOne({ where: { id: matchId, stageId } });
    if (!match) {
      throw new NotFoundException(`Match "${matchId}" not found in stage`);
    }

    if (dto.homeTeamId !== undefined) match.homeTeamId = dto.homeTeamId;
    if (dto.awayTeamId !== undefined) match.awayTeamId = dto.awayTeamId;
    if (dto.venueId !== undefined) match.venueId = dto.venueId ?? null;
    if (dto.homeScore !== undefined) match.homeScore = dto.homeScore;
    if (dto.awayScore !== undefined) match.awayScore = dto.awayScore;
    if (dto.status !== undefined) {
      if (dto.status === 'live' && match.status !== 'live') {
        const players = await this.matchPlayerRepo.find({
          where: { matchId: match.id, isPlaying: true },
        });

        const homeTeamPlayers = players.filter((p) => p.teamId === match.homeTeamId);
        const awayTeamPlayers = players.filter((p) => p.teamId === match.awayTeamId);

        if (match.homeTeamId && homeTeamPlayers.length === 0) {
          throw new BadRequestException('Cannot start the match: home team lineup has not been set.');
        }
        if (match.awayTeamId && awayTeamPlayers.length === 0) {
          throw new BadRequestException('Cannot start the match: away team lineup has not been set.');
        }
      }
      match.status = dto.status;
    }
    const oldStatus = match.status;

    if (dto.config !== undefined) {
      match.config = { ...match.config, ...dto.config };
    }
    if (dto.liveData !== undefined) {
      match.liveData = { ...match.liveData, ...dto.liveData };
    }

    const saved = await this.matchRepo.save(match);
    const populated = (await this.matchRepo.findOne({
      where: { id: saved.id },
      relations: { homeTeam: true, awayTeam: true, venue: true },
    }))!;

    // If match was completed, run knockout advancement and auto-rate players
    if (saved.status === 'completed') {
      const stage = await this.stageRepo.findOne({ where: { id: stageId } });
      if (stage) {
        if (stage.type === 'knockout' || stage.type === 'group_knockout') {
          await this.advanceKnockoutWinner(saved, stage);
        }
        if (stage.type === 'group_knockout') {
          await this.advanceGroupStageWinners(stage);
        }
        await this.advanceTeamsBetweenStages(stage);
        await this.checkAndAutoCompleteCompetition(stage.competitionId);
      }
      // Auto-calculate player ratings based on match events
      await this.autoRateMatchPlayers(saved);
    }

    // 6.3 / 6.4 / 6.5 / 6.6 / 6.7 — Notify status changes
    if (dto.status !== undefined && dto.status !== oldStatus) {
      if (populated.homeTeamId && populated.awayTeamId) {
        const homePlayers = await this.getTeamPlayerUserIds(populated.homeTeamId);
        const awayPlayers = await this.getTeamPlayerUserIds(populated.awayTeamId);
        const allPlayers = [...homePlayers, ...awayPlayers];

        if (dto.status === 'live') {
          await this.sendNotificationToMany(
            allPlayers,
            NotificationType.MATCH_STARTED,
            `🔴 LIVE: ${populated.homeTeam?.name} vs ${populated.awayTeam?.name} has started!`,
            workspaceId,
            { matchId: populated.id, homeTeamName: populated.homeTeam?.name, awayTeamName: populated.awayTeam?.name },
          );
        } else if (dto.status === 'completed') {
          const live = populated.liveData || {};
          const isWalkover = live.matchStatus === 'Walkover' || live.matchStatus === 'Retired' || String(live.result || '').toLowerCase().includes('walkover');
          const isAbandoned = live.matchStatus === 'Abandoned';

          if (isWalkover || isAbandoned) {
            const displayStatus = isWalkover ? 'Walkover' : 'Abandoned';
            await this.sendNotificationToMany(
              allPlayers,
              NotificationType.MATCH_WALKOVER,
              `Match ${populated.homeTeam?.name} vs ${populated.awayTeam?.name} has been marked as ${displayStatus}.`,
              workspaceId,
              { matchId: populated.id, status: displayStatus },
            );
          } else {
            await this.sendNotificationToMany(
              allPlayers,
              NotificationType.MATCH_COMPLETED,
              `Match completed: ${populated.homeTeam?.name} ${populated.homeScore} - ${populated.awayScore} ${populated.awayTeam?.name}.`,
              workspaceId,
              { matchId: populated.id, homeScore: populated.homeScore, awayScore: populated.awayScore },
            );

            const scoreText = `${populated.homeScore} - ${populated.awayScore}`;
            if (populated.homeScore > populated.awayScore) {
              await this.sendNotificationToMany(
                homePlayers,
                NotificationType.MATCH_WON,
                `🎉 Victory! ${populated.homeTeam?.name} won against ${populated.awayTeam?.name} (${scoreText}).`,
                workspaceId,
                { matchId: populated.id, opponent: populated.awayTeam?.name, score: scoreText },
              );
              await this.sendNotificationToMany(
                awayPlayers,
                NotificationType.MATCH_LOST,
                `Match lost: ${populated.awayTeam?.name} lost to ${populated.homeTeam?.name} (${scoreText}).`,
                workspaceId,
                { matchId: populated.id, opponent: populated.homeTeam?.name, score: scoreText },
              );
            } else if (populated.awayScore > populated.homeScore) {
              await this.sendNotificationToMany(
                awayPlayers,
                NotificationType.MATCH_WON,
                `🎉 Victory! ${populated.awayTeam?.name} won against ${populated.homeTeam?.name} (${scoreText}).`,
                workspaceId,
                { matchId: populated.id, opponent: populated.homeTeam?.name, score: scoreText },
              );
              await this.sendNotificationToMany(
                homePlayers,
                NotificationType.MATCH_LOST,
                `Match lost: ${populated.homeTeam?.name} lost to ${populated.awayTeam?.name} (${scoreText}).`,
                workspaceId,
                { matchId: populated.id, opponent: populated.awayTeam?.name, score: scoreText },
              );
            }
          }
        }
      }
    }

    return populated;
  }

  private async advanceKnockoutWinner(completedMatch: Match, stage: CompetitionStage): Promise<void> {
    const roundName = (completedMatch.config as any)?.round;
    if (!roundName || roundName.toLowerCase() === 'final' || roundName.toLowerCase().includes('third') || roundName.toLowerCase().includes('3rd')) return;

    // Ignore group and league stage matches for knockout advancement
    const roundLower = roundName.toLowerCase();
    if (roundLower.includes('group') || roundLower.includes('league')) return;

    // Fetch all matches in this stage
    const allMatches = await this.matchRepo.find({
      where: { stageId: stage.id },
      order: { id: 'ASC', createdAt: 'ASC' }
    });

    // Group unique matches per round (excluding Third Place Match)
    const roundCounts: { [round: string]: number } = {};
    for (const m of allMatches) {
      const rName = (m.config as any)?.round;
      if (!rName) continue;
      if (rName.toLowerCase().includes('third') || rName.toLowerCase().includes('3rd')) continue;
      const isLeg1OrNone = (m.config as any)?.leg === undefined || (m.config as any)?.leg === 1;
      if (isLeg1OrNone) {
        roundCounts[rName] = (roundCounts[rName] || 0) + 1;
      }
    }

    const sortedRounds = Object.keys(roundCounts).sort((a, b) => roundCounts[b] - roundCounts[a]);
    const currRoundIdx = sortedRounds.indexOf(roundName);
    if (currRoundIdx === -1 || currRoundIdx === sortedRounds.length - 1) return;

    const nextRoundName = sortedRounds[currRoundIdx + 1];

    // Find winner of the completed match/tie
    let winnerId: string | null = null;
    const homeScore = completedMatch.homeScore ?? 0;
    const awayScore = completedMatch.awayScore ?? 0;

    if ((completedMatch.config as any)?.leg === 1) {
      // Leg 1 complete: wait for leg 2 to finish
      return;
    }

    if ((completedMatch.config as any)?.leg === 2) {
      // Aggregate two legs
      const leg1 = allMatches.find(m =>
        (m.config as any)?.round === roundName &&
        (m.config as any)?.leg === 1 &&
        m.homeTeamId === completedMatch.awayTeamId &&
        m.awayTeamId === completedMatch.homeTeamId
      );
      if (leg1) {
        const teamAScore = (leg1.homeScore ?? 0) + (completedMatch.awayScore ?? 0);
        const teamBScore = (leg1.awayScore ?? 0) + (completedMatch.homeScore ?? 0);
        if (teamAScore > teamBScore) {
          winnerId = leg1.homeTeamId;
        } else if (teamBScore > teamAScore) {
          winnerId = leg1.awayTeamId;
        } else {
          // Tie-breaker: check shootout score or default to leg 2 winner
          const live = completedMatch.liveData || {};
          const shHome = live.shootoutHomeScore ?? 0;
          const shAway = live.shootoutAwayScore ?? 0;
          if (shHome > shAway) {
            winnerId = completedMatch.homeTeamId;
          } else if (shAway > shHome) {
            winnerId = completedMatch.awayTeamId;
          } else {
            winnerId = homeScore > awayScore ? completedMatch.homeTeamId : completedMatch.awayTeamId;
          }
        }
      } else {
        const live = completedMatch.liveData || {};
        const shHome = live.shootoutHomeScore ?? 0;
        const shAway = live.shootoutAwayScore ?? 0;
        if (shHome > shAway) {
          winnerId = completedMatch.homeTeamId;
        } else if (shAway > shHome) {
          winnerId = completedMatch.awayTeamId;
        } else {
          winnerId = homeScore > awayScore ? completedMatch.homeTeamId : completedMatch.awayTeamId;
        }
      }
    } else {
      // Single leg
      const live = completedMatch.liveData || {};
      const result = live.result;
      if (result === 'Home Win' || result === 'Walkover (Home Win)') {
        winnerId = completedMatch.homeTeamId;
      } else if (result === 'Away Win' || result === 'Walkover (Away Win)') {
        winnerId = completedMatch.awayTeamId;
      } else if (homeScore > awayScore) {
        winnerId = completedMatch.homeTeamId;
      } else if (awayScore > homeScore) {
        winnerId = completedMatch.awayTeamId;
      } else {
        // Check shootout
        const shHome = live.shootoutHomeScore ?? 0;
        const shAway = live.shootoutAwayScore ?? 0;
        if (shHome > shAway) {
          winnerId = completedMatch.homeTeamId;
        } else if (shAway > shHome) {
          winnerId = completedMatch.awayTeamId;
        }
      }
    }

    if (!winnerId) return;

    // Find index of this match in the current round
    const currRoundMatches = allMatches.filter(m =>
      (m.config as any)?.round === roundName &&
      ((m.config as any)?.leg === undefined || (m.config as any)?.leg === 1)
    );
    const matchIndex = currRoundMatches.findIndex(m =>
      m.id === completedMatch.id ||
      ((completedMatch.config as any)?.leg === 2 && m.homeTeamId === completedMatch.awayTeamId && m.awayTeamId === completedMatch.homeTeamId)
    );
    if (matchIndex === -1) return;

    // Next round details
    const nextRoundMatches = allMatches.filter(m =>
      (m.config as any)?.round === nextRoundName &&
      ((m.config as any)?.leg === undefined || (m.config as any)?.leg === 1)
    );

    const nextMatchIndex = Math.floor(matchIndex / 2);
    const targetLeg1Match = nextRoundMatches[nextMatchIndex];
    if (!targetLeg1Match) return;

    const isHomeSlot = matchIndex % 2 === 0;

    // Update Leg 1 match
    if (isHomeSlot) {
      targetLeg1Match.homeTeamId = winnerId;
    } else {
      targetLeg1Match.awayTeamId = winnerId;
    }
    await this.matchRepo.save(targetLeg1Match);

    // If next round is two-legged, also update Leg 2 match with swapped roles
    const twoLegged = (stage.config as any)?.twoLegged || (stage.config as any)?.legs === 2;
    if (twoLegged) {
      const nextRoundLeg2Matches = allMatches.filter(m =>
        (m.config as any)?.round === nextRoundName &&
        (m.config as any)?.leg === 2
      );
      const targetLeg2MatchSec = nextRoundLeg2Matches[nextMatchIndex];
      if (targetLeg2MatchSec) {
        if (isHomeSlot) {
          targetLeg2MatchSec.awayTeamId = winnerId;
        } else {
          targetLeg2MatchSec.homeTeamId = winnerId;
        }
        await this.matchRepo.save(targetLeg2MatchSec);
      }
    }

    // Place loser in the Third Place Match if current round is Semi-Final
    let loserId: string | null = null;
    if (completedMatch.homeTeamId === winnerId) {
      loserId = completedMatch.awayTeamId;
    } else {
      loserId = completedMatch.homeTeamId;
    }

    if (loserId && roundName.toLowerCase() === 'semi-final') {
      const thirdPlaceMatches = allMatches.filter(m =>
        (m.config as any)?.round === 'Third Place Match' &&
        ((m.config as any)?.leg === undefined || (m.config as any)?.leg === 1)
      );
      const targetThirdPlaceMatch = thirdPlaceMatches[0];
      if (targetThirdPlaceMatch) {
        if (isHomeSlot) {
          targetThirdPlaceMatch.homeTeamId = loserId;
        } else {
          targetThirdPlaceMatch.awayTeamId = loserId;
        }
        await this.matchRepo.save(targetThirdPlaceMatch);

        if (twoLegged) {
          const thirdPlaceLeg2Matches = allMatches.filter(m =>
            (m.config as any)?.round === 'Third Place Match' &&
            (m.config as any)?.leg === 2
          );
          const targetThirdPlaceLeg2Match = thirdPlaceLeg2Matches[0];
          if (targetThirdPlaceLeg2Match) {
            if (isHomeSlot) {
              targetThirdPlaceLeg2Match.awayTeamId = loserId;
            } else {
              targetThirdPlaceLeg2Match.homeTeamId = loserId;
            }
            await this.matchRepo.save(targetThirdPlaceLeg2Match);
          }
        }
      }
    }

    // 9.1 & 9.2 — Team advanced & eliminated notifications
    try {
      const comp = await this.competitionRepo.findOne({
        where: { id: stage.competitionId },
        relations: { event: true }
      });
      if (comp) {
        const workspaceId = comp.event?.workspaceId || null;
        if (winnerId) {
          const winnerTeam = await this.teamRepo.findOne({ where: { id: winnerId } });
          const winningPlayers = await this.getTeamPlayerUserIds(winnerId);
          await this.sendNotificationToMany(
            winningPlayers,
            NotificationType.TEAM_ADVANCED,
            `🎯 ${winnerTeam?.name ?? 'Your team'} has advanced to the ${nextRoundName} in ${comp.name}!`,
            workspaceId,
            { competitionId: comp.id, competitionName: comp.name, nextRound: nextRoundName },
          );
        }
        if (loserId) {
          const loserTeam = await this.teamRepo.findOne({ where: { id: loserId } });
          const losingPlayers = await this.getTeamPlayerUserIds(loserId);
          await this.sendNotificationToMany(
            losingPlayers,
            NotificationType.TEAM_ELIMINATED,
            `💔 ${loserTeam?.name ?? 'Your team'} has been eliminated from ${comp.name}.`,
            workspaceId,
            { competitionId: comp.id, competitionName: comp.name },
          );
        }
      }
    } catch (e) {
      // ignore silently to prevent blocking knockout advancement
    }
  }

  private async advanceGroupStageWinners(stage: CompetitionStage): Promise<void> {
    // Fetch all matches in this stage
    const allMatches = await this.matchRepo.find({
      where: { stageId: stage.id },
      order: { id: 'ASC', createdAt: 'ASC' }
    });

    // Separate group and knockout matches
    const groupMatches = allMatches.filter(m => {
      const r = (m.config as any)?.round || '';
      return r.toLowerCase().includes('group') || r.toLowerCase().includes('league');
    });

    const knockoutMatches = allMatches.filter(m => {
      const r = (m.config as any)?.round || '';
      return !r.toLowerCase().includes('group') && !r.toLowerCase().includes('league');
    });

    if (groupMatches.length === 0 || knockoutMatches.length === 0) return;

    // Check if all group stage matches are completed
    const allGroupMatchesCompleted = groupMatches.every(m => m.status === 'completed');
    if (!allGroupMatchesCompleted) return;

    // Calculate standings for each group
    const winPoint = stage.config?.winPoint ?? 3;
    const drawPoint = stage.config?.drawPoint ?? 1;

    const roundTeams = new Map<string, Set<string>>();
    for (const m of groupMatches) {
      const r = (m.config as any)?.round || 'Group Stage';
      if (!roundTeams.has(r)) {
        roundTeams.set(r, new Set());
      }
      if (m.homeTeamId) roundTeams.get(r)!.add(m.homeTeamId);
      if (m.awayTeamId) roundTeams.get(r)!.add(m.awayTeamId);
    }

    const standings = new Map<string, { teamId: string; pts: number; gd: number; gf: number }>();
    for (const [r, teams] of roundTeams.entries()) {
      for (const teamId of teams) {
        standings.set(`${r}-${teamId}`, { teamId, pts: 0, gd: 0, gf: 0 });
      }
    }

    for (const m of groupMatches) {
      const r = (m.config as any)?.round || 'Group Stage';
      if (!m.homeTeamId || !m.awayTeamId) continue;

      const homeKey = `${r}-${m.homeTeamId}`;
      const awayKey = `${r}-${m.awayTeamId}`;

      const homeStats = standings.get(homeKey);
      const awayStats = standings.get(awayKey);
      if (!homeStats || !awayStats) continue;

      const hScore = m.homeScore ?? 0;
      const aScore = m.awayScore ?? 0;

      homeStats.gf += hScore;
      awayStats.gf += aScore;
      homeStats.gd += (hScore - aScore);
      awayStats.gd += (aScore - hScore);

      if (hScore > aScore) {
        homeStats.pts += winPoint;
      } else if (aScore > hScore) {
        awayStats.pts += winPoint;
      } else {
        homeStats.pts += drawPoint;
        awayStats.pts += drawPoint;
      }
    }

    const roundRankings = new Map<string, string[]>();
    for (const [r, teams] of roundTeams.entries()) {
      const sorted = Array.from(teams).sort((a, b) => {
        const statsA = standings.get(`${r}-${a}`)!;
        const statsB = standings.get(`${r}-${b}`)!;
        if (statsB.pts !== statsA.pts) return statsB.pts - statsA.pts;
        if (statsB.gd !== statsA.gd) return statsB.gd - statsA.gd;
        return statsB.gf - statsA.gf;
      });
      roundRankings.set(r, sorted);
    }

    // Determine the first knockout round matches (excluding Third Place Match)
    const koRoundCounts: { [round: string]: number } = {};
    for (const m of knockoutMatches) {
      const rName = (m.config as any)?.round;
      if (!rName) continue;
      if (rName.toLowerCase().includes('third') || rName.toLowerCase().includes('3rd')) continue;
      const isLeg1OrNone = (m.config as any)?.leg === undefined || (m.config as any)?.leg === 1;
      if (isLeg1OrNone) {
        koRoundCounts[rName] = (koRoundCounts[rName] || 0) + 1;
      }
    }
    const sortedKoRounds = Object.keys(koRoundCounts).sort((a, b) => koRoundCounts[b] - koRoundCounts[a]);
    if (sortedKoRounds.length === 0) return;

    const firstKoRoundName = sortedKoRounds[0];
    const firstKoRoundMatches = knockoutMatches.filter(m =>
      (m.config as any)?.round === firstKoRoundName &&
      ((m.config as any)?.leg === undefined || (m.config as any)?.leg === 1)
    );

    const isSingleGroup = stage.config?.groupKnockoutSubtype === 'single_group';
    const advancingType = stage.config?.advancingType || 'winner';
    const groupsCount = stage.config?.groupsCount ?? 2;
    const twoLegged = (stage.config as any)?.twoLegged || (stage.config as any)?.legs === 2;

    const promotedTeams: { home: string; away: string }[] = [];

    if (isSingleGroup) {
      const sortedTeams = roundRankings.get('Group Stage') || [];
      if (firstKoRoundMatches.length === 1) {
        if (sortedTeams.length >= 2) {
          promotedTeams.push({ home: sortedTeams[0], away: sortedTeams[1] });
        }
        // Populate Third Place Match with 3rd and 4th place teams if they exist
        if (sortedTeams.length >= 4) {
          const thirdPlaceLeg1Match = knockoutMatches.find(m =>
            (m.config as any)?.round === 'Third Place Match' &&
            ((m.config as any)?.leg === undefined || (m.config as any)?.leg === 1)
          );
          if (thirdPlaceLeg1Match) {
            thirdPlaceLeg1Match.homeTeamId = sortedTeams[2];
            thirdPlaceLeg1Match.awayTeamId = sortedTeams[3];
            await this.matchRepo.save(thirdPlaceLeg1Match);

            if (twoLegged) {
              const thirdPlaceLeg2Match = knockoutMatches.find(m =>
                (m.config as any)?.round === 'Third Place Match' &&
                (m.config as any)?.leg === 2
              );
              if (thirdPlaceLeg2Match) {
                thirdPlaceLeg2Match.homeTeamId = sortedTeams[3];
                thirdPlaceLeg2Match.awayTeamId = sortedTeams[2];
                await this.matchRepo.save(thirdPlaceLeg2Match);
              }
            }
          }
        }
      } else if (firstKoRoundMatches.length === 2) {
        if (sortedTeams.length >= 4) {
          promotedTeams.push({ home: sortedTeams[0], away: sortedTeams[3] });
          promotedTeams.push({ home: sortedTeams[1], away: sortedTeams[2] });
        }
      }
    } else {
      const getWinner = (gIdx: number) => {
        const groupChar = String.fromCharCode(65 + gIdx);
        const sorted = roundRankings.get(`Group ${groupChar}`) || [];
        return sorted[0] || null;
      };
      const getRunner = (gIdx: number) => {
        const groupChar = String.fromCharCode(65 + gIdx);
        const sorted = roundRankings.get(`Group ${groupChar}`) || [];
        return sorted[1] || null;
      };

      if (groupsCount === 2) {
        if (advancingType === 'winner') {
          const wA = getWinner(0);
          const wB = getWinner(1);
          if (wA && wB) {
            promotedTeams.push({ home: wA, away: wB });
          }
          // Populate Third Place Match with runners-up
          const rA = getRunner(0);
          const rB = getRunner(1);
          if (rA && rB) {
            const thirdPlaceLeg1Match = knockoutMatches.find(m =>
              (m.config as any)?.round === 'Third Place Match' &&
              ((m.config as any)?.leg === undefined || (m.config as any)?.leg === 1)
            );
            if (thirdPlaceLeg1Match) {
              thirdPlaceLeg1Match.homeTeamId = rA;
              thirdPlaceLeg1Match.awayTeamId = rB;
              await this.matchRepo.save(thirdPlaceLeg1Match);

              if (twoLegged) {
                const thirdPlaceLeg2Match = knockoutMatches.find(m =>
                  (m.config as any)?.round === 'Third Place Match' &&
                  (m.config as any)?.leg === 2
                );
                if (thirdPlaceLeg2Match) {
                  thirdPlaceLeg2Match.homeTeamId = rB;
                  thirdPlaceLeg2Match.awayTeamId = rA;
                  await this.matchRepo.save(thirdPlaceLeg2Match);
                }
              }
            }
          }
        } else if (advancingType === 'winner_and_runner') {
          const wA = getWinner(0);
          const rA = getRunner(0);
          const wB = getWinner(1);
          const rB = getRunner(1);
          if (wA && rB) promotedTeams.push({ home: wA, away: rB });
          if (wB && rA) promotedTeams.push({ home: wB, away: rA });
        }
      } else if (groupsCount === 4) {
        if (advancingType === 'winner') {
          const wA = getWinner(0);
          const wB = getWinner(1);
          const wC = getWinner(2);
          const wD = getWinner(3);
          if (wA && wB) promotedTeams.push({ home: wA, away: wB });
          if (wC && wD) promotedTeams.push({ home: wC, away: wD });
        } else if (advancingType === 'winner_and_runner') {
          const wA = getWinner(0);
          const rA = getRunner(0);
          const wB = getWinner(1);
          const rB = getRunner(1);
          const wC = getWinner(2);
          const rC = getRunner(2);
          const wD = getWinner(3);
          const rD = getRunner(3);
          if (wA && rB) promotedTeams.push({ home: wA, away: rB });
          if (wB && rA) promotedTeams.push({ home: wB, away: rA });
          if (wC && rD) promotedTeams.push({ home: wC, away: rD });
          if (wD && rC) promotedTeams.push({ home: wD, away: rC });
        }
      }
    }

    for (let i = 0; i < promotedTeams.length; i++) {
      const targetMatch = firstKoRoundMatches[i];
      if (!targetMatch) continue;

      targetMatch.homeTeamId = promotedTeams[i].home;
      targetMatch.awayTeamId = promotedTeams[i].away;
      await this.matchRepo.save(targetMatch);

      if (twoLegged) {
        const nextRoundLeg2Matches = knockoutMatches.filter(m =>
          (m.config as any)?.round === firstKoRoundName &&
          (m.config as any)?.leg === 2
        );
        const targetLeg2Match = nextRoundLeg2Matches[i];
        if (targetLeg2Match) {
          targetLeg2Match.homeTeamId = promotedTeams[i].away;
          targetLeg2Match.awayTeamId = promotedTeams[i].home;
          await this.matchRepo.save(targetLeg2Match);
        }
      }
    }

    // 9.2 & 9.3 — Team qualified / eliminated notifications
    try {
      const comp = await this.competitionRepo.findOne({
        where: { id: stage.competitionId },
        relations: { event: true }
      });
      if (comp) {
        const workspaceId = comp.event?.workspaceId || null;
        const qualifiedTeamIds = [...new Set(promotedTeams.flatMap((p) => [p.home, p.away]))];

        for (const tId of qualifiedTeamIds) {
          const team = await this.teamRepo.findOne({ where: { id: tId } });
          if (team) {
            const players = await this.getTeamPlayerUserIds(tId);
            await this.sendNotificationToMany(
              players,
              NotificationType.TEAM_QUALIFIED_FROM_GROUP,
              `🎯 ${team.name} has qualified from the group stage in ${comp.name}!`,
              workspaceId,
              { competitionId: comp.id, competitionName: comp.name },
            );
          }
        }

        const allCompTeams = await this.competitionTeamRepo.find({ where: { competitionId: stage.competitionId } });
        const enrolledTeamIds = allCompTeams.map((ct) => ct.teamId);
        const eliminatedTeamIds = enrolledTeamIds.filter((id) => !qualifiedTeamIds.includes(id));

        for (const tId of eliminatedTeamIds) {
          const team = await this.teamRepo.findOne({ where: { id: tId } });
          if (team) {
            const players = await this.getTeamPlayerUserIds(tId);
            await this.sendNotificationToMany(
              players,
              NotificationType.TEAM_ELIMINATED,
              `💔 ${team.name} has been eliminated from ${comp.name}.`,
              workspaceId,
              { competitionId: comp.id, competitionName: comp.name },
            );
          }
        }
      }
    } catch (e) {
      // ignore silently to prevent blocking group stage advancement
    }
  }

  private async getStageRankings(stage: CompetitionStage): Promise<string[]> {
    const matches = await this.matchRepo.find({
      where: { stageId: stage.id },
    });

    const winPoint = stage.config?.winPoint ?? 3;
    const drawPoint = stage.config?.drawPoint ?? 1;

    // Gather all unique team IDs that participated in this stage
    const teamIds = new Set<string>();
    for (const m of matches) {
      if (m.homeTeamId) teamIds.add(m.homeTeamId);
      if (m.awayTeamId) teamIds.add(m.awayTeamId);
    }

    const standings = new Map<string, { teamId: string; pts: number; gd: number; gf: number }>();
    for (const teamId of teamIds) {
      standings.set(teamId, { teamId, pts: 0, gd: 0, gf: 0 });
    }

    for (const m of matches) {
      if (m.status !== 'completed' || !m.homeTeamId || !m.awayTeamId) continue;

      const homeStats = standings.get(m.homeTeamId);
      const awayStats = standings.get(m.awayTeamId);
      if (!homeStats || !awayStats) continue;

      const hScore = m.homeScore ?? 0;
      const aScore = m.awayScore ?? 0;

      homeStats.gf += hScore;
      awayStats.gf += aScore;
      homeStats.gd += (hScore - aScore);
      awayStats.gd += (aScore - hScore);

      if (hScore > aScore) {
        homeStats.pts += winPoint;
      } else if (aScore > hScore) {
        awayStats.pts += winPoint;
      } else {
        homeStats.pts += drawPoint;
        awayStats.pts += drawPoint;
      }
    }

    return Array.from(teamIds).sort((a, b) => {
      const statsA = standings.get(a)!;
      const statsB = standings.get(b)!;
      if (statsB.pts !== statsA.pts) return statsB.pts - statsA.pts;
      if (statsB.gd !== statsA.gd) return statsB.gd - statsA.gd;
      return statsB.gf - statsA.gf;
    });
  }

  private async generateKnockoutStageMatches(stage: CompetitionStage, teamIds: string[]): Promise<void> {
    const twoLegged = stage.config?.twoLegged || stage.config?.legs === 2;
    // Determine number of teams to advance
    const prevStages = await this.stageRepo.find({
      where: { competitionId: stage.competitionId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });
    const prevStage = prevStages[prevStages.indexOf(stage) - 1];

    let koTeamsCount = teamIds.length;
    if (prevStage) {
      if (prevStage.type === 'group' || prevStage.type === 'league') {
        koTeamsCount = prevStage.config?.advancingCount ?? (prevStage.config?.groupsCount ? prevStage.config.groupsCount * 2 : 4);
      }
    }

    const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(koTeamsCount, 2))));
    const advancingTeams = teamIds.slice(0, bracketSize);

    const padded: (string | null)[] = [...advancingTeams, ...Array(bracketSize - advancingTeams.length).fill(null)];

    const fixtures: Array<{ homeTeamId: string | null; awayTeamId: string | null; config: any }> = [];

    const roundLabel = bracketSize === 2 ? 'Final' : bracketSize === 4 ? 'Semi-Final' : bracketSize === 8 ? 'Quarter-Final' : `Round of ${bracketSize}`;

    const firstRoundPairs: [string | null, string | null][] = [];
    const half = bracketSize / 2;
    for (let i = 0; i < half; i++) {
      firstRoundPairs.push([padded[i], padded[bracketSize - 1 - i]]);
    }

    for (const pair of firstRoundPairs) {
      const home = pair[0];
      const away = pair[1];
      if (home === null && away === null) continue;
      fixtures.push({
        homeTeamId: home,
        awayTeamId: away,
        config: twoLegged ? { round: roundLabel, leg: 1 } : { round: roundLabel },
      });
      if (twoLegged && home !== null && away !== null) {
        fixtures.push({
          homeTeamId: away,
          awayTeamId: home,
          config: { round: roundLabel, leg: 2 },
        });
      }
    }

    // Generate subsequent rounds as TBD skeletons
    let remainingTeams = bracketSize / 2;
    while (remainingTeams >= 2) {
      const subRoundLabel = remainingTeams === 2 ? 'Final' : remainingTeams === 4 ? 'Semi-Final' : remainingTeams === 8 ? 'Quarter-Final' : `Round of ${remainingTeams * 2}`;
      const matchesInRound = remainingTeams / 2;
      for (let m = 0; m < matchesInRound; m++) {
        fixtures.push({
          homeTeamId: null,
          awayTeamId: null,
          config: twoLegged ? { round: subRoundLabel, leg: 1 } : { round: subRoundLabel },
        });
        if (twoLegged) {
          fixtures.push({
            homeTeamId: null,
            awayTeamId: null,
            config: { round: subRoundLabel, leg: 2 },
          });
        }
      }
      if (remainingTeams === 2) {
        // Generate Third Place Match (losers final)
        const home3rd = bracketSize === 2 && advancingTeams.length >= 4 ? advancingTeams[2] : null;
        const away3rd = bracketSize === 2 && advancingTeams.length >= 4 ? advancingTeams[3] : null;
        fixtures.push({
          homeTeamId: home3rd,
          awayTeamId: away3rd,
          config: twoLegged ? { round: 'Third Place Match', leg: 1 } : { round: 'Third Place Match' },
        });
        if (twoLegged) {
          fixtures.push({
            homeTeamId: away3rd,
            awayTeamId: home3rd,
            config: { round: 'Third Place Match', leg: 2 },
          });
        }
      }
      remainingTeams = remainingTeams / 2;
    }

    // Save matches
    for (const f of fixtures) {
      const m = this.matchRepo.create({
        stageId: stage.id,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        status: 'scheduled',
        config: f.config,
        liveData: {},
      });
      await this.matchRepo.save(m);
    }
  }

  private async advanceTeamsBetweenStages(currentStage: CompetitionStage): Promise<void> {
    // 1. Fetch all stages in the competition
    const stages = await this.stageRepo.find({
      where: { competitionId: currentStage.competitionId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });

    const currIdx = stages.findIndex((s) => s.id === currentStage.id);
    if (currIdx === -1 || currIdx === stages.length - 1) return;

    const nextStage = stages[currIdx + 1];
    if (nextStage.type !== 'knockout') return; // only support progression to knockout stage

    // 2. Check if all matches in current stage are completed
    const currentMatches = await this.matchRepo.find({
      where: { stageId: currentStage.id },
    });
    if (currentMatches.length === 0) return;

    const allCompleted = currentMatches.every((m) => m.status === 'completed');
    if (!allCompleted) return;

    // 3. Get rankings/standings from the current stage
    const sortedTeams = await this.getStageRankings(currentStage);
    if (sortedTeams.length === 0) return;

    // 4. Fetch all matches of the next stage
    let nextMatches = await this.matchRepo.find({
      where: { stageId: nextStage.id },
      order: { id: 'ASC', createdAt: 'ASC' },
    });

    if (nextMatches.length === 0) {
      await this.generateKnockoutStageMatches(nextStage, sortedTeams);
      nextMatches = await this.matchRepo.find({
        where: { stageId: nextStage.id },
        order: { id: 'ASC', createdAt: 'ASC' },
      });
    }

    if (nextMatches.length === 0) return;

    // 5. Find the first round matches of the next stage (round with the highest matches count)
    const roundCounts: { [round: string]: number } = {};
    for (const m of nextMatches) {
      const rName = (m.config as any)?.round;
      if (!rName) continue;
      if (rName.toLowerCase().includes('third') || rName.toLowerCase().includes('3rd')) continue;
      const isLeg1OrNone = (m.config as any)?.leg === undefined || (m.config as any)?.leg === 1;
      if (isLeg1OrNone) {
        roundCounts[rName] = (roundCounts[rName] || 0) + 1;
      }
    }

    const sortedRounds = Object.keys(roundCounts).sort((a, b) => roundCounts[b] - roundCounts[a]);
    if (sortedRounds.length === 0) return;

    const firstKoRoundName = sortedRounds[0];
    const firstKoRoundMatches = nextMatches.filter(m =>
      (m.config as any)?.round === firstKoRoundName &&
      ((m.config as any)?.leg === undefined || (m.config as any)?.leg === 1)
    );

    const matchesCount = firstKoRoundMatches.length;
    const teamsCountNeeded = matchesCount * 2;

    // Get the top teams needed
    const advancingTeams = sortedTeams.slice(0, teamsCountNeeded);

    const twoLegged = (nextStage.config as any)?.twoLegged || (nextStage.config as any)?.legs === 2;

    // Map: High seed vs Low seed (standard bracket seeding)
    for (let i = 0; i < matchesCount; i++) {
      const targetMatch = firstKoRoundMatches[i];
      if (!targetMatch) continue;

      const homeTeam = advancingTeams[i] || null;
      const awayTeam = advancingTeams[teamsCountNeeded - 1 - i] || null;

      targetMatch.homeTeamId = homeTeam;
      targetMatch.awayTeamId = awayTeam;
      await this.matchRepo.save(targetMatch);

      if (twoLegged) {
        const nextRoundLeg2Matches = nextMatches.filter(m =>
          (m.config as any)?.round === firstKoRoundName &&
          (m.config as any)?.leg === 2
        );
        const targetLeg2Match = nextRoundLeg2Matches[i];
        if (targetLeg2Match) {
          targetLeg2Match.homeTeamId = awayTeam;
          targetLeg2Match.awayTeamId = homeTeam;
          await this.matchRepo.save(targetLeg2Match);
        }
      }
    }

    // Populate Third Place Match / Losers Final with 3rd and 4th place teams if first KO round is the Final (matchesCount === 1)
    if (matchesCount === 1 && sortedTeams.length >= 4) {
      const thirdPlaceMatches = nextMatches.filter(m => {
        const r = (m.config as any)?.round || '';
        const rLower = r.toLowerCase();
        return rLower.includes('third') || rLower.includes('3rd') || rLower.includes('loser');
      });

      const thirdPlaceLeg1Matches = thirdPlaceMatches.filter(m =>
        (m.config as any)?.leg === undefined || (m.config as any)?.leg === 1
      );

      for (let i = 0; i < thirdPlaceLeg1Matches.length; i++) {
        const targetMatch = thirdPlaceLeg1Matches[i];
        if (!targetMatch) continue;

        const homeTeam = sortedTeams[2] || null;
        const awayTeam = sortedTeams[3] || null;

        targetMatch.homeTeamId = homeTeam;
        targetMatch.awayTeamId = awayTeam;
        await this.matchRepo.save(targetMatch);

        if (twoLegged) {
          const nextRoundLeg2Matches = thirdPlaceMatches.filter(m =>
            (m.config as any)?.leg === 2
          );
          const targetLeg2Match = nextRoundLeg2Matches[i];
          if (targetLeg2Match) {
            targetLeg2Match.homeTeamId = awayTeam;
            targetLeg2Match.awayTeamId = homeTeam;
            await this.matchRepo.save(targetLeg2Match);
          }
        }
      }
    }
  }

  async removeMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    userId: string,
  ): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');
    await this.validateStageContext(workspaceId, eventId, competitionId, stageId);
    const match = await this.matchRepo.findOne({ where: { id: matchId, stageId } });
    if (!match) {
      throw new NotFoundException(`Match "${matchId}" not found in stage`);
    }
    await this.matchRepo.remove(match);
  }

  // ─── Competition Teams (Participants) ─────────────────────────────────────

  async getCompetitionTeams(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<CompetitionTeam[]> {
    await this.ensureMember(workspaceId, userId);
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
      relations: { teams: true },
    });
    if (!event) throw new NotFoundException(`Event not found`);
    const competition = await this.competitionRepo.findOne({ where: { id: competitionId, eventId } });
    if (!competition) throw new NotFoundException(`Competition "${competitionId}" not found`);

    const eventTeams = event.teams || [];
    const uniqueTeams = Array.from(new Map(eventTeams.map((t) => [t.id, t])).values());
    return uniqueTeams.map((t) => ({
      id: `${competitionId}-${t.id}`,
      competitionId,
      teamId: t.id,
      team: t,
      createdAt: event.createdAt,
    })) as CompetitionTeam[];
  }

  async addTeamToCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    teamId: string,
    userId: string,
  ): Promise<CompetitionTeam> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');
    await this.validateCompetitionContext(workspaceId, eventId, competitionId);
    const team = await this.teamRepo.findOne({ where: { id: teamId, workspaceId } });
    if (!team) throw new NotFoundException(`Team "${teamId}" not found in workspace`);
    const existing = await this.competitionTeamRepo.findOne({ where: { competitionId, teamId } });
    if (existing) throw new ConflictException(`Team is already enrolled in this competition`);
    const entry = this.competitionTeamRepo.create({ competitionId, teamId });
    const saved = await this.competitionTeamRepo.save(entry);
    const foundEntry = await this.competitionTeamRepo.findOne({ where: { id: saved.id }, relations: { team: true } });

    if (foundEntry) {
      const comp = await this.competitionRepo.findOne({ where: { id: competitionId } });
      const players = await this.getTeamPlayerUserIds(teamId);
      await this.sendNotificationToMany(
        players,
        NotificationType.TEAM_ADDED_TO_COMPETITION,
        `Your team ${foundEntry.team.name} has been registered for ${comp?.name ?? 'a competition'}.`,
        workspaceId,
        { teamId, teamName: foundEntry.team.name, competitionId, competitionName: comp?.name },
      );
    }

    return foundEntry as any;
  }

  async removeTeamFromCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    teamId: string,
    userId: string,
  ): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');
    await this.validateCompetitionContext(workspaceId, eventId, competitionId);
    const entry = await this.competitionTeamRepo.findOne({ where: { competitionId, teamId } });
    if (!entry) throw new NotFoundException(`Team is not enrolled in this competition`);

    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    const comp = await this.competitionRepo.findOne({ where: { id: competitionId } });

    await this.competitionTeamRepo.remove(entry);

    const players = await this.getTeamPlayerUserIds(teamId);
    await this.sendNotificationToMany(
      players,
      NotificationType.TEAM_REMOVED_FROM_COMPETITION,
      `Your team ${team?.name ?? 'Unknown'} has been withdrawn from ${comp?.name ?? 'the competition'}.`,
      workspaceId,
      { teamId, teamName: team?.name, competitionId, competitionName: comp?.name },
    );
  }

  // ─── Fixture Generator ─────────────────────────────────────────────────────

  async generateFixtures(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<{ stagesGenerated: number; matchesCreated: number }> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');

    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
      relations: { teams: true },
    });
    if (!event) throw new NotFoundException(`Event not found`);

    const competition = await this.competitionRepo.findOne({ where: { id: competitionId, eventId } });
    if (!competition) throw new NotFoundException(`Competition not found`);

    // Participating teams from event context
    const eventTeams = event.teams || [];
    const uniqueTeams = Array.from(new Map(eventTeams.map((t) => [t.id, t])).values());
    if (uniqueTeams.length < 2) {
      throw new BadRequestException('At least 2 teams must be mapped to the event before generating fixtures.');
    }

    // Stages
    const stages = await this.stageRepo.find({
      where: { competitionId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });
    if (stages.length === 0) {
      throw new BadRequestException('Configure at least one stage before generating fixtures.');
    }

    // Shuffle team IDs (guaranteed unique)
    const teamIds = uniqueTeams.map((t) => t.id);
    this.shuffleArray(teamIds);

    let totalMatches = 0;

    for (const stage of stages) {
      // Remove existing matches for this stage before regenerating
      const existing = await this.matchRepo.find({ where: { stageId: stage.id } });
      if (existing.length) await this.matchRepo.remove(existing);

      const fixtures: Array<{ homeTeamId: string | null; awayTeamId: string | null; config: any }> = [];

      // ── League / Group (Single Group Round Robin) ──────────────────────────
      if (stage.type === 'league' || stage.type === 'group') {
        const twoLegged = stage.config?.twoLegged || stage.config?.legs === 2;
        const roundRobin = this.generateRoundRobin(teamIds, twoLegged);
        for (const pair of roundRobin) {
          fixtures.push({
            homeTeamId: pair[0],
            awayTeamId: pair[1],
            config: { round: 'League Stage' },
          });
        }
      }

      // ── Pure Knockout first round and subsequent skeleton rounds ───────────
      else if (stage.type === 'knockout') {
        const twoLegged = stage.config?.twoLegged || stage.config?.legs === 2;
        const isFirstStage = stage.id === stages[0].id;

        if (isFirstStage) {
          const n = teamIds.length;
          const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));
          const padded: (string | null)[] = [...teamIds, ...Array(bracketSize - n).fill(null)];

          // Generate First Round (could contain actual teams and byes)
          const roundLabel = bracketSize === 2 ? 'Final' : bracketSize === 4 ? 'Semi-Final' : bracketSize === 8 ? 'Quarter-Final' : `Round of ${bracketSize}`;
          for (let i = 0; i < padded.length; i += 2) {
            const home = padded[i];
            const away = padded[i + 1];
            // Skip double-bye slots
            if (home === null && away === null) continue;
            fixtures.push({
              homeTeamId: home,
              awayTeamId: away,
              config: twoLegged ? { round: roundLabel, leg: 1 } : { round: roundLabel },
            });
            if (twoLegged && home !== null && away !== null) {
              fixtures.push({
                homeTeamId: away,
                awayTeamId: home,
                config: { round: roundLabel, leg: 2 },
              });
            }
          }

          // Generate subsequent rounds as TBD skeletons
          let remainingTeams = bracketSize / 2;
          while (remainingTeams >= 2) {
            const subRoundLabel = remainingTeams === 2 ? 'Final' : remainingTeams === 4 ? 'Semi-Final' : remainingTeams === 8 ? 'Quarter-Final' : `Round of ${remainingTeams * 2}`;
            const matchesInRound = remainingTeams / 2;
            for (let m = 0; m < matchesInRound; m++) {
              fixtures.push({
                homeTeamId: null,
                awayTeamId: null,
                config: twoLegged ? { round: subRoundLabel, leg: 1 } : { round: subRoundLabel },
              });
              if (twoLegged) {
                fixtures.push({
                  homeTeamId: null,
                  awayTeamId: null,
                  config: { round: subRoundLabel, leg: 2 },
                });
              }
            }
            if (remainingTeams === 2) {
              // Also generate Third Place Match
              fixtures.push({
                homeTeamId: null,
                awayTeamId: null,
                config: twoLegged ? { round: 'Third Place Match', leg: 1 } : { round: 'Third Place Match' },
              });
              if (twoLegged) {
                fixtures.push({
                  homeTeamId: null,
                  awayTeamId: null,
                  config: { round: 'Third Place Match', leg: 2 },
                });
              }
            }
            remainingTeams = remainingTeams / 2;
          }
        } else {
          // Do not generate dummy skeleton fixtures for subsequent knockout stages.
          // They will be dynamically generated once the previous stage is fully completed.
        }
      }

      // ── Group + Knockout Combined ──────────────────────────────────────────
      else if (stage.type === 'group_knockout') {
        const isSingleGroup = stage.config?.groupKnockoutSubtype === 'single_group';
        const twoLeggedGroup = stage.config?.twoLegged || stage.config?.legs === 2;
        const twoLeggedKO = stage.config?.twoLegged || stage.config?.legs === 2; // default same legs for KO

        let totalAdvancing = 2; // Default play final

        if (isSingleGroup) {
          // 1. Group Stage: Single group, round robin
          const roundRobin = this.generateRoundRobin(teamIds, twoLeggedGroup);
          for (const pair of roundRobin) {
            fixtures.push({
              homeTeamId: pair[0],
              awayTeamId: pair[1],
              config: { round: 'Group Stage' },
            });
          }
          // Get advancing setup
          totalAdvancing = Number(stage.config?.singleGroupAdvancing ?? 2);
        } else {
          // 2. Group Stage: Multiple groups, round robin
          const groupsCount = stage.config?.groupsCount ?? 2;
          const groups: string[][] = Array.from({ length: groupsCount }, () => []);
          teamIds.forEach((id, idx) => groups[idx % groupsCount].push(id));

          for (let gIndex = 0; gIndex < groups.length; gIndex++) {
            const group = groups[gIndex];
            const groupChar = String.fromCharCode(65 + gIndex); // A, B, C...
            if (group.length < 2) continue;
            const roundRobin = this.generateRoundRobin(group, twoLeggedGroup);
            for (const pair of roundRobin) {
              fixtures.push({
                homeTeamId: pair[0],
                awayTeamId: pair[1],
                config: { round: `Group ${groupChar}` },
              });
            }
          }

          // Calculate advancing count
          const isWinnerAndRunner = stage.config?.advancingType === 'winner_and_runner';
          totalAdvancing = groupsCount * (isWinnerAndRunner ? 2 : 1);
        }

        // 3. Generate Knockout Stage Skeleton (TBD teams)
        // Ensure totalAdvancing is at least 2 and power of 2
        let koTeamsCount = totalAdvancing;
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(koTeamsCount, 2))));

        let remainingTeams = bracketSize;
        while (remainingTeams >= 2) {
          const koRoundLabel = remainingTeams === 2 ? 'Final' : remainingTeams === 4 ? 'Semi-Final' : remainingTeams === 8 ? 'Quarter-Final' : `Round of ${remainingTeams}`;
          const matchesInRound = remainingTeams / 2;
          for (let m = 0; m < matchesInRound; m++) {
            fixtures.push({
              homeTeamId: null,
              awayTeamId: null,
              config: twoLeggedKO ? { round: koRoundLabel, leg: 1 } : { round: koRoundLabel },
            });
            if (twoLeggedKO) {
              fixtures.push({
                homeTeamId: null,
                awayTeamId: null,
                config: { round: koRoundLabel, leg: 2 },
              });
            }
          }
          if (remainingTeams === 2) {
            // Also generate Third Place Match
            fixtures.push({
              homeTeamId: null,
              awayTeamId: null,
              config: twoLeggedKO ? { round: 'Third Place Match', leg: 1 } : { round: 'Third Place Match' },
            });
            if (twoLeggedKO) {
              fixtures.push({
                homeTeamId: null,
                awayTeamId: null,
                config: { round: 'Third Place Match', leg: 2 },
              });
            }
          }
          remainingTeams = remainingTeams / 2;
        }
      }

      if (fixtures.length === 0) continue;

      const matchEntities = fixtures.map((f) =>
        this.matchRepo.create({
          stageId: stage.id,
          homeTeamId: f.homeTeamId,
          awayTeamId: f.awayTeamId,
          venueId: (stage.config as any)?.venueId || null,
          homeScore: 0,
          awayScore: 0,
          status: 'scheduled',
          config: f.config,
          liveData: null,
        }),
      );

      await this.matchRepo.save(matchEntities);
      totalMatches += matchEntities.length;
    }

    // 5.4 — Notify players in competing teams that fixtures have been generated
    if (totalMatches > 0) {
      const compTeams = await this.competitionTeamRepo.find({ where: { competitionId } });
      const teamIds = compTeams.map((ct) => ct.teamId);
      const players = await this.getTeamsPlayerUserIds(teamIds);
      await this.sendNotificationToMany(
        players,
        NotificationType.FIXTURES_GENERATED,
        `Fixtures have been generated for "${competition.name}". Check your schedule!`,
        workspaceId,
        { competitionId, competitionName: competition.name },
      );
    }

    return { stagesGenerated: stages.length, matchesCreated: totalMatches };
  }

  /** Fisher-Yates in-place shuffle */
  private shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  /** Round-robin pairings for a group of teams */
  private generateRoundRobin(
    teams: string[],
    twoLegged: boolean,
  ): [string, string][] {
    const matches: [string, string][] = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push([teams[i], teams[j]]);
        if (twoLegged) matches.push([teams[j], teams[i]]);
      }
    }
    return matches;
  }

  /** First-round knockout bracket; pads to next power-of-2 with null byes */
  private generateKnockoutBracket(
    teams: string[],
    twoLegged: boolean,
  ): [string | null, string | null][] {
    const n = teams.length;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));
    const padded: (string | null)[] = [...teams, ...Array(bracketSize - n).fill(null)];

    const matches: [string | null, string | null][] = [];
    for (let i = 0; i < padded.length; i += 2) {
      const home = padded[i];
      const away = padded[i + 1];
      // Skip double-bye slots
      if (home === null && away === null) continue;
      matches.push([home, away]);
      if (twoLegged && home !== null && away !== null) {
        matches.push([away, home]);
      }
    }
    return matches;
  }

  // ─── Venues Management ─────────────────────────────────────────────────────

  async getVenues(workspaceId: string, userId: string): Promise<Venue[]> {
    await this.ensureMember(workspaceId, userId);
    return this.venueRepo.find({
      where: { workspaceId },
      order: { name: 'ASC' },
    });
  }

  async createVenue(workspaceId: string, dto: CreateVenueDto, userId: string): Promise<Venue> {
    await this.ensurePermission(workspaceId, userId, 'workspace.update');
    const venue = this.venueRepo.create({
      name: dto.name,
      location: dto.location ?? null,
      capacity: dto.capacity ?? null,
      imageUrl: dto.imageUrl ?? null,
      workspaceId,
    });
    return this.venueRepo.save(venue);
  }

  async updateVenue(
    workspaceId: string,
    venueId: string,
    dto: UpdateVenueDto,
    userId: string,
  ): Promise<Venue> {
    await this.ensurePermission(workspaceId, userId, 'workspace.update');
    const venue = await this.venueRepo.findOne({ where: { id: venueId, workspaceId } });
    if (!venue) {
      throw new NotFoundException('Venue not found in this workspace');
    }

    Object.assign(venue, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
    });

    return this.venueRepo.save(venue);
  }

  async removeVenue(workspaceId: string, venueId: string, userId: string): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'workspace.update');
    const venue = await this.venueRepo.findOne({ where: { id: venueId, workspaceId } });
    if (!venue) {
      throw new NotFoundException('Venue not found in this workspace');
    }
    await this.venueRepo.remove(venue);
  }

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

    let statistics = {
      allTime: {
        appearances: 0,
        mvps: 0,
        avgRating: null as number | null,
        football: { goals: 0, assists: 0, yellowCards: 0, redCards: 0, ownGoals: 0 },
        cricket: { runs: 0, wickets: 0, oversBowled: 0, ballsBowled: 0, runsConceded: 0, maidens: 0, bowledOut: 0, fours: 0, sixes: 0 },
        badminton: { ralliesWon: 0, ralliesLost: 0 },
      },
      competitions: [] as any[]
    };

    const playerIds = players.map(p => p.id);
    if (playerIds.length > 0) {
      const playerEntries = await this.matchPlayerRepo.find({
        where: { playerId: In(playerIds) },
        relations: {
          match: {
            stage: {
              competition: {
                sport: true,
              },
            },
          },
          player: {
            user: true,
          },
          team: true,
        },
      });

      const completedEntries = playerEntries.filter(pe => pe.match && pe.match.status === 'completed');
      if (completedEntries.length > 0) {
        const matchIds = completedEntries.map(pe => pe.matchId);
        const maxRatings = new Map<string, number>();

        const allMatchPlayersInUserMatches = await this.matchPlayerRepo.find({
          where: { matchId: In(matchIds), isPlaying: true },
        });
        for (const amp of allMatchPlayersInUserMatches) {
          if (amp.rating !== null) {
            const rVal = Number(amp.rating);
            const currentMax = maxRatings.get(amp.matchId) ?? -1;
            if (rVal > currentMax) {
              maxRatings.set(amp.matchId, rVal);
            }
          }
        }

        const competitionGroups = new Map<string, { competitionId: string; competitionName: string; sportCode: string; entries: MatchPlayer[] }>();
        for (const pe of completedEntries) {
          const stage = pe.match?.stage;
          const competition = stage?.competition;
          if (!competition) continue;

          let group = competitionGroups.get(competition.id);
          if (!group) {
            group = {
              competitionId: competition.id,
              competitionName: competition.name,
              sportCode: competition.sport?.code ?? 'football',
              entries: [],
            };
            competitionGroups.set(competition.id, group);
          }
          group.entries.push(pe);
        }

        const statsByCompetition: any[] = [];
        const allTimeStats = {
          appearances: 0,
          mvps: 0,
          ratings: [] as number[],
          football: { goals: 0, assists: 0, yellowCards: 0, redCards: 0, ownGoals: 0 },
          cricket: { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, wickets: 0, maidens: 0, runsConceded: 0, oversBowled: 0, ballsBowled: 0, bowledOut: 0 },
          badminton: { ralliesWon: 0, ralliesLost: 0 }
        };

        for (const group of competitionGroups.values()) {
          const compStats: any = {
            competitionId: group.competitionId,
            competitionName: group.competitionName,
            sportCode: group.sportCode,
            appearances: group.entries.length,
            mvps: 0,
            avgRating: null as number | null,
            ratings: [] as number[],
          };

          if (group.sportCode === 'football') {
            compStats.football = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, ownGoals: 0 };
          } else if (group.sportCode === 'cricket') {
            compStats.cricket = { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, wickets: 0, maidens: 0, runsConceded: 0, oversBowled: 0, ballsBowled: 0, bowledOut: 0 };
          } else if (group.sportCode === 'badminton') {
            compStats.badminton = { ralliesWon: 0, ralliesLost: 0 };
          }

          for (const pe of group.entries) {
            if (pe.rating !== null) {
              const ratingVal = Number(pe.rating);
              compStats.ratings.push(ratingVal);
              allTimeStats.ratings.push(ratingVal);

              const maxR = maxRatings.get(pe.matchId);
              if (maxR !== undefined && ratingVal === maxR) {
                compStats.mvps++;
                allTimeStats.mvps++;
              }
            }

            allTimeStats.appearances++;

            const liveData = pe.match?.liveData;
            if (!liveData) continue;

            if (group.sportCode === 'football') {
              const events = liveData.events || [];
              for (const ev of events) {
                const isSelf = (ev.playerUserId === userId) || (ev.playerId === pe.playerId);
                const isSelfAssist = (ev.assistPlayerUserId === userId) || (ev.assistPlayerId === pe.playerId);

                if (ev.type === 'goal') {
                  if (ev.goalType === 'own_goal') {
                    if (isSelf) {
                      compStats.football.ownGoals++;
                      allTimeStats.football.ownGoals++;
                    }
                  } else {
                    if (isSelf) {
                      compStats.football.goals++;
                      allTimeStats.football.goals++;
                    }
                    if (isSelfAssist) {
                      compStats.football.assists++;
                      allTimeStats.football.assists++;
                    }
                  }
                } else if (ev.type === 'own_goal') {
                  if (isSelf) {
                    compStats.football.ownGoals++;
                    allTimeStats.football.ownGoals++;
                  }
                } else if (ev.type === 'assist') {
                  if (isSelf) {
                    compStats.football.assists++;
                    allTimeStats.football.assists++;
                  }
                } else if (ev.type === 'card') {
                  if (isSelf) {
                    if (ev.cardType === 'yellow') {
                      compStats.football.yellowCards++;
                      allTimeStats.football.yellowCards++;
                    } else if (ev.cardType === 'red' || ev.cardType === 'second_yellow') {
                      compStats.football.redCards++;
                      allTimeStats.football.redCards++;
                    }
                  }
                } else if (ev.type === 'yellow_card') {
                  if (isSelf) {
                    compStats.football.yellowCards++;
                    allTimeStats.football.yellowCards++;
                  }
                } else if (ev.type === 'red_card') {
                  if (isSelf) {
                    compStats.football.redCards++;
                    allTimeStats.football.redCards++;
                  }
                }
              }
            } else if (group.sportCode === 'cricket') {
              const inningsList = liveData.inningsData || [];
              const username = pe.player?.user?.username;
              if (username) {
                for (const inn of inningsList) {
                  const bStats = inn.batsmanStats?.[username];
                  if (bStats) {
                    const r = bStats.runs ?? 0;
                    const b = bStats.balls ?? 0;
                    const f = bStats.fours ?? 0;
                    const s = bStats.sixes ?? 0;
                    compStats.cricket.runs += r;
                    compStats.cricket.ballsFaced += b;
                    compStats.cricket.fours += f;
                    compStats.cricket.sixes += s;

                    allTimeStats.cricket.runs += r;
                    allTimeStats.cricket.ballsFaced += b;
                    allTimeStats.cricket.fours += f;
                    allTimeStats.cricket.sixes += s;
                  }
                  const bwStats = inn.bowlerStats?.[username];
                  if (bwStats) {
                    const o = bwStats.overs ?? 0;
                    const b = bwStats.balls ?? 0;
                    const rc = bwStats.runsConceded ?? 0;
                    const w = bwStats.wickets ?? 0;
                    const m = bwStats.maidens ?? 0;

                    compStats.cricket.oversBowled += o;
                    compStats.cricket.ballsBowled += b;
                    compStats.cricket.runsConceded += rc;
                    compStats.cricket.wickets += w;
                    compStats.cricket.maidens += m;

                    allTimeStats.cricket.oversBowled += o;
                    allTimeStats.cricket.ballsBowled += b;
                    allTimeStats.cricket.runsConceded += rc;
                    allTimeStats.cricket.wickets += w;
                    allTimeStats.cricket.maidens += m;
                  }
                  if (inn.ballsHistory) {
                    for (const ball of inn.ballsHistory) {
                      if (ball.wicket && ball.striker === username && ball.wicketType !== 'Retired Hurt') {
                        compStats.cricket.bowledOut++;
                        allTimeStats.cricket.bowledOut++;
                      }
                    }
                  }
                }
              }
            } else if (group.sportCode === 'badminton') {
              const rallies = liveData.rallies || [];
              const isHomeTeam = pe.teamId === pe.match.homeTeamId;
              for (const r of rallies) {
                if (r.winnerSide === 'none') continue;
                if (isHomeTeam) {
                  if (r.winnerSide === 'home') {
                    compStats.badminton.ralliesWon++;
                    allTimeStats.badminton.ralliesWon++;
                  } else {
                    compStats.badminton.ralliesLost++;
                    allTimeStats.badminton.ralliesLost++;
                  }
                } else {
                  if (r.winnerSide === 'away') {
                    compStats.badminton.ralliesWon++;
                    allTimeStats.badminton.ralliesWon++;
                  } else {
                    compStats.badminton.ralliesLost++;
                    allTimeStats.badminton.ralliesLost++;
                  }
                }
              }
            }
          }

          compStats.avgRating = compStats.ratings.length > 0
            ? Math.round((compStats.ratings.reduce((a: any, b: any) => a + b, 0) / compStats.ratings.length) * 100) / 100
            : null;
          delete compStats.ratings;

          statsByCompetition.push(compStats);
        }

        const allTimeAvgRating = allTimeStats.ratings.length > 0
          ? Math.round((allTimeStats.ratings.reduce((a: any, b: any) => a + b, 0) / allTimeStats.ratings.length) * 100) / 100
          : null;

        statistics = {
          allTime: {
            appearances: allTimeStats.appearances,
            mvps: allTimeStats.mvps,
            avgRating: allTimeAvgRating,
            football: allTimeStats.football,
            cricket: {
              runs: allTimeStats.cricket.runs,
              wickets: allTimeStats.cricket.wickets,
              oversBowled: allTimeStats.cricket.oversBowled,
              ballsBowled: allTimeStats.cricket.ballsBowled,
              runsConceded: allTimeStats.cricket.runsConceded,
              maidens: allTimeStats.cricket.maidens,
              bowledOut: allTimeStats.cricket.bowledOut,
              fours: allTimeStats.cricket.fours,
              sixes: allTimeStats.cricket.sixes,
            },
            badminton: allTimeStats.badminton,
          },
          competitions: statsByCompetition
        };
      }
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      workspaces: memberships.map(m => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: {
          slug: m.role.slug,
          name: m.role.name,
        }
      })),
      teams: players.map(p => ({
        id: p.team.id,
        name: p.team.name,
        code: p.team.code,
        logoUrl: p.team.logoUrl,
        jerseyNumber: p.jerseyNumber,
        workspace: {
          id: p.workspace.id,
          name: p.workspace.name,
        }
      })),
      statistics
    };
  }

  // ─── Match Lineups ─────────────────────────────────────────────────────────

  async getMatchLineup(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    userId: string,
  ): Promise<MatchPlayer[]> {
    await this.ensureMember(workspaceId, userId);
    await this.validateStageContext(workspaceId, eventId, competitionId, stageId);

    const match = await this.matchRepo.findOne({
      where: { id: matchId, stageId },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return this.matchPlayerRepo.find({
      where: { matchId },
      relations: {
        player: {
          user: true,
        },
        team: true,
      },
    });
  }

  async saveMatchLineup(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    lineups: { playerId: string; isPlaying: boolean; teamId: string; isGoalkeeper?: boolean }[],
    userId: string,
  ): Promise<MatchPlayer[]> {
    await this.ensurePermission(workspaceId, userId, 'match.score');
    await this.validateStageContext(workspaceId, eventId, competitionId, stageId);

    const match = await this.matchRepo.findOne({
      where: { id: matchId, stageId },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Fetch existing entries
    const existing = await this.matchPlayerRepo.find({
      where: { matchId },
    });
    const existingMap = new Map<string, MatchPlayer>();
    for (const entry of existing) {
      existingMap.set(entry.playerId, entry);
    }

    const toSave: MatchPlayer[] = [];
    const processedPlayerIds = new Set<string>();

    for (const item of lineups) {
      processedPlayerIds.add(item.playerId);
      let entry = existingMap.get(item.playerId);
      const isGK = item.isGoalkeeper ?? false;
      if (entry) {
        entry.isPlaying = item.isPlaying;
        entry.teamId = item.teamId;
        entry.isGoalkeeper = isGK;
      } else {
        entry = this.matchPlayerRepo.create({
          matchId,
          playerId: item.playerId,
          teamId: item.teamId,
          isPlaying: item.isPlaying,
          isGoalkeeper: isGK,
        });
      }
      toSave.push(entry);
    }

    // Save the new/updated ones
    await this.matchPlayerRepo.save(toSave);

    // Delete any existing entries that were not present in the update payload
    const toDelete: MatchPlayer[] = [];
    for (const entry of existing) {
      if (!processedPlayerIds.has(entry.playerId)) {
        toDelete.push(entry);
      }
    }
    if (toDelete.length > 0) {
      await this.matchPlayerRepo.remove(toDelete);
    }

    // Return the updated list with relations
    const result = await this.matchPlayerRepo.find({
      where: { matchId },
      relations: {
        player: {
          user: true,
        },
        team: true,
      },
    });

    // 6.2 — Notify selected players
    const matchDetails = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: { homeTeam: true, awayTeam: true }
    });
    const selectedPlayers = result.filter(mp => mp.isPlaying);
    for (const sp of selectedPlayers) {
      if (sp.player?.userId) {
        await this.sendNotification(
          sp.player.userId,
          NotificationType.MATCH_LINEUP_SET,
          `You've been selected in the lineup for ${matchDetails?.homeTeam?.name ?? 'Home'} vs ${matchDetails?.awayTeam?.name ?? 'Away'}.`,
          workspaceId,
          { matchId, homeTeamName: matchDetails?.homeTeam?.name, awayTeamName: matchDetails?.awayTeam?.name }
        );
      }
    }

    return result;
  }

  // ─── Player Ratings ────────────────────────────────────────────────────────

  /**
   * Returns all MatchPlayer entries for a match, including the rating field.
   */
  async getMatchRatings(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    userId: string,
  ): Promise<MatchPlayer[]> {
    await this.ensureMember(workspaceId, userId);
    await this.validateStageContext(workspaceId, eventId, competitionId, stageId);

    const match = await this.matchRepo.findOne({ where: { id: matchId, stageId } });
    if (!match) throw new NotFoundException('Match not found');

    return this.matchPlayerRepo.find({
      where: { matchId, isPlaying: true },
      relations: { player: { user: true }, team: true },
      order: { rating: 'DESC' },
    });
  }

  /**
   * Manually set / override per-player ratings for a match.
   * Only players with isPlaying=true can be rated.
   * Ratings are clamped to 5.0–10.0 by the DTO validator.
   */
  async setMatchPlayerRatings(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    ratings: RateMatchPlayerItemDto[],
    userId: string,
  ): Promise<MatchPlayer[]> {
    await this.ensurePermission(workspaceId, userId, 'match.score');
    await this.validateStageContext(workspaceId, eventId, competitionId, stageId);

    const match = await this.matchRepo.findOne({ where: { id: matchId, stageId } });
    if (!match) throw new NotFoundException('Match not found');

    const players = await this.matchPlayerRepo.find({ where: { matchId } });
    const playerMap = new Map(players.map((p) => [p.playerId, p]));

    const toSave: MatchPlayer[] = [];
    for (const item of ratings) {
      const entry = playerMap.get(item.playerId);
      if (!entry) continue; // silently skip players not in this match
      entry.rating = Math.min(10.0, Math.max(5.0, item.rating));
      toSave.push(entry);
    }

    const savedRatings = await this.matchPlayerRepo.save(toSave);
    const populatedSaved = await this.matchPlayerRepo.find({
      where: { id: In(savedRatings.map((s) => s.id)) },
      relations: { player: { user: true }, team: true },
    });

    const matchDetails = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: { homeTeam: true, awayTeam: true },
    });

    for (const entry of populatedSaved) {
      if (entry.player?.userId && entry.rating !== null) {
        await this.sendNotification(
          entry.player.userId,
          NotificationType.PLAYER_RATING_UPDATED,
          `Your match rating has been updated to ${entry.rating}/10 for ${matchDetails?.homeTeam?.name} vs ${matchDetails?.awayTeam?.name}.`,
          workspaceId,
          { matchId, rating: entry.rating },
        );
      }
    }

    return this.matchPlayerRepo.find({
      where: { matchId, isPlaying: true },
      relations: { player: { user: true }, team: true },
      order: { rating: 'DESC' },
    });
  }

  /**
   * Returns the "Best Player" for a competition based on:
   * - Average rating across all matches they played
   * - Minimum appearance threshold: must have played in >= 50% of the
   *   competition's total completed matches to be eligible.
   */
  async getCompetitionBestPlayer(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<{
    bestPlayer: MatchPlayer | null;
    allRankings: Array<{
      playerId: string;
      playerName: string;
      teamName: string;
      avgRating: number;
      appearances: number;
      eligible: boolean;
    }>;
    totalMatches: number;
    minAppearancesRequired: number;
  }> {
    await this.ensureMember(workspaceId, userId);
    const competition = await this.validateCompetitionContext(workspaceId, eventId, competitionId);

    // Gather all stage IDs for this competition
    const stages = await this.stageRepo.find({ where: { competitionId } });
    const stageIds = stages.map((s) => s.id);
    if (stageIds.length === 0) {
      return { bestPlayer: null, allRankings: [], totalMatches: 0, minAppearancesRequired: 0 };
    }

    // Count total completed matches in the competition
    const allMatches = await this.matchRepo.find({
      where: { stageId: In(stageIds), status: 'completed' },
    });
    const totalMatches = allMatches.length;
    if (totalMatches === 0) {
      return { bestPlayer: null, allRankings: [], totalMatches: 0, minAppearancesRequired: 0 };
    }

    const matchIds = allMatches.map((m) => m.id);
    const minAppearancesRequired = Math.ceil(totalMatches * 0.5);

    // Fetch all rated match-player entries across all competition matches
    const allMatchPlayers = await this.matchPlayerRepo.find({
      where: { matchId: In(matchIds), isPlaying: true },
      relations: { player: { user: true }, team: true },
    });

    // Aggregate per player
    const playerStats = new Map<
      string,
      { entry: MatchPlayer; ratings: number[]; teamName: string; playerName: string }
    >();

    for (const mp of allMatchPlayers) {
      if (mp.rating === null) continue; // skip unrated
      const existing = playerStats.get(mp.playerId);
      const playerName =
        mp.player?.user?.username ?? mp.player?.jerseyNumber?.toString() ?? mp.playerId;
      const teamName = mp.team?.name ?? 'Unknown';
      if (existing) {
        existing.ratings.push(Number(mp.rating));
      } else {
        playerStats.set(mp.playerId, {
          entry: mp,
          ratings: [Number(mp.rating)],
          playerName,
          teamName,
        });
      }
    }

    // Build rankings
    const rankings: Array<{
      playerId: string;
      playerName: string;
      teamName: string;
      avgRating: number;
      appearances: number;
      eligible: boolean;
    }> = [];

    for (const [playerId, stats] of playerStats.entries()) {
      const appearances = stats.ratings.length;
      const avgRating =
        Math.round((stats.ratings.reduce((a, b) => a + b, 0) / appearances) * 100) / 100;
      rankings.push({
        playerId,
        playerName: stats.playerName,
        teamName: stats.teamName,
        avgRating,
        appearances,
        eligible: appearances >= minAppearancesRequired,
      });
    }

    // Sort eligible first, then by avgRating descending
    rankings.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.avgRating - a.avgRating;
    });

    const topEligible = rankings.find((r) => r.eligible) ?? null;
    let bestPlayer: MatchPlayer | null = null;
    if (topEligible) {
      bestPlayer =
        playerStats.get(topEligible.playerId)?.entry ?? null;
    }

    return { bestPlayer, allRankings: rankings, totalMatches, minAppearancesRequired };
  }

  /**
   * Aggregates and returns stats leaderboards for a competition.
   */
  async getCompetitionStats(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<any> {
    await this.ensureMember(workspaceId, userId);
    const competition = await this.validateCompetitionContext(workspaceId, eventId, competitionId);

    const sportCode = competition.sport?.code ?? 'football';

    // Gather all stage IDs for this competition
    const stages = await this.stageRepo.find({ where: { competitionId } });
    const stageIds = stages.map((s) => s.id);
    if (stageIds.length === 0) {
      return { sportCode, topRated: [] };
    }

    // Find all completed matches in the competition
    const completedMatches = await this.matchRepo.find({
      where: { stageId: In(stageIds), status: 'completed' },
    });
    if (completedMatches.length === 0) {
      return { sportCode, topRated: [] };
    }

    const matchIds = completedMatches.map((m) => m.id);

    // Fetch all match-player entries for these matches (starters & subs)
    const allMatchPlayers = await this.matchPlayerRepo.find({
      where: { matchId: In(matchIds), isPlaying: true },
      relations: { player: { user: true }, team: true },
    });

    // Lookup structures
    // Key: userId -> { playerId, playerName, teamName }
    const userUserIdMap = new Map<string, { playerId: string; playerName: string; teamName: string }>();
    // Key: username -> { playerId, playerName, teamName }
    const userUsernameMap = new Map<string, { playerId: string; playerName: string; teamName: string }>();
    // Key: playerId -> { playerId, playerName, teamName, ratings[] }
    const ratingsMap = new Map<string, { playerId: string; playerName: string; teamName: string; ratings: number[] }>();

    for (const mp of allMatchPlayers) {
      const playerName = mp.player?.user?.username ?? mp.player?.jerseyNumber?.toString() ?? mp.playerId;
      const teamName = mp.team?.name ?? 'Unknown';
      const pInfo = { playerId: mp.playerId, playerName, teamName };

      if (mp.player?.userId) {
        userUserIdMap.set(mp.player.userId, pInfo);
      }
      if (mp.player?.user?.username) {
        userUsernameMap.set(mp.player.user.username, pInfo);
      }

      if (mp.rating !== null) {
        let existing = ratingsMap.get(mp.playerId);
        if (!existing) {
          existing = { ...pInfo, ratings: [] };
          ratingsMap.set(mp.playerId, existing);
        }
        existing.ratings.push(Number(mp.rating));
      }
    }

    // Top rated calculations
    const topRated = Array.from(ratingsMap.values()).map(r => {
      const avgRating = Math.round((r.ratings.reduce((a, b) => a + b, 0) / r.ratings.length) * 100) / 100;
      return {
        playerId: r.playerId,
        playerName: r.playerName,
        teamName: r.teamName,
        avgRating,
        appearances: r.ratings.length,
      };
    }).sort((a, b) => b.avgRating - a.avgRating).slice(0, 10);

    // Calculate most MVPs
    const mvpCounts = new Map<string, { playerId: string; playerName: string; teamName: string; mvps: number }>();
    const matchPlayersMap = new Map<string, MatchPlayer[]>();
    for (const mp of allMatchPlayers) {
      if (!matchPlayersMap.has(mp.matchId)) {
        matchPlayersMap.set(mp.matchId, []);
      }
      matchPlayersMap.get(mp.matchId)!.push(mp);
    }
    for (const [matchId, playersInMatch] of matchPlayersMap.entries()) {
      let maxRating = -1;
      let mvpCandidates: MatchPlayer[] = [];
      for (const mp of playersInMatch) {
        if (mp.rating !== null) {
          const r = Number(mp.rating);
          if (r > maxRating) {
            maxRating = r;
            mvpCandidates = [mp];
          } else if (r === maxRating) {
            mvpCandidates.push(mp);
          }
        }
      }
      if (maxRating >= 5.0) {
        for (const mvpMp of mvpCandidates) {
          let entry = mvpCounts.get(mvpMp.playerId);
          if (!entry) {
            const playerName = mvpMp.player?.user?.username ?? mvpMp.player?.jerseyNumber?.toString() ?? mvpMp.playerId;
            const teamName = mvpMp.team?.name ?? 'Unknown';
            entry = { playerId: mvpMp.playerId, playerName, teamName, mvps: 0 };
            mvpCounts.set(mvpMp.playerId, entry);
          }
          entry.mvps++;
        }
      }
    }
    const mostMvps = Array.from(mvpCounts.values()).sort((a, b) => b.mvps - a.mvps).slice(0, 10);

    if (sportCode === 'football') {
      const scorers = new Map<string, { playerId: string; playerName: string; teamName: string; goals: number }>();
      const assists = new Map<string, { playerId: string; playerName: string; teamName: string; assists: number }>();
      const yellowCards = new Map<string, { playerId: string; playerName: string; teamName: string; cards: number }>();
      const redCards = new Map<string, { playerId: string; playerName: string; teamName: string; cards: number }>();

      const getOrCreateTally = (
        map: Map<string, any>,
        pUserId: string,
        initialValueKey: string,
      ) => {
        let entry = map.get(pUserId);
        if (!entry) {
          const info = userUserIdMap.get(pUserId) ?? { playerId: pUserId, playerName: 'Unknown', teamName: 'Unknown' };
          entry = { ...info, [initialValueKey]: 0 };
          map.set(pUserId, entry);
        }
        return entry;
      };

      for (const m of completedMatches) {
        const events = (m.liveData as any)?.events;
        if (!Array.isArray(events)) continue;

        for (const ev of events) {
          const pUserId = ev.playerUserId;
          if (!pUserId) continue;

          if (ev.type === 'goal') {
            if (ev.goalType !== 'own_goal') {
              const scorer = getOrCreateTally(scorers, pUserId, 'goals');
              scorer.goals++;

              const assistUserId = ev.assistPlayerUserId;
              if (assistUserId) {
                const assister = getOrCreateTally(assists, assistUserId, 'assists');
                assister.assists++;
              }
            }
          } else if (ev.type === 'card') {
            if (ev.cardType === 'yellow') {
              const yc = getOrCreateTally(yellowCards, pUserId, 'cards');
              yc.cards++;
            } else if (ev.cardType === 'red' || ev.cardType === 'second_yellow') {
              const rc = getOrCreateTally(redCards, pUserId, 'cards');
              rc.cards++;
            }
          }
        }
      }

      return {
        sportCode,
        topRated,
        mostMvps,
        topScorers: Array.from(scorers.values()).sort((a, b) => b.goals - a.goals).slice(0, 10),
        topAssists: Array.from(assists.values()).sort((a, b) => b.assists - a.assists).slice(0, 10),
        mostYellowCards: Array.from(yellowCards.values()).sort((a, b) => b.cards - a.cards).slice(0, 10),
        mostRedCards: Array.from(redCards.values()).sort((a, b) => b.cards - a.cards).slice(0, 10),
      };
    }

    if (sportCode === 'cricket') {
      const runs = new Map<string, { playerId: string; playerName: string; teamName: string; runs: number; innings: number }>();
      const wickets = new Map<string, { playerId: string; playerName: string; teamName: string; wickets: number; innings: number }>();

      for (const m of completedMatches) {
        const innings = (m.liveData as any)?.inningsData;
        if (!Array.isArray(innings)) continue;

        for (const inn of innings) {
          const batStats = inn.batsmanStats || {};
          for (const username of Object.keys(batStats)) {
            const playerRuns = batStats[username]?.runs ?? 0;
            if (playerRuns > 0) {
              let entry = runs.get(username);
              if (!entry) {
                const info = userUsernameMap.get(username) ?? { playerId: username, playerName: username, teamName: 'Unknown' };
                entry = { ...info, runs: 0, innings: 0 };
                runs.set(username, entry);
              }
              entry.runs += playerRuns;
              entry.innings++;
            }
          }

          const bowlStats = inn.bowlerStats || {};
          for (const username of Object.keys(bowlStats)) {
            const playerWickets = bowlStats[username]?.wickets ?? 0;
            if (playerWickets > 0) {
              let entry = wickets.get(username);
              if (!entry) {
                const info = userUsernameMap.get(username) ?? { playerId: username, playerName: username, teamName: 'Unknown' };
                entry = { ...info, wickets: 0, innings: 0 };
                wickets.set(username, entry);
              }
              entry.wickets += playerWickets;
              entry.innings++;
            }
          }
        }
      }

      return {
        sportCode,
        topRated,
        mostMvps,
        topRuns: Array.from(runs.values()).sort((a, b) => b.runs - a.runs).slice(0, 10),
        topWickets: Array.from(wickets.values()).sort((a, b) => b.wickets - a.wickets).slice(0, 10),
      };
    }

    if (sportCode === 'badminton') {
      const ralliesWon = new Map<string, { playerId: string; playerName: string; teamName: string; ralliesWon: number }>();

      for (const m of completedMatches) {
        const rallies = (m.liveData as any)?.rallies || [];
        const matchPlayersInMatch = allMatchPlayers.filter(mp => mp.matchId === m.id);

        for (const r of rallies) {
          if (r.winnerSide === 'none') continue;

          const targetTeamId = r.winnerSide === 'home' ? m.homeTeamId : m.awayTeamId;
          const winners = matchPlayersInMatch.filter(mp => mp.teamId === targetTeamId);

          for (const w of winners) {
            let entry = ralliesWon.get(w.playerId);
            if (!entry) {
              const playerName = w.player?.user?.username ?? w.player?.jerseyNumber?.toString() ?? w.playerId;
              const teamName = w.team?.name ?? 'Unknown';
              entry = { playerId: w.playerId, playerName, teamName, ralliesWon: 0 };
              ralliesWon.set(w.playerId, entry);
            }
            entry.ralliesWon++;
          }
        }
      }

      return {
        sportCode,
        topRated,
        mostMvps,
        topRalliesWon: Array.from(ralliesWon.values()).sort((a, b) => b.ralliesWon - a.ralliesWon).slice(0, 10),
      };
    }

    return { sportCode, topRated, mostMvps };
  }

  /**
   * Auto-calculates and saves per-player ratings for a completed football match.
   * Reads liveData.events[] to tally goals, assists, own goals, and cards.
   * Only players with isPlaying=true are rated.
   *
   * Football liveData event shape:
   * { type: 'goal'|'own_goal'|'assist'|'yellow_card'|'red_card', playerId, teamId, minute }
   */
  private async autoRateMatchPlayers(match: Match): Promise<void> {
    const liveData = match.liveData as any;
    if (!liveData) return;

    // Fetch sport code
    const stage = await this.stageRepo.findOne({
      where: { id: match.stageId },
      relations: { competition: { sport: true } },
    });
    const sportCode = stage?.competition?.sport?.code ?? 'football';

    const matchPlayers = await this.matchPlayerRepo.find({
      where: { matchId: match.id },
      relations: { player: { user: true } },
    });
    if (matchPlayers.length === 0) return;

    const toSave: MatchPlayer[] = [];

    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;
    const winnerTeamId =
      homeScore > awayScore
        ? match.homeTeamId
        : awayScore > homeScore
          ? match.awayTeamId
          : null;
    const loserTeamId =
      winnerTeamId === match.homeTeamId
        ? match.awayTeamId
        : winnerTeamId === match.awayTeamId
          ? match.homeTeamId
          : null;

    if (sportCode === 'football') {
      if (!Array.isArray(liveData.events)) return;
      const playingStarters = matchPlayers.filter(mp => mp.isPlaying);
      if (playingStarters.length === 0) return;

      type PlayerTally = {
        goals: number;
        assists: number;
        ownGoals: number;
        yellowCards: number;
        redCards: number;
      };
      const tallies = new Map<string, PlayerTally>();
      for (const mp of playingStarters) {
        tallies.set(mp.playerId, { goals: 0, assists: 0, ownGoals: 0, yellowCards: 0, redCards: 0 });
      }

      for (const event of liveData.events as any[]) {
        let scorerPlayerId: string | undefined = undefined;
        let assistPlayerId: string | undefined = undefined;

        if (event.playerId) {
          scorerPlayerId = event.playerId;
        } else if (event.playerUserId) {
          scorerPlayerId = matchPlayers.find(mp => mp.player?.userId === event.playerUserId)?.playerId;
        }

        if (event.assistPlayerUserId) {
          assistPlayerId = matchPlayers.find(mp => mp.player?.userId === event.assistPlayerUserId)?.playerId;
        } else if (event.assistPlayerId) {
          assistPlayerId = event.assistPlayerId;
        }

        if (event.type === 'goal') {
          if (event.goalType === 'own_goal') {
            if (scorerPlayerId) {
              const t = tallies.get(scorerPlayerId);
              if (t) t.ownGoals++;
            }
          } else {
            if (scorerPlayerId) {
              const t = tallies.get(scorerPlayerId);
              if (t) t.goals++;
            }
            if (assistPlayerId) {
              const t = tallies.get(assistPlayerId);
              if (t) t.assists++;
            }
          }
        } else if (event.type === 'own_goal') {
          if (scorerPlayerId) {
            const t = tallies.get(scorerPlayerId);
            if (t) t.ownGoals++;
          }
        } else if (event.type === 'assist') {
          if (scorerPlayerId) {
            const t = tallies.get(scorerPlayerId);
            if (t) t.assists++;
          }
        } else if (event.type === 'card') {
          if (scorerPlayerId) {
            const t = tallies.get(scorerPlayerId);
            if (t) {
              if (event.cardType === 'yellow') {
                t.yellowCards++;
              } else if (event.cardType === 'red' || event.cardType === 'second_yellow') {
                t.redCards++;
              }
            }
          }
        } else if (event.type === 'yellow_card') {
          if (scorerPlayerId) {
            const t = tallies.get(scorerPlayerId);
            if (t) t.yellowCards++;
          }
        } else if (event.type === 'red_card') {
          if (scorerPlayerId) {
            const t = tallies.get(scorerPlayerId);
            if (t) t.redCards++;
          }
        }
      }

      const homeGoalsAgainst = awayScore;
      const awayGoalsAgainst = homeScore;

      for (const mp of playingStarters) {
        if (mp.rating !== null) continue;

        const tally = tallies.get(mp.playerId) ?? { goals: 0, assists: 0, ownGoals: 0, yellowCards: 0, redCards: 0 };
        let rating = 5.0;

        const goalBonus = mp.isGoalkeeper ? 0.3 : 0.5;
        rating += tally.goals * goalBonus;
        rating += tally.assists * 0.3;
        rating -= tally.ownGoals * 0.5;

        if (winnerTeamId && mp.teamId === winnerTeamId) {
          rating += 0.5;
        } else if (loserTeamId && mp.teamId === loserTeamId) {
          rating -= 0.3;
        }

        if (mp.isGoalkeeper) {
          const goalsConceded =
            mp.teamId === match.homeTeamId ? homeGoalsAgainst : awayGoalsAgainst;
          if (goalsConceded === 0) {
            rating += 0.5;
          }
        }

        rating -= tally.yellowCards * 0.3;
        rating -= tally.redCards * 0.8;

        mp.rating = Math.min(10.0, Math.max(5.0, Math.round(rating * 100) / 100));
        toSave.push(mp);
      }
    } else if (sportCode === 'cricket') {
      const inningsList = liveData.inningsData || [];

      for (const mp of matchPlayers) {
        if (mp.rating !== null) continue;

        const username = mp.player?.user?.username;
        if (!username) continue;

        // Check if player participated in lineup or statistics
        const hasStats = inningsList.some((inn: any) => inn.batsmanStats?.[username] || inn.bowlerStats?.[username]);
        if (!mp.isPlaying && !hasStats) continue;

        let rating = 5.0;

        let batRuns = 0, batBalls = 0, batFours = 0, batSixes = 0;
        let bowledOut = false;

        let bowlOvers = 0, bowlBalls = 0, bowlRunsConceded = 0, bowlWickets = 0, bowlMaidens = 0;

        for (const inn of inningsList) {
          const bStats = inn.batsmanStats?.[username];
          if (bStats) {
            batRuns += bStats.runs ?? 0;
            batBalls += bStats.balls ?? 0;
            batFours += bStats.fours ?? 0;
            batSixes += bStats.sixes ?? 0;
          }
          const bwStats = inn.bowlerStats?.[username];
          if (bwStats) {
            bowlOvers += bwStats.overs ?? 0;
            bowlBalls += bwStats.balls ?? 0;
            bowlRunsConceded += bwStats.runsConceded ?? 0;
            bowlWickets += bwStats.wickets ?? 0;
            bowlMaidens += bwStats.maidens ?? 0;
          }
          if (inn.ballsHistory) {
            for (const ball of inn.ballsHistory) {
              if (ball.wicket && ball.striker === username && ball.wicketType !== 'Retired Hurt') {
                bowledOut = true;
              }
            }
          }
        }

        // Batting calculations
        rating += batRuns * 0.05;
        rating += batFours * 0.1;
        rating += batSixes * 0.2;

        if (batBalls > 5) {
          const sr = (batRuns / batBalls) * 100;
          if (sr > 150) rating += 0.5;
          else if (sr > 120) rating += 0.3;
          else if (sr < 80) rating -= 0.3;
        }

        if (bowledOut && batRuns === 0 && batBalls > 0) {
          rating -= 0.5; // Duck penalty
        }

        // Bowling calculations
        rating += bowlWickets * 0.8;
        rating += bowlMaidens * 0.5;
        rating -= bowlRunsConceded * 0.02;

        const totalOvers = bowlOvers + (bowlBalls / 6);
        if (totalOvers > 1.0) {
          const econ = bowlRunsConceded / totalOvers;
          if (econ < 6.0) rating += 0.5;
          else if (econ < 8.0) rating += 0.2;
          else if (econ > 10.0) rating -= 0.4;
        }

        // Win/loss points
        if (winnerTeamId && mp.teamId === winnerTeamId) {
          rating += 0.5;
        } else if (loserTeamId && mp.teamId === loserTeamId) {
          rating -= 0.3;
        }

        mp.rating = Math.min(10.0, Math.max(5.0, Math.round(rating * 100) / 100));
        toSave.push(mp);
      }
    } else if (sportCode === 'badminton') {
      const rallies = liveData.rallies || [];
      const starters = matchPlayers.filter(mp => mp.isPlaying);

      for (const mp of starters) {
        if (mp.rating !== null) continue;

        let rating = 5.0;
        let wonRallies = 0, lostRallies = 0;

        const isHomeTeam = mp.teamId === match.homeTeamId;

        for (const r of rallies) {
          if (r.winnerSide === 'none') continue;
          if (isHomeTeam) {
            if (r.winnerSide === 'home') wonRallies++;
            else lostRallies++;
          } else {
            if (r.winnerSide === 'away') wonRallies++;
            else lostRallies++;
          }
        }

        rating += wonRallies * 0.1;
        rating -= lostRallies * 0.05;

        if (winnerTeamId && mp.teamId === winnerTeamId) {
          rating += 0.5;
        } else if (loserTeamId && mp.teamId === loserTeamId) {
          rating -= 0.3;
        }

        mp.rating = Math.min(10.0, Math.max(5.0, Math.round(rating * 100) / 100));
        toSave.push(mp);
      }
    }

    if (toSave.length > 0) {
      await this.matchPlayerRepo.save(toSave);

      // 7.1 — Notify each auto-rated player
      const populatedSaved = await this.matchPlayerRepo.find({
        where: { id: In(toSave.map((s) => s.id)) },
        relations: { player: { user: true }, team: true },
      });

      const workspaceId = stage?.competition?.event?.workspaceId || null;

      for (const entry of populatedSaved) {
        if (entry.player?.userId && entry.rating !== null) {
          await this.sendNotification(
            entry.player.userId,
            NotificationType.PLAYER_RATED,
            `Your performance rating for ${match.homeTeam?.name ?? 'Home'} vs ${match.awayTeam?.name ?? 'Away'}: ${entry.rating}/10.`,
            workspaceId,
            { matchId: match.id, rating: entry.rating },
          );
        }
      }

      // 7.3 & 7.4 — Identify Match MVP
      let maxRating = -1;
      let mvpMp: MatchPlayer | null = null;
      for (const entry of populatedSaved) {
        if (entry.rating !== null) {
          const r = Number(entry.rating);
          if (r > maxRating) {
            maxRating = r;
            mvpMp = entry;
          }
        }
      }

      if (mvpMp && maxRating >= 5.0 && mvpMp.player?.userId) {
        const playerName = mvpMp.player.user?.username ?? 'Player';
        const teamName = mvpMp.team?.name ?? 'Unknown';

        // 7.3 - Notify the MVP player
        await this.sendNotification(
          mvpMp.player.userId,
          NotificationType.MATCH_MVP,
          `🌟 MVP! You were the highest-rated player (${maxRating}) in ${match.homeTeam?.name ?? 'Home'} vs ${match.awayTeam?.name ?? 'Away'}!`,
          workspaceId,
          { matchId: match.id, rating: maxRating },
        );

        // 7.4 - Announcement to all workspace members
        if (workspaceId) {
          const memberIds = await this.getWorkspaceMemberUserIds(workspaceId);
          await this.sendNotificationToMany(
            memberIds,
            NotificationType.MATCH_MVP_ANNOUNCEMENT,
            `🌟 ${playerName} (${teamName}) is the Man of the Match in ${match.homeTeam?.name ?? 'Home'} vs ${match.awayTeam?.name ?? 'Away'} (rating: ${maxRating})!`,
            workspaceId,
            { matchId: match.id, playerId: mvpMp.playerId, playerName, teamName, rating: maxRating },
          );
        }
      }
    }
  }
}

