import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CompetitionStage, Match } from '../../../workspaces/services/workspace.service';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';
import { StageWinnerResult } from '../../models/event.interface';
import { knockoutRoundNames, matchesForRound } from '../../utils/league-table.util';

@Component({
  selector: 'app-knockout-bracket-panel',
  standalone: true,
  imports: [AvatarComponent],
  templateUrl: './knockout-bracket-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnockoutBracketPanelComponent {
  stage = input<CompetitionStage | null>(null);
  matches = input<Match[]>([]);
  winner = input<StageWinnerResult | null>(null);

  rounds = computed(() => knockoutRoundNames(this.matches(), this.stage()));

  matchesFor(round: string): Match[] {
    return matchesForRound(this.matches(), round);
  }
}
