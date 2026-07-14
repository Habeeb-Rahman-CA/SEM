import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceService, Workspace, WorkspaceMember, AppNotification } from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './workspaces.html',
  styleUrl: './workspaces.css',
})
export class WorkspacesComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  authService = inject(AuthService);
  private router = inject(Router);
  private uiService = inject(UiService);

  workspaces = signal<Workspace[]>([]);
  isLoading = signal(true);
  error = signal('');

  // Dropdown & Upload signals
  isUserDropdownOpen = signal(false);
  isUploadingAvatar = signal(false);

  // Invitation & Notification signals
  pendingInvitations = signal<WorkspaceMember[]>([]);
  notifications = signal<AppNotification[]>([]);
  isNotificationOpen = signal(false);
  isProcessingInvitation = signal(false);

  unreadNotificationsCount = computed(() => this.notifications().filter(n => !n.isRead).length);
  totalBadgeCount = computed(() => this.pendingInvitations().length + this.unreadNotificationsCount());

  ngOnInit() {
    this.workspaceService.getAll().subscribe({
      next: (data) => {
        this.workspaces.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Failed to load workspaces.');
        this.isLoading.set(false);
      },
    });
    this.loadInvitationsAndNotifications();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onSignOut() {
    this.logout();
  }

  onAvatarUpload(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingAvatar.set(true);
    this.workspaceService.uploadImage(file, 'user').subscribe({
      next: (res) => {
        this.authService.updateProfile(undefined, res.url).subscribe({
          next: () => {
            this.isUploadingAvatar.set(false);
            this.uiService.success('Avatar updated successfully!');
          },
          error: (err) => {
            console.error(err);
            this.isUploadingAvatar.set(false);
            this.uiService.error('Failed to update profile with new avatar.');
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.isUploadingAvatar.set(false);
        this.uiService.error('Failed to upload avatar image.');
      }
    });
  }

  initials(name: string): string {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts.slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  avatarColor(name: string): string {
    if (!name) return '#6366f1';
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
      '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  // Workspace creation modal signals & logic
  isCreateModalOpen = signal(false);
  name = signal('');
  description = signal('');
  isCreating = signal(false);
  createError = signal('');

  slugPreview = computed(() =>
    this.name()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60) || 'your-workspace'
  );

  openCreateModal() {
    this.name.set('');
    this.description.set('');
    this.createError.set('');
    this.isCreating.set(false);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  onCreateWorkspace() {
    const name = this.name().trim();
    if (!name) {
      this.createError.set('Workspace name is required.');
      return;
    }

    this.isCreating.set(true);
    this.createError.set('');

    this.workspaceService.create({ name, description: this.description().trim() || undefined }).subscribe({
      next: (ws) => {
        this.isCreating.set(false);
        this.closeCreateModal();
        this.router.navigate(['/workspaces', ws.id]);
      },
      error: (err) => {
        this.isCreating.set(false);
        console.error(err);
        if (err.status === 409) {
          this.createError.set('A workspace with that name/slug already exists.');
        } else if (err.error?.message) {
          this.createError.set(Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message);
        } else {
          this.createError.set('Failed to create workspace. Please try again.');
        }
      },
    });
  }

  loadInvitationsAndNotifications() {
    this.workspaceService.getPendingInvitations().subscribe({
      next: (data) => {
        this.pendingInvitations.set(data);
      },
      error: (err) => {
        console.error('Failed to load invitations', err);
      }
    });

    this.workspaceService.getNotifications().subscribe({
      next: (data) => {
        this.notifications.set(data);
      },
      error: (err) => {
        console.error('Failed to load notifications', err);
      }
    });
  }

  acceptInvite(workspaceId: string, workspaceName: string) {
    this.isProcessingInvitation.set(true);
    this.workspaceService.acceptInvitation(workspaceId).subscribe({
      next: () => {
        this.isProcessingInvitation.set(false);
        this.isNotificationOpen.set(false);
        this.uiService.success(`You joined the ${workspaceName} workspace!`);
        this.loadInvitationsAndNotifications();
        this.workspaceService.getAll().subscribe(data => this.workspaces.set(data));
      },
      error: (err) => {
        this.isProcessingInvitation.set(false);
        console.error(err);
        this.uiService.error(err.error?.message ?? 'Failed to accept invitation.');
      }
    });
  }

  rejectInvite(workspaceId: string, workspaceName: string) {
    this.isProcessingInvitation.set(true);
    this.workspaceService.rejectInvitation(workspaceId).subscribe({
      next: () => {
        this.isProcessingInvitation.set(false);
        this.isNotificationOpen.set(false);
        this.uiService.success(`Rejected invitation to "${workspaceName}".`);
        this.loadInvitationsAndNotifications();
      },
      error: (err) => {
        this.isProcessingInvitation.set(false);
        console.error(err);
        this.uiService.error(err.error?.message ?? 'Failed to reject invitation.');
      }
    });
  }

  markNotificationsAsRead() {
    if (this.unreadNotificationsCount() === 0) return;
    this.workspaceService.markNotificationsRead().subscribe({
      next: () => {
        this.loadInvitationsAndNotifications();
      },
      error: (err) => {
        console.error('Failed to mark notifications as read', err);
      }
    });
  }
}
