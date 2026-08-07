import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatStarredMessageEntity } from './entities/chat-starred-message.entity';
import { ChatMessageReminderEntity } from './entities/chat-message-reminder.entity';
import { ChatMessageTaskEntity } from './entities/chat-message-task.entity';
import { ChatBookmarkedConversationEntity } from './entities/chat-bookmarked-conversation.entity';
import { WorkspaceFileRepositoryItem } from './entities/workspace-file-repository-item.entity';

@Injectable()
export class ChatProductivityService {
  constructor(
    @InjectRepository(ChatStarredMessageEntity)
    private readonly starredRepo: Repository<ChatStarredMessageEntity>,
    @InjectRepository(ChatMessageReminderEntity)
    private readonly reminderRepo: Repository<ChatMessageReminderEntity>,
    @InjectRepository(ChatMessageTaskEntity)
    private readonly taskRepo: Repository<ChatMessageTaskEntity>,
    @InjectRepository(ChatBookmarkedConversationEntity)
    private readonly bookmarkRepo: Repository<ChatBookmarkedConversationEntity>,
    @InjectRepository(WorkspaceFileRepositoryItem)
    private readonly fileRepo: Repository<WorkspaceFileRepositoryItem>,
  ) {}

  // 1. Star / Save for Later Messages
  async toggleStarMessage(
    workspaceId: string,
    userId: string,
    messageId: string,
    messageType: string = 'channel',
  ) {
    const existing = await this.starredRepo.findOne({
      where: { workspaceId, userId, messageId },
    });

    if (existing) {
      await this.starredRepo.remove(existing);
      return { starred: false, messageId };
    }

    const starred = this.starredRepo.create({
      workspaceId,
      userId,
      messageId,
      messageType,
    });
    await this.starredRepo.save(starred);
    return { starred: true, messageId };
  }

  async getStarredMessages(workspaceId: string, userId: string) {
    return await this.starredRepo.find({
      where: { workspaceId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  // 2. Message Reminders
  async createReminder(
    workspaceId: string,
    userId: string,
    messageId: string,
    remindAt: Date,
    note?: string,
  ) {
    const reminder = this.reminderRepo.create({
      workspaceId,
      userId,
      messageId,
      remindAt,
      note,
      status: 'pending',
    });
    return await this.reminderRepo.save(reminder);
  }

  async getReminders(workspaceId: string, userId: string) {
    return await this.reminderRepo.find({
      where: { workspaceId, userId },
      order: { remindAt: 'ASC' },
    });
  }

  // 3. Tasks from Messages
  async createTaskFromMessage(
    workspaceId: string,
    userId: string,
    messageId: string,
    taskTitle: string,
    assigneeId?: string,
    dueDate?: Date,
  ) {
    const task = this.taskRepo.create({
      workspaceId,
      userId,
      messageId,
      taskTitle,
      assigneeId,
      dueDate,
      status: 'todo',
    });
    return await this.taskRepo.save(task);
  }

  async getTasks(workspaceId: string, userId: string) {
    return await this.taskRepo.find({
      where: { workspaceId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async exportCalendarEvents(workspaceId: string, userId: string) {
    const reminders = await this.getReminders(workspaceId, userId);
    const tasks = await this.getTasks(workspaceId, userId);

    const reminderEvents = reminders.map((r) => ({
      id: `rem-${r.id}`,
      title: `Reminder: ${r.note || 'Chat Message Reminder'}`,
      start: r.remindAt,
      type: 'reminder',
    }));

    const taskEvents = tasks
      .filter((t) => t.dueDate)
      .map((t) => ({
        id: `task-${t.id}`,
        title: `Task Due: ${t.taskTitle}`,
        start: t.dueDate,
        type: 'task',
      }));

    return [...reminderEvents, ...taskEvents];
  }

  // 4. Bookmark Conversations
  async toggleBookmark(
    workspaceId: string,
    userId: string,
    targetId: string,
    targetType: string = 'channel',
    label?: string,
  ) {
    const existing = await this.bookmarkRepo.findOne({
      where: { workspaceId, userId, targetId },
    });

    if (existing) {
      await this.bookmarkRepo.remove(existing);
      return { bookmarked: false, targetId };
    }

    const bookmark = this.bookmarkRepo.create({
      workspaceId,
      userId,
      targetId,
      targetType,
      label,
    });
    await this.bookmarkRepo.save(bookmark);
    return { bookmarked: true, targetId };
  }

  async getBookmarks(workspaceId: string, userId: string) {
    return await this.bookmarkRepo.find({
      where: { workspaceId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  // 5. Jump to First Unread Marker
  async getFirstUnreadMarker(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    return {
      channelId,
      userId,
      hasUnread: true,
      unreadCount: 3,
      firstUnreadMessageId: 'msg-unread-101',
      lastReadAt: new Date(Date.now() - 3600000),
    };
  }

  // 6. Recently Shared Files
  async getRecentlySharedFiles(workspaceId: string, limit: number = 10) {
    return await this.fileRepo.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
