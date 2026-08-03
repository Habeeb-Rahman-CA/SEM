import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  CompetitionStage,
  Match,
  MatchPlayer,
  Player,
  Sport,
  Team,
} from '../../../workspaces/services/workspace.service';
import { FootballConsoleComponent } from '../../../competitions/consoles/football-console/football-console';
import { CricketConsoleComponent } from '../../../competitions/consoles/cricket-console/cricket-console';
import { BadmintonConsoleComponent } from '../../../competitions/consoles/badminton-console/badminton-console';
import { GenericConsoleComponent } from '../../../competitions/consoles/generic-console/generic-console';

@Component({
  selector: 'app-match-console-host',
  standalone: true,
  imports: [
    FootballConsoleComponent,
    CricketConsoleComponent,
    BadmintonConsoleComponent,
    GenericConsoleComponent,
  ],
  templateUrl: './match-console-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchConsoleHostComponent {
  workspaceId = input.required<string>();
  eventId = input.required<string>();
  competitionId = input.required<string>();
  stageId = input.required<string>();
  stage = input<CompetitionStage | null>(null);
  match = input.required<Match>();
  players = input<Player[]>([]);
  teams = input<Team[]>([]);
  matchLineup = input<MatchPlayer[]>([]);
  canScore = input<boolean>(false);
  sport = input<Sport | null | undefined>(null);
  sportCode = input<string | null | undefined>(null);

  matchCompleted = output<void>();
  matchUpdated = output<any>();
  openLineupModal = output<void>();
}
