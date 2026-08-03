import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { WorkspaceOverviewPanelComponent } from '../panels/overview-panel/overview-panel';
import { WorkspaceMembersPanelComponent } from '../panels/members-panel/members-panel';
import { WorkspaceSettingsPanelComponent } from '../panels/settings-panel/settings-panel';
import { WorkspaceReportsPanelComponent } from '../panels/reports-panel/reports-panel';
import { WorkspaceFilesPanelComponent } from '../panels/files-panel/files-panel';
import { WorkspaceTeamsPanelComponent } from '../panels/teams-panel/teams-panel';
import { WorkspacePlayersPanelComponent } from '../panels/players-panel/players-panel';
import { WorkspaceVenuesPanelComponent } from '../panels/venues-panel/venues-panel';
import { WorkspaceEventsPanelComponent } from '../panels/events-panel/events-panel';

import { VolunteersComponent } from '../../../volunteers/pages/volunteers';
import { EquipmentComponent } from '../../../equipment/pages/equipment';
import { MedicalComponent } from '../../../medical/pages/medical';
import { AccreditationComponent } from '../../../accreditation/pages/accreditation';
import { StreamingComponent } from '../../../streaming/pages/streaming';
import { AutomationComponent } from '../../../automation/pages/automation';
import { AuctionsComponent } from '../../../auctions/pages/auctions';
import { TransfersComponent } from '../../../transfers/pages/transfers';
import { RostersComponent } from '../../../rosters/pages/rosters';
import { FinanceComponent } from '../../../finance/pages/finance';
import { GovernanceComponent } from '../../../governance/pages/governance';

import type {
  Workspace,
  WorkspaceMember,
  Role,
  Team,
  Player,
  WorkspaceEvent,
  Competition,
  CompetitionStage,
  Match,
  MatchPlayer,
  AppNotification,
} from '../../services/workspace.service';
import type { Venue } from '../../../venues/services/venue.service';
import type { WorkspaceTab } from '../../models/workspace-tab.type';
import type {
  DashboardMatch,
  DashboardCompetition,
  DashboardScorer,
  DashboardRatedPlayer,
} from '../../models/dashboard.interface';

@Component({
  selector: 'app-workspace-tabs-outlet',
  standalone: true,
  imports: [
    WorkspaceOverviewPanelComponent,
    WorkspaceMembersPanelComponent,
    WorkspaceSettingsPanelComponent,
    WorkspaceReportsPanelComponent,
    WorkspaceFilesPanelComponent,
    WorkspaceTeamsPanelComponent,
    WorkspacePlayersPanelComponent,
    WorkspaceVenuesPanelComponent,
    WorkspaceEventsPanelComponent,
    VolunteersComponent,
    EquipmentComponent,
    MedicalComponent,
    AccreditationComponent,
    StreamingComponent,
    AutomationComponent,
    AuctionsComponent,
    TransfersComponent,
    RostersComponent,
    FinanceComponent,
    GovernanceComponent,
  ],
  templateUrl: './workspace-tabs-outlet.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceTabsOutletComponent {
  activeTab = input.required<WorkspaceTab>();
  workspace = input.required<Workspace | null>();
  workspaceId = input<string>('');

  members = input<WorkspaceMember[]>([]);
  roles = input<Role[]>([]);
  assignableRoles = input<Role[]>([]);
  teams = input<Team[]>([]);
  players = input<Player[]>([]);
  events = input<WorkspaceEvent[]>([]);
  venues = input<Venue[]>([]);
  notifications = input<AppNotification[]>([]);
  matches = input<Match[]>([]);
  matchLineup = input<MatchPlayer[]>([]);

  // Overview
  liveMatches = input<DashboardMatch[]>([]);
  upcomingMatches = input<DashboardMatch[]>([]);
  completedMatches = input<DashboardMatch[]>([]);
  runningCompetitions = input<DashboardCompetition[]>([]);
  topScorers = input<DashboardScorer[]>([]);
  topRatedPlayers = input<DashboardRatedPlayer[]>([]);
  isOverviewLoading = input<boolean>(false);
  selectedOverviewCompId = input<string>('');
  selectedOverviewComp = input<DashboardCompetition | null>(null);

  // Events tab state
  selectedEvent = input<WorkspaceEvent | null>(null);
  competitions = input<Competition[]>([]);
  selectedCompetition = input<Competition | null>(null);
  stages = input<CompetitionStage[]>([]);
  selectedStage = input<CompetitionStage | null>(null);
  selectedMatch = input<Match | null>(null);
  activeCompetitionTab = input<'matches' | 'stats' | 'predictions'>('matches');

  // Selection state (files/teams/players)
  selectedFileId = input<string | null>(null);
  selectedTeamId = input<string | null>(null);
  selectedPlayerId = input<string | null>(null);

  // Permissions
  canManageTeams = input<boolean>(false);
  canManagePlayers = input<boolean>(false);
  canManageVenues = input<boolean>(false);
  canCreateEvent = input<boolean>(false);
  canInviteMember = input<boolean>(false);
  canUpdateMember = input<boolean>(false);
  canRemoveMember = input<boolean>(false);

  // Outputs
  activeTabChange = output<WorkspaceTab>();
  workspaceChange = output<Workspace | null>();
  membersChange = output<WorkspaceMember[]>();

  selectedOverviewCompIdChange = output<string>();
  selectedOverviewCompChange = output<DashboardCompetition | null>();
  enterLiveMatch = output<DashboardMatch>();

  selectedTeamIdChange = output<string | null>();
  selectedPlayerIdChange = output<string | null>();

  addTeam = output<void>();
  editTeam = output<Team>();
  deleteTeam = output<Team>();
  teamsImported = output<Team[]>();

  addPlayer = output<void>();
  editPlayer = output<Player>();
  deletePlayer = output<Player>();
  playersImported = output<Player[]>();

  addVenue = output<void>();
  editVenue = output<Venue>();
  deleteVenue = output<Venue>();

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
