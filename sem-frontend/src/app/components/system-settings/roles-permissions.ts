import { Component, signal, inject, OnInit, output, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkspaceService, Role, Permission } from '../../services/workspace.service';
import { UiService } from '../../services/ui.service';
import { roleBadgeClass } from '../../shared';

@Component({
  selector: 'app-roles-permissions',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './roles-permissions.html',
})
export class RolesPermissionsComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  private uiService = inject(UiService);

  roles = signal<Role[]>([]);
  permissions = signal<Permission[]>([]);
  isLoading = signal(false);

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

  roleBadgeClass = roleBadgeClass;

  // Mode: 'roles' or 'permissions'
  activeSubSection = input<'roles' | 'permissions'>('roles');

  // Outputs to notify parent about counts
  rolesChanged = output<number>();
  permissionsChanged = output<number>();

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
        this.rolesChanged.emit(roles.length);
      },
      error: (err) => {
        console.error('Failed to load global roles', err);
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
        this.rolesChanged.emit(this.roles().length);
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
        this.rolesChanged.emit(this.roles().length);
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
        this.rolesChanged.emit(this.roles().length);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete global role.');
      },
    });
  }

  // Permissions Management

  loadGlobalPermissions() {
    this.workspaceService.getGlobalPermissions().subscribe({
      next: (perms) => {
        this.permissions.set(perms);
        this.permissionsChanged.emit(perms.length);
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
        this.permissionsChanged.emit(this.permissions().length);
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
        this.permissionsChanged.emit(this.permissions().length);
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
        this.permissionsChanged.emit(this.permissions().length);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete permission.');
      },
    });
  }

  // Manage Role Assignment of Permissions

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
}
