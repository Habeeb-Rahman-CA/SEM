import { Component, input, model, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Workspace, WorkspaceService } from '../../../services/workspace.service';
import { UiService } from '../../../services/ui.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-workspace-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
})
export class WorkspaceSettingsComponent {
  private workspaceService = inject(WorkspaceService);
  private uiService = inject(UiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  workspace = model.required<Workspace | null>();
  activeTab = model<'overview' | 'members' | 'settings' | 'teams' | 'players' | 'events' | 'venues' | 'reports' | 'files'>();

  // Settings form states
  editName = signal('');
  editDescription = signal('');
  editLogoUrl = signal('');
  isUploadingWorkspaceLogo = signal(false);
  isSavingSettings = signal(false);
  settingsError = signal('');
  settingsSuccess = signal('');

  constructor() {
    effect(() => {
      const ws = this.workspace();
      if (ws) {
        // Only set if user hasn't changed it or it's first load
        this.editName.set(ws.name);
        this.editDescription.set(ws.description ?? '');
        this.editLogoUrl.set(ws.logoUrl ?? '');
      }
    }, { allowSignalWrites: true });
  }

  isOwner(): boolean {
    return this.workspace()?.ownerId === this.authService.currentUser()?.id;
  }

  onWorkspaceLogoUpload(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingWorkspaceLogo.set(true);
    this.workspaceService.uploadImage(file, 'workspace').subscribe({
      next: (res) => {
        this.isUploadingWorkspaceLogo.set(false);
        this.editLogoUrl.set(res.url);
        this.uiService.success('Workspace logo uploaded successfully.');
      },
      error: (err) => {
        this.isUploadingWorkspaceLogo.set(false);
        console.error(err);
        this.uiService.error('Workspace logo upload failed.');
      }
    });
  }

  onSaveSettings() {
    const name = this.editName().trim();
    const description = this.editDescription().trim();
    const ws = this.workspace();
    if (!ws || !name) return;

    this.isSavingSettings.set(true);
    this.settingsError.set('');
    this.settingsSuccess.set('');

    const logoUrl = this.editLogoUrl().trim();

    this.workspaceService.update(ws.id, { name, description, logoUrl: logoUrl || null }).subscribe({
      next: (updatedWs) => {
        this.isSavingSettings.set(false);
        this.workspace.set(updatedWs);
        this.settingsSuccess.set('Workspace settings updated successfully!');
      },
      error: (err) => {
        this.isSavingSettings.set(false);
        this.settingsError.set(err.error?.message ?? 'Failed to update workspace settings.');
      }
    });
  }

  async deleteWorkspace() {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Workspace',
      message: `Are you sure you want to delete "${ws.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;
    this.workspaceService.remove(ws.id).subscribe({
      next: () => {
        this.uiService.success(`Workspace "${ws.name}" deleted successfully.`);
        this.router.navigate(['/workspaces']);
      },
      error: (err) => this.uiService.error(err.error?.message ?? 'Failed to delete workspace.'),
    });
  }
}
