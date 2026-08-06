import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  CenterNotificationItem,
  FrontendNotificationCenterService,
  NotificationCategory,
  NotificationTab,
} from '../../services/notification-center.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notification-center.html',
})
export class NotificationCenterComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private notificationService = inject(FrontendNotificationCenterService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  notifications = signal<CenterNotificationItem[]>([]);
  unreadTotal = signal<number>(0);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  activeTab = signal<NotificationTab>('all');
  searchQuery = signal('');

  filteredNotifications = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.notifications().filter((n) => {
      if (
        q &&
        !n.title.toLowerCase().includes(q) &&
        !n.message.toLowerCase().includes(q) &&
        !(n.authorName && n.authorName.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.workspaceId.set(id);
      if (id) this.load();
    });
  }

  setTab(tab: NotificationTab) {
    this.activeTab.set(tab);
    this.load();
  }

  load() {
    this.isLoading.set(true);
    this.error.set(null);
    this.notificationService.getNotifications(this.workspaceId(), this.activeTab()).subscribe({
      next: (res) => {
        this.notifications.set(res.items);
        this.unreadTotal.set(res.unreadCount);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load notifications');
        this.isLoading.set(false);
      },
    });
  }

  toggleRead(notification: CenterNotificationItem) {
    const newStatus = !notification.isRead;
    this.notificationService.toggleRead(this.workspaceId(), notification.id, newStatus).subscribe({
      next: (updated) => {
        this.notifications.update((list) => list.map((n) => (n.id === updated.id ? updated : n)));
        this.unreadTotal.update((c) => (newStatus ? Math.max(0, c - 1) : c + 1));
        this.ui.info(newStatus ? 'Marked notification as read' : 'Marked notification as unread');
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to update notification');
      },
    });
  }

  archive(notification: CenterNotificationItem) {
    this.notificationService.archive(this.workspaceId(), notification.id).subscribe({
      next: () => {
        this.notifications.update((list) => list.filter((n) => n.id !== notification.id));
        this.ui.success(`Archived notification "${notification.title}".`);
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to archive notification');
      },
    });
  }

  snooze(notification: CenterNotificationItem, minutes: number = 240) {
    this.notificationService.snooze(this.workspaceId(), notification.id, minutes).subscribe({
      next: () => {
        this.notifications.update((list) => list.filter((n) => n.id !== notification.id));
        this.ui.info(`Snoozed notification for ${minutes / 60} hours.`);
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to snooze notification');
      },
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead(this.workspaceId()).subscribe({
      next: (res) => {
        this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
        this.unreadTotal.set(0);
        this.ui.success(`Marked ${res.count} notifications as read.`);
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to mark all as read');
      },
    });
  }

  categoryIcon(cat: NotificationCategory): string {
    return this.notificationService.getCategoryIcon(cat);
  }

  categoryBadge(cat: NotificationCategory): string {
    return this.notificationService.getCategoryBadgeClass(cat);
  }
}
