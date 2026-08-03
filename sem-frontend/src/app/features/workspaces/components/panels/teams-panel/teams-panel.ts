import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TeamListComponent } from '../../../../teams/pages/team-list';
import type { Team } from '../../../services/workspace.service';

@Component({
  selector: 'app-workspace-teams-panel',
  standalone: true,
  imports: [TeamListComponent],
  templateUrl: './teams-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceTeamsPanelComponent {
  workspaceId = input<string>('');
  teams = input.required<Team[]>();
  canUpdate = input<boolean>(false);
  selectedTeamId = input<string | null>(null);

  selectedTeamIdChange = output<string | null>();
  add = output<void>();
  edit = output<Team>();
  delete = output<Team>();
  teamsImported = output<Team[]>();
}
