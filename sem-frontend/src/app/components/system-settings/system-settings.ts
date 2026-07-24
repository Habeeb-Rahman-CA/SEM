import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  WorkspaceService,
  Workspace,
  Role,
  Permission,
  Sport,
  AuditLog,
  SystemMetrics,
} from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar';
import { SportsManagementComponent } from './sports-management';
import { RolesPermissionsComponent } from './roles-permissions';
import { AuditLogsComponent } from './audit-logs';
import { SystemHealthComponent } from './system-health';
import { GlobalPreferencesComponent } from './global-preferences';
import { WorkspacesManagementComponent } from './workspaces-management';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    AvatarComponent,
    SportsManagementComponent,
    RolesPermissionsComponent,
    AuditLogsComponent,
    SystemHealthComponent,
    GlobalPreferencesComponent,
    WorkspacesManagementComponent,
  ],
  templateUrl: './system-settings.html',
  styleUrl: './system-settings.css',
})
export class SystemSettingsComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  authService = inject(AuthService);
  private router = inject(Router);
  private uiService = inject(UiService);

  activeSection = signal<string | null>(null);

  workspaces = signal<Workspace[]>([]);
  roles = signal<Role[]>([]);
  permissions = signal<Permission[]>([]);
  sports = signal<Sport[]>([]);
  auditLogs = signal<AuditLog[]>([]);
  systemMetrics = signal<SystemMetrics | null>(null);

  // Dropdown & Upload signals
  isUserDropdownOpen = signal(false);
  isUploadingAvatar = signal(false);

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

  ngOnInit() {
    this.loadWorkspaces();
    this.loadGlobalRoles();
    this.loadGlobalPermissions();
    this.loadSports();
    this.loadAuditLogs();
    this.loadSystemMetrics();
  }

  loadWorkspaces() {
    this.workspaceService.getAll().subscribe({
      next: (wsList) => this.workspaces.set(wsList),
      error: (err) => console.error('Failed to load workspaces in system settings dashboard', err),
    });
  }

  loadGlobalRoles() {
    this.workspaceService.getGlobalRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: (err) => console.error('Failed to load global roles in system settings dashboard', err),
    });
  }

  loadGlobalPermissions() {
    this.workspaceService.getGlobalPermissions().subscribe({
      next: (perms) => this.permissions.set(perms),
      error: (err) => console.error('Failed to load global permissions in system settings dashboard', err),
    });
  }

  loadSports() {
    this.workspaceService.getSports().subscribe({
      next: (sports) => this.sports.set(sports),
      error: (err) => console.error('Failed to load sports in system settings dashboard', err),
    });
  }

  loadAuditLogs() {
    this.workspaceService.getAuditLogs().subscribe({
      next: (logs) => this.auditLogs.set(logs),
      error: (err) => console.error('Failed to load audit logs in system settings dashboard', err),
    });
  }

  loadSystemMetrics() {
    this.workspaceService.getSystemMetrics().subscribe({
      next: (metrics) => this.systemMetrics.set(metrics),
      error: (err) => console.error('Failed to load system metrics in system settings dashboard', err),
    });
  }
}
