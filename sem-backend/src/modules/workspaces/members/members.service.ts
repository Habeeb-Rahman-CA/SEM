import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  WorkspaceMember,
  WorkspaceRole,
  MANAGEMENT_ROLES,
} from '../entities/workspace-member.entity';
import { Workspace } from '../entities/workspace.entity';
import { Player } from '../../players/entities/player.entity';
import { UsersService } from '../../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RolesPermissionsService } from '../roles-permissions/roles-permissions.service';
import { InviteMemberDto } from '../dto/invite-member.dto';
import { BulkImportMembersDto } from '../dto/bulk-import-members.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class WorkspaceMembersService {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly rolesPermissionsService: RolesPermissionsService,
  ) {}

  async getMembers(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember[]> {
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

    const role = await this.rolesPermissionsService.findRoleBySlug(
      dto.role,
      workspaceId,
    );
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

    // Notify invited user
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
    });
    await this.notificationsService.sendNotification(
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
          user = await this.usersService.create(
            item.username,
            dto.password,
            true,
          );
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
        const role = await this.rolesPermissionsService.findRoleBySlug(
          roleSlug,
          workspaceId,
        );
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

    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
    });
    const wsName = workspace?.name ?? 'the workspace';
    for (const item of success) {
      const user = await this.usersService.findOneByUsername(item.username);
      if (user) {
        if (item.isNew) {
          await this.notificationsService.sendNotification(
            user.id,
            NotificationType.BULK_IMPORT_CHANGE_PASSWORD,
            `Welcome to SEM! You've been added to ${wsName}. Please change your default password for security.`,
            workspaceId,
            { workspaceName: wsName, role: item.role },
          );
        } else {
          await this.notificationsService.sendNotification(
            user.id,
            NotificationType.BULK_IMPORT_USER,
            `You've been added to ${wsName} as ${item.role}.`,
            workspaceId,
            { workspaceName: wsName, role: item.role },
          );
        }
      }
    }

    await this.notificationsService.sendNotification(
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
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
    });
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

    const role = await this.rolesPermissionsService.findRoleBySlug(
      'viewer',
      workspaceId,
    );

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

    const adminIds = await this.getWorkspaceAdminUserIds(workspaceId);
    await this.notificationsService.sendNotificationToMany(
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

  async acceptInvitation(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId, status: 'pending' },
      relations: { user: true, role: true, workspace: true },
    });
    if (!member) {
      throw new NotFoundException(
        'Invitation not found or already accepted/rejected',
      );
    }
    member.status = 'joined';
    const saved = await this.memberRepo.save(member);

    await this.notificationsService.sendNotification(
      userId,
      NotificationType.INVITATION_ACCEPTED,
      `You joined the ${member.workspace.name} workspace.`,
      workspaceId,
      { workspaceName: member.workspace.name },
    );

    if (member.invitedById) {
      await this.notificationsService.sendNotification(
        member.invitedById,
        NotificationType.INVITATION_ACCEPTED,
        `${member.user.username} accepted your invitation to the ${member.workspace.name} workspace.`,
        workspaceId,
        {
          username: member.user.username,
          workspaceName: member.workspace.name,
        },
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
      throw new NotFoundException(
        'Invitation not found or already accepted/rejected',
      );
    }

    if (member.invitedById) {
      await this.notificationsService.sendNotification(
        member.invitedById,
        NotificationType.INVITATION_REJECTED,
        `${member.user.username} rejected your invitation to the ${member.workspace.name} workspace.`,
        workspaceId,
        {
          username: member.user.username,
          workspaceName: member.workspace.name,
        },
      );
    }

    member.deletedAt = new Date();
    await this.memberRepo.save(member);
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
      throw new ForbiddenException(
        'Cannot change the role of the workspace Owner',
      );
    }

    const role = await this.rolesPermissionsService.findRoleBySlug(
      dto.role,
      workspaceId,
    );
    if (role.slug === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot set a member role to Owner');
    }

    member.roleId = role.id;
    member.role = role;
    const saved = await this.memberRepo.save(member);

    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
    });
    await this.notificationsService.sendNotification(
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

    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
    });
    await this.notificationsService.sendNotification(
      targetUserId,
      NotificationType.MEMBER_REMOVED,
      `You have been removed from the ${workspace?.name ?? 'workspace'} workspace.`,
      null,
      { workspaceName: workspace?.name },
    );

    member.deletedAt = new Date();
    await this.memberRepo.save(member);
  }

  async getWorkspaceMemberUserIds(
    workspaceId: string,
    excludeUserId?: string,
  ): Promise<string[]> {
    const members = await this.memberRepo.find({
      where: { workspaceId, status: 'joined' },
      select: { userId: true },
    });
    const ids = members.map((m) => m.userId);
    if (excludeUserId) return ids.filter((id) => id !== excludeUserId);
    return ids;
  }

  private async getWorkspaceAdminUserIds(
    workspaceId: string,
  ): Promise<string[]> {
    const members = await this.memberRepo.find({
      where: { workspaceId, status: 'joined' },
      relations: { role: true },
    });
    return members
      .filter((m) => MANAGEMENT_ROLES.includes(m.role.slug))
      .map((m) => m.userId);
  }

  async ensureMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId, status: 'joined' },
      relations: { role: true },
    });
    if (!member)
      throw new ForbiddenException('You are not a member of this workspace');
    return member;
  }

  async ensurePermission(
    workspaceId: string,
    userId: string,
    permissionSlug: string,
  ): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId, status: 'joined' },
      relations: { role: { permissions: true } },
    });
    if (!member)
      throw new ForbiddenException('You are not a member of this workspace');
    const hasPerm =
      member.role?.permissions?.some((p) => p.slug === permissionSlug) ?? false;
    if (!hasPerm) {
      throw new ForbiddenException(
        `Permission denied: requires '${permissionSlug}'`,
      );
    }
  }
}
