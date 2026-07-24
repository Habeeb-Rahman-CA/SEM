import { Component, signal, inject, OnInit, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkspaceService, Workspace } from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar';

@Component({
  selector: 'app-workspaces-management',
  standalone: true,
  imports: [FormsModule, RouterLink, AvatarComponent],
  templateUrl: './workspaces-management.html',
})
export class WorkspacesManagementComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private uiService = inject(UiService);

  workspaces = signal<Workspace[]>([]);
  defaultWorkspaceId = signal<string>('');

  // Create Workspace Signals
  wsName = signal('');
  wsDescription = signal('');
  isCreatingWs = signal(false);
  wsCreateError = signal('');

  // Output to notify parent when workspaces change
  workspacesChanged = output<number>();

  ngOnInit() {
    this.loadWorkspaces();
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
        this.workspacesChanged.emit(wsList.length);
      },
      error: (err) => console.error('Failed to load workspaces', err),
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
}
