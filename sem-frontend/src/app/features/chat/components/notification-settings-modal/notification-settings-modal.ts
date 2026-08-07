import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

export interface NotificationPreferences {
  desktopEnabled: boolean;
  browserEnabled: boolean;
  pushEnabled: boolean;
  emailDigest: 'instant' | 'hourly' | 'daily' | 'off';
  notificationScope: 'all' | 'mentions_only' | 'nothing';
  mutedChannelIds: string[];
  mutedUserIds: string[];
}

@Component({
  selector: 'app-notification-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-settings-modal.html',
  styleUrls: ['./notification-settings-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationSettingsModalComponent implements OnInit {
  @Input() currentUserId: string = 'current-user';
  @Input() channels: { id: string; name: string; isMuted?: boolean }[] = [];
  @Input() users: { id: string; username: string; isMuted?: boolean }[] = [];
  @Input() preferences: NotificationPreferences = {
    desktopEnabled: true,
    browserEnabled: true,
    pushEnabled: true,
    emailDigest: 'hourly',
    notificationScope: 'all',
    mutedChannelIds: [],
    mutedUserIds: [],
  };

  @Output() savePreferences = new EventEmitter<NotificationPreferences>();
  @Output() close = new EventEmitter<void>();

  private chatService = inject(ChatService);

  desktopEnabled = signal<boolean>(true);
  browserEnabled = signal<boolean>(true);
  pushEnabled = signal<boolean>(true);
  emailDigest = signal<'instant' | 'hourly' | 'daily' | 'off'>('hourly');
  notificationScope = signal<'all' | 'mentions_only' | 'nothing'>('all');
  mutedChannelIds = signal<string[]>([]);
  mutedUserIds = signal<string[]>([]);

  browserPermissionStatus = signal<string>('granted');

  emailOptions: ('instant' | 'hourly' | 'daily' | 'off')[] = ['instant', 'hourly', 'daily', 'off'];

  ngOnInit() {
    if (this.preferences) {
      this.desktopEnabled.set(this.preferences.desktopEnabled ?? true);
      this.browserEnabled.set(this.preferences.browserEnabled ?? true);
      this.pushEnabled.set(this.preferences.pushEnabled ?? true);
      this.emailDigest.set(this.preferences.emailDigest || 'hourly');
      this.notificationScope.set(this.preferences.notificationScope || 'all');
      this.mutedChannelIds.set(this.preferences.mutedChannelIds || []);
      this.mutedUserIds.set(this.preferences.mutedUserIds || []);
    }

    if (this.currentUserId) {
      this.chatService.getUserPreferences(this.currentUserId).subscribe({
        next: (dbPref) => {
          if (dbPref) {
            this.desktopEnabled.set(dbPref.desktopNotifications ?? true);
            this.browserEnabled.set(dbPref.browserNotifications ?? true);
            this.pushEnabled.set(dbPref.pushNotifications ?? true);
            this.notificationScope.set(dbPref.mentionOnly ? 'mentions_only' : 'all');
            this.mutedChannelIds.set(dbPref.mutedChannelIds || []);
            this.mutedUserIds.set(dbPref.mutedUserIds || []);
          }
        },
        error: () => {},
      });
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.browserPermissionStatus.set(Notification.permission);
    }
  }

  requestBrowserPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then((permission) => {
        this.browserPermissionStatus.set(permission);
        if (permission === 'granted') {
          this.desktopEnabled.set(true);
        }
      });
    }
  }

  toggleMuteChannel(channelId: string) {
    this.mutedChannelIds.update((list) =>
      list.includes(channelId) ? list.filter((id) => id !== channelId) : [...list, channelId],
    );
  }

  toggleMuteUser(userId: string) {
    this.mutedUserIds.update((list) =>
      list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId],
    );
  }

  save() {
    const updated: NotificationPreferences = {
      desktopEnabled: this.desktopEnabled(),
      browserEnabled: this.browserEnabled(),
      pushEnabled: this.pushEnabled(),
      emailDigest: this.emailDigest(),
      notificationScope: this.notificationScope(),
      mutedChannelIds: this.mutedChannelIds(),
      mutedUserIds: this.mutedUserIds(),
    };

    this.chatService
      .updateUserPreferences(this.currentUserId, {
        desktopNotifications: updated.desktopEnabled,
        browserNotifications: updated.browserEnabled,
        pushNotifications: updated.pushEnabled,
        mentionOnly: updated.notificationScope === 'mentions_only',
        mutedChannelIds: updated.mutedChannelIds,
        mutedUserIds: updated.mutedUserIds,
      })
      .subscribe({ error: () => {} });

    this.savePreferences.emit(updated);
    this.close.emit();
  }
}
