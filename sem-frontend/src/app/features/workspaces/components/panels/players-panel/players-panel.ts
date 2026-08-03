import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PlayerListComponent } from '../../../../players/pages/player-list';
import type { Player, Team, WorkspaceMember } from '../../../services/workspace.service';

@Component({
  selector: 'app-workspace-players-panel',
  standalone: true,
  imports: [PlayerListComponent],
  templateUrl: './players-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspacePlayersPanelComponent {
  workspaceId = input<string>('');
  players = input.required<Player[]>();
  members = input<WorkspaceMember[]>([]);
  teams = input<Team[]>([]);
  canUpdate = input<boolean>(false);
  selectedPlayerId = input<string | null>(null);

  selectedPlayerIdChange = output<string | null>();
  add = output<void>();
  edit = output<Player>();
  delete = output<Player>();
  playersImported = output<Player[]>();
}
