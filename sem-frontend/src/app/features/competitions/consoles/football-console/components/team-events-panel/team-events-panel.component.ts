import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Player } from '../../../../../workspaces/services/workspace.service';
import {
  FootballCardPayload,
  FootballGoalPayload,
  FootballPenaltyPayload,
  FootballSubstitutionPayload,
} from '../../models/football-console.interface';

@Component({
  selector: 'app-football-team-events-panel',
  standalone: true,
  templateUrl: './team-events-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamEventsPanelComponent {
  teamName = input<string | null | undefined>();
  teamId = input.required<string>();
  players = input<Player[]>([]);
  benchPlayers = input<Player[]>([]);

  recordGoal = output<FootballGoalPayload>();
  recordCard = output<FootballCardPayload>();
  recordPenalty = output<FootballPenaltyPayload>();
  recordSubstitution = output<FootballSubstitutionPayload>();
}
