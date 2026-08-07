import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupChat } from './entities/group-chat.entity';
import {
  GroupChatMember,
  GroupMemberRole,
} from './entities/group-chat-member.entity';
import { GroupChatMessage } from './entities/group-chat-message.entity';
import { WorkspaceMembersService } from '../workspaces/members/members.service';
import { EventsGateway } from '../workspaces/events.gateway';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { UpdateGroupChatDto } from './dto/update-group-chat.dto';
import { SendGroupMessageDto } from './dto/send-group-message.dto';

@Injectable()
export class GroupChatsService {
  constructor(
    @InjectRepository(GroupChat)
    private readonly groupRepo: Repository<GroupChat>,
    @InjectRepository(GroupChatMember)
    private readonly memberRepo: Repository<GroupChatMember>,
    @InjectRepository(GroupChatMessage)
    private readonly messageRepo: Repository<GroupChatMessage>,
    private readonly workspaceMembersService: WorkspaceMembersService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createGroupChat(
    workspaceId: string,
    creatorId: string,
    dto: CreateGroupChatDto,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, creatorId);

    const group = this.groupRepo.create({
      workspaceId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      icon: dto.icon || 'fi fi-rr-users-alt',
      isTemporary: dto.isTemporary || false,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdById: creatorId,
    });

    const savedGroup = await this.groupRepo.save(group);

    // Add creator as Admin
    await this.memberRepo.save(
      this.memberRepo.create({
        groupChatId: savedGroup.id,
        workspaceId,
        userId: creatorId,
        role: GroupMemberRole.ADMIN,
      }),
    );

    // Add initial members if specified
    if (dto.initialMemberUserIds && dto.initialMemberUserIds.length > 0) {
      for (const targetUserId of dto.initialMemberUserIds) {
        if (targetUserId !== creatorId) {
          const exists = await this.memberRepo.findOne({
            where: { groupChatId: savedGroup.id, userId: targetUserId },
          });
          if (!exists) {
            await this.memberRepo.save(
              this.memberRepo.create({
                groupChatId: savedGroup.id,
                workspaceId,
                userId: targetUserId,
                role: GroupMemberRole.MEMBER,
              }),
            );
          }
        }
      }
    }

    return this.getGroupChatDetails(workspaceId, savedGroup.id, creatorId);
  }

  async listUserGroupChats(workspaceId: string, userId: string) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    // Seed defaults if workspace has 0 group chats
    const count = await this.groupRepo.count({ where: { workspaceId } });
    if (count === 0) {
      await this.ensureDefaultGroupChats(workspaceId, userId);
    }

    const memberships = await this.memberRepo.find({
      where: { workspaceId, userId },
      relations: { groupChat: true },
    });

    const result = [];
    for (const mem of memberships) {
      const group = mem.groupChat;
      if (!group) continue;

      const memberCount = await this.memberRepo.count({
        where: { groupChatId: group.id },
      });

      // Unread count
      const unreadQb = this.messageRepo
        .createQueryBuilder('msg')
        .where('msg.groupChatId = :groupId', { groupId: group.id })
        .andWhere('msg.senderId != :userId', { userId });

      if (mem.lastReadAt) {
        unreadQb.andWhere('msg.createdAt > :lastReadAt', {
          lastReadAt: mem.lastReadAt,
        });
      }
      const unreadCount = await unreadQb.getCount();

      result.push({
        id: group.id,
        workspaceId: group.workspaceId,
        name: group.name,
        description: group.description,
        icon: group.icon,
        isTemporary: group.isTemporary,
        expiresAt: group.expiresAt,
        createdById: group.createdById,
        lastMessageAt: group.lastMessageAt,
        lastMessageText: group.lastMessageText,
        createdAt: group.createdAt,
        role: mem.role,
        isPinned: mem.isPinned,
        isMuted: mem.isMuted,
        lastReadAt: mem.lastReadAt,
        memberCount,
        unreadCount,
      });
    }

