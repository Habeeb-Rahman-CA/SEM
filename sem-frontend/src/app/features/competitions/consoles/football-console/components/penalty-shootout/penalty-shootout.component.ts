import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Match, Player } from '../../../../../workspaces/services/workspace.service';
import { FootballShootoutPenaltyPayload } from '../../models/football-console.interface';

@Component({
  selector: 'app-football-penalty-shootout',
  standalone: true,
  templateUrl: './penalty-shootout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PenaltyShootoutComponent {
  match = input.required<Match>();
  homePlayers = input<Player[]>([]);
  awayPlayers = input<Player[]>([]);

  recordShootoutPenalty = output<FootballShootoutPenaltyPayload>();
}
