import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WorkspaceReportsComponent } from '../../../../reports/pages/reports';
import type {
  Workspace,
  Team,
  Player,
  WorkspaceEvent,
  WorkspaceMember,
  Role,
} from '../../../services/workspace.service';
import type { Venue } from '../../../../venues/services/venue.service';

@Component({
  selector: 'app-workspace-reports-panel',
  standalone: true,
  imports: [WorkspaceReportsComponent],
  templateUrl: './reports-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceReportsPanelComponent {
  workspace = input.required<Workspace | null>();
  teams = input<Team[]>([]);
  players = input<Player[]>([]);
  events = input<WorkspaceEvent[]>([]);
  venues = input<Venue[]>([]);
  members = input<WorkspaceMember[]>([]);
  roles = input<Role[]>([]);
}
