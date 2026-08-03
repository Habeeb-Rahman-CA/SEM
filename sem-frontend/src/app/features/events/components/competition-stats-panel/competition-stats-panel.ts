import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CompetitionStats } from '../../../workspaces/services/workspace.service';

@Component({
  selector: 'app-competition-stats-panel',
  standalone: true,
  imports: [],
  templateUrl: './competition-stats-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionStatsPanelComponent {
  isLoading = input<boolean>(false);
  stats = input<CompetitionStats | null>(null);
}
