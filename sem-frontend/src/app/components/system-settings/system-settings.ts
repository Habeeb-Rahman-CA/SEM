import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  WorkspaceService,
  Workspace,
  Role,
  Permission,
  Sport,
  AuditLog,
  SystemMetrics,
  SystemConfigMap,
} from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar';
import { roleBadgeClass } from '../../shared';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, AvatarComponent],
  templateUrl: './system-settings.html',
  styleUrl: './system-settings.css',
})
export class SystemSettingsComponent implements OnInit {

  private workspaceService = inject(WorkspaceService);
  authService = inject(AuthService);
  private router = inject(Router);
  private uiService = inject(UiService);

  activeSection = signal<string | null>(null); // 'roles' | 'permissions' | 'workspaces' | 'sports' | 'audit' | 'monitoring' | 'config' | null

  workspaces = signal<Workspace[]>([]);
  defaultWorkspaceId = signal<string>('');
  roles = signal<Role[]>([]);
  permissions = signal<Permission[]>([]);
  sports = signal<Sport[]>([]);

  isLoading = signal(false);
  isLoadingSports = signal(false);
  error = signal('');

  // Create Workspace Signals
  wsName = signal('');
  wsDescription = signal('');
  isCreatingWs = signal(false);
  wsCreateError = signal('');

  // Dropdown & Upload signals
  isUserDropdownOpen = signal(false);
  isUploadingAvatar = signal(false);

  // Create Role Form Signals
  newRoleName = signal('');
  newRoleDescription = signal('');
  isCreatingRole = signal(false);
  roleCreateSuccess = signal('');
  roleCreateError = signal('');

  // Edit Role Modal State
  editingRole = signal<Role | null>(null);
  editRoleName = signal('');
  editRoleDescription = signal('');
  isUpdatingRole = signal(false);

  // Permission Modal State (for role assignment)
  selectedRole = signal<Role | null>(null);
  selectedRolePermissionIds = signal<string[]>([]);
  isSavingPermissions = signal(false);

  // Permission CRUD Signals
  newPermName = signal('');
  newPermSlug = signal('');
  newPermDescription = signal('');
  isCreatingPerm = signal(false);
  permCreateSuccess = signal('');
  permCreateError = signal('');

  editingPerm = signal<Permission | null>(null);
  editPermName = signal('');
  editPermSlug = signal('');
  editPermDescription = signal('');
  isUpdatingPerm = signal(false);

  // Sports CRUD Signals
  newSportName = signal('');
  newSportCode = signal('');
  newSportDescription = signal('');
  isCreatingSport = signal(false);
  sportCreateSuccess = signal('');
  sportCreateError = signal('');

  editingSport = signal<Sport | null>(null);
  editSportName = signal('');
  editSportCode = signal('');
  editSportDescription = signal('');
  isUpdatingSport = signal(false);

  // Audit Logs State
  auditLogs = signal<AuditLog[]>([]);
  isLoadingAuditLogs = signal(false);
  selectedAuditCategory = signal<string>('');

  // Monitoring State
  systemMetrics = signal<SystemMetrics | null>(null);
  isLoadingMetrics = signal(false);

