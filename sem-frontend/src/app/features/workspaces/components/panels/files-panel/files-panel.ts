import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WorkspaceFilesComponent } from '../../../pages/files/files';
import type { Workspace } from '../../../services/workspace.service';

@Component({
  selector: 'app-workspace-files-panel',
  standalone: true,
  imports: [WorkspaceFilesComponent],
  templateUrl: './files-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceFilesPanelComponent {
  workspace = input.required<Workspace | null>();
  selectedFileId = input<string | null>(null);
}
