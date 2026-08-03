import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AvatarComponent } from '../../../../../../shared/components/avatar/avatar';
import { Match, Team } from '../../../../../workspaces/services/workspace.service';
import { FootballCardType } from '../../models/football-console.interface';

export interface RefereeGoalIntent {
  teamId: string;
  delta: number;
}

export interface RefereeCardIntent {
  teamId: string;
  cardType: FootballCardType;
}

interface RefereeSide {
  key: 'home' | 'away';
  team?: Team | null;
  teamId: string;
  score: number;
  fallback: string;
  name: string;
}

@Component({
  selector: 'app-football-referee-quick-entry',
  standalone: true,
  imports: [AvatarComponent],
  templateUrl: './referee-quick-entry.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefereeQuickEntryComponent {
  match = input.required<Match>();

  refereeGoal = output<RefereeGoalIntent>();
  refereeCard = output<RefereeCardIntent>();

  readonly sides = computed<RefereeSide[]>(() => {
    const m = this.match();
    return [
      {
        key: 'home',
        team: m.homeTeam,
        teamId: m.homeTeamId ?? '',
        score: m.homeScore,
        fallback: 'HM',
        name: 'Home Team',
      },
      {
        key: 'away',
        team: m.awayTeam,
        teamId: m.awayTeamId ?? '',
        score: m.awayScore,
        fallback: 'AW',
        name: 'Away Team',
      },
    ];
  });
}
