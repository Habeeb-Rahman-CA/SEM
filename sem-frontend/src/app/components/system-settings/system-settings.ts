import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkspaceService, Role, Permission } from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './system-settings.html',
  styleUrl: './system-settings.css',
})
export class SystemSettingsComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  authService = inject(AuthService);
  private router = inject(Router);
  private uiService = inject(UiService);

  activeSection = signal<string | null>(null);

  roles = signal<Role[]>([]);
  permissions = signal<Permission[]>([]);
  isLoading = signal(false);
  error = signal('');

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

  // Create Role Form Signals
  newRoleName = signal('');
  newRoleDescription = signal('');
  isCreatingRole = signal(false);
  roleCreateSuccess = signal('');
  roleCreateError = signal('');

  // Permission Modal State
  selectedRole = signal<Role | null>(null);
  selectedRolePermissionIds = signal<string[]>([]);
  isSavingPermissions = signal(false);

  ngOnInit() {
    this.loadGlobalRoles();
    this.loadGlobalPermissions();
  }

  loadGlobalRoles() {
    this.isLoading.set(true);
    this.workspaceService.getGlobalRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load global roles', err);
        this.error.set('Failed to load global roles.');
        this.isLoading.set(false);
      },
    });
  }

  loadGlobalPermissions() {
    this.workspaceService.getGlobalPermissions().subscribe({
      next: (perms) => {
        this.permissions.set(perms);
      },
      error: (err) => {
        console.error('Failed to load global permissions', err);
      },
    });
  }

  onCreateRole() {
    const name = this.newRoleName().trim();
    const description = this.newRoleDescription().trim();
    if (!name) return;

    this.isCreatingRole.set(true);
    this.roleCreateError.set('');
    this.roleCreateSuccess.set('');

    this.workspaceService.createGlobalRole(name, description || undefined).subscribe({
      next: (role) => {
        this.isCreatingRole.set(false);
        this.roleCreateSuccess.set(`Global role "${role.name}" created successfully!`);
        this.newRoleName.set('');
        this.newRoleDescription.set('');
        // Initialize role permissions as empty array
        role.permissions = [];
        this.roles.update((prev) => [...prev, role]);
      },
      error: (err) => {
        this.isCreatingRole.set(false);
        this.roleCreateError.set(err.error?.message ?? 'Failed to create global role.');
      },
    });
  }

  async onDeleteRole(role: Role) {
    const confirmed = await this.uiService.confirm({
      title: 'Delete Global Role',
      message: `Delete the global role "${role.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.removeGlobalRole(role.id).subscribe({
      next: () => {
        this.roles.update((prev) => prev.filter((r) => r.id !== role.id));
        this.uiService.success(`Global role "${role.name}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete global role.');
      },
    });
  }

  openPermissionModal(role: Role) {
    this.selectedRole.set(role);
    const ids = role.permissions?.map((p) => p.id) || [];
    this.selectedRolePermissionIds.set(ids);
  }

  closePermissionModal() {
    this.selectedRole.set(null);
    this.selectedRolePermissionIds.set([]);
  }

  togglePermission(permId: string) {
    const current = this.selectedRolePermissionIds();
    if (current.includes(permId)) {
      this.selectedRolePermissionIds.set(current.filter((id) => id !== permId));
    } else {
      this.selectedRolePermissionIds.set([...current, permId]);
    }
  }

  saveRolePermissions() {
    const role = this.selectedRole();
    if (!role) return;

    this.isSavingPermissions.set(true);
    const permIds = this.selectedRolePermissionIds();

    this.workspaceService.updateRolePermissions(role.id, permIds).subscribe({
      next: (updatedRole) => {
        this.isSavingPermissions.set(false);
        this.roles.update((prev) =>
          prev.map((r) => (r.id === updatedRole.id ? { ...r, permissions: updatedRole.permissions } : r))
        );
        this.closePermissionModal();
        this.uiService.success('Role permissions updated successfully.');
      },
      error: (err) => {
        this.isSavingPermissions.set(false);
        this.uiService.error(err.error?.message ?? 'Failed to update permissions.');
      },
    });
  }

  getRolesForPermission(permission: Permission): Role[] {
    return this.roles().filter((role) =>
      role.permissions?.some((p) => p.id === permission.id || p.slug === permission.slug)
    );
  }

  roleBadgeClass(slug: string): string {
    const map: Record<string, string> = {
      owner:               'bg-violet-500/20 text-violet-300 border-violet-500/30',
      administrator:       'bg-blue-500/20 text-blue-300 border-blue-500/30',
      event_manager:       'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      competition_manager: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      referee:             'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      statistician:        'bg-orange-500/20 text-orange-300 border-orange-500/30',
      media_team:          'bg-pink-500/20 text-pink-300 border-pink-500/30',
      viewer:              'bg-slate-500/20 text-slate-300 border-slate-500/30',
    };
    return map[slug] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
}

