import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FootballConsoleComponent } from '../../../competitions/consoles/football-console/football-console';
import { CricketConsoleComponent } from '../../../competitions/consoles/cricket-console/cricket-console';
import { BadmintonConsoleComponent } from '../../../competitions/consoles/badminton-console/badminton-console';
import { GenericConsoleComponent } from '../../../competitions/consoles/generic-console/generic-console';
import type {
  Workspace,
  WorkspaceEvent,
  Competition,
  CompetitionStage,
  Match,
  Team,
  Player,
  MatchPlayer,
} from '../../services/workspace.service';

@Component({
  selector: 'app-referee-match-console',
  standalone: true,
  imports: [
    FootballConsoleComponent,
    CricketConsoleComponent,
    BadmintonConsoleComponent,
    GenericConsoleComponent,
  ],
  templateUrl: './referee-match-console.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefereeMatchConsoleComponent {
  workspace = input.required<Workspace | null>();
  event = input.required<WorkspaceEvent | null>();
  competition = input.required<Competition | null>();
  stage = input.required<CompetitionStage | null>();
  match = input.required<Match | null>();
  players = input<Player[]>([]);
  teams = input<Team[]>([]);
  matchLineup = input<MatchPlayer[]>([]);
  canScore = input<boolean>(false);

  back = output<void>();
  matchCompleted = output<void>();
  matchUpdated = output<Match>();
  openLineupModal = output<void>();
}
