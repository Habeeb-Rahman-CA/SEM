import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DirectMessageConversation } from './entities/direct-message-conversation.entity';
import { DirectMessageParticipant } from './entities/direct-message-participant.entity';
import { DirectMessage } from './entities/direct-message.entity';
import { WorkspaceMembersService } from '../workspaces/members/members.service';
import { EventsGateway } from '../workspaces/events.gateway';
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';
import { UpdateDmSettingsDto } from './dto/update-dm-settings.dto';

@Injectable()
export class DirectMessagesService {
  constructor(
    @InjectRepository(DirectMessageConversation)
    private readonly convRepo: Repository<DirectMessageConversation>,
    @InjectRepository(DirectMessageParticipant)
    private readonly participantRepo: Repository<DirectMessageParticipant>,
    @InjectRepository(DirectMessage)
    private readonly messageRepo: Repository<DirectMessage>,
    private readonly workspaceMembersService: WorkspaceMembersService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private getOrderedUserPair(u1: string, u2: string): [string, string] {
    return u1 < u2 ? [u1, u2] : [u2, u1];
  }

  async getOrCreateConversation(
    workspaceId: string,
    currentUserId: string,
    recipientUserId: string,
  ) {
    if (currentUserId === recipientUserId) {
      throw new BadRequestException(
        'Cannot start a direct message with yourself',
      );
    }

    await this.workspaceMembersService.ensureMember(workspaceId, currentUserId);
    await this.workspaceMembersService.ensureMember(
      workspaceId,
      recipientUserId,
    );

    const [user1Id, user2Id] = this.getOrderedUserPair(
      currentUserId,
      recipientUserId,
    );

    let conversation = await this.convRepo.findOne({
      where: { workspaceId, user1Id, user2Id },
      relations: { user1: true, user2: true },
    });

    if (!conversation) {
      const created = this.convRepo.create({
        workspaceId,
        user1Id,
        user2Id,
      });
      await this.convRepo.save(created);
      conversation = await this.convRepo.findOne({
        where: { id: created.id },
        relations: { user1: true, user2: true },
      });
    }

    if (!conversation) {
      throw new NotFoundException('Failed to create or retrieve conversation');
    }

    // Ensure participant settings records exist for both users
    await this.ensureParticipant(conversation.id, workspaceId, user1Id);
    await this.ensureParticipant(conversation.id, workspaceId, user2Id);

    const partner =
      conversation.user1Id === currentUserId
        ? conversation.user2
        : conversation.user1;

    const participant = await this.participantRepo.findOne({
      where: { conversationId: conversation.id, userId: currentUserId },
    });

    return {
      ...conversation,
      partner: {
        id: partner?.id,
        username: partner?.username,
        avatarUrl: partner?.avatarUrl,
        isOnline: partner ? this.eventsGateway.isUserOnline(partner.id) : false,
      },
      isPinned: participant?.isPinned || false,
      isMuted: participant?.isMuted || false,
      lastReadAt: participant?.lastReadAt || null,
    };
  }

  private async ensureParticipant(
    conversationId: string,
    workspaceId: string,
    userId: string,
  ) {
    let p = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });
    if (!p) {
      p = this.participantRepo.create({
        conversationId,
        workspaceId,
        userId,
      });
      await this.participantRepo.save(p);
    }
    return p;
  }

  async listConversations(workspaceId: string, currentUserId: string) {
    await this.workspaceMembersService.ensureMember(workspaceId, currentUserId);

    const conversations = await this.convRepo
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.user1', 'user1')
      .leftJoinAndSelect('conv.user2', 'user2')
      .where('conv.workspaceId = :workspaceId', { workspaceId })
      .andWhere(
        '(conv.user1Id = :currentUserId OR conv.user2Id = :currentUserId)',
        {
          currentUserId,
        },
      )
      .orderBy('conv.lastMessageAt', 'DESC', 'NULLS LAST')
      .getMany();

    const participants = await this.participantRepo.find({
      where: { workspaceId, userId: currentUserId },
    });
    const participantMap = new Map<string, DirectMessageParticipant>();
    for (const p of participants) {
      participantMap.set(p.conversationId, p);
    }

    const result = [];
    for (const conv of conversations) {
      const partner = conv.user1Id === currentUserId ? conv.user2 : conv.user1;
      const partSetting = participantMap.get(conv.id);

      // Unread count: messages sent by partner after user's lastReadAt
      const unreadQb = this.messageRepo
        .createQueryBuilder('msg')
        .where('msg.conversationId = :conversationId', {
          conversationId: conv.id,
        })
        .andWhere('msg.senderId != :currentUserId', { currentUserId });

      if (partSetting?.lastReadAt) {
        unreadQb.andWhere('msg.createdAt > :lastReadAt', {
          lastReadAt: partSetting.lastReadAt,
        });
      }
      const unreadCount = await unreadQb.getCount();

      result.push({
        id: conv.id,
        workspaceId: conv.workspaceId,
        lastMessageAt: conv.lastMessageAt,
        lastMessageText: conv.lastMessageText,
        createdAt: conv.createdAt,
        partner: {
          id: partner?.id,
          username: partner?.username,
          avatarUrl: partner?.avatarUrl,
          isOnline: partner
            ? this.eventsGateway.isUserOnline(partner.id)
            : false,
        },
        isPinned: partSetting?.isPinned || false,
        isMuted: partSetting?.isMuted || false,
        lastReadAt: partSetting?.lastReadAt || null,
        unreadCount,
      });
    }

    // Sort pinned conversations to the top
    return result.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const tA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tB - tA;
    });
  }

  async sendMessage(
    workspaceId: string,
    senderId: string,
    dto: CreateDirectMessageDto,
  ) {
    const convInfo = await this.getOrCreateConversation(
      workspaceId,
      senderId,
      dto.recipientUserId,
    );

    const message = this.messageRepo.create({
      conversationId: convInfo.id,
      workspaceId,
      senderId,
      content: dto.content.trim(),
      attachments: dto.attachments || [],
    });

    const savedMessage = await this.messageRepo.save(message);

    // Update conversation metadata
    await this.convRepo.update(convInfo.id, {
      lastMessageAt: savedMessage.createdAt,
      lastMessageText: savedMessage.content,
    });

    // Auto mark as read for sender
    await this.participantRepo.update(
      { conversationId: convInfo.id, userId: senderId },
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
      recipientUserId: dto.recipientUserId,
    };

    // Broadcast real-time message to recipient
    this.eventsGateway.sendDirectMessage(dto.recipientUserId, payload);

    return payload;
  }

  async getMessages(
    workspaceId: string,
    conversationId: string,
    currentUserId: string,
    limit: number = 50,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, currentUserId);

    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, workspaceId },
    });
    if (
      !conversation ||
      (conversation.user1Id !== currentUserId &&
        conversation.user2Id !== currentUserId)
    ) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    const messages = await this.messageRepo.find({
      where: { conversationId },
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

  async updateParticipantSettings(
    workspaceId: string,
    conversationId: string,
    currentUserId: string,
    dto: UpdateDmSettingsDto,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, currentUserId);
    const participant = await this.ensureParticipant(
      conversationId,
      workspaceId,
      currentUserId,
    );

    if (dto.isPinned !== undefined) participant.isPinned = dto.isPinned;
    if (dto.isMuted !== undefined) participant.isMuted = dto.isMuted;

    return this.participantRepo.save(participant);
  }

  async markAsRead(
    workspaceId: string,
    conversationId: string,
    currentUserId: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, currentUserId);
    const participant = await this.ensureParticipant(
      conversationId,
      workspaceId,
      currentUserId,
    );

    const now = new Date();
    participant.lastReadAt = now;
    await this.participantRepo.save(participant);

    return { success: true, lastReadAt: now };
  }

  async searchMessages(
    workspaceId: string,
    currentUserId: string,
    query: string,
  ) {
    await this.workspaceMembersService.ensureMember(workspaceId, currentUserId);

    if (!query || query.trim().length === 0) {
      return [];
    }

    const conversations = await this.convRepo.find({
      where: [
        { workspaceId, user1Id: currentUserId },
        { workspaceId, user2Id: currentUserId },
      ],
    });

    const convIds = conversations.map((c) => c.id);
    if (convIds.length === 0) return [];

    const messages = await this.messageRepo
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.sender', 'sender')
      .leftJoinAndSelect('msg.conversation', 'conv')
      .leftJoinAndSelect('conv.user1', 'user1')
      .leftJoinAndSelect('conv.user2', 'user2')
      .where('msg.conversationId IN (:...convIds)', { convIds })
      .andWhere('msg.content ILIKE :query', { query: `%${query.trim()}%` })
      .orderBy('msg.createdAt', 'DESC')
      .take(30)
      .getMany();

    return messages.map((m) => {
      const partner =
        m.conversation?.user1Id === currentUserId
          ? m.conversation?.user2
          : m.conversation?.user1;
      return {
        id: m.id,
        conversationId: m.conversationId,
        content: m.content,
        createdAt: m.createdAt,
        senderId: m.senderId,
        senderName: m.sender?.username,
        partnerName: partner?.username,
      };
    });
  }
}
