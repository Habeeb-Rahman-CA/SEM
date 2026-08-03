import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { WorkspaceDashboardComponent } from '../../../pages/dashboard/dashboard';
import type {
  Workspace,
  Team,
  Player,
  WorkspaceEvent,
  WorkspaceMember,
  AppNotification,
} from '../../../services/workspace.service';
import type { Venue } from '../../../../venues/services/venue.service';
import type { WorkspaceTab } from '../../../models/workspace-tab.type';
import type {
  DashboardMatch,
  DashboardCompetition,
  DashboardScorer,
  DashboardRatedPlayer,
} from '../../../models/dashboard.interface';

@Component({
  selector: 'app-workspace-overview-panel',
  standalone: true,
  imports: [WorkspaceDashboardComponent],
  templateUrl: './overview-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceOverviewPanelComponent {
  workspace = input.required<Workspace | null>();
  activeTab = input.required<WorkspaceTab>();
  liveMatches = input<DashboardMatch[]>([]);
  upcomingMatches = input<DashboardMatch[]>([]);
  completedMatches = input<DashboardMatch[]>([]);
  runningCompetitions = input<DashboardCompetition[]>([]);
  topScorers = input<DashboardScorer[]>([]);
  topRatedPlayers = input<DashboardRatedPlayer[]>([]);
  teams = input<Team[]>([]);
  players = input<Player[]>([]);
  events = input<WorkspaceEvent[]>([]);
  venues = input<Venue[]>([]);
  members = input<WorkspaceMember[]>([]);
  notifications = input<AppNotification[]>([]);
  isOverviewLoading = input<boolean>(false);
  canCreateEvent = input<boolean>(false);
  canManageTeams = input<boolean>(false);
  canManagePlayers = input<boolean>(false);
  canManageVenues = input<boolean>(false);
  selectedOverviewCompId = input<string>('');
  selectedOverviewComp = input<DashboardCompetition | null>(null);

  activeTabChange = output<WorkspaceTab>();
  selectedOverviewCompIdChange = output<string>();
  selectedOverviewCompChange = output<DashboardCompetition | null>();
  enterLiveMatch = output<DashboardMatch>();

  onDashboardActiveTabChange(tab: WorkspaceTab | undefined): void {
    if (tab) this.activeTabChange.emit(tab);
  }
}
