import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';

export type NotificationCategory =
  'mention' | 'support' | 'system' | 'match' | 'payment';
export type NotificationTab =
  'all' | 'unread' | 'mentions' | 'support' | 'archived' | 'snoozed';

export interface CenterNotificationItem {
  id: string;
  workspaceId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  isArchived: boolean;
  snoozedUntil: string | null;
  createdAt: string;
  linkUrl?: string;
  authorName?: string;
}

@Injectable()
export class NotificationCenterService {
  private notificationsStore: Map<string, CenterNotificationItem[]> = new Map();

  constructor(private readonly workspacesService: WorkspacesService) {
    this.seedInitialNotifications();
  }

  private seedInitialNotifications() {
    const defaultList: CenterNotificationItem[] = [
      {
        id: 'notif-101',
        workspaceId: 'default-ws',
        title: 'Mentioned in Match #104 Discussion',
        message:
          '@Ahmed Al-Mansoor mentioned you: "Please confirm the referee assignment for pitch 1 before 18:00."',
        category: 'mention',
        isRead: false,
        isArchived: false,
        snoozedUntil: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15m ago
        authorName: 'Ahmed Al-Mansoor',
        linkUrl: '/live',
      },
      {
        id: 'notif-102',
        workspaceId: 'default-ws',
        title: 'Support Ticket #402 Resolved',
        message:
          'Your helpdesk request regarding "QR Scan Verification Failure" has been marked as resolved.',
        category: 'support',
        isRead: false,
        isArchived: false,
        snoozedUntil: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2h ago
        authorName: 'Taisen Helpdesk',
      },
      {
        id: 'notif-103',
        workspaceId: 'default-ws',
        title: 'Payment Confirmation — Falcons FC',
        message:
          'Registration fee payment of $1,200.00 for Falcons FC has been verified and processed.',
        category: 'payment',
        isRead: true,
        isArchived: false,
        snoozedUntil: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6h ago
      },
      {
        id: 'notif-104',
        workspaceId: 'default-ws',
        title: 'Snoozed: Review Sponsor Banner ROI',
        message:
          'Reminder: Review quarterly banner impression analytics report for Platinum sponsors.',
        category: 'system',
        isRead: true,
        isArchived: false,
        snoozedUntil: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(), // Snoozed for 4h
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
      {
        id: 'notif-105',
        workspaceId: 'default-ws',
        title: 'Archived: Stadium Pitch 3 Maintenance Completed',
        message: 'Floodlights and turf maintenance completed successfully.',
        category: 'system',
        isRead: true,
        isArchived: true,
        snoozedUntil: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      },
    ];

    this.notificationsStore.set('default-ws', defaultList);
  }

  async getNotifications(
    workspaceId: string,
    tab: NotificationTab = 'all',
    userId?: string,
  ): Promise<{ items: CenterNotificationItem[]; unreadCount: number }> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.notificationsStore.get(workspaceId) ||
      this.notificationsStore.get('default-ws') ||
      [];
    const now = new Date().toISOString();

    const unreadCount = list.filter((n) => !n.isRead && !n.isArchived).length;

    let filtered = list;

    switch (tab) {
      case 'unread':
        filtered = list.filter((n) => !n.isRead && !n.isArchived);
        break;
      case 'mentions':
        filtered = list.filter(
          (n) => n.category === 'mention' && !n.isArchived,
        );
        break;
      case 'support':
        filtered = list.filter(
          (n) => n.category === 'support' && !n.isArchived,
        );
        break;
      case 'archived':
        filtered = list.filter((n) => n.isArchived);
        break;
      case 'snoozed':
        filtered = list.filter(
          (n) => n.snoozedUntil && n.snoozedUntil > now && !n.isArchived,
        );
        break;
      case 'all':
      default:
        filtered = list.filter(
          (n) => !n.isArchived && (!n.snoozedUntil || n.snoozedUntil <= now),
        );
        break;
    }

    return { items: filtered, unreadCount };
  }

  async toggleReadStatus(
    workspaceId: string,
    notificationId: string,
    isRead: boolean,
    userId?: string,
  ): Promise<CenterNotificationItem> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.notificationsStore.get(workspaceId) ||
      this.notificationsStore.get('default-ws') ||
      [];
    const index = list.findIndex((n) => n.id === notificationId);

    if (index === -1)
      throw new NotFoundException(`Notification "${notificationId}" not found`);

    list[index].isRead = isRead;
    this.notificationsStore.set(workspaceId, list);
    return list[index];
  }

  async archiveNotification(
    workspaceId: string,
    notificationId: string,
    userId?: string,
  ): Promise<CenterNotificationItem> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.notificationsStore.get(workspaceId) ||
      this.notificationsStore.get('default-ws') ||
      [];
    const index = list.findIndex((n) => n.id === notificationId);

    if (index === -1)
      throw new NotFoundException(`Notification "${notificationId}" not found`);

    list[index].isArchived = true;
    this.notificationsStore.set(workspaceId, list);
    return list[index];
  }

  async snoozeNotification(
    workspaceId: string,
    notificationId: string,
    minutes: number,
    userId?: string,
  ): Promise<CenterNotificationItem> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.notificationsStore.get(workspaceId) ||
      this.notificationsStore.get('default-ws') ||
      [];
    const index = list.findIndex((n) => n.id === notificationId);

    if (index === -1)
      throw new NotFoundException(`Notification "${notificationId}" not found`);

    const snoozedUntil = new Date(
      Date.now() + 1000 * 60 * minutes,
    ).toISOString();
    list[index].snoozedUntil = snoozedUntil;
    this.notificationsStore.set(workspaceId, list);
    return list[index];
  }

  async markAllAsRead(
    workspaceId: string,
    userId?: string,
  ): Promise<{ success: boolean; count: number }> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.notificationsStore.get(workspaceId) ||
      this.notificationsStore.get('default-ws') ||
      [];
    let updatedCount = 0;

    const updated = list.map((n) => {
      if (!n.isRead) {
        updatedCount++;
        return { ...n, isRead: true };
      }
      return n;
    });

    this.notificationsStore.set(workspaceId, updated);
    return { success: true, count: updatedCount };
  }

  async createNotification(
    workspaceId: string,
    notification: {
      title: string;
      message: string;
      category: NotificationCategory;
      authorName?: string;
      linkUrl?: string;
    },
  ): Promise<CenterNotificationItem> {
    const list = this.notificationsStore.get(workspaceId) || [];
    const newItem: CenterNotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      workspaceId,
      title: notification.title,
      message: notification.message,
      category: notification.category,
      isRead: false,
      isArchived: false,
      snoozedUntil: null,
      createdAt: new Date().toISOString(),
      authorName: notification.authorName,
      linkUrl: notification.linkUrl,
    };
    list.unshift(newItem);
    this.notificationsStore.set(workspaceId, list);
    return newItem;
  }
}
