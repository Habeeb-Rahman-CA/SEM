import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { WorkspaceEventsComponent } from '../../../../events/pages/events';
import type {
  Workspace,
  Player,
  Team,
  WorkspaceMember,
  WorkspaceEvent,
  Competition,
  CompetitionStage,
  Match,
  MatchPlayer,
} from '../../../services/workspace.service';
import type { Venue } from '../../../../venues/services/venue.service';

@Component({
  selector: 'app-workspace-events-panel',
  standalone: true,
  imports: [WorkspaceEventsComponent],
  templateUrl: './events-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceEventsPanelComponent {
  workspace = input.required<Workspace | null>();
  players = input<Player[]>([]);
  teams = input<Team[]>([]);
  venues = input<Venue[]>([]);
  members = input<WorkspaceMember[]>([]);
  events = input.required<WorkspaceEvent[]>();
  selectedEvent = input<WorkspaceEvent | null>(null);
  competitions = input<Competition[]>([]);
  selectedCompetition = input<Competition | null>(null);
  stages = input<CompetitionStage[]>([]);
  selectedStage = input<CompetitionStage | null>(null);
  selectedMatch = input<Match | null>(null);
  matches = input<Match[]>([]);
  matchLineup = input<MatchPlayer[]>([]);
  activeCompetitionTab = input<'matches' | 'stats' | 'predictions'>('matches');

  eventsChange = output<WorkspaceEvent[]>();
  selectedEventChange = output<WorkspaceEvent | null>();
  competitionsChange = output<Competition[]>();
  selectedCompetitionChange = output<Competition | null>();
  stagesChange = output<CompetitionStage[]>();
  selectedStageChange = output<CompetitionStage | null>();
  selectedMatchChange = output<Match | null>();
  matchesChange = output<Match[]>();
  matchLineupChange = output<MatchPlayer[]>();
  activeCompetitionTabChange = output<'matches' | 'stats' | 'predictions'>();
}
