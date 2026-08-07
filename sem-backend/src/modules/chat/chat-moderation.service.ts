import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceChannel } from './entities/workspace-channel.entity';
import { WorkspaceFileRepositoryItem } from './entities/workspace-file-repository-item.entity';
import {
  ChatModerationAuditLogEntity,
  ModerationActionType,
} from './entities/chat-moderation-audit-log.entity';
import { ChatMutedUserEntity } from './entities/chat-muted-user.entity';
import { ChatBannedUserEntity } from './entities/chat-banned-user.entity';
import { WorkspaceMembersService } from '../workspaces/members/members.service';

@Injectable()
export class ChatModerationService {
  constructor(
    @InjectRepository(WorkspaceChannel)
    private readonly channelRepo: Repository<WorkspaceChannel>,
    @InjectRepository(WorkspaceFileRepositoryItem)
    private readonly fileRepo: Repository<WorkspaceFileRepositoryItem>,
    @InjectRepository(ChatModerationAuditLogEntity)
    private readonly auditRepo: Repository<ChatModerationAuditLogEntity>,
    @InjectRepository(ChatMutedUserEntity)
    private readonly mutedRepo: Repository<ChatMutedUserEntity>,
    @InjectRepository(ChatBannedUserEntity)
    private readonly bannedRepo: Repository<ChatBannedUserEntity>,
    private readonly workspaceMembersService: WorkspaceMembersService,
  ) {}

  private async createAuditLog(
    workspaceId: string,
    actionType: ModerationActionType,
    performedById: string,
    targetUserId?: string,
    channelId?: string,
    reason?: string,
    metadata?: Record<string, any>,
  ) {
    const log = this.auditRepo.create({
      workspaceId,
      channelId,
      actionType,
      performedById,
      targetUserId,
      reason,
      metadata,
    });
    return await this.auditRepo.save(log);
  }

  async deleteMedia(
    workspaceId: string,
    fileId: string,
    adminId: string,
    reason?: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, adminId);
    const file = await this.fileRepo.findOne({
      where: { id: fileId, workspaceId },
    });
    if (!file) throw new NotFoundException('Media item not found');

    await this.fileRepo.remove(file);
    await this.createAuditLog(
      workspaceId,
      ModerationActionType.DELETE_MEDIA,
      adminId,
      file.uploaderId,
      file.folderId,
      reason || 'Deleted by Moderator',
      { fileName: file.name, fileUrl: file.url },
    );
    return { success: true, message: `Media item ${file.name} deleted` };
  }

  async muteUser(
    workspaceId: string,
    targetUserId: string,
    adminId: string,
    durationMinutes?: number,
    reason?: string,
    channelId?: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, adminId);
    const mutedUntil = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60000)
      : undefined;

    let existing = await this.mutedRepo.findOne({
      where: {
        workspaceId,
        userId: targetUserId,
        channelId: channelId || undefined,
      },
    });

    if (!existing) {
      existing = this.mutedRepo.create({
        workspaceId,
        channelId,
        userId: targetUserId,
        mutedById: adminId,
        mutedUntil: mutedUntil || null,
        reason: reason || null,
      });
    } else {
      existing.mutedUntil = mutedUntil || null;
      existing.reason = reason || null;
      existing.mutedById = adminId;
    }

    const saved = await this.mutedRepo.save(existing);
    await this.createAuditLog(
      workspaceId,
      ModerationActionType.MUTE_USER,
      adminId,
      targetUserId,
      channelId,
      reason || 'Muted by Moderator',
      { durationMinutes, mutedUntil },
    );
    return saved;
  }

  async unmuteUser(
    workspaceId: string,
    targetUserId: string,
    adminId: string,
    channelId?: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, adminId);
    const existing = await this.mutedRepo.findOne({
      where: {
        workspaceId,
        userId: targetUserId,
        channelId: channelId || undefined,
      },
    });

    if (existing) {
      await this.mutedRepo.remove(existing);
      await this.createAuditLog(
        workspaceId,
        ModerationActionType.UNMUTE_USER,
        adminId,
        targetUserId,
        channelId,
        'Unmuted by Moderator',
      );
    }
    return { success: true, message: 'User unmuted successfully' };
  }

  async banUser(
    workspaceId: string,
    targetUserId: string,
    adminId: string,
    reason?: string,
    channelId?: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, adminId);
    let existing = await this.bannedRepo.findOne({
      where: {
        workspaceId,
        userId: targetUserId,
        channelId: channelId || undefined,
      },
    });

    if (!existing) {
      existing = this.bannedRepo.create({
        workspaceId,
        channelId,
        userId: targetUserId,
        bannedById: adminId,
        reason,
      });
      await this.bannedRepo.save(existing);
    }

    await this.createAuditLog(
      workspaceId,
      ModerationActionType.BAN_USER,
      adminId,
      targetUserId,
      channelId,
      reason || 'Banned by Moderator',
    );
    return existing;
  }

  async unbanUser(
    workspaceId: string,
    targetUserId: string,
    adminId: string,
    channelId?: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, adminId);
    const existing = await this.bannedRepo.findOne({
      where: {
        workspaceId,
        userId: targetUserId,
        channelId: channelId || undefined,
      },
    });

    if (existing) {
      await this.bannedRepo.remove(existing);
      await this.createAuditLog(
        workspaceId,
        ModerationActionType.UNBAN_USER,
        adminId,
        targetUserId,
        channelId,
        'Unbanned by Moderator',
      );
    }
    return { success: true, message: 'User unbanned successfully' };
  }

  async setChannelLock(
    workspaceId: string,
    channelId: string,
    adminId: string,
    isLocked: boolean,
    reason?: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, adminId);
    const channel = await this.channelRepo.findOne({
      where: { id: channelId, workspaceId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    channel.isLocked = isLocked;
    const saved = await this.channelRepo.save(channel);

    await this.createAuditLog(
      workspaceId,
      isLocked
        ? ModerationActionType.LOCK_CHANNEL
        : ModerationActionType.UNLOCK_CHANNEL,
      adminId,
      undefined,
      channelId,
      reason || (isLocked ? 'Channel locked' : 'Channel unlocked'),
    );
    return saved;
  }

  async setChannelArchive(
    workspaceId: string,
    channelId: string,
    adminId: string,
    isArchived: boolean,
    reason?: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, adminId);
    const channel = await this.channelRepo.findOne({
      where: { id: channelId, workspaceId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    channel.isArchived = isArchived;
    const saved = await this.channelRepo.save(channel);

    await this.createAuditLog(
      workspaceId,
      isArchived
        ? ModerationActionType.ARCHIVE_CHANNEL
        : ModerationActionType.UNARCHIVE_CHANNEL,
      adminId,
      undefined,
      channelId,
      reason || (isArchived ? 'Channel archived' : 'Channel unarchived'),
    );
    return saved;
  }

  async getAuditLogs(workspaceId: string, channelId?: string, limit = 50) {
    const where: any = { workspaceId };
    if (channelId) where.channelId = channelId;

    return await this.auditRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
