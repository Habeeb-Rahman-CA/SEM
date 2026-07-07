import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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
import { Match } from './entities/match.entity';
import { CompetitionTeam } from './entities/competition-team.entity';
import { Venue } from './entities/venue.entity';
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
      where: { userId },
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
    await this.ensureAdminOrOwner(id, userId);

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
    await this.ensureOwner(id, userId);
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    await this.workspaceRepo.remove(workspace);
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  async getMembers(workspaceId: string, userId: string): Promise<WorkspaceMember[]> {
    await this.ensureMember(workspaceId, userId);
    return this.memberRepo.find({
      where: { workspaceId },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
    });
  }

  async inviteMember(
    workspaceId: string,
    dto: InviteMemberDto,
    requesterId: string,
  ): Promise<WorkspaceMember> {
    await this.ensureAdminOrOwner(workspaceId, requesterId);

    const user = await this.usersService.findOneByUsername(dto.username);
    if (!user) {
      throw new NotFoundException(`User "${dto.username}" not found`);
    }

    const existing = await this.memberRepo.findOne({
      where: { workspaceId, userId: user.id },
    });
    if (existing) {
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
    });
    const saved = await this.memberRepo.save(member);
    saved.user = user;
    saved.role = role;
    return saved;
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
      return existing;
    }

    const role = await this.findRoleBySlug('viewer', workspaceId);
    
    const member = this.memberRepo.create({
      workspaceId,
      userId,
      roleId: role.id,
    });
    const saved = await this.memberRepo.save(member);
    
    const fullMember = await this.memberRepo.findOne({
      where: { id: saved.id },
      relations: { user: true, role: true },
    });
    return fullMember!;
  }

  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
    requesterId: string,
  ): Promise<WorkspaceMember> {
    await this.ensureAdminOrOwner(workspaceId, requesterId);

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
    await this.ensureAdminOrOwner(workspaceId, requesterId);

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
    await this.ensureAdminOrOwner(workspaceId, userId);
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
    await this.ensureAdminOrOwner(workspaceId, userId);
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
      where: { workspaceId, userId },
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

  // ─── Teams Management ──────────────────────────────────────────────────────

  async getTeams(workspaceId: string, userId: string): Promise<Team[]> {
    await this.ensureMember(workspaceId, userId);
    return this.teamRepo.find({
      where: { workspaceId },
      order: { name: 'ASC' },
    });
  }

  async createTeam(workspaceId: string, dto: CreateTeamDto, userId: string): Promise<Team> {
    await this.ensureMember(workspaceId, userId);

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
    await this.ensureMember(workspaceId, userId);
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
    });

    return this.teamRepo.save(team);
  }

  async removeTeam(workspaceId: string, teamId: string, userId: string): Promise<void> {
    await this.ensureAdminOrOwner(workspaceId, userId);
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
    await this.ensureMember(workspaceId, userId);
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
    await this.ensureMember(workspaceId, userId);
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
    await this.ensureAdminOrOwner(workspaceId, userId);
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
      order: { name: 'ASC' },
    });
  }

  async createEvent(workspaceId: string, dto: CreateEventDto, userId: string): Promise<Event> {
    await this.ensureAdminOrOwner(workspaceId, userId);
    const event = this.eventRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      status: dto.status ?? 'upcoming',
      logoUrl: dto.logoUrl ?? null,
      workspaceId,
    });
    return this.eventRepo.save(event);
  }

  async updateEvent(
    workspaceId: string,
    eventId: string,
    dto: UpdateEventDto,
    userId: string,
  ): Promise<Event> {
    await this.ensureAdminOrOwner(workspaceId, userId);
    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
      throw new NotFoundException('Event not found in this workspace');
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
    await this.ensureAdminOrOwner(workspaceId, userId);
    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) {
      throw new NotFoundException('Event not found in this workspace');
    }
    await this.eventRepo.remove(event);
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
    return await this.competitionRepo.find({
      where: { eventId },
      relations: { sport: true },
      order: { name: 'ASC' },
    });
  }

  async createCompetition(
    workspaceId: string,
    eventId: string,
    dto: CreateCompetitionDto,
    userId: string,
  ): Promise<Competition> {
    await this.ensureAdminOrOwner(workspaceId, userId);
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
    await this.ensureAdminOrOwner(workspaceId, userId);
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

    await this.competitionRepo.save(competition);
    const found = await this.competitionRepo.findOne({ where: { id: competitionId }, relations: { sport: true } });
    if (!found) {
      throw new NotFoundException(`Competition "${competitionId}" not found`);
    }
    return found;
  }

  async removeCompetition(workspaceId: string, eventId: string, competitionId: string, userId: string): Promise<void> {
    await this.ensureAdminOrOwner(workspaceId, userId);
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
    await this.ensureAdminOrOwner(workspaceId, userId);
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
    await this.ensureAdminOrOwner(workspaceId, userId);
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
    await this.ensureAdminOrOwner(workspaceId, userId);
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

    return this.matchRepo.find({
      where: { stageId },
      relations: { homeTeam: true, awayTeam: true, venue: true },
      order: { createdAt: 'ASC' },
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
    await this.ensureAdminOrOwner(workspaceId, userId);
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
      liveData = {
        currentSet: 1,
        setsScore: [{ home: 0, away: 0 }],
        homeSetsWon: 0,
        awaySetsWon: 0,
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
    await this.ensureAdminOrOwner(workspaceId, userId);
    const match = await this.matchRepo.findOne({ where: { id: matchId, stageId } });
    if (!match) {
      throw new NotFoundException(`Match "${matchId}" not found in stage`);
    }

    if (dto.homeTeamId !== undefined) match.homeTeamId = dto.homeTeamId;
    if (dto.awayTeamId !== undefined) match.awayTeamId = dto.awayTeamId;
    if (dto.venueId !== undefined) match.venueId = dto.venueId ?? null;
    if (dto.homeScore !== undefined) match.homeScore = dto.homeScore;
    if (dto.awayScore !== undefined) match.awayScore = dto.awayScore;
    if (dto.status !== undefined) match.status = dto.status;
    if (dto.config !== undefined) {
      match.config = { ...match.config, ...dto.config };
    }
    if (dto.liveData !== undefined) {
      match.liveData = { ...match.liveData, ...dto.liveData };
    }

    const saved = await this.matchRepo.save(match);
    return (await this.matchRepo.findOne({
      where: { id: saved.id },
      relations: { homeTeam: true, awayTeam: true, venue: true },
    }))!;
  }

  async removeMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    userId: string,
  ): Promise<void> {
    await this.ensureAdminOrOwner(workspaceId, userId);
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
    const competition = await this.competitionRepo.findOne({ where: { id: competitionId, eventId } });
    if (!competition) throw new NotFoundException(`Competition "${competitionId}" not found`);
    return this.competitionTeamRepo.find({
      where: { competitionId },
      relations: { team: true },
      order: { createdAt: 'ASC' },
    });
  }

  async addTeamToCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    teamId: string,
    userId: string,
  ): Promise<CompetitionTeam> {
    await this.ensureAdminOrOwner(workspaceId, userId);
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
    await this.ensureAdminOrOwner(workspaceId, userId);
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
    await this.ensureAdminOrOwner(workspaceId, userId);

    const event = await this.eventRepo.findOne({ where: { id: eventId, workspaceId } });
    if (!event) throw new NotFoundException(`Event not found`);

    const competition = await this.competitionRepo.findOne({ where: { id: competitionId, eventId } });
    if (!competition) throw new NotFoundException(`Competition not found`);

    // Enrolled teams
    const enrolled = await this.competitionTeamRepo.find({ where: { competitionId } });
    if (enrolled.length < 2) {
      throw new BadRequestException('At least 2 teams must be enrolled before generating fixtures.');
    }

    // Stages
    const stages = await this.stageRepo.find({
      where: { competitionId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });
    if (stages.length === 0) {
      throw new BadRequestException('Configure at least one stage before generating fixtures.');
    }

    // Shuffle team IDs
    const teamIds = enrolled.map((ct) => ct.teamId);
    this.shuffleArray(teamIds);

    let totalMatches = 0;

    for (const stage of stages) {
      // Remove existing matches for this stage before regenerating
      const existing = await this.matchRepo.find({ where: { stageId: stage.id } });
      if (existing.length) await this.matchRepo.remove(existing);

      const pairings: [string | null, string | null][] = [];

      // ── Group / Group+Knockout group phase ──────────────────────────────
      if (stage.type === 'group' || stage.type === 'group_knockout') {
        const groupsCount = stage.config?.groupsCount ?? 2;
        const twoLegged = stage.config?.twoLegged ?? false;

        // Distribute teams snake-draft style
        const groups: string[][] = Array.from({ length: groupsCount }, () => []);
        teamIds.forEach((id, idx) => groups[idx % groupsCount].push(id));

        for (const group of groups) {
          if (group.length < 2) continue;
          const roundRobin = this.generateRoundRobin(group, twoLegged);
          pairings.push(...roundRobin);
        }
      }

      // ── Pure Knockout first round ────────────────────────────────────────
      if (stage.type === 'knockout') {
        const twoLegged = stage.config?.twoLegged ?? false;
        const bracket = this.generateKnockoutBracket(teamIds, twoLegged);
        pairings.push(...bracket);
      }

      // ── group_knockout: generate group fixtures + skeleton KO bracket ──
      // KO bracket teams are TBD (null) — placeholders created once groups finish.
      // We skip KO skeleton creation here; admin can generate after group phase.

      if (pairings.length === 0) continue;

      const matchEntities = pairings.map((pair) =>
        this.matchRepo.create({
          stageId: stage.id,
          homeTeamId: pair[0],
          awayTeamId: pair[1],
          homeScore: 0,
          awayScore: 0,
          status: 'scheduled',
          config: {},
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
    await this.ensureMember(workspaceId, userId);
    const venue = this.venueRepo.create({
      name: dto.name,
      location: dto.location ?? null,
      capacity: dto.capacity ?? null,
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
    await this.ensureMember(workspaceId, userId);
    const venue = await this.venueRepo.findOne({ where: { id: venueId, workspaceId } });
    if (!venue) {
      throw new NotFoundException('Venue not found in this workspace');
    }

    Object.assign(venue, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
    });

    return this.venueRepo.save(venue);
  }

  async removeVenue(workspaceId: string, venueId: string, userId: string): Promise<void> {
    await this.ensureAdminOrOwner(workspaceId, userId);
    const venue = await this.venueRepo.findOne({ where: { id: venueId, workspaceId } });
    if (!venue) {
      throw new NotFoundException('Venue not found in this workspace');
    }
    await this.venueRepo.remove(venue);
  }
}