    return result.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const tA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tB - tA;
    });
  }

  async getGroupChatDetails(
    workspaceId: string,
    groupId: string,
    userId: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    const membership = await this.memberRepo.findOne({
      where: { groupChatId: groupId, userId, workspaceId },
      relations: { groupChat: true },
    });

    if (!membership || !membership.groupChat) {
      throw new ForbiddenException('You are not a member of this group chat');
    }

    const members = await this.memberRepo.find({
      where: { groupChatId: groupId },
      relations: { user: true },
    });

    return {
      ...membership.groupChat,
      role: membership.role,
      isPinned: membership.isPinned,
      isMuted: membership.isMuted,
      lastReadAt: membership.lastReadAt,
      memberCount: members.length,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        username: m.user?.username,
        avatarUrl: m.user?.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt,
        isOnline: this.eventsGateway.isUserOnline(m.userId),
      })),
    };
  }

  async updateGroupChat(
    workspaceId: string,
    groupId: string,
    dto: UpdateGroupChatDto,
    userId: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);
    const membership = await this.memberRepo.findOne({
      where: { groupChatId: groupId, userId, workspaceId },
      relations: { groupChat: true },
    });

    if (!membership || !membership.groupChat) {
      throw new ForbiddenException('Access denied');
    }

    // Pin or Mute settings update for current user
    if (dto.isPinned !== undefined || dto.isMuted !== undefined) {
      if (dto.isPinned !== undefined) membership.isPinned = dto.isPinned;
      if (dto.isMuted !== undefined) membership.isMuted = dto.isMuted;
      await this.memberRepo.save(membership);
    }

    // Group info updates (Requires Admin role)
    if (
      dto.name !== undefined ||
      dto.description !== undefined ||
      dto.icon !== undefined ||
      dto.isTemporary !== undefined ||
      dto.expiresAt !== undefined
    ) {
      if (membership.role !== GroupMemberRole.ADMIN) {
        throw new ForbiddenException(
          'Only group admins can modify group details',
        );
      }

      const group = membership.groupChat;
      if (dto.name !== undefined) group.name = dto.name.trim();
      if (dto.description !== undefined)
        group.description = dto.description.trim();
      if (dto.icon !== undefined) group.icon = dto.icon;
      if (dto.isTemporary !== undefined) group.isTemporary = dto.isTemporary;
      if (dto.expiresAt !== undefined)
        group.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

      await this.groupRepo.save(group);
    }

    return this.getGroupChatDetails(workspaceId, groupId, userId);
  }

  async deleteGroupChat(workspaceId: string, groupId: string, userId: string) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);
    const membership = await this.memberRepo.findOne({
      where: { groupChatId: groupId, userId, workspaceId },
    });

    if (!membership || membership.role !== GroupMemberRole.ADMIN) {
      throw new ForbiddenException(
        'Only group admins can delete this group chat',
      );
    }

    await this.groupRepo.delete({ id: groupId, workspaceId });
    return { success: true, message: 'Group chat deleted successfully' };
  }

  async addMember(
    workspaceId: string,
    groupId: string,
    targetUserId: string,
    requesterId: string,
    role: GroupMemberRole = GroupMemberRole.MEMBER,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, requesterId);
    await this.workspaceMembersService.ensureMember(workspaceId, targetUserId);

    const requesterMem = await this.memberRepo.findOne({
      where: { groupChatId: groupId, userId: requesterId, workspaceId },
    });

    if (!requesterMem || requesterMem.role !== GroupMemberRole.ADMIN) {
      throw new ForbiddenException('Only group admins can add members');
    }

    let existing = await this.memberRepo.findOne({
      where: { groupChatId: groupId, userId: targetUserId },
    });

    if (!existing) {
      existing = this.memberRepo.create({
        groupChatId: groupId,
        workspaceId,
        userId: targetUserId,
        role,
      });
      await this.memberRepo.save(existing);
    }

    return this.getGroupChatDetails(workspaceId, groupId, requesterId);
  }

  async removeMember(
    workspaceId: string,
    groupId: string,
    targetUserId: string,
    requesterId: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, requesterId);

    const requesterMem = await this.memberRepo.findOne({
      where: { groupChatId: groupId, userId: requesterId, workspaceId },
    });

    if (!requesterMem || requesterMem.role !== GroupMemberRole.ADMIN) {
      throw new ForbiddenException('Only group admins can remove members');
    }

    await this.memberRepo.delete({
      groupChatId: groupId,
      userId: targetUserId,
    });
    return { success: true, message: 'Member removed from group' };
  }

  async leaveGroup(workspaceId: string, groupId: string, userId: string) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);
    await this.memberRepo.delete({ groupChatId: groupId, userId });
    return { success: true, message: 'Left group successfully' };
  }

  async sendMessage(
    workspaceId: string,
    groupId: string,
    senderId: string,
    dto: SendGroupMessageDto,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, senderId);

    const membership = await this.memberRepo.findOne({
      where: { groupChatId: groupId, userId: senderId, workspaceId },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group chat');
    }

    const message = this.messageRepo.create({
      groupChatId: groupId,
      workspaceId,
      senderId,
      content: dto.content.trim(),
      attachments: dto.attachments || [],
    });

    const savedMessage = await this.messageRepo.save(message);

    // Update group chat metadata
    await this.groupRepo.update(groupId, {
      lastMessageAt: savedMessage.createdAt,
      lastMessageText: savedMessage.content,
    });

    // Auto mark as read for sender
    await this.memberRepo.update(
      { groupChatId: groupId, userId: senderId },
      { lastReadAt: savedMessage.createdAt },
    );

    const fullMessage = await this.messageRepo.findOne({
      where: { id: savedMessage.id },
      relations: { sender: true },
    });

    const payload = {
      ...fullMessage,
      senderName: fullMessage?.sender?.username,
      senderAvatarUrl: fullMessage?.sender?.avatarUrl,
    };

    // Broadcast real-time message to group room
    this.eventsGateway.sendGroupMessage(groupId, payload);

    return payload;
  }

  async getMessages(
    workspaceId: string,
    groupId: string,
    userId: string,
    limit: number = 50,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);

    const membership = await this.memberRepo.findOne({
      where: { groupChatId: groupId, userId, workspaceId },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied to this group chat');
    }

    const messages = await this.messageRepo.find({
      where: { groupChatId: groupId },
      relations: { sender: true },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    return messages.map((m) => ({
      ...m,
      senderName: m.sender?.username,
      senderAvatarUrl: m.sender?.avatarUrl,
    }));
  }

  async markAsRead(workspaceId: string, groupId: string, userId: string) {
    await this.workspaceMembersService.ensureMember(workspaceId, userId);
    const membership = await this.memberRepo.findOne({
      where: { groupChatId: groupId, userId, workspaceId },
    });

    if (membership) {
      const now = new Date();
      membership.lastReadAt = now;
      await this.memberRepo.save(membership);
      return { success: true, lastReadAt: now };
    }
    return { success: false };
  }

  async ensureDefaultGroupChats(workspaceId: string, creatorId: string) {
    const defaultGroups = [
      {
        name: 'Football Referees',
        description:
          'Coordination group for football referees and match officials',
        icon: 'fi fi-rr-whistle',
        isTemporary: false,
      },
      {
        name: 'Cricket Team Captains',
        description: 'Communications channel for team captains & fixtures',
        icon: 'fi fi-rr-trophy',
        isTemporary: false,
      },
      {
        name: 'Volunteer Leaders',
        description: 'Operations group for ground volunteers and team leads',
        icon: 'fi fi-rr-users-alt',
        isTemporary: false,
      },
      {
        name: 'Venue Managers',
        description: 'Facilities management, equipment & ground updates',
        icon: 'fi fi-rr-building',
        isTemporary: false,
      },
      {
        name: 'Tournament Committee',
        description: 'Executive committee for rules, scheduling & appeals',
        icon: 'fi fi-rr-badge-check',
        isTemporary: false,
      },
    ];

    for (const g of defaultGroups) {
      const exists = await this.groupRepo.findOne({
        where: { workspaceId, name: g.name },
      });
      if (!exists) {
        const group = await this.groupRepo.save(
          this.groupRepo.create({
            workspaceId,
            name: g.name,
            description: g.description,
            icon: g.icon,
            isTemporary: g.isTemporary,
            createdById: creatorId,
          }),
        );
        await this.memberRepo.save(
          this.memberRepo.create({
            groupChatId: group.id,
            workspaceId,
            userId: creatorId,
            role: GroupMemberRole.ADMIN,
          }),
        );
      }
    }
  }
}
