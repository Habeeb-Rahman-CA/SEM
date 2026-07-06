import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkspaceService, Role } from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';

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

  activeSection = signal<string | null>(null);

  roles = signal<Role[]>([]);
  isLoading = signal(false);
  error = signal('');

  // Create Role Form Signals
  newRoleName = signal('');
  newRoleDescription = signal('');
  isCreatingRole = signal(false);
  roleCreateSuccess = signal('');
  roleCreateError = signal('');

  ngOnInit() {
    this.loadGlobalRoles();
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
        this.roles.update((prev) => [...prev, role]);
      },
      error: (err) => {
        this.isCreatingRole.set(false);
        this.roleCreateError.set(err.error?.message ?? 'Failed to create global role.');
      },
    });
  }

  onDeleteRole(role: Role) {
    if (!confirm(`Delete the global role "${role.name}"? This cannot be undone.`)) return;

    this.workspaceService.removeGlobalRole(role.id).subscribe({
      next: () => {
        this.roles.update((prev) => prev.filter((r) => r.id !== role.id));
      },
      error: (err) => {
        alert(err.error?.message ?? 'Failed to delete global role.');
      },
    });
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
      viewer:              'bg-slate-700 text-slate-300 border-slate-600',
    };
    return map[slug] ?? 'bg-slate-700 text-slate-300 border-slate-600';
  }
}
