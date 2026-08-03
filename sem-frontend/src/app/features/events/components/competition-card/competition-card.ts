import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Competition } from '../../../workspaces/services/workspace.service';
import { CompetitionStatusBadgePipe } from '../../pipes/competition-status-badge.pipe';
import { competitionWinnerAndRunnerUp } from '../../utils/league-table.util';

@Component({
  selector: 'app-competition-card',
  standalone: true,
  imports: [CompetitionStatusBadgePipe],
  templateUrl: './competition-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionCardComponent {
  competition = input.required<Competition>();
  canManage = input<boolean>(false);

  select = output<Competition>();
  edit = output<Competition>();
  remove = output<Competition>();

  winner = computed(() => competitionWinnerAndRunnerUp(this.competition()));
}