  // Config State
  systemConfigs = signal<SystemConfigMap | null>(null);
  isLoadingConfigs = signal(false);

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
    this.loadSystemConfigs();
  }

  loadWorkspaces() {
    this.workspaceService.getAll().subscribe({
      next: (wsList) => {
        this.workspaces.set(wsList);
        const savedDefault = this.authService.getDefaultWorkspaceId();
        if (savedDefault && wsList.some((w) => w.id === savedDefault)) {
          this.defaultWorkspaceId.set(savedDefault);
        } else if (wsList.length > 0) {
          this.defaultWorkspaceId.set(wsList[0].id);
          this.authService.setDefaultWorkspaceId(wsList[0].id);
        }
      },
      error: (err) => console.error('Failed to load workspaces in system settings', err),
    });
  }

  onSetDefaultWorkspace(wsId: string) {
    if (!wsId) return;
    this.defaultWorkspaceId.set(wsId);
    this.authService.setDefaultWorkspaceId(wsId);
    const selected = this.workspaces().find((w) => w.id === wsId);
    if (selected) {
      this.uiService.success(`"${selected.name}" set as default login workspace.`);
    }
  }

  onCreateWorkspace() {
    const name = this.wsName().trim();
    if (!name) return;

    this.isCreatingWs.set(true);
    this.wsCreateError.set('');

    this.workspaceService.create({ name, description: this.wsDescription().trim() || undefined }).subscribe({
      next: (ws) => {
        this.isCreatingWs.set(false);
        this.wsName.set('');
        this.wsDescription.set('');
        this.uiService.success(`Workspace "${ws.name}" created successfully!`);
        this.loadWorkspaces();
        this.router.navigate(['/workspaces', ws.id]);
      },
      error: (err) => {
        this.isCreatingWs.set(false);
        this.wsCreateError.set(err.error?.message ?? 'Failed to create workspace.');
      },
    });
  }

  // ─── Global Roles ─────────────────────────────────────────────────────────

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
        role.permissions = [];
        this.roles.update((prev) => [...prev, role]);
      },
      error: (err) => {
        this.isCreatingRole.set(false);
        this.roleCreateError.set(err.error?.message ?? 'Failed to create global role.');
      },
    });
  }

  openEditRoleModal(role: Role) {
    this.editingRole.set(role);
    this.editRoleName.set(role.name);
    this.editRoleDescription.set(role.description || '');
  }

  closeEditRoleModal() {
    this.editingRole.set(null);
    this.editRoleName.set('');
    this.editRoleDescription.set('');
  }

  onUpdateRole() {
    const role = this.editingRole();
    if (!role) return;

    const name = this.editRoleName().trim();
    const description = this.editRoleDescription().trim();
    if (!name) return;

    this.isUpdatingRole.set(true);
    this.workspaceService.updateGlobalRole(role.id, name, description || undefined).subscribe({
      next: (updatedRole) => {
        this.isUpdatingRole.set(false);
        this.roles.update((prev) =>
          prev.map((r) => (r.id === updatedRole.id ? { ...r, ...updatedRole } : r))
        );
        this.closeEditRoleModal();
        this.uiService.success(`Role "${updatedRole.name}" updated successfully.`);
      },
      error: (err) => {
        this.isUpdatingRole.set(false);
        this.uiService.error(err.error?.message ?? 'Failed to update role.');
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

  // ─── Global Permissions ───────────────────────────────────────────────────

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

  onCreatePermission() {
    const name = this.newPermName().trim();
    const slug = this.newPermSlug().trim();
    const description = this.newPermDescription().trim();
    if (!name || !slug) return;

    this.isCreatingPerm.set(true);
    this.permCreateError.set('');
    this.permCreateSuccess.set('');

    this.workspaceService.createPermission(name, slug, description || undefined).subscribe({
      next: (perm) => {
        this.isCreatingPerm.set(false);
        this.permCreateSuccess.set(`Permission "${perm.name}" created successfully!`);
        this.newPermName.set('');
        this.newPermSlug.set('');
        this.newPermDescription.set('');
        this.permissions.update((prev) => [...prev, perm]);
      },
      error: (err) => {
        this.isCreatingPerm.set(false);
        this.permCreateError.set(err.error?.message ?? 'Failed to create permission.');
      },
    });
  }

  openEditPermModal(perm: Permission) {
    this.editingPerm.set(perm);
    this.editPermName.set(perm.name);
    this.editPermSlug.set(perm.slug);
    this.editPermDescription.set(perm.description || '');
  }

  closeEditPermModal() {
    this.editingPerm.set(null);
    this.editPermName.set('');
    this.editPermSlug.set('');
    this.editPermDescription.set('');
  }

  onUpdatePermission() {
    const perm = this.editingPerm();
    if (!perm) return;

    const name = this.editPermName().trim();
    const slug = this.editPermSlug().trim();
    const description = this.editPermDescription().trim();
    if (!name || !slug) return;

    this.isUpdatingPerm.set(true);
    this.workspaceService.updatePermission(perm.id, name, slug, description || undefined).subscribe({
      next: (updatedPerm) => {
        this.isUpdatingPerm.set(false);
        this.permissions.update((prev) =>
          prev.map((p) => (p.id === updatedPerm.id ? updatedPerm : p))
        );
        this.closeEditPermModal();
        this.uiService.success(`Permission "${updatedPerm.name}" updated successfully.`);
      },
      error: (err) => {
        this.isUpdatingPerm.set(false);
        this.uiService.error(err.error?.message ?? 'Failed to update permission.');
      },
    });
  }

  async onDeletePermission(perm: Permission) {
    const confirmed = await this.uiService.confirm({
      title: 'Delete System Permission',
      message: `Delete the permission scope "${perm.name}" (${perm.slug})?`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.deletePermission(perm.id).subscribe({
      next: () => {
        this.permissions.update((prev) => prev.filter((p) => p.id !== perm.id));
        this.uiService.success(`Permission "${perm.name}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete permission.');
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

  // ─── Sports Master Data ───────────────────────────────────────────────────

  loadSports() {
    this.isLoadingSports.set(true);
    this.workspaceService.getSports().subscribe({
      next: (sports) => {
        this.sports.set(sports);
        this.isLoadingSports.set(false);
      },
      error: (err) => {
        console.error('Failed to load sports', err);
        this.isLoadingSports.set(false);
      },
    });
  }

  onCreateSport() {
    const name = this.newSportName().trim();
    const code = this.newSportCode().trim();
    const description = this.newSportDescription().trim();
    if (!name || !code) return;

    this.isCreatingSport.set(true);
    this.sportCreateError.set('');
    this.sportCreateSuccess.set('');

    this.workspaceService.createSport(name, code, description || undefined).subscribe({
      next: (sport) => {
        this.isCreatingSport.set(false);
        this.sportCreateSuccess.set(`Sport "${sport.name}" created successfully!`);
        this.newSportName.set('');
        this.newSportCode.set('');
        this.newSportDescription.set('');
        this.sports.update((prev) => [...prev, sport]);
      },
      error: (err) => {
        this.isCreatingSport.set(false);
        this.sportCreateError.set(err.error?.message ?? 'Failed to create sport.');
      },
    });
  }

  openEditSportModal(sport: Sport) {
    this.editingSport.set(sport);
    this.editSportName.set(sport.name);
    this.editSportCode.set(sport.code);
    this.editSportDescription.set(sport.description || '');
  }

  closeEditSportModal() {
    this.editingSport.set(null);
    this.editSportName.set('');
    this.editSportCode.set('');
    this.editSportDescription.set('');
  }

  onUpdateSport() {
    const sport = this.editingSport();
    if (!sport) return;

    const name = this.editSportName().trim();
    const code = this.editSportCode().trim();
    const description = this.editSportDescription().trim();
    if (!name || !code) return;

    this.isUpdatingSport.set(true);
    this.workspaceService.updateSport(sport.id, name, code, description || undefined).subscribe({
      next: (updatedSport) => {
        this.isUpdatingSport.set(false);
        this.sports.update((prev) =>
          prev.map((s) => (s.id === updatedSport.id ? updatedSport : s))
        );
        this.closeEditSportModal();
        this.uiService.success(`Sport "${updatedSport.name}" updated successfully.`);
      },
      error: (err) => {
        this.isUpdatingSport.set(false);
        this.uiService.error(err.error?.message ?? 'Failed to update sport.');
      },
    });
  }

  async onDeleteSport(sport: Sport) {
    const confirmed = await this.uiService.confirm({
      title: 'Delete Sport Master Data',
      message: `Delete the sport "${sport.name}" (${sport.code})? This will fail if competitions use it.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.deleteSport(sport.id).subscribe({
      next: () => {
        this.sports.update((prev) => prev.filter((s) => s.id !== sport.id));
        this.uiService.success(`Sport "${sport.name}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete sport.');
      },
    });
  }

  // ─── Audit Logs, Monitoring & System Config ───────────────────────────────

  loadAuditLogs() {
    this.isLoadingAuditLogs.set(true);
    const cat = this.selectedAuditCategory() || undefined;
    this.workspaceService.getAuditLogs(cat).subscribe({
      next: (logs) => {
        this.auditLogs.set(logs);
        this.isLoadingAuditLogs.set(false);
      },
      error: (err) => {
        console.error('Failed to load audit logs', err);
        this.isLoadingAuditLogs.set(false);
      },
    });
  }

  async onClearAuditLogs() {
    const confirmed = await this.uiService.confirm({
      title: 'Clear Audit Logs',
      message: 'Are you sure you want to clear all recorded audit logs? This action cannot be undone.',
      confirmText: 'Clear Logs',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.clearAuditLogs().subscribe({
      next: () => {
        this.auditLogs.set([]);
        this.uiService.success('Audit logs cleared successfully.');
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to clear audit logs.');
      },
    });
  }

  loadSystemMetrics() {
    this.isLoadingMetrics.set(true);
    this.workspaceService.getSystemMetrics().subscribe({
      next: (metrics) => {
        this.systemMetrics.set(metrics);
        this.isLoadingMetrics.set(false);
      },
      error: (err) => {
        console.error('Failed to load system metrics', err);
        this.isLoadingMetrics.set(false);
      },
    });
  }

  loadSystemConfigs() {
    this.isLoadingConfigs.set(true);
    this.workspaceService.getSystemConfigs().subscribe({
      next: (cfg) => {
        this.systemConfigs.set(cfg);
        this.isLoadingConfigs.set(false);
      },
      error: (err) => {
        console.error('Failed to load system configs', err);
        this.isLoadingConfigs.set(false);
      },
    });
  }

  onToggleConfig(key: string, currentValue: string) {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    this.workspaceService.updateSystemConfig(key, newValue).subscribe({
      next: (updatedMap) => {
        this.systemConfigs.set(updatedMap);
        this.uiService.success(`System setting updated.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to update system config.');
      },
    });
  }

  onUpdateConfigValue(key: string, value: string) {
    this.workspaceService.updateSystemConfig(key, value).subscribe({
      next: (updatedMap) => {
        this.systemConfigs.set(updatedMap);
        this.uiService.success(`System setting updated.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to update system config.');
      },
    });
  }

  roleBadgeClass = roleBadgeClass;
}
