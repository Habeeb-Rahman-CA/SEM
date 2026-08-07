import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
export class NotificationSettingsModalComponent {
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
    this.savePreferences.emit({
      desktopEnabled: this.desktopEnabled(),
      browserEnabled: this.browserEnabled(),
      pushEnabled: this.pushEnabled(),
      emailDigest: this.emailDigest(),
      notificationScope: this.notificationScope(),
      mutedChannelIds: this.mutedChannelIds(),
      mutedUserIds: this.mutedUserIds(),
    });
    this.close.emit();
  }
}
