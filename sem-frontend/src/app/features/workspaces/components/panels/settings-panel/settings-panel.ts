import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { WorkspaceSettingsComponent } from '../../../pages/settings/settings';
import type { Workspace } from '../../../services/workspace.service';
import type { WorkspaceTab } from '../../../models/workspace-tab.type';

@Component({
  selector: 'app-workspace-settings-panel',
  standalone: true,
  imports: [WorkspaceSettingsComponent],
  templateUrl: './settings-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSettingsPanelComponent {
  workspace = input.required<Workspace | null>();
  activeTab = input.required<WorkspaceTab>();

  workspaceChange = output<Workspace | null>();
  activeTabChange = output<WorkspaceTab>();
}
