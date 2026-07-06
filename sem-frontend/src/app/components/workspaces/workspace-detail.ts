import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { WorkspaceService, Workspace, WorkspaceMember } from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-workspace-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './workspace-detail.html',
  styleUrl: './workspace-detail.css',
})
export class WorkspaceDetailComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  workspace = signal<Workspace | null>(null);
  members = signal<WorkspaceMember[]>([]);
  isLoading = signal(true);
  error = signal('');
  activeTab = signal<'overview' | 'members'>('overview');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.workspaceService.getOne(id).subscribe({
      next: (ws) => {
        this.workspace.set(ws);
        this.loadMembers(id);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Workspace not found or access denied.');
        this.isLoading.set(false);
      },
    });
  }

  loadMembers(workspaceId: string) {
    this.workspaceService.getMembers(workspaceId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  deleteWorkspace() {
    const ws = this.workspace();
    if (!ws) return;
    if (!confirm(`Are you sure you want to delete "${ws.name}"? This cannot be undone.`)) return;
    this.workspaceService.remove(ws.id).subscribe({
      next: () => this.router.navigate(['/workspaces']),
      error: (err) => alert(err.error?.message ?? 'Failed to delete workspace.'),
    });
  }

  isOwner(): boolean {
    const userId = this.authService.currentUser()?.id;
    return this.workspace()?.ownerId === userId;
  }

  roleLabel(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  roleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      owner: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      admin: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      member: 'bg-slate-700 text-slate-300 border-slate-600',
    };
    return map[role] ?? map['member'];
  }

  avatarColor(name: string): string {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
      '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }
}
