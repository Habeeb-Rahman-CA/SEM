import { Component, signal, inject, OnInit } from '@angular/core';
import { WorkspaceService, SystemConfigMap } from '../../services/workspace.service';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-global-preferences',
  standalone: true,
  templateUrl: './global-preferences.html',
})
export class GlobalPreferencesComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  private uiService = inject(UiService);

  systemConfigs = signal<SystemConfigMap | null>(null);
  isLoadingConfigs = signal(false);

  ngOnInit() {
    this.loadSystemConfigs();
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
}
