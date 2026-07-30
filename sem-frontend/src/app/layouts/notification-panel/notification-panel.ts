import { Component, input, model, output, HostListener } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  WorkspaceMember,
  AppNotification,
} from '../../features/workspaces/services/workspace.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [DatePipe, AvatarComponent],
  templateUrl: './notification-panel.html',
})
export class NotificationPanelComponent {
  isNotificationOpen = model<boolean>(false);

  pendingInvitations = input.required<WorkspaceMember[]>();
  notifications = input.required<AppNotification[]>();
  unreadCount = input.required<number>();
  isProcessingInvitation = input<boolean>(false);

  acceptInvitation = output<{ workspaceId: string; name: string }>();
  rejectInvitation = output<{ workspaceId: string; name: string }>();
  markNotificationsRead = output<void>();

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.isNotificationOpen() && event.key === 'Escape') {
      this.isNotificationOpen.set(false);
      event.preventDefault();
    }
  }
}
