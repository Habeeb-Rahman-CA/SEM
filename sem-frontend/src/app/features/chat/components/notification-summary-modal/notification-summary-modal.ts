import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NotificationItem {
  id: string;
  senderName: string;
  senderAvatarUrl?: string;
  channelName?: string;
  content: string;
  type: 'mention' | 'announcement' | 'direct_message' | 'reply';
  createdAt: string;
  isRead: boolean;
}

@Component({
  selector: 'app-notification-summary-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-summary-modal.html',
  styleUrls: ['./notification-summary-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationSummaryModalComponent {
  @Input() notifications: NotificationItem[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() markAllAsRead = new EventEmitter<void>();
  @Output() jumpToNotification = new EventEmitter<NotificationItem>();

  activeFilter = signal<'all' | 'unread' | 'mentions' | 'announcements'>('all');

  filteredNotifications = computed(() => {
    const list = this.notifications || [];
    const filter = this.activeFilter();

    if (filter === 'unread') return list.filter((n) => !n.isRead);
    if (filter === 'mentions') return list.filter((n) => n.type === 'mention');
    if (filter === 'announcements') return list.filter((n) => n.type === 'announcement');
    return list;
  });

  unreadCount = computed(() => (this.notifications || []).filter((n) => !n.isRead).length);

  getTypeBadge(type: string): { label: string; class: string; icon: string } {
    switch (type) {
      case 'mention':
        return {
          label: 'Mention',
          class: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: 'fi fi-rr-at',
        };
      case 'announcement':
        return {
          label: 'Announcement',
          class: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          icon: 'fi fi-rr-megaphone',
        };
      case 'direct_message':
        return {
          label: 'Direct Message',
          class: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
          icon: 'fi fi-rr-paper-plane',
        };
      case 'reply':
      default:
        return {
          label: 'Thread Reply',
          class: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          icon: 'fi fi-rr-comment-alt-middle',
        };
    }
  }
}
