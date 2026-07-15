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
import { Notification } from './entities/notification.entity';
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
  ) {}

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

    return this.workspaceRepo.save(workspace);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(id: string, userId: string): Promise<void> {
    await this.ensurePermission(id, userId, 'workspace.delete');
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');
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
          user = await this.usersService.create(item.username, dto.password);
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

    // Create notification for joining user
    const userNotification = this.notificationRepo.create({
      userId: userId,
      message: `You joined the ${member.workspace.name} workspace`,
    });
    await this.notificationRepo.save(userNotification);

    // Create notification for inviter
    if (member.invitedById) {
      const inviterNotification = this.notificationRepo.create({
        userId: member.invitedById,
        message: `${member.user.username} accepted your invitation to the ${member.workspace.name} workspace`,
      });
      await this.notificationRepo.save(inviterNotification);
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

    // Create notification for inviter
    if (member.invitedById) {
      const inviterNotification = this.notificationRepo.create({
        userId: member.invitedById,
        message: `${member.user.username} rejected your invitation to the ${member.workspace.name} workspace`,
      });
      await this.notificationRepo.save(inviterNotification);
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
    return this.memberRepo.save(member);
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
    return this.teamRepo.save(team);
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
    await this.teamRepo.remove(team);
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

    return this.playerRepo.save(player);
  }

  async removePlayer(workspaceId: string, playerId: string, userId: string): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'player.manage');
    const player = await this.playerRepo.findOne({ where: { id: playerId, workspaceId } });
    if (!player) {
      throw new NotFoundException('Player not found in this workspace');
    }
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
      teams = await this.teamRepo.findBy({ id: In(dto.teamIds) });
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
    return this.eventRepo.save(event);
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

    if (dto.teamIds !== undefined) {
      if (dto.teamIds.length > 0) {
        event.teams = await this.teamRepo.findBy({ id: In(dto.teamIds) });
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

    return this.eventRepo.save(event);
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
      relations: { stages: true }
    });
    if (!comp || comp.stages.length === 0) return;

    const sortedStages = [...comp.stages].sort((a, b) => a.sequence - b.sequence);
    const lastStage = sortedStages[sortedStages.length - 1];

    const matches = await this.matchRepo.find({ where: { stageId: lastStage.id } });
    if (matches && matches.length > 0) {
      const allCompleted = matches.every((m: any) => m.status === 'completed');
      if (allCompleted) {
        comp.status = 'completed';
        await this.competitionRepo.save(comp);
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
    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }
    const competitions = await this.competitionRepo.find({
      where: { eventId },
      relations: { sport: true, stages: true },
      order: { name: 'ASC' },
    });

    const result: any[] = [];
    for (const comp of competitions) {
      const compJson = JSON.parse(JSON.stringify(comp));
      if (compJson.stages && compJson.stages.length > 0) {
        const stageIds = compJson.stages.map((s: any) => s.id);
        const matches = await this.matchRepo.find({
          where: { stageId: In(stageIds) },
          relations: { homeTeam: true, awayTeam: true },
        });
        
        for (const stage of compJson.stages) {
          stage.matches = matches.filter(m => m.stageId === stage.id);
        }
      } else {
        compJson.stages = [];
      }
      result.push(compJson);
    }
    return result;
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
    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }

    const competition = await this.competitionRepo.findOne({ where: { id: competitionId, eventId } });
    if (!competition) {
      throw new NotFoundException(`Competition "${competitionId}" not found in event`);
    }

    if (dto.sportId) {
      const sport = await this.sportRepo.findOne({ where: { id: dto.sportId } });
      if (!sport) {
        throw new NotFoundException(`Sport with ID "${dto.sportId}" not found`);
      }
      competition.sportId = dto.sportId;
    }

    if (dto.name !== undefined) competition.name = dto.name;
    if (dto.status !== undefined) competition.status = dto.status;
    if (dto.pointsConfig !== undefined) competition.pointsConfig = dto.pointsConfig ?? null;

    await this.competitionRepo.save(competition);
    const found = await this.competitionRepo.findOne({ where: { id: competitionId }, relations: { sport: true } });
    if (!found) {
      throw new NotFoundException(`Competition "${competitionId}" not found`);
    }
    return found;
  }

  async removeCompetition(workspaceId: string, eventId: string, competitionId: string, userId: string): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');
    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
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
    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }
    const competition = await this.competitionRepo.findOne({ where: { id: competitionId, eventId } });
    if (!competition) {
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
    const stage = await this.stageRepo.findOne({ where: { id: stageId, competitionId } });
    if (!stage) {
      throw new NotFoundException(`Stage "${stageId}" not found in competition`);
    }

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
    const stage = await this.stageRepo.findOne({ where: { id: stageId, competitionId } });
    if (!stage) {
      throw new NotFoundException(`Stage "${stageId}" not found in competition`);
    }

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
    return (await this.matchRepo.findOne({
      where: { id: saved.id },
      relations: { homeTeam: true, awayTeam: true, venue: true },
    }))!;
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
    if (dto.config !== undefined) {
      match.config = { ...match.config, ...dto.config };
    }
    if (dto.liveData !== undefined) {
      match.liveData = { ...match.liveData, ...dto.liveData };
    }

    const saved = await this.matchRepo.save(match);

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

    return (await this.matchRepo.findOne({
      where: { id: saved.id },
      relations: { homeTeam: true, awayTeam: true, venue: true },
    }))!;
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
    const competition = await this.competitionRepo.findOne({ where: { id: competitionId, eventId } });
    if (!competition) throw new NotFoundException(`Competition "${competitionId}" not found`);
    const team = await this.teamRepo.findOne({ where: { id: teamId, workspaceId } });
    if (!team) throw new NotFoundException(`Team "${teamId}" not found in workspace`);
    const existing = await this.competitionTeamRepo.findOne({ where: { competitionId, teamId } });
    if (existing) throw new ConflictException(`Team is already enrolled in this competition`);
    const entry = this.competitionTeamRepo.create({ competitionId, teamId });
    const saved = await this.competitionTeamRepo.save(entry);
    return this.competitionTeamRepo.findOne({ where: { id: saved.id }, relations: { team: true } }) as Promise<CompetitionTeam>;
  }

  async removeTeamFromCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    teamId: string,
    userId: string,
  ): Promise<void> {
    await this.ensurePermission(workspaceId, userId, 'competition.manage');
    const entry = await this.competitionTeamRepo.findOne({ where: { competitionId, teamId } });
    if (!entry) throw new NotFoundException(`Team is not enrolled in this competition`);
    await this.competitionTeamRepo.remove(entry);
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
      }))
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

    await this.matchPlayerRepo.save(toSave);

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

    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
    });
    if (!competition) throw new NotFoundException('Competition not found');

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

    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
      relations: { sport: true },
    });
    if (!competition) throw new NotFoundException('Competition not found');

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
        topRalliesWon: Array.from(ralliesWon.values()).sort((a, b) => b.ralliesWon - a.ralliesWon).slice(0, 10),
      };
    }

    return { sportCode, topRated };
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
    }
  }
}

