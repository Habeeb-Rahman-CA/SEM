import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AvatarComponent } from '../../../../../../shared/components/avatar/avatar';
import { Match, Player } from '../../../../../workspaces/services/workspace.service';
import { MatchClockPipe } from '../../../_shared/pipes/match-clock.pipe';
import { ConsoleMode, FootballEvent } from '../../models/football-console.interface';

@Component({
  selector: 'app-football-scoreboard-header',
  standalone: true,
  imports: [AvatarComponent, MatchClockPipe],
  templateUrl: './scoreboard-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreboardHeaderComponent {
  match = input.required<Match>();
  players = input.required<Player[]>();
  elapsedSeconds = input.required<number>();
  consoleMode = input.required<ConsoleMode>();
  hasUnpublishedEvents = input<boolean>(false);
  draftHomeScore = input<number>(0);
  draftAwayScore = input<number>(0);
  periodStatus = input<string>('');

  events = computed<FootballEvent[]>(() => this.match()?.liveData?.events ?? []);

  playerNameFor(
    teamId: string | null | undefined,
    userId: string | undefined,
    fallback: string,
  ): string {
    if (!teamId) return fallback;
    const teamPlayers = this.players().filter((p) => p.teamId === teamId);
    const found = teamPlayers.find((p) => p.userId === userId);
    return found?.user?.username ?? fallback;
  }
}
