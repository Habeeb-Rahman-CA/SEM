import { Component, OnInit, signal, inject, computed, effect, HostListener, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceService, Workspace, WorkspaceMember, AppNotification, Role, Team, Player, WorkspaceEvent, Sport, Competition, CompetitionStage, CompetitionTeam, Match, PointsConfigEntry, MatchPlayer, CompetitionStats } from '../../services/workspace.service';
import { VenueService, Venue } from '../../services/venue.service';
import { AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';
import { SocketService } from '../../services/socket.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VenueListComponent } from './venues/venue-list';
import { VenueModalComponent } from './venues/venue-modal';
import { TeamService } from '../../services/team.service';
import { TeamListComponent } from './teams/team-list';
import { TeamModalComponent } from './teams/team-modal';
import { PlayerService } from '../../services/player.service';
import { PlayerListComponent } from './players/player-list';
import { PlayerModalComponent } from './players/player-modal';
import { EventService } from '../../services/event.service';
import { CompetitionService } from '../../services/competition.service';
import { FootballConsoleComponent } from './consoles/football-console/football-console';
import { CricketConsoleComponent } from './consoles/cricket-console/cricket-console';
import { BadmintonConsoleComponent } from './consoles/badminton-console/badminton-console';
import { AvatarComponent } from '../../shared/components/avatar/avatar';
import { InitialsPipe } from '../../shared/pipes/initials.pipe';
import { SidebarComponent } from './layout/sidebar/sidebar';
import { TopbarComponent } from './layout/topbar/topbar';
import { WorkspaceDashboardComponent } from './dashboard/dashboard';
import { WorkspaceMembersComponent } from './members/members';
import { WorkspaceSettingsComponent } from './settings/settings';
import { WorkspaceReportsComponent } from './reports/reports';

declare const L: any;

@Component({
  selector: 'app-workspace-detail',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    FormsModule,
    VenueListComponent,
    VenueModalComponent,
    TeamListComponent,
    TeamModalComponent,
    PlayerListComponent,
    PlayerModalComponent,
    FootballConsoleComponent,
    CricketConsoleComponent,
    BadmintonConsoleComponent,
    AvatarComponent,
    InitialsPipe,
    SidebarComponent,
    TopbarComponent,
    WorkspaceDashboardComponent,
    WorkspaceMembersComponent,
    WorkspaceSettingsComponent,
    WorkspaceReportsComponent,
  ],
  templateUrl: './workspace-detail.html',
  styleUrl: './workspace-detail.css',
})
export class WorkspaceDetailComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  private venueService = inject(VenueService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private uiService = inject(UiService);
  private socketService = inject(SocketService);
  private destroyRef = inject(DestroyRef);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private eventService = inject(EventService);
  private competitionService = inject(CompetitionService);

  selectedPlayerId = signal<string | null>(null);
  selectedTeamId = signal<string | null>(null);

  constructor() {
    effect(() => {
      // Clear team/player details when main tab changes
      this.activeTab();
      this.selectedTeamId.set(null);
      this.selectedPlayerId.set(null);
    });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const el = document.getElementById('globalSearchInput');
      if (el) {
        el.focus();
        this.showGlobalSearchResults.set(true);
      }
    }
  }

  map: any = null;
  marker: any = null;

  workspace = signal<Workspace | null>(null);
  allWorkspaces = signal<Workspace[]>([]);
  members = signal<WorkspaceMember[]>([]);
  roles = signal<Role[]>([]);
  isLoading = signal(true);
  error = signal('');
  activeTab = signal<'overview' | 'members' | 'settings' | 'teams' | 'players' | 'events' | 'venues' | 'reports'>('overview');
  isSidebarOpen = signal(true);

  // ── Workspace Dashboard Overview Signals ─────────────────────────────────────
  overviewLiveMatches = signal<any[]>([]);
  overviewUpcomingMatches = signal<any[]>([]);
  overviewRunningCompetitions = signal<any[]>([]);
  overviewTopScorers = signal<any[]>([]);
  overviewTopRatedPlayers = signal<any[]>([]);
  selectedOverviewCompId = signal<string>('');
  selectedOverviewComp = signal<any | null>(null);
  isOverviewLoading = signal<boolean>(false);

  // ── Global Search State ──────────────────────────────────────────────────────
  globalSearchQuery = signal<string>('');
  showGlobalSearchResults = signal<boolean>(false);
  allCompetitions = signal<Competition[]>([]);

  // ── Search State & Filtered Computed Listings ────────────────────────────────
  memberSearchQuery = signal<string>('');
  teamSearchQuery = signal<string>('');
  playerSearchQuery = signal<string>('');
  eventSearchQuery = signal<string>('');
  venueSearchQuery = signal<string>('');

  filteredMembers = computed(() => {
    const query = this.memberSearchQuery().toLowerCase().trim();
    const list = this.members();
    if (!query) return list;
    return list.filter(m => 
      m.user.username.toLowerCase().includes(query) ||
      m.role.name.toLowerCase().includes(query)
    );
  });

  filteredTeams = computed(() => {
    const query = this.teamSearchQuery().toLowerCase().trim();
    const list = this.teams();
    if (!query) return list;
    return list.filter(t => 
      t.name.toLowerCase().includes(query) ||
      (t.code && t.code.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query))
    );
  });

  filteredPlayers = computed(() => {
    const query = this.playerSearchQuery().toLowerCase().trim();
    const list = this.players();
    if (!query) return list;
    return list.filter(p => 
      p.user.username.toLowerCase().includes(query) ||
      p.team.name.toLowerCase().includes(query) ||
      (p.jerseyNumber && String(p.jerseyNumber).toLowerCase().includes(query))
    );
  });

  filteredEvents = computed(() => {
    const query = this.eventSearchQuery().toLowerCase().trim();
    const list = this.events();
    if (!query) return list;
    return list.filter(e => 
      e.name.toLowerCase().includes(query) ||
      e.status.toLowerCase().includes(query) ||
      (e.description && e.description.toLowerCase().includes(query))
    );
  });

  filteredVenues = computed(() => {
    const query = this.venueSearchQuery().toLowerCase().trim();
    const list = this.venues();
    if (!query) return list;
    return list.filter(v => 
      v.name.toLowerCase().includes(query) ||
      (v.location && v.location.toLowerCase().includes(query))
    );
  });

  globalSearchResults = computed(() => {
    const query = this.globalSearchQuery().toLowerCase().trim();
    if (!query) {
      return {
        teams: [],
        players: [],
        events: [],
        competitions: [],
        venues: [],
        members: [],
        totalCount: 0
      };
    }

    const matchedTeams = this.teams().filter(t => 
      t.name.toLowerCase().includes(query) || 
      (t.code && t.code.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query))
    );

    const matchedPlayers = this.players().filter(p => 
      p.user.username.toLowerCase().includes(query) ||
      p.team.name.toLowerCase().includes(query) ||
      (p.jerseyNumber && String(p.jerseyNumber).toLowerCase().includes(query))
    );

    const matchedEvents = this.events().filter(e => 
      e.name.toLowerCase().includes(query) || 
      e.status.toLowerCase().includes(query) ||
      (e.description && e.description.toLowerCase().includes(query))
    );

    const matchedCompetitions = this.allCompetitions().filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.status.toLowerCase().includes(query) ||
      (c.sport?.name && c.sport.name.toLowerCase().includes(query))
    );

    const matchedVenues = this.venues().filter(v => 
      v.name.toLowerCase().includes(query) ||
      (v.location && v.location.toLowerCase().includes(query))
    );

    const matchedMembers = this.members().filter(m => 
      m.user.username.toLowerCase().includes(query) ||
      m.role.name.toLowerCase().includes(query)
    );

    const totalCount = matchedTeams.length + matchedPlayers.length + matchedEvents.length + matchedCompetitions.length + matchedVenues.length + matchedMembers.length;

    return {
      teams: matchedTeams,
      players: matchedPlayers,
      events: matchedEvents,
      competitions: matchedCompetitions,
      venues: matchedVenues,
      members: matchedMembers,
      totalCount
    };
  });

  selectGlobalTeam(team: Team) {
    this.activeTab.set('teams');
    this.selectedTeamId.set(team.id);
    this.clearGlobalSearch();
  }

  selectGlobalPlayer(player: Player) {
    this.activeTab.set('players');
    this.selectedPlayerId.set(player.id);
    this.clearGlobalSearch();
  }

  selectGlobalEvent(event: WorkspaceEvent) {
    this.activeTab.set('events');
    this.onSelectEvent(event);
    this.clearGlobalSearch();
  }

  selectGlobalCompetition(comp: Competition) {
    this.activeTab.set('events');
    const parentEvent = this.events().find(e => e.id === comp.eventId);
    if (parentEvent) {
      this.onSelectEvent(parentEvent);
      this.onSelectCompetition(comp);
    }
    this.clearGlobalSearch();
  }

  selectGlobalVenue(venue: Venue) {
    this.activeTab.set('venues');
    this.clearGlobalSearch();
  }

  selectGlobalMember(member: WorkspaceMember) {
    this.activeTab.set('members');
    this.clearGlobalSearch();
  }

  clearGlobalSearch() {
    this.globalSearchQuery.set('');
    this.showGlobalSearchResults.set(false);
  }

  // Invitation & Notification signals
  pendingInvitations = signal<WorkspaceMember[]>([]);
  notifications = signal<AppNotification[]>([]);
  isNotificationOpen = signal(false);
  isProcessingInvitation = signal(false);

  unreadNotificationsCount = computed(() => this.notifications().filter(n => !n.isRead).length);
  totalBadgeCount = computed(() => this.pendingInvitations().length + this.unreadNotificationsCount());
  enableExtraTime = signal(false);
  enablePenaltyShootout = signal(false);
  extraTimeHalfDuration = signal(15);

  // Image Upload Loading States
  isUploadingAvatar = signal(false);
  isUploadingWorkspaceLogo = signal(false);

  isUploadingEventLogo = signal(false);

  // ── Teams State ────────────────────────────────────────────────────────────
  teams = signal<Team[]>([]);
  isTeamModalOpen = signal(false);
  editingTeam = signal<Team | null>(null);

  // ── Players State ──────────────────────────────────────────────────────────
  players = signal<Player[]>([]);
  isPlayerModalOpen = signal(false);
  editingPlayer = signal<Player | null>(null);


  // ── Events State ────────────────────────────────────────────────────────────
  events = signal<WorkspaceEvent[]>([]);
  newEventName = signal('');
  newEventDescription = signal('');
  newEventStartDate = signal('');
  newEventEndDate = signal('');
  newEventStatus = signal('upcoming');
  newEventLogoUrl = signal('');
  selectedEventTeamIds = signal<string[]>([]);
  isCreatingEvent = signal(false);
  eventCreateError = signal('');
  eventCreateSuccess = signal('');
  isEventModalOpen = signal(false);

  // Editing state for Events
  editingEvent = signal<WorkspaceEvent | null>(null);
  editEventName = signal('');
  editEventDescription = signal('');
  editEventStartDate = signal('');
  editEventEndDate = signal('');
  editEventStatus = signal('upcoming');
  editEventLogoUrl = signal('');
  isUpdatingEvent = signal(false);
  eventUpdateError = signal('');
  eventUpdateSuccess = signal('');

  // ── Competitions State ───────────────────────────────────────────────────────
  sports = signal<Sport[]>([]);
  selectedEvent = signal<WorkspaceEvent | null>(null);
  eventStandings = signal<any[]>([]);
  competitions = signal<Competition[]>([]);
  isLoadingCompetitions = signal(false);
  isCompetitionModalOpen = signal(false);
  
  newCompetitionName = signal('');
  newCompetitionSportId = signal('');
  newCompetitionStatus = signal('upcoming');
  newCompetitionPointsConfig = signal<PointsConfigEntry[]>([]);
  isCreatingCompetition = signal(false);
  competitionCreateError = signal('');
  competitionCreateSuccess = signal('');

  editingCompetition = signal<Competition | null>(null);
  editCompetitionName = signal('');
  editCompetitionSportId = signal('');
  editCompetitionStatus = signal('upcoming');
  editCompetitionPointsConfig = signal<PointsConfigEntry[]>([]);
  isUpdatingCompetition = signal(false);
  competitionUpdateError = signal('');
  competitionUpdateSuccess = signal('');

  // ── Stages State ───────────────────────────────────────────────────────────
  selectedCompetition = signal<Competition | null>(null);
  stages = signal<CompetitionStage[]>([]);
  isLoadingStages = signal(false);
  activeCompetitionTab = signal<'matches' | 'stats'>('matches');
  competitionStats = signal<CompetitionStats | null>(null);
  isLoadingStats = signal(false);

  newStageName = signal('');
  newStageType = signal<'league' | 'group' | 'knockout' | 'group_knockout'>('league');
  newStageWinPoint = signal<number>(3);
  newStageDrawPoint = signal<number>(1);
  newStageTwoLegged = signal<boolean>(false);
  newStageGroupsCount = signal<number>(2);
  newStageAdvancingCount = signal<number>(2);
  newStageGamesPerTeam = signal<number>(3);
  newStageLegs = signal<number>(1);
  newStageGroupKnockoutSubtype = signal<'single_group' | 'multiple_groups'>('multiple_groups');
  newStageAdvancingType = signal<'winner' | 'winner_and_runner'>('winner_and_runner');
  newStageSingleGroupAdvancing = signal<number>(2);
  newStageVenueId = signal<string>('');

  isCreatingStage = signal(false);
  stageCreateError = signal('');
  stageCreateSuccess = signal('');

  editingStage = signal<CompetitionStage | null>(null);
  editStageName = signal('');
  editStageType = signal<'league' | 'group' | 'knockout' | 'group_knockout'>('league');
  editStageWinPoint = signal<number>(3);
  editStageDrawPoint = signal<number>(1);
  editStageTwoLegged = signal<boolean>(false);
  editStageGroupsCount = signal<number>(2);
  editStageAdvancingCount = signal<number>(2);
  editStageGamesPerTeam = signal<number>(3);
  editStageLegs = signal<number>(1);
  editStageGroupKnockoutSubtype = signal<'single_group' | 'multiple_groups'>('multiple_groups');
  editStageAdvancingType = signal<'winner' | 'winner_and_runner'>('winner_and_runner');
  editStageSingleGroupAdvancing = signal<number>(2);

  isUpdatingStage = signal(false);
  stageUpdateError = signal('');
  stageUpdateSuccess = signal('');

  // ── Matches State ──────────────────────────────────────────────────────────
  selectedStage = signal<CompetitionStage | null>(null);
  matches = signal<Match[]>([]);
  selectedMatch = signal<Match | null>(null);
  selectedPointsTableGroup = signal<string>('Group A');
  matchLineup = signal<MatchPlayer[]>([]);
  isLineupModalOpen = signal(false);
  lineupForm = signal<{ playerId: string; isPlaying: boolean; isGoalkeeper: boolean; teamId: string; player: Player }[]>([]);



  isStageCompleted = computed(() => {
    const stage = this.selectedStage();
    if (!stage) return false;
    const matchesList = this.matches();
    if (matchesList.length === 0) return false;

    if (stage.type === 'league') {
      return matchesList.every(m => m.status === 'completed');
    }
    if (stage.type === 'group' || stage.type === 'group_knockout') {
      const currentGroup = this.selectedPointsTableGroup();
      const isMultipleGroups = stage.type === 'group_knockout' && stage.config?.groupKnockoutSubtype === 'multiple_groups';
      
      const targetMatches = isMultipleGroups
        ? matchesList.filter(m => m.config?.round === currentGroup)
        : matchesList.filter(m => !m.config?.round || m.config.round.toLowerCase().includes('group') || m.config.round.toLowerCase().includes('stage'));

      if (targetMatches.length === 0) return false;
      return targetMatches.every(m => m.status === 'completed');
    }
    if (stage.type === 'knockout') {
      return matchesList.every(m => m.status === 'completed');
    }
    return false;
  });

  availableGroups = computed(() => {
    const stage = this.selectedStage();
    if (!stage) return [];
    if (stage.type === 'group_knockout' && stage.config?.groupKnockoutSubtype === 'multiple_groups') {
      const groupsCount = stage.config?.groupsCount ?? 2;
      return Array.from({ length: groupsCount }, (_, i) => `Group ${String.fromCharCode(65 + i)}`);
    }
    return [];
  });

  leagueTable = computed(() => {
    const stage = this.selectedStage();
    if (!stage) return [];
    if (stage.type !== 'league' && stage.type !== 'group' && stage.type !== 'group_knockout') {
      return [];
    }

    const matchesList = this.matches();
    const enrolledTeams = this.competitionTeams();
    const currentGroup = this.selectedPointsTableGroup();
    const isMultipleGroups = stage.type === 'group_knockout' && stage.config?.groupKnockoutSubtype === 'multiple_groups';

    // Find teams in current group if multiple groups
    const groupTeamIds = new Set<string>();
    if (isMultipleGroups) {
      for (const m of matchesList) {
        if (m.config?.round === currentGroup) {
          if (m.homeTeamId) groupTeamIds.add(m.homeTeamId);
          if (m.awayTeamId) groupTeamIds.add(m.awayTeamId);
        }
      }
    }
    
    // Initialize map of team stats
    const statsMap = new Map<string, {
      teamId: string;
      teamName: string;
      teamLogoUrl?: string | null;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      gf: number;
      ga: number;
      gd: number;
      pts: number;
    }>();

    // Initialize with enrolled teams
    for (const ct of enrolledTeams) {
      if (isMultipleGroups && !groupTeamIds.has(ct.teamId)) {
        continue;
      }
      statsMap.set(ct.teamId, {
        teamId: ct.teamId,
        teamName: ct.team.name,
        teamLogoUrl: ct.team.logoUrl,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
      });
    }

    const winPts = stage.config?.winPoint ?? 3;
    const drawPts = stage.config?.drawPoint ?? 1;

    // Process completed matches (and matches with score)
    for (const match of matchesList) {
      // Only process group play matches (ignore bracket matches if any)
      const isGroupMatch = !match.config?.round || match.config.round.toLowerCase().includes('group') || match.config.round.toLowerCase().includes('stage');
      if (stage.type === 'group_knockout' && !isGroupMatch) {
        continue;
      }

      // If multiple groups, only process matches belonging to the selected group
      if (isMultipleGroups && match.config?.round !== currentGroup) {
        continue;
      }

      if (match.status !== 'completed') continue;
      if (!match.homeTeamId || !match.awayTeamId) continue;

      const home = statsMap.get(match.homeTeamId);
      const away = statsMap.get(match.awayTeamId);

      // If either team is not in statsMap (e.g. deleted or external), initialize
      if (!home && match.homeTeam) {
        statsMap.set(match.homeTeamId, {
          teamId: match.homeTeamId, teamName: match.homeTeam.name, teamLogoUrl: match.homeTeam.logoUrl, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0
        });
      }
      if (!away && match.awayTeam) {
        statsMap.set(match.awayTeamId, {
          teamId: match.awayTeamId, teamName: match.awayTeam.name, teamLogoUrl: match.awayTeam.logoUrl, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0
        });
      }

      const hStats = statsMap.get(match.homeTeamId);
      const aStats = statsMap.get(match.awayTeamId);
      if (!hStats || !aStats) continue;

      hStats.played++;
      aStats.played++;

      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;

      hStats.gf += homeScore;
      hStats.ga += awayScore;
      aStats.gf += awayScore;
      aStats.ga += homeScore;

      if (homeScore > awayScore) {
        hStats.won++;
        hStats.pts += winPts;
        aStats.lost++;
      } else if (homeScore < awayScore) {
        aStats.won++;
        aStats.pts += winPts;
        hStats.lost++;
      } else {
        hStats.drawn++;
        hStats.pts += drawPts;
        aStats.drawn++;
        aStats.pts += drawPts;
      }

      hStats.gd = hStats.gf - hStats.ga;
      aStats.gd = aStats.gf - aStats.ga;
    }

    // Convert map to array and sort
    return Array.from(statsMap.values()).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  });

  getKnockoutRounds(): string[] {
    const list = this.matches();
    const stage = this.selectedStage();
    if (!stage) return [];
    
    // Extract unique round names from matches that are not group stage matches
    const roundsSet = new Set<string>();
    for (const m of list) {
      const round = m.config?.round;
      if (round) {
        // If stage is group_knockout, exclude group stage matches
        const isGroup = round.toLowerCase().includes('group') || round.toLowerCase().includes('stage');
        if (stage.type === 'group_knockout' && isGroup) {
          continue;
        }
        roundsSet.add(round);
      }
    }
    
    // Sort rounds so that they display from earliest to latest: Round of X -> Quarter-Final -> Semi-Final -> Final -> Third Place Match
    const roundOrder = ['round of 32', 'round of 16', 'round of 8', 'quarter-final', 'semi-final', 'final', 'third place match', '3rd place match'];
    return Array.from(roundsSet).sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const idxA = roundOrder.findIndex(o => aLower.includes(o));
      const idxB = roundOrder.findIndex(o => bLower.includes(o));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }

  getMatchesForRound(roundName: string): Match[] {
    // Only return leg 1 matches or first occurrence to keep brackets clean and compact
    return this.matches().filter(m => m.config?.round === roundName && (m.config?.leg === undefined || m.config?.leg === 1));
  }

  isCreatingMatch = signal(false);

  newMatchHomeTeamId = signal('');
  newMatchAwayTeamId = signal('');
  newMatchTimerDuration = signal<number>(90);
  newMatchOvers = signal<number>(20);
  newMatchSetsToWin = signal<number>(2);

  matchCreateError = signal('');
  matchCreateSuccess = signal('');



  // ── Competition Teams State ──────────────────────────────────────────────────
  competitionTeams = signal<CompetitionTeam[]>([]);
  isLoadingCompetitionTeams = signal(false);
  addTeamId = signal('');
  isAddingTeam = signal(false);
  addTeamError = signal('');
  addTeamSuccess = signal('');

  // ── Venues State ───────────────────────────────────────────────────────────
  venues = signal<Venue[]>([]);
  isVenueModalOpen = signal(false);
  editingVenue = signal<Venue | null>(null);

  newMatchVenueId = signal('');

  // ── Fixture Generator State ─────────────────────────────────────────────────
  isGeneratingFixtures = signal(false);
  generateFixturesError = signal('');
  generateFixturesSuccess = signal('');

  // Combined Stage & Team Setup Modal
  isGenerateFixturesModalOpen = signal(false);
  selectedFixtureTeamIds = signal<string[]>([]);
  isGeneratingFixturesSubmit = signal(false);
  generateFixturesSubmitError = signal('');
  isResettingStages = signal(false);

  isUserDropdownOpen = signal(false);

  // ── Member Invite State ────────────────────────────────────────────────────
  inviteUsername = signal('');
  inviteRole = signal<string>('viewer');
  isInviting = signal(false);
  inviteError = signal('');
  inviteSuccess = signal('');

  // ── Role Create State ──────────────────────────────────────────────────────
  newRoleName = signal('');
  newRoleDescription = signal('');
  isCreatingRole = signal(false);
  roleCreateError = signal('');
  roleCreateSuccess = signal('');

  // ── Assignable roles for invite/member dropdown (non-owner) ───────────────
  get assignableRoles(): Role[] {
    return this.roles().filter(r => r.slug !== 'owner');
  }

  closeSidebarOnMobile() {
    if (window.innerWidth < 1024) {
      this.isSidebarOpen.set(false);
    }
  }

  ngOnInit() {
    this.loadInvitationsAndNotifications();
    this.loadAllWorkspaces();

    this.socketService.notification$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => {
        this.notifications.update((prev) => [notification, ...prev]);
        this.uiService.info(notification.message);
      });

    this.socketService.matchUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updatedMatch) => {
        // 1. Update in the matches list signal
        this.matches.update((prev) =>
          prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m))
        );

        // 2. Update in overviewLiveMatches
        this.overviewLiveMatches.update((prev) =>
          prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m))
        );

        // 3. Update in overviewUpcomingMatches
        this.overviewUpcomingMatches.update((prev) =>
          prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m))
        );

        // 4. Update selectedMatch if currently viewing this match in live console
        if (this.selectedMatch()?.id === updatedMatch.id) {
          this.selectedMatch.set(updatedMatch);
        }
      });

    this.destroyRef.onDestroy(() => {
      if (this.currentSubscribedWorkspaceId) {
        this.socketService.unsubscribeWorkspace(this.currentSubscribedWorkspaceId);
      }
      if (this.currentSubscribedMatchId) {
        this.socketService.unsubscribeMatch(this.currentSubscribedMatchId);
      }
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadWorkspaceDetails(id);
      }
    });

    this.route.queryParams.subscribe((params) => {
      if (params['matchId'] || params['eventId']) {
        this.handleDeepLink(params);
      }
    });
  }

  loadAllWorkspaces() {
    this.workspaceService.getAll().subscribe({
      next: (data) => this.allWorkspaces.set(data),
      error: (err) => console.error('Failed to load all workspaces', err),
    });
  }

  onSwitchWorkspace(wsId: string) {
    if (wsId && wsId !== this.workspace()?.id) {
      this.router.navigate(['/workspaces', wsId]);
    }
  }

  private currentSubscribedWorkspaceId: string | null = null;

  loadWorkspaceDetails(id: string) {
    this.isLoading.set(true);
    this.error.set('');

    if (this.currentSubscribedWorkspaceId) {
      this.socketService.unsubscribeWorkspace(this.currentSubscribedWorkspaceId);
      this.currentSubscribedWorkspaceId = null;
    }
    this.socketService.subscribeWorkspace(id);
    this.currentSubscribedWorkspaceId = id;

    this.workspaceService.getOne(id).subscribe({
      next: (ws) => {
        this.workspace.set(ws);
        this.loadMembers(id);
        this.loadRoles(id);
        this.loadTeams(id);
        this.loadPlayers(id);
        this.loadEvents(id);
        this.loadSports();
        this.loadVenues(id);
        this.loadWorkspaceDashboard(id);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Workspace not found or access denied.');
        this.isLoading.set(false);
      },
    });
  }

  loadWorkspaceDashboard(workspaceId: string) {
    this.isOverviewLoading.set(true);
    this.workspaceService.getDashboardOverview().subscribe({
      next: (data) => {
        const live = (data.liveMatches || []).filter((m: any) =>
          m.workspaceId === workspaceId ||
          m.stage?.competition?.event?.workspaceId === workspaceId
        );
        this.overviewLiveMatches.set(live);

        const upcoming = (data.upcomingMatches || []).filter((m: any) =>
          m.workspaceId === workspaceId ||
          m.stage?.competition?.event?.workspaceId === workspaceId
        );
        this.overviewUpcomingMatches.set(upcoming);

        const runningComps = (data.runningCompetitions || []).filter((c: any) =>
          c.event?.workspaceId === workspaceId || c.workspaceId === workspaceId
        );
        this.overviewRunningCompetitions.set(runningComps);
        if (runningComps.length > 0) {
          this.selectedOverviewCompId.set(runningComps[0].id);
          this.selectedOverviewComp.set(runningComps[0]);
        }

        this.overviewTopScorers.set(data.topScorers || []);
        this.overviewTopRatedPlayers.set(data.topRatedPlayers || []);
        this.isOverviewLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load workspace overview', err);
        this.isOverviewLoading.set(false);
      }
    });
  }

  onSelectOverviewCompetition(comp: any) {
    this.selectedOverviewCompId.set(comp.id);
    this.selectedOverviewComp.set(comp);
  }

  onEnterLiveMatchFromOverview(match: any) {
    const eventId = match.stage?.competition?.eventId || match.eventId;
    const competitionId = match.stage?.competitionId || match.competitionId;
    const stageId = match.stageId;
    const matchId = match.id;

    if (eventId) {
      this.handleDeepLink({ eventId, competitionId, stageId, matchId });
    }
  }

  getSportBadgeClass(sportCode?: string): string {
    switch (sportCode?.toLowerCase()) {
      case 'football': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'cricket': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'badminton': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default: return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    }
  }

  getSportIconClass(sportCode?: string): string {
    switch (sportCode?.toLowerCase()) {
      case 'football': return 'fi fi-rr-football';
      case 'cricket': return 'fi fi-rr-bowling';
      case 'badminton': return 'fi fi-rr-trophy';
      default: return 'fi fi-rr-trophy';
    }
  }

  openEventModal() {
    this.activeTab.set('events');
  }

  openTeamModal() {
    this.activeTab.set('teams');
  }

  openPlayerModal() {
    this.activeTab.set('players');
  }

  openVenueModal() {
    this.activeTab.set('venues');
  }

  formatMatchStatusDetail(match: any): string {
    if (match.status !== 'live') return 'Scheduled';
    const sport = match.stage?.competition?.sport?.code || 'football';
    const live = match.liveData || {};

    if (sport === 'football') {
      const half = live.currentHalf === 1 ? '1st Half' : live.currentHalf === 2 ? '2nd Half' : live.currentHalf === 3 ? 'ET 1' : live.currentHalf === 4 ? 'ET 2' : 'Live';
      const mins = Math.floor((live.elapsedSeconds || 0) / 60);
      return `${half} ${mins}'`;
    }
    if (sport === 'cricket') {
      const overs = live.currentOvers || '0.0';
      const wkt = live.wickets || 0;
      return `Overs: ${overs} (${wkt} wkts)`;
    }
    if (sport === 'badminton') {
      return live.matchStatus || 'Game in Progress';
    }
    return 'LIVE';
  }

  handleDeepLink(params: any) {
    const { eventId, competitionId, stageId, matchId } = params;
    const ws = this.workspace();
    if (!ws || !eventId) return;

    this.activeTab.set('events');
    this.eventService.getEvents(ws.id).subscribe({
      next: (events) => {
        this.events.set(events);
        const ev = events.find((e) => e.id === eventId);
        if (!ev) return;
        this.selectedEvent.set(ev);

        if (!competitionId) return;
        this.competitionService.getCompetitions(ws.id, eventId).subscribe({
          next: (comps) => {
            this.competitions.set(comps);
            const comp = comps.find((c) => c.id === competitionId);
            if (!comp) return;
            this.selectedCompetition.set(comp);
            this.activeCompetitionTab.set('matches');

            this.competitionService.getStages(ws.id, eventId, competitionId).subscribe({
              next: (stages) => {
                this.stages.set(stages);
                const stage = (stageId ? stages.find((s) => s.id === stageId) : null) || stages[0];
                if (!stage) return;
                this.selectedStage.set(stage);

                if (!matchId) return;
                this.competitionService.getMatches(ws.id, eventId, competitionId, stage.id).subscribe({
                  next: (matches) => {
                    this.matches.set(matches);
                    const m = matches.find((match) => match.id === matchId);
                    if (m) {
                      this.onSelectMatch(m);
                    }
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  loadMembers(workspaceId: string) {
    this.workspaceService.getMembers(workspaceId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  loadRoles(workspaceId: string) {
    this.workspaceService.getRoles(workspaceId).subscribe({
      next: (roles) => this.roles.set(roles),
      error: (err) => console.error('Failed to load roles', err),
    });
  }

  isOwner(): boolean {
    return this.workspace()?.ownerId === this.authService.currentUser()?.id;
  }

  getCurrentUserRoleSlug(): string {
    const userId = this.authService.currentUser()?.id;
    return this.members().find(m => m.userId === userId)?.role?.slug ?? 'viewer';
  }

  canManageMembers(): boolean {
    const slug = this.getCurrentUserRoleSlug();
    return slug === 'owner' || slug === 'administrator';
  }

  hasPermission(permission: string): boolean {
    const userId = this.authService.currentUser()?.id;
    const member = this.members().find(m => m.userId === userId);
    if (!member || !member.role) return false;
    if (member.role.slug === 'owner') return true;
    return member.role.permissions?.some(p => p.slug === permission) ?? false;
  }

  onSignOut(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isCopied = signal(false);

  getInviteLink(): string {
    return `${window.location.origin}/workspaces/join?id=${this.workspace()?.id}`;
  }

  getQrCodeUrl(): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=222831&bgcolor=EEEEEE&data=${encodeURIComponent(this.getInviteLink())}`;
  }

  copyInviteLink() {
    navigator.clipboard.writeText(this.getInviteLink());
    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), 2000);
  }

  // ── Role Helpers ────────────────────────────────────────────────────────────

  roleBadgeClass(slug: string): string {
    const map: Record<string, string> = {
      owner:               'bg-violet-500/20 text-violet-300 border-violet-500/30',
      administrator:       'bg-blue-500/20 text-blue-300 border-blue-500/30',
      event_manager:       'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      competition_manager: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      referee:             'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      statistician:        'bg-orange-500/20 text-orange-300 border-orange-500/30',
      media_team:          'bg-pink-500/20 text-pink-300 border-pink-500/30',
      viewer:              'bg-slate-500/20 text-slate-300 border-slate-500/30',
    };
    return map[slug] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }

  memberCountForRole(roleId: string): number {
    return this.members().filter(m => m.role?.id === roleId).length;
  }

  // ── Invite Member ──────────────────────────────────────────────────────────

  onInvite() {
    const username = this.inviteUsername().trim();
    const roleSlug = this.inviteRole();
    const ws = this.workspace();
    if (!ws || !username) return;

    this.isInviting.set(true);
    this.inviteError.set('');
    this.inviteSuccess.set('');

    this.workspaceService.inviteMember(ws.id, username, roleSlug).subscribe({
      next: (newMember) => {
        this.isInviting.set(false);
        this.inviteSuccess.set(`${username} has been invited successfully!`);
        this.inviteUsername.set('');
      },
      error: (err) => {
        this.isInviting.set(false);
        this.inviteError.set(err.error?.message ?? 'Failed to invite user.');
      }
    });
  }

  // ── Update Member Role ─────────────────────────────────────────────────────

  onUpdateRole(member: WorkspaceMember, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newRoleSlug = select.value;
    const ws = this.workspace();
    if (!ws) return;

    this.workspaceService.updateMemberRole(ws.id, member.userId, newRoleSlug).subscribe({
      next: (updated) => {
        this.members.update(prev => prev.map(m => m.id === member.id ? { ...m, role: updated.role } : m));
        this.uiService.success(`Role for ${member.user.username} updated to ${updated.role.name}.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to update member role.');
        select.value = member.role?.slug ?? '';
      }
    });
  }

  // ── Remove Member ──────────────────────────────────────────────────────────

  async onRemoveMember(member: WorkspaceMember) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Remove Member',
      message: `Remove "${member.user.username}" from this workspace?`,
      confirmText: 'Remove',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.removeMember(ws.id, member.userId).subscribe({
      next: () => {
        this.members.update(prev => prev.filter(m => m.userId !== member.userId));
        this.uiService.success(`Removed "${member.user.username}" from workspace.`);
      },
      error: (err) => this.uiService.error(err.error?.message ?? 'Failed to remove member.'),
    });
  }

  // ── Create Custom Role ─────────────────────────────────────────────────────

  onCreateRole() {
    const name = this.newRoleName().trim();
    const description = this.newRoleDescription().trim();
    const ws = this.workspace();
    if (!ws || !name) return;

    this.isCreatingRole.set(true);
    this.roleCreateError.set('');
    this.roleCreateSuccess.set('');

    this.workspaceService.createRole(ws.id, name, description || undefined).subscribe({
      next: (role) => {
        this.isCreatingRole.set(false);
        this.roleCreateSuccess.set(`Role "${role.name}" created!`);
        this.newRoleName.set('');
        this.newRoleDescription.set('');
        this.roles.update(prev => [...prev, role]);
      },
      error: (err) => {
        this.isCreatingRole.set(false);
        this.roleCreateError.set(err.error?.message ?? 'Failed to create role.');
      }
    });
  }

  // ── Delete Custom Role ─────────────────────────────────────────────────────

  async onDeleteRole(role: Role) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Custom Role',
      message: `Delete the role "${role.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.removeRole(ws.id, role.id).subscribe({
      next: () => {
        this.roles.update(prev => prev.filter(r => r.id !== role.id));
        this.uiService.success(`Role "${role.name}" deleted successfully.`);
      },
      error: (err) => this.uiService.error(err.error?.message ?? 'Failed to delete role.'),
    });
  }

  // ── Venues CRUD ────────────────────────────────────────────────────────────

  loadVenues(workspaceId: string) {
    this.venueService.getVenues(workspaceId).subscribe({
      next: (venues) => this.venues.set(venues),
      error: (err) => console.error('Failed to load venues', err),
    });
  }

  onAddVenue() {
    this.editingVenue.set(null);
    this.isVenueModalOpen.set(true);
  }

  onEditVenue(venue: Venue) {
    this.editingVenue.set(venue);
    this.isVenueModalOpen.set(true);
  }

  closeVenueModal() {
    this.isVenueModalOpen.set(false);
    this.editingVenue.set(null);
  }

  onVenueSaved(savedVenue: Venue) {
    const isEdit = this.venues().some(v => v.id === savedVenue.id);
    if (isEdit) {
      this.venues.update(prev => prev.map(v => v.id === savedVenue.id ? savedVenue : v));
      this.matches.update(prevMatches => prevMatches.map(m => m.venueId === savedVenue.id ? { ...m, venue: savedVenue } : m));
    } else {
      this.venues.update(prev => [...prev, savedVenue]);
    }
  }

  async onDeleteVenue(venue: Venue) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Venue',
      message: `Delete venue "${venue.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.venueService.removeVenue(ws.id, venue.id).subscribe({
      next: () => {
        this.venues.update(prev => prev.filter(v => v.id !== venue.id));
        this.matches.update(prevMatches => prevMatches.map(m => m.venueId === venue.id ? { ...m, venueId: null, venue: null } : m));
        this.uiService.success(`Venue "${venue.name}" deleted successfully.`);
      },
      error: (err) => this.uiService.error(err.error?.message ?? 'Failed to delete venue.'),
    });
  }

  // ── Teams CRUD ─────────────────────────────────────────────────────────────

  loadTeams(workspaceId: string) {
    this.teamService.getTeams(workspaceId).subscribe({
      next: (teams) => this.teams.set(teams),
      error: (err) => console.error('Failed to load teams', err),
    });
  }

  onAddTeam() {
    this.editingTeam.set(null);
    this.isTeamModalOpen.set(true);
  }

  onEditTeam(team: Team) {
    this.editingTeam.set(team);
    this.isTeamModalOpen.set(true);
  }

  closeTeamModal() {
    this.isTeamModalOpen.set(false);
    this.editingTeam.set(null);
  }

  onTeamSaved(savedTeam: Team) {
    const isEdit = this.teams().some(t => t.id === savedTeam.id);
    if (isEdit) {
      this.teams.update(prev => prev.map(t => t.id === savedTeam.id ? savedTeam : t));
      this.matches.update(prevMatches => prevMatches.map(m => {
        let updated = { ...m };
        if (m.homeTeamId === savedTeam.id) {
          updated.homeTeam = savedTeam;
        }
        if (m.awayTeamId === savedTeam.id) {
          updated.awayTeam = savedTeam;
        }
        return updated;
      }));
    } else {
      this.teams.update(prev => [...prev, savedTeam]);
    }
  }

  onTeamsImported(importedList: Team[]) {
    this.teams.update(prev => [...prev, ...importedList]);
  }

  async onDeleteTeam(team: Team) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Team',
      message: `Delete team "${team.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.teamService.removeTeam(ws.id, team.id).subscribe({
      next: () => {
        this.teams.update(prev => prev.filter(t => t.id !== team.id));
        this.matches.update(prevMatches => prevMatches.map(m => {
          let updated = { ...m };
          if (m.homeTeamId === team.id) {
            updated.homeTeamId = null;
            updated.homeTeam = null;
          }
          if (m.awayTeamId === team.id) {
            updated.awayTeamId = null;
            updated.awayTeam = null;
          }
          return updated;
        }));
        this.uiService.success(`Team "${team.name}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete team.');
      }
    });
  }

  // ── Players CRUD ───────────────────────────────────────────────────────────

  loadPlayers(workspaceId: string) {
    this.playerService.getPlayers(workspaceId).subscribe({
      next: (players) => this.players.set(players),
      error: (err) => console.error('Failed to load players', err),
    });
  }

  onAddPlayer() {
    this.editingPlayer.set(null);
    this.isPlayerModalOpen.set(true);
  }

  onEditPlayer(player: Player) {
    this.editingPlayer.set(player);
    this.isPlayerModalOpen.set(true);
  }

  closePlayerModal() {
    this.isPlayerModalOpen.set(false);
    this.editingPlayer.set(null);
  }

  onPlayerSaved(player: Player) {
    const exists = this.players().some(p => p.id === player.id);
    if (exists) {
      this.players.update(prev => prev.map(p => p.id === player.id ? player : p));
    } else {
      this.players.update(prev => [...prev, player]);
    }
  }

  onPlayersImported(importedList: Player[]) {
    if (importedList && importedList.length > 0) {
      this.players.update(prev => {
        const list = [...prev];
        importedList.forEach(p => {
          if (!list.some(x => x.id === p.id)) {
            list.push(p);
          }
        });
        return list;
      });
    }
  }




  async onDeletePlayer(player: Player) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Player',
      message: `Delete player "${player.user.username}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.playerService.removePlayer(ws.id, player.id).subscribe({
      next: () => {
        this.players.update(prev => prev.filter(p => p.id !== player.id));
        this.uiService.success(`Player "${player.user.username}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete player.');
      }
    });
  }

  // ── Events CRUD ────────────────────────────────────────────────────────────

  loadEvents(workspaceId: string) {
    this.eventService.getEvents(workspaceId).subscribe({
      next: (events) => {
        this.events.set(events);
        this.loadAllCompetitions(workspaceId, events);
      },
      error: (err) => console.error('Failed to load events', err),
    });
  }

  loadAllCompetitions(workspaceId: string, events: WorkspaceEvent[]) {
    this.allCompetitions.set([]);
    for (const event of events) {
      this.competitionService.getCompetitions(workspaceId, event.id).subscribe({
        next: (comps) => {
          this.allCompetitions.update(prev => {
            const ids = new Set(prev.map(c => c.id));
            const newComps = comps.filter(c => !ids.has(c.id));
            return [...prev, ...newComps];
          });
        },
        error: (err) => console.error(`Failed to load competitions for event ${event.id}`, err),
      });
    }
  }

  showDatePicker(event: any) {
    if (event.target && typeof event.target.showPicker === 'function') {
      try {
        event.target.showPicker();
      } catch (e) {
        console.warn('showPicker is not supported or blocked:', e);
      }
    }
  }

  private formatToLocalDatetime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().substring(0, 16);
  }

  toggleEventTeam(teamId: string) {
    this.selectedEventTeamIds.update(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  }

  onAddEvent() {
    this.editingEvent.set(null);
    this.newEventName.set('');
    this.newEventDescription.set('');
    this.newEventStartDate.set('');
    this.newEventEndDate.set('');
    this.newEventStatus.set('upcoming');
    this.newEventLogoUrl.set('');
    this.selectedEventTeamIds.set([]);
    this.eventCreateError.set('');
    this.eventCreateSuccess.set('');
    this.isEventModalOpen.set(true);
  }

  closeEventModal() {
    this.isEventModalOpen.set(false);
    this.editingEvent.set(null);
    this.newEventName.set('');
    this.newEventDescription.set('');
    this.newEventStartDate.set('');
    this.newEventEndDate.set('');
    this.newEventStatus.set('upcoming');
    this.newEventLogoUrl.set('');
    this.selectedEventTeamIds.set([]);
    this.eventCreateError.set('');
    this.eventCreateSuccess.set('');
    this.editEventName.set('');
    this.editEventDescription.set('');
    this.editEventStartDate.set('');
    this.editEventEndDate.set('');
    this.editEventStatus.set('upcoming');
    this.editEventLogoUrl.set('');
    this.eventUpdateError.set('');
    this.eventUpdateSuccess.set('');
  }

  onCreateEvent() {
    const name = this.newEventName().trim();
    const description = this.newEventDescription().trim();
    const startDate = this.newEventStartDate();
    const endDate = this.newEventEndDate();
    const status = this.newEventStatus();
    const ws = this.workspace();
    if (!ws || !name) return;

    this.isCreatingEvent.set(true);
    this.eventCreateError.set('');
    this.eventCreateSuccess.set('');

    const payload = {
      name,
      description: description || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      status,
      logoUrl: this.newEventLogoUrl() || undefined,
      teamIds: this.selectedEventTeamIds(),
    };

    this.eventService.createEvent(ws.id, payload).subscribe({
      next: (event) => {
        this.isCreatingEvent.set(false);
        this.eventCreateSuccess.set(`Event "${event.name}" created successfully!`);
        this.events.update(prev => [...prev, event]);
        setTimeout(() => this.closeEventModal(), 1500);
      },
      error: (err) => {
        this.isCreatingEvent.set(false);
        this.eventCreateError.set(err.error?.message ?? 'Failed to create event.');
      }
    });
  }

  onEditEvent(event: WorkspaceEvent) {
    this.editingEvent.set(event);
    this.editEventName.set(event.name);
    this.editEventDescription.set(event.description ?? '');
    this.editEventStartDate.set(this.formatToLocalDatetime(event.startDate));
    this.editEventEndDate.set(this.formatToLocalDatetime(event.endDate));
    this.editEventStatus.set(event.status);
    this.editEventLogoUrl.set(event.logoUrl ?? '');
    this.selectedEventTeamIds.set(event.teams?.map(t => t.id) || []);
    this.eventUpdateError.set('');
    this.eventUpdateSuccess.set('');
    this.isEventModalOpen.set(true);
  }

  onCancelEditEvent() {
    this.closeEventModal();
  }

  onUpdateEvent() {
    const name = this.editEventName().trim();
    const description = this.editEventDescription().trim();
    const startDate = this.editEventStartDate();
    const endDate = this.editEventEndDate();
    const status = this.editEventStatus();
    const ws = this.workspace();
    const event = this.editingEvent();
    if (!ws || !event || !name) return;

    this.isUpdatingEvent.set(true);
    this.eventUpdateError.set('');
    this.eventUpdateSuccess.set('');

    const payload = {
      name,
      description: description || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      status,
      logoUrl: this.editEventLogoUrl() || undefined,
      teamIds: this.selectedEventTeamIds(),
    };

    this.eventService.updateEvent(ws.id, event.id, payload).subscribe({
      next: (updated) => {
        this.isUpdatingEvent.set(false);
        this.eventUpdateSuccess.set(`Event updated successfully!`);
        this.events.update(prev => prev.map(e => e.id === event.id ? updated : e));
        
        // Also update selectedEvent if it's currently viewed
        const curEvent = this.selectedEvent();
        if (curEvent && curEvent.id === event.id) {
          this.selectedEvent.set(updated);
        }

        setTimeout(() => this.closeEventModal(), 1500);
      },
      error: (err) => {
        this.isUpdatingEvent.set(false);
        this.eventUpdateError.set(err.error?.message ?? 'Failed to update event.');
      }
    });
  }

  async onDeleteEvent(event: WorkspaceEvent) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Event',
      message: `Delete event "${event.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.eventService.removeEvent(ws.id, event.id).subscribe({
      next: () => {
        this.events.update(prev => prev.filter(e => e.id !== event.id));
        this.uiService.success(`Event "${event.name}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete event.');
      }
    });
  }

  // ── Competitions CRUD ───────────────────────────────────────────────────────

  loadSports() {
    this.workspaceService.getSports().subscribe({
      next: (sports) => this.sports.set(sports),
      error: (err) => console.error('Failed to load sports', err),
    });
  }

  onSelectEvent(event: WorkspaceEvent) {
    this.selectedEvent.set(event);
    this.editingCompetition.set(null);
    this.competitionCreateError.set('');
    this.competitionCreateSuccess.set('');
    this.loadCompetitions(event.id);
    this.loadEventStandings(event.id);
  }

  onDeselectEvent() {
    this.selectedEvent.set(null);
    this.competitions.set([]);
    this.eventStandings.set([]);
  }

  loadCompetitions(eventId: string) {
    const ws = this.workspace();
    if (!ws) return;
    this.isLoadingCompetitions.set(true);
    this.competitionService.getCompetitions(ws.id, eventId).subscribe({
      next: (comps) => {
        this.competitions.set(comps);
        this.isLoadingCompetitions.set(false);
      },
      error: (err) => {
        console.error('Failed to load competitions', err);
        this.isLoadingCompetitions.set(false);
      }
    });
  }

  loadEventStandings(eventId: string) {
    const ws = this.workspace();
    if (!ws) return;
    this.eventService.getEventStandings(ws.id, eventId).subscribe({
      next: (data) => {
        this.eventStandings.set(data);
      },
      error: (err) => {
        console.error('Failed to load event standings', err);
      }
    });
  }

  onAddCompetition() {
    this.editingCompetition.set(null);
    this.newCompetitionName.set('');
    this.newCompetitionSportId.set('');
    this.newCompetitionStatus.set('upcoming');
    this.newCompetitionPointsConfig.set([]);
    this.competitionCreateError.set('');
    this.competitionCreateSuccess.set('');
    this.isCompetitionModalOpen.set(true);
  }

  closeCompetitionModal() {
    this.isCompetitionModalOpen.set(false);
    this.editingCompetition.set(null);
    this.newCompetitionName.set('');
    this.newCompetitionSportId.set('');
    this.newCompetitionStatus.set('upcoming');
    this.newCompetitionPointsConfig.set([]);
    this.competitionCreateError.set('');
    this.competitionCreateSuccess.set('');
    this.editCompetitionName.set('');
    this.editCompetitionSportId.set('');
    this.editCompetitionStatus.set('upcoming');
    this.editCompetitionPointsConfig.set([]);
    this.competitionUpdateError.set('');
    this.competitionUpdateSuccess.set('');
  }

  addPointsRow(isEdit: boolean) {
    const cfg = isEdit ? this.editCompetitionPointsConfig : this.newCompetitionPointsConfig;
    const current = cfg();
    const nextPosition = current.length > 0 ? Math.max(...current.map(r => r.position)) + 1 : 1;
    const defaultLabels: Record<number, string> = { 1: 'Winner', 2: 'Runner-up', 3: '3rd Place', 4: '4th Place' };
    cfg.set([...current, { position: nextPosition, label: defaultLabels[nextPosition] ?? `${nextPosition}th Place`, points: 0 }]);
  }

  removePointsRow(index: number, isEdit: boolean) {
    const cfg = isEdit ? this.editCompetitionPointsConfig : this.newCompetitionPointsConfig;
    cfg.update(rows => rows.filter((_, i) => i !== index));
  }

  updatePointsRow(index: number, field: keyof PointsConfigEntry, value: any, isEdit: boolean) {
    const cfg = isEdit ? this.editCompetitionPointsConfig : this.newCompetitionPointsConfig;
    cfg.update(rows => rows.map((r, i) => i === index ? { ...r, [field]: field === 'points' || field === 'position' ? Number(value) : value } : r));
  }

  onCreateCompetition() {
    const name = this.newCompetitionName().trim();
    const sportId = this.newCompetitionSportId();
    const status = this.newCompetitionStatus();
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!ws || !event || !name || !sportId) return;

    this.isCreatingCompetition.set(true);
    this.competitionCreateError.set('');
    this.competitionCreateSuccess.set('');

    const pointsConfig = this.newCompetitionPointsConfig();
    const payload = {
      name,
      sportId,
      status,
      pointsConfig: pointsConfig.length > 0 ? pointsConfig : null,
    };

    this.competitionService.createCompetition(ws.id, event.id, payload).subscribe({
      next: (comp) => {
        this.isCreatingCompetition.set(false);
        this.competitionCreateSuccess.set(`Competition "${comp.name}" created successfully!`);
        this.competitions.update(prev => [...prev, comp]);
        this.allCompetitions.update(prev => [...prev, comp]);
        setTimeout(() => this.closeCompetitionModal(), 1500);
      },
      error: (err) => {
        this.isCreatingCompetition.set(false);
        this.competitionCreateError.set(err.error?.message ?? 'Failed to create competition.');
      }
    });
  }

  onEditCompetition(comp: Competition) {
    this.editingCompetition.set(comp);
    this.editCompetitionName.set(comp.name);
    this.editCompetitionSportId.set(comp.sportId);
    this.editCompetitionStatus.set(comp.status);
    this.editCompetitionPointsConfig.set(comp.pointsConfig ? [...comp.pointsConfig] : []);
    this.competitionUpdateError.set('');
    this.competitionUpdateSuccess.set('');
    this.isCompetitionModalOpen.set(true);
  }

  onCancelEditCompetition() {
    this.closeCompetitionModal();
  }

  onUpdateCompetition() {
    const name = this.editCompetitionName().trim();
    const sportId = this.editCompetitionSportId();
    const status = this.editCompetitionStatus();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.editingCompetition();
    if (!ws || !event || !comp || !name || !sportId) return;

    this.isUpdatingCompetition.set(true);
    this.competitionUpdateError.set('');
    this.competitionUpdateSuccess.set('');

    const pointsConfig = this.editCompetitionPointsConfig();
    const payload = {
      name,
      sportId,
      status,
      pointsConfig: pointsConfig.length > 0 ? pointsConfig : null,
    };

    this.competitionService.updateCompetition(ws.id, event.id, comp.id, payload).subscribe({
      next: (updated) => {
        this.isUpdatingCompetition.set(false);
        this.competitionUpdateSuccess.set(`Competition updated successfully!`);
        this.competitions.update(prev => prev.map(c => c.id === comp.id ? updated : c));
        this.allCompetitions.update(prev => prev.map(c => c.id === comp.id ? updated : c));
        setTimeout(() => this.closeCompetitionModal(), 1500);
      },
      error: (err) => {
        this.isUpdatingCompetition.set(false);
        this.competitionUpdateError.set(err.error?.message ?? 'Failed to update competition.');
      }
    });
  }

  async onDeleteCompetition(comp: Competition) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!ws || !event) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Competition',
      message: `Delete competition "${comp.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.competitionService.removeCompetition(ws.id, event.id, comp.id).subscribe({
      next: () => {
        this.competitions.update(prev => prev.filter(c => c.id !== comp.id));
        this.allCompetitions.update(prev => prev.filter(c => c.id !== comp.id));
        this.uiService.success(`Competition "${comp.name}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete competition.');
      }
    });
  }

  getCompetitionWinnerAndRunnerUp(comp: Competition): { winner?: string; runnerUp?: string } | null {
    if (!comp.stages || comp.stages.length === 0) return null;

    // Sort stages by sequence asc to find the last stage
    const sortedStages = [...comp.stages].sort((a, b) => a.sequence - b.sequence);
    const lastStage = sortedStages[sortedStages.length - 1];

    if (!lastStage.matches || lastStage.matches.length === 0) return null;

    // Check if all matches in the last stage are completed
    const allMatchesCompleted = lastStage.matches.every((m: any) => m.status === 'completed');
    if (!allMatchesCompleted) return null;

    if (lastStage.type === 'knockout' || lastStage.type === 'group_knockout') {
      // Find the final match: round is 'Final'
      const finalMatch = lastStage.matches.find((m: any) => m.config?.round === 'Final');
      if (finalMatch && finalMatch.status === 'completed') {
        const homeScore = finalMatch.homeScore ?? 0;
        const awayScore = finalMatch.awayScore ?? 0;
        if (homeScore > awayScore) {
          return {
            winner: finalMatch.homeTeam?.name || 'Home Team',
            runnerUp: finalMatch.awayTeam?.name || 'Away Team',
          };
        } else if (awayScore > homeScore) {
          return {
            winner: finalMatch.awayTeam?.name || 'Away Team',
            runnerUp: finalMatch.homeTeam?.name || 'Home Team',
          };
        }
      }
    } else if (lastStage.type === 'league' || lastStage.type === 'group') {
      const winPts = lastStage.config?.winPoint ?? 3;
      const drawPts = lastStage.config?.drawPoint ?? 1;

      const statsMap = new Map<string, { teamName: string; pts: number; gd: number; gf: number; ga: number }>();

      for (const m of lastStage.matches) {
        if (!m.homeTeamId || !m.awayTeamId) continue;
        if (m.status !== 'completed') continue;

        if (!statsMap.has(m.homeTeamId) && m.homeTeam) {
          statsMap.set(m.homeTeamId, { teamName: m.homeTeam.name, pts: 0, gd: 0, gf: 0, ga: 0 });
        }
        if (!statsMap.has(m.awayTeamId) && m.awayTeam) {
          statsMap.set(m.awayTeamId, { teamName: m.awayTeam.name, pts: 0, gd: 0, gf: 0, ga: 0 });
        }

        const h = statsMap.get(m.homeTeamId);
        const a = statsMap.get(m.awayTeamId);
        if (!h || !a) continue;

        const homeScore = m.homeScore ?? 0;
        const awayScore = m.awayScore ?? 0;

        h.gf += homeScore;
        h.ga += awayScore;
        a.gf += awayScore;
        a.ga += homeScore;

        if (homeScore > awayScore) {
          h.pts += winPts;
        } else if (awayScore > homeScore) {
          a.pts += winPts;
        } else {
          h.pts += drawPts;
          a.pts += drawPts;
        }
        h.gd = h.gf - h.ga;
        a.gd = a.gf - a.ga;
      }

      const table = Array.from(statsMap.values()).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      });

      if (table.length > 0) {
        return {
          winner: table[0].teamName,
          runnerUp: table[1]?.teamName,
        };
      }
    }

    return null;
  }

  getStageWinnerAndRunnerUp(): { winner?: string; runnerUp?: string } | null {
    const stage = this.selectedStage();
    if (!stage) return null;
    const matchesList = this.matches();
    if (matchesList.length === 0) return null;

    const allCompleted = matchesList.every(m => m.status === 'completed');
    if (!allCompleted) return null;

    if (stage.type === 'knockout' || stage.type === 'group_knockout') {
      const finalMatch = matchesList.find(m => m.config?.round === 'Final');
      if (finalMatch && finalMatch.status === 'completed') {
        const homeScore = finalMatch.homeScore ?? 0;
        const awayScore = finalMatch.awayScore ?? 0;
        if (homeScore > awayScore) {
          return {
            winner: finalMatch.homeTeam?.name || 'Home Team',
            runnerUp: finalMatch.awayTeam?.name || 'Away Team',
          };
        } else if (awayScore > homeScore) {
          return {
            winner: finalMatch.awayTeam?.name || 'Away Team',
            runnerUp: finalMatch.homeTeam?.name || 'Home Team',
          };
        }
      }
    } else if (stage.type === 'league' || stage.type === 'group') {
      const table = this.leagueTable();
      if (table && table.length > 0) {
        return {
          winner: table[0].teamName,
          runnerUp: table[1]?.teamName,
        };
      }
    }
    return null;
  }

  // ── Stage Actions ─────────────────────────────────────────────────────────

  onSelectCompetition(comp: Competition) {
    this.selectedCompetition.set(comp);
    this.activeCompetitionTab.set('matches');
    this.competitionStats.set(null);
    this.editingStage.set(null);
    this.stageCreateError.set('');
    this.stageCreateSuccess.set('');
    this.addTeamError.set('');
    this.addTeamSuccess.set('');
    this.addTeamId.set('');
    this.selectedStage.set(null);
    this.selectedMatch.set(null);
    this.matches.set([]);
    this.competitionTeams.set([]);
    this.loadStages(comp.id);
    this.loadCompetitionTeams(comp.id);
  }

  onDeselectCompetition() {
    this.selectedCompetition.set(null);
    this.activeCompetitionTab.set('matches');
    this.competitionStats.set(null);
    this.stages.set([]);
    this.selectedStage.set(null);
    this.selectedMatch.set(null);
    this.matches.set([]);
    this.competitionTeams.set([]);
  }

  setCompetitionTab(tab: 'matches' | 'stats') {
    this.activeCompetitionTab.set(tab);
    if (tab === 'stats') {
      this.loadCompetitionStats();
    }
  }

  loadCompetitionStats() {
    const comp = this.selectedCompetition();
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!comp || !ws || !event) return;

    this.isLoadingStats.set(true);
    this.competitionService.getCompetitionStats(ws.id, event.id, comp.id).subscribe({
      next: (stats) => {
        this.competitionStats.set(stats);
        this.isLoadingStats.set(false);
      },
      error: (err) => {
        this.isLoadingStats.set(false);
        this.uiService.error('Failed to load competition statistics.');
      }
    });
  }

  loadStages(competitionId: string) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!ws || !event) return;
    this.isLoadingStages.set(true);
    this.competitionService.getStages(ws.id, event.id, competitionId).subscribe({
      next: (stages) => {
        this.stages.set(stages);
        this.isLoadingStages.set(false);
        if (stages.length > 0) {
          this.onSelectStage(stages[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load stages', err);
        this.isLoadingStages.set(false);
      }
    });
  }

  loadCompetitionTeams(competitionId: string) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!ws || !event) return;
    this.isLoadingCompetitionTeams.set(true);
    this.competitionService.getCompetitionTeams(ws.id, event.id, competitionId).subscribe({
      next: (ct) => {
        this.competitionTeams.set(ct);
        this.isLoadingCompetitionTeams.set(false);
      },
      error: (err) => {
        console.error('Failed to load competition teams', err);
        this.isLoadingCompetitionTeams.set(false);
      }
    });
  }

  onAddTeamToCompetition() {
    const teamId = this.addTeamId();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp || !teamId) return;
    this.isAddingTeam.set(true);
    this.addTeamError.set('');
    this.addTeamSuccess.set('');
    this.competitionService.addTeamToCompetition(ws.id, event.id, comp.id, teamId).subscribe({
      next: (entry) => {
        this.isAddingTeam.set(false);
        this.competitionTeams.update(prev => [...prev, entry]);
        this.addTeamId.set('');
        this.addTeamSuccess.set('Team enrolled in competition!');
        setTimeout(() => this.addTeamSuccess.set(''), 3000);
      },
      error: (err) => {
        this.isAddingTeam.set(false);
        this.addTeamError.set(err.error?.message ?? 'Failed to add team.');
      }
    });
  }

  async onRemoveTeamFromCompetition(entry: CompetitionTeam) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;
    const confirmed = await this.uiService.confirm({
      title: 'Remove Team',
      message: `Remove "${entry.team.name}" from this competition?`,
      confirmText: 'Remove',
      type: 'danger',
    });
    if (!confirmed) return;
    this.competitionService.removeTeamFromCompetition(ws.id, event.id, comp.id, entry.teamId).subscribe({
      next: () => {
        this.competitionTeams.update(prev => prev.filter(t => t.id !== entry.id));
        this.uiService.success(`Removed "${entry.team.name}" from competition.`);
      },
      error: (err) => this.uiService.error(err.error?.message ?? 'Failed to remove team.')
    });
  }

  async onGenerateFixtures() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;

    const stagesCount = this.stages().length;
    const teamsCount = this.competitionTeams().length;

    if (stagesCount === 0) {
      this.generateFixturesError.set('Configure at least one stage before generating fixtures.');
      return;
    }
    if (teamsCount < 2) {
      this.generateFixturesError.set('Enroll at least 2 teams before generating fixtures.');
      return;
    }

    const hasExistingMatches = this.stages().length > 0;
    if (hasExistingMatches) {
      const confirmed = await this.uiService.confirm({
        title: 'Regenerate Fixtures',
        message: 'This will DELETE any existing matches and regenerate all fixtures randomly. Continue?',
        confirmText: 'Regenerate',
        type: 'warning',
      });
      if (!confirmed) return;
    }

    this.isGeneratingFixtures.set(true);
    this.generateFixturesError.set('');
    this.generateFixturesSuccess.set('');

    this.competitionService.generateFixtures(ws.id, event.id, comp.id).subscribe({
      next: (result) => {
        this.isGeneratingFixtures.set(false);
        this.generateFixturesSuccess.set(
          `Generated ${result.matchesCreated} fixtures across ${result.stagesGenerated} stage(s)!`
        );
        this.uiService.success(`Fixtures generated successfully!`);
        // Reload stages so match counts update
        this.loadStages(comp.id);
        setTimeout(() => this.generateFixturesSuccess.set(''), 5000);
      },
      error: (err) => {
        this.isGeneratingFixtures.set(false);
        this.generateFixturesError.set(err.error?.message ?? 'Failed to generate fixtures.');
        this.uiService.error(err.error?.message ?? 'Failed to generate fixtures.');
      }
    });
  }

  onCreateStage() {
    const name = this.newStageName().trim();
    const type = this.newStageType();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp || !name) return;

    this.isCreatingStage.set(true);
    this.stageCreateError.set('');
    this.stageCreateSuccess.set('');

    const config: any = {};
    if (type === 'group') {
      config.winPoint = this.newStageWinPoint();
      config.drawPoint = this.newStageDrawPoint();
      config.gamesPerTeam = this.newStageGamesPerTeam();
    } else if (type === 'knockout') {
      config.twoLegged = this.newStageTwoLegged();
    } else if (type === 'group_knockout') {
      config.groupsCount = this.newStageGroupsCount();
      config.advancingCount = this.newStageAdvancingCount();
      config.winPoint = this.newStageWinPoint();
      config.drawPoint = this.newStageDrawPoint();
      config.twoLegged = this.newStageTwoLegged();
      config.gamesPerTeam = this.newStageGamesPerTeam();
    }

    const payload = {
      name,
      type,
      config,
    };

    this.competitionService.createStage(ws.id, event.id, comp.id, payload).subscribe({
      next: (stage) => {
        this.isCreatingStage.set(false);
        this.stageCreateSuccess.set(`Stage "${stage.name}" created successfully!`);
        this.newStageName.set('');
        this.newStageType.set('group');
        this.newStageWinPoint.set(3);
        this.newStageDrawPoint.set(1);
        this.newStageTwoLegged.set(false);
        this.newStageGroupsCount.set(2);
        this.newStageAdvancingCount.set(2);
        this.newStageGamesPerTeam.set(3);
        this.stages.update(prev => [...prev, stage]);
      },
      error: (err) => {
        this.isCreatingStage.set(false);
        this.stageCreateError.set(err.error?.message ?? 'Failed to create stage.');
      }
    });
  }

  onEditStage(stage: CompetitionStage) {
    this.editingStage.set(stage);
    this.editStageName.set(stage.name);
    this.editStageType.set(stage.type);
    
    // Prefill config values based on type
    const config = stage.config || {};
    this.editStageWinPoint.set(config.winPoint ?? 3);
    this.editStageDrawPoint.set(config.drawPoint ?? 1);
    this.editStageTwoLegged.set(config.twoLegged ?? false);
    this.editStageGroupsCount.set(config.groupsCount ?? 2);
    this.editStageAdvancingCount.set(config.advancingCount ?? 2);
    this.editStageGamesPerTeam.set(config.gamesPerTeam ?? 3);

    this.stageUpdateError.set('');
    this.stageUpdateSuccess.set('');
  }

  onCancelEditStage() {
    this.editingStage.set(null);
  }

  onUpdateStage() {
    const name = this.editStageName().trim();
    const type = this.editStageType();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.editingStage();
    if (!ws || !event || !comp || !stage || !name) return;

    this.isUpdatingStage.set(true);
    this.stageUpdateError.set('');
    this.stageUpdateSuccess.set('');

    const config: any = {};
    if (type === 'group') {
      config.winPoint = this.editStageWinPoint();
      config.drawPoint = this.editStageDrawPoint();
      config.gamesPerTeam = this.editStageGamesPerTeam();
    } else if (type === 'knockout') {
      config.twoLegged = this.editStageTwoLegged();
    } else if (type === 'group_knockout') {
      config.groupsCount = this.editStageGroupsCount();
      config.advancingCount = this.editStageAdvancingCount();
      config.winPoint = this.editStageWinPoint();
      config.drawPoint = this.editStageDrawPoint();
      config.twoLegged = this.editStageTwoLegged();
      config.gamesPerTeam = this.editStageGamesPerTeam();
    }

    const payload = {
      name,
      type,
      config,
    };

    this.competitionService.updateStage(ws.id, event.id, comp.id, stage.id, payload).subscribe({
      next: (updated) => {
        this.isUpdatingStage.set(false);
        this.stageUpdateSuccess.set(`Stage updated successfully!`);
        this.stages.update(prev => prev.map(s => s.id === stage.id ? updated : s));
        setTimeout(() => this.editingStage.set(null), 1000);
      },
      error: (err) => {
        this.isUpdatingStage.set(false);
        this.stageUpdateError.set(err.error?.message ?? 'Failed to update stage.');
      }
    });
  }

  async onDeleteStage(stage: CompetitionStage) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Stage',
      message: `Delete stage "${stage.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.competitionService.removeStage(ws.id, event.id, comp.id, stage.id).subscribe({
      next: () => {
        this.stages.update(prev => prev.filter(s => s.id !== stage.id));
        this.uiService.success(`Stage "${stage.name}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete stage.');
      }
    });
  }

  // ─── Matches Operations ────────────────────────────────────────────────────

  onSelectStage(stage: CompetitionStage | null) {
    this.selectedStage.set(stage);
    this.selectedPointsTableGroup.set('Group A');
    this.selectedMatch.set(null);
    if (!stage) {
      this.matches.set([]);
      return;
    }

    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;

    this.competitionService.getMatches(ws.id, event.id, comp.id, stage.id).subscribe({
      next: (data) => {
        this.matches.set(data);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to load matches.');
      }
    });
  }

  onCreateMatch() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!ws || !event || !comp || !stage) return;

    const homeId = this.newMatchHomeTeamId();
    const awayId = this.newMatchAwayTeamId();
    if (!homeId || !awayId) {
      this.matchCreateError.set('Please select both teams.');
      return;
    }
    if (homeId === awayId) {
      this.matchCreateError.set('Home and Away teams must be different.');
      return;
    }

    const sportCode = comp.sport?.code ?? 'football';
    const config: any = {};
    if (sportCode === 'football') {
      config.timerDuration = this.newMatchTimerDuration();
    } else if (sportCode === 'cricket') {
      config.overs = this.newMatchOvers();
    } else if (sportCode === 'badminton') {
      config.setsToWin = this.newMatchSetsToWin();
    }

    this.matchCreateError.set('');
    this.matchCreateSuccess.set('');

    this.competitionService.createMatch(ws.id, event.id, comp.id, stage.id, {
      homeTeamId: homeId,
      awayTeamId: awayId,
      venueId: this.newMatchVenueId() || null,
      config,
    }).subscribe({
      next: (created) => {
        this.matches.update(prev => [...prev, created]);
        this.matchCreateSuccess.set('Match scheduled successfully!');
        this.uiService.success('Match scheduled successfully!');
        this.newMatchHomeTeamId.set('');
        this.newMatchAwayTeamId.set('');
        this.newMatchVenueId.set('');
        setTimeout(() => {
          this.isCreatingMatch.set(false);
          this.matchCreateSuccess.set('');
        }, 1000);
      },
      error: (err) => {
        this.matchCreateError.set(err.error?.message ?? 'Failed to schedule match.');
      }
    });
  }

  async onDeleteMatch(match: Match) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!ws || !event || !comp || !stage) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Match',
      message: 'Delete this match? This cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.competitionService.removeMatch(ws.id, event.id, comp.id, stage.id, match.id).subscribe({
      next: () => {
        this.matches.update(prev => prev.filter(m => m.id !== match.id));
        if (this.selectedMatch()?.id === match.id) {
          this.selectedMatch.set(null);
        }
        this.uiService.success('Match deleted successfully.');
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete match.');
      }
    });
  }

  private currentSubscribedMatchId: string | null = null;

  onSelectMatch(match: Match | null) {
    if (this.currentSubscribedMatchId) {
      this.socketService.unsubscribeMatch(this.currentSubscribedMatchId);
      this.currentSubscribedMatchId = null;
    }

    this.selectedMatch.set(match);
    this.matchLineup.set([]);
    
    if (match) {
      this.socketService.subscribeMatch(match.id);
      this.currentSubscribedMatchId = match.id;
      this.loadMatchLineup(match.id);
    }
  }

  getPlayersForTeam(teamId: string | null): Player[] {
    if (!teamId) return [];
    const match = this.selectedMatch();
    const inactiveIds = new Set<string>();
    const subbedInUserIds = new Set<string>();
    if (match?.liveData?.events) {
      for (const ev of match.liveData.events) {
        if (ev.type === 'card' && (ev.cardType === 'red' || ev.cardType === 'second_yellow')) {
          if (ev.playerUserId) {
            inactiveIds.add(ev.playerUserId);
          }
        }
        if (ev.type === 'substitution') {
          if (ev.playerOutId) {
            inactiveIds.add(ev.playerOutId);
          }
          if (ev.playerInId) {
            subbedInUserIds.add(ev.playerInId);
          }
        }
        if (ev.type === 'injury' && ev.substituted) {
          if (ev.playerUserId) {
            inactiveIds.add(ev.playerUserId);
          }
        }
      }
    }
    
    const teamPlayers = this.players().filter(p => p.teamId === teamId && !inactiveIds.has(p.userId));
    const lineup = this.matchLineup();
    const hasMappedLineup = lineup.some(le => le.teamId === teamId && le.isPlaying);
    
    if (hasMappedLineup) {
      const playingPlayerIds = new Set(lineup.filter(le => le.teamId === teamId && le.isPlaying).map(le => le.playerId));
      return teamPlayers.filter(p => playingPlayerIds.has(p.id) || subbedInUserIds.has(p.userId));
    }
    
    return teamPlayers;
  }

  loadMatchLineup(matchId: string) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!ws || !event || !comp || !stage) return;

    this.competitionService.getMatchLineup(ws.id, event.id, comp.id, stage.id, matchId).subscribe({
      next: (lineup) => this.matchLineup.set(lineup),
      error: (err) => console.error('Failed to load match lineup', err)
    });
  }

  openLineupModal() {
    const match = this.selectedMatch();
    if (!match) return;

    const homePlayers = this.players().filter(p => p.teamId === match.homeTeamId);
    const awayPlayers = this.players().filter(p => p.teamId === match.awayTeamId);
    const currentLineup = this.matchLineup();

    const form: { playerId: string; isPlaying: boolean; isGoalkeeper: boolean; teamId: string; player: Player }[] = [];

    // Map home players
    for (const p of homePlayers) {
      const matchEntry = currentLineup.find(le => le.playerId === p.id);
      form.push({
        playerId: p.id,
        teamId: p.teamId,
        isPlaying: matchEntry ? matchEntry.isPlaying : false,
        isGoalkeeper: matchEntry ? !!matchEntry.isGoalkeeper : false,
        player: p
      });
    }

    // Map away players
    for (const p of awayPlayers) {
      const matchEntry = currentLineup.find(le => le.playerId === p.id);
      form.push({
        playerId: p.id,
        teamId: p.teamId,
        isPlaying: matchEntry ? matchEntry.isPlaying : false,
        isGoalkeeper: matchEntry ? !!matchEntry.isGoalkeeper : false,
        player: p
      });
    }

    this.lineupForm.set(form);
    this.isLineupModalOpen.set(true);
  }

  togglePlayerInLineup(playerId: string) {
    this.lineupForm.update(prev => prev.map(item => {
      if (item.playerId === playerId) {
        const nextPlaying = !item.isPlaying;
        return {
          ...item,
          isPlaying: nextPlaying,
          isGoalkeeper: nextPlaying ? item.isGoalkeeper : false
        };
      }
      return item;
    }));
  }

  setGoalkeeper(teamId: string, playerId: string) {
    this.lineupForm.update(prev => prev.map(item => {
      if (item.teamId === teamId) {
        return { ...item, isGoalkeeper: item.playerId === playerId };
      }
      return item;
    }));
  }

  saveLineup() {
    const match = this.selectedMatch();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!ws || !event || !comp || !stage || !match) return;

    const payload = this.lineupForm().map(item => ({
      playerId: item.playerId,
      isPlaying: item.isPlaying,
      isGoalkeeper: item.isGoalkeeper,
      teamId: item.teamId
    }));

    this.competitionService.saveMatchLineup(ws.id, event.id, comp.id, stage.id, match.id, payload).subscribe({
      next: (updatedLineup) => {
        this.matchLineup.set(updatedLineup);
        this.isLineupModalOpen.set(false);
        this.uiService.success('Match lineup saved successfully!');
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to save match lineup.');
      }
    });
  }

  getSortedMatchLineup(teamId: string | null): any[] {
    if (!teamId) return [];
    const match = this.selectedMatch();
    const teamPlayers = this.players().filter(p => p.teamId === teamId);
    const lineup = this.matchLineup();
    const events = match?.liveData?.events || [];
    
    // Find all substitution and red card statuses
    const subbedOutUserIds = new Set<string>();
    const subbedInUserIds = new Set<string>();
    const redCardedUserIds = new Set<string>();
    
    for (const ev of events) {
      if (ev.type === 'substitution') {
        if (ev.playerOutId) subbedOutUserIds.add(ev.playerOutId);
        if (ev.playerInId) subbedInUserIds.add(ev.playerInId);
      }
      if (ev.type === 'card' && (ev.cardType === 'red' || ev.cardType === 'second_yellow')) {
        if (ev.playerUserId) redCardedUserIds.add(ev.playerUserId);
      }
    }

    return teamPlayers.map(p => {
      const matchEntry = lineup.find(le => le.playerId === p.id);
      const isOriginalStarter = matchEntry ? matchEntry.isPlaying : false;
      const isGoalkeeper = matchEntry ? !!matchEntry.isGoalkeeper : false;
      
      let subStatus: 'in' | 'out' | null = null;
      if (subbedOutUserIds.has(p.userId)) {
        subStatus = 'out';
      } else if (subbedInUserIds.has(p.userId)) {
        subStatus = 'in';
      }
      
      const isRedCarded = redCardedUserIds.has(p.userId);
      
      // A player has participated if they started or were subbed in
      const participated = isOriginalStarter || subStatus === 'in';
      
      // A player is currently playing if they started or were subbed in, AND not subbed out, AND not red carded
      const isCurrentlyPlaying = participated && subStatus !== 'out' && !isRedCarded;
      
      // Calculate live rating
      const rating = this.calculatePlayerLiveRating(p, matchEntry?.rating ?? null);

      return {
        id: p.id,
        player: p,
        isPlaying: isOriginalStarter,
        isGoalkeeper,
        subStatus,
        isRedCarded,
        isCurrentlyPlaying,
        participated,
        rating,
      };
    }).sort((a, b) => {
      // Sort: currently playing first, then by rating desc, then starters, then GK first among playing
      if (a.isCurrentlyPlaying && !b.isCurrentlyPlaying) return -1;
      if (!a.isCurrentlyPlaying && b.isCurrentlyPlaying) return 1;
      
      if (a.isCurrentlyPlaying && b.isCurrentlyPlaying) {
        if (a.isGoalkeeper && !b.isGoalkeeper) return -1;
        if (!a.isGoalkeeper && b.isGoalkeeper) return 1;
        // Sort by rating descending
        const ra = a.rating ?? -1;
        const rb = b.rating ?? -1;
        if (ra !== rb) return rb - ra;
      } else {
        if (a.participated && !b.participated) return -1;
        if (!a.participated && b.participated) return 1;
      }
      
      const nameA = a.player?.user?.username || '';
      const nameB = b.player?.user?.username || '';
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Calculates player's live rating during football matches.
   * Starts at 5.0 and increments/decrements based on live match events.
   */
  calculatePlayerLiveRating(player: Player, dbRating: number | null): number | null {
    const match = this.selectedMatch();
    if (!match) return null;
    
    // If match hasn't started, don't show any ratings
    if (match.status === 'scheduled') return null;
    
    // If rating is already finalized/saved in the DB, prioritize it
    if (dbRating !== null) return dbRating;
    
    const events = match.liveData?.events || [];
    const lineup = this.matchLineup();
    const matchEntry = lineup.find(le => le.playerId === player.id);
    const isOriginalStarter = matchEntry ? matchEntry.isPlaying : false;
    const isGoalkeeper = matchEntry ? !!matchEntry.isGoalkeeper : false;
    
    // Check if player participated (starter or subbed in)
    const subbedIn = events.some((ev: any) => ev.type === 'substitution' && ev.playerInId === player.userId);
    if (!isOriginalStarter && !subbedIn) {
      return null;
    }
    
    let rating = 5.0; // Everyone starts at 5.0
    
    // Tally events
    let goals = 0;
    let assists = 0;
    let ownGoals = 0;
    let yellowCards = 0;
    let redCards = 0;
    
    for (const ev of events) {
      if (ev.playerUserId === player.userId) {
        if (ev.type === 'goal') goals++;
        if (ev.type === 'own_goal') ownGoals++;
        if (ev.type === 'card' && ev.cardType === 'yellow') yellowCards++;
        if (ev.type === 'card' && (ev.cardType === 'red' || ev.cardType === 'second_yellow')) redCards++;
      }
      if (ev.type === 'goal' && ev.assistPlayerUserId === player.userId) {
        assists++;
      }
    }
    
    // Goal bonus
    rating += goals * (isGoalkeeper ? 0.3 : 0.5);
    
    // Assist bonus
    rating += assists * 0.3;
    
    // Own goal penalty
    rating -= ownGoals * 0.5;
    
    // Cards penalty
    rating -= yellowCards * 0.3;
    rating -= redCards * 0.8;
    
    // GK clean sheet bonus
    if (isGoalkeeper) {
      const isHomeTeam = player.teamId === match.homeTeamId;
      const goalsConceded = isHomeTeam ? (match.awayScore ?? 0) : (match.homeScore ?? 0);
      if (goalsConceded === 0) {
        rating += 0.5;
      }
    }
    
    // Win / Loss points if completed
    if (match.status === 'completed') {
      const isHomeTeam = player.teamId === match.homeTeamId;
      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;
      
      if (homeScore > awayScore) {
        rating += isHomeTeam ? 0.5 : -0.3;
      } else if (awayScore > homeScore) {
        rating += isHomeTeam ? -0.3 : 0.5;
      }
    }
    
    return Math.min(10.0, Math.max(5.0, Math.round(rating * 10) / 10));
  }



  getHomePlayersInForm(): any[] {
    const match = this.selectedMatch();
    if (!match) return [];
    return this.lineupForm().filter(item => item.teamId === match.homeTeamId);
  }

  getAwayPlayersInForm(): any[] {
    const match = this.selectedMatch();
    if (!match) return [];
    return this.lineupForm().filter(item => item.teamId === match.awayTeamId);
  }

  getBenchPlayersForTeam(teamId: string | null): Player[] {
    if (!teamId) return [];
    const match = this.selectedMatch();
    const inactiveIds = new Set<string>();
    const subbedInIds = new Set<string>();
    
    if (match?.liveData?.events) {
      for (const ev of match.liveData.events) {
        if (ev.type === 'card' && (ev.cardType === 'red' || ev.cardType === 'second_yellow')) {
          if (ev.playerUserId) {
            inactiveIds.add(ev.playerUserId);
          }
        }
        if (ev.type === 'substitution') {
          if (ev.playerOutId) {
            inactiveIds.add(ev.playerOutId);
          }
          if (ev.playerInId) {
            subbedInIds.add(ev.playerInId);
          }
        }
        if (ev.type === 'injury' && ev.substituted) {
          if (ev.playerUserId) {
            inactiveIds.add(ev.playerUserId);
          }
        }
      }
    }

    const teamPlayers = this.players().filter(p => 
      p.teamId === teamId && 
      !inactiveIds.has(p.userId) && 
      !subbedInIds.has(p.userId)
    );

    const lineup = this.matchLineup();
    const hasMappedLineup = lineup.some(le => le.teamId === teamId && le.isPlaying);

    if (hasMappedLineup) {
      const benchPlayerIds = new Set(lineup.filter(le => le.teamId === teamId && !le.isPlaying).map(le => le.playerId));
      return teamPlayers.filter(p => benchPlayerIds.has(p.id));
    }

    return teamPlayers;
  }


  // ─── Live Consoles Handlers ────────────────────────────────────────────────
  onMatchUpdated(updated: any) {
    this.selectedMatch.set(updated);
    this.matches.update(prev => prev.map(m => m.id === updated.id ? updated : m));
  }

  onMatchCompleted() {
    const event = this.selectedEvent();
    if (event) {
      this.loadCompetitions(event.id);
      this.loadEventStandings(event.id);
    }
  }

  onAvatarUpload(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingAvatar.set(true);
    this.workspaceService.uploadImage(file, 'user').subscribe({
      next: (res) => {
        this.authService.updateProfile(undefined, res.url).subscribe({
          next: () => {
            this.isUploadingAvatar.set(false);
            this.uiService.success('Profile picture updated successfully!');
          },
          error: (err) => {
            this.isUploadingAvatar.set(false);
            console.error(err);
            this.uiService.error('Failed to update user profile image.');
          }
        });
      },
      error: (err) => {
        this.isUploadingAvatar.set(false);
        console.error(err);
        this.uiService.error('Image upload failed.');
      }
    });
  }


  onEventLogoUpload(event: any, isEdit: boolean) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingEventLogo.set(true);
    this.workspaceService.uploadImage(file, 'event').subscribe({
      next: (res) => {
        this.isUploadingEventLogo.set(false);
        if (isEdit) {
          this.editEventLogoUrl.set(res.url);
        } else {
          this.newEventLogoUrl.set(res.url);
        }
        this.uiService.success('Event logo uploaded successfully.');
      },
      error: (err) => {
        this.isUploadingEventLogo.set(false);
        console.error(err);
        this.uiService.error('Event logo upload failed.');
      }
    });
  }

  openGenerateFixturesModal() {
    const comp = this.selectedCompetition();
    const event = this.selectedEvent();
    if (!comp || !event) return;

    const eventTeamIds = event.teams?.map(t => t.id) || [];
    this.selectedFixtureTeamIds.set(eventTeamIds);

    const existingStages = this.stages();
    if (existingStages.length > 0) {
      const stage = existingStages[0];
      this.newStageName.set(stage.name);
      this.newStageType.set(stage.type === 'group' ? 'league' : stage.type as any);
      this.newStageWinPoint.set(stage.config?.winPoint ?? 3);
      this.newStageDrawPoint.set(stage.config?.drawPoint ?? 1);
      this.newStageTwoLegged.set(stage.config?.twoLegged ?? false);
      this.newStageGroupsCount.set(stage.config?.groupsCount ?? 2);
      this.newStageAdvancingCount.set(stage.config?.advancingCount ?? 2);
      this.newStageGamesPerTeam.set(stage.config?.gamesPerTeam ?? 3);
      this.newStageLegs.set(stage.config?.legs ?? (stage.config?.twoLegged ? 2 : 1));
      this.newStageGroupKnockoutSubtype.set(stage.config?.groupKnockoutSubtype ?? 'multiple_groups');
      this.newStageAdvancingType.set(stage.config?.advancingType ?? 'winner_and_runner');
      this.newStageSingleGroupAdvancing.set(stage.config?.singleGroupAdvancing ?? 2);
      this.newStageVenueId.set(stage.config?.venueId ?? '');
    } else {
      this.newStageName.set('Main Stage');
      this.newStageType.set('league');
      this.newStageWinPoint.set(3);
      this.newStageDrawPoint.set(1);
      this.newStageTwoLegged.set(false);
      this.newStageGroupsCount.set(2);
      this.newStageAdvancingCount.set(2);
      this.newStageGamesPerTeam.set(3);
      this.newStageLegs.set(1);
      this.newStageGroupKnockoutSubtype.set('multiple_groups');
      this.newStageAdvancingType.set('winner_and_runner');
      this.newStageSingleGroupAdvancing.set(2);
      this.newStageVenueId.set('');
    }

    this.generateFixturesSubmitError.set('');
    this.isGenerateFixturesModalOpen.set(true);
  }

  closeGenerateFixturesModal() {
    this.isGenerateFixturesModalOpen.set(false);
  }

  toggleFixtureTeam(teamId: string) {
    this.selectedFixtureTeamIds.update(ids => {
      if (ids.includes(teamId)) {
        return ids.filter(id => id !== teamId);
      } else {
        return [...ids, teamId];
      }
    });
  }

  async onGenerateFixturesSubmit() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;

    const selectedIds = this.selectedFixtureTeamIds();
    if (selectedIds.length < 2) {
      this.generateFixturesSubmitError.set('Please select at least 2 teams to participate.');
      return;
    }

    const stageName = this.newStageName().trim();
    if (!stageName) {
      this.generateFixturesSubmitError.set('Please enter a stage name.');
      return;
    }

    const existingStages = this.stages();
    if (existingStages.length > 0) {
      const confirmed = await this.uiService.confirm({
        title: 'Regenerate Fixtures',
        message: 'This will DELETE any existing matches and regenerate all fixtures randomly. Continue?',
        confirmText: 'Regenerate',
        type: 'warning',
      });
      if (!confirmed) return;
    }

    this.isGeneratingFixturesSubmit.set(true);
    this.generateFixturesSubmitError.set('');

    try {
      // Refresh competition teams local state
      const refreshedTeams = await firstValueFrom(this.competitionService.getCompetitionTeams(ws.id, event.id, comp.id));
      this.competitionTeams.set(refreshedTeams);

      // 2. Setup stage (create or update)
      const stagePayload: any = {
        name: stageName,
        type: this.newStageType(),
        sequence: 1,
        config: {}
      };

      if (this.newStageType() === 'league') {
        stagePayload.config = {
          winPoint: this.newStageWinPoint(),
          drawPoint: this.newStageDrawPoint(),
          legs: this.newStageLegs(),
          twoLegged: this.newStageLegs() === 2
        };
      } else if (this.newStageType() === 'group') {
        stagePayload.config = {
          winPoint: this.newStageWinPoint(),
          drawPoint: this.newStageDrawPoint(),
          gamesPerTeam: this.newStageGamesPerTeam(),
          legs: this.newStageLegs(),
          twoLegged: this.newStageLegs() === 2
        };
      } else if (this.newStageType() === 'knockout') {
        stagePayload.config = {
          legs: this.newStageLegs(),
          twoLegged: this.newStageLegs() === 2
        };
      } else if (this.newStageType() === 'group_knockout') {
        stagePayload.config = {
          winPoint: this.newStageWinPoint(),
          drawPoint: this.newStageDrawPoint(),
          legs: this.newStageLegs(),
          twoLegged: this.newStageLegs() === 2,
          groupKnockoutSubtype: this.newStageGroupKnockoutSubtype(),
          groupsCount: this.newStageGroupKnockoutSubtype() === 'multiple_groups' ? this.newStageGroupsCount() : 1,
          advancingType: this.newStageAdvancingType(),
          singleGroupAdvancing: this.newStageSingleGroupAdvancing(),
          advancingCount: this.newStageGroupKnockoutSubtype() === 'multiple_groups'
            ? (this.newStageAdvancingType() === 'winner_and_runner' ? 2 : 1)
            : this.newStageSingleGroupAdvancing()
        };
      }

      if (this.newStageVenueId()) {
        stagePayload.config.venueId = this.newStageVenueId();
      }

      if (existingStages.length > 0) {
        await firstValueFrom(
          this.competitionService.updateStage(ws.id, event.id, comp.id, existingStages[0].id, stagePayload)
        );
      } else {
        await firstValueFrom(
          this.competitionService.createStage(ws.id, event.id, comp.id, stagePayload)
        );
      }

      // 3. Generate fixtures
      const result = await firstValueFrom(
        this.competitionService.generateFixtures(ws.id, event.id, comp.id)
      );

      this.uiService.success(`Fixtures generated successfully! Created ${result.matchesCreated} matches.`);

      // 4. Reload stages (this will auto-select the stage and load its matches)
      this.loadStages(comp.id);
      
      this.isGeneratingFixturesSubmit.set(false);
      this.closeGenerateFixturesModal();
    } catch (err: any) {
      console.error('Failed to setup fixtures', err);
      this.generateFixturesSubmitError.set(err.error?.message ?? 'Failed to setup fixtures and generate matches.');
      this.isGeneratingFixturesSubmit.set(false);
    }
  }

  async onResetStagesAndFixtures() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;

    const confirmed = await this.uiService.confirm({
      title: 'Reset Stages & Fixtures',
      message: 'Are you sure you want to delete all stages and all generated fixtures for this competition? This action cannot be undone.',
      confirmText: 'Reset',
      type: 'danger',
    });
    if (!confirmed) return;

    this.isResettingStages.set(true);
    try {
      await firstValueFrom(
        this.competitionService.resetStagesAndFixtures(ws.id, event.id, comp.id)
      );

      this.uiService.success('Stages and fixtures have been cleared successfully.');
      
      // Reset local state signals
      this.stages.set([]);
      this.selectedStage.set(null);
      this.matches.set([]);
      this.selectedMatch.set(null);

      // Force reload stages so UI returns to setup view
      this.loadStages(comp.id);
    } catch (err: any) {
      console.error('Failed to reset stages and fixtures', err);
      this.uiService.error(
        err.error?.message ?? 'Failed to clear stages and fixtures. Please try again.'
      );
    } finally {
      this.isResettingStages.set(false);
    }
  }

  loadInvitationsAndNotifications() {
    this.workspaceService.getPendingInvitations().subscribe({
      next: (data) => {
        this.pendingInvitations.set(data);
      },
      error: (err) => {
        console.error('Failed to load invitations', err);
      }
    });

    this.workspaceService.getNotifications().subscribe({
      next: (data) => {
        this.notifications.set(data);
      },
      error: (err) => {
        console.error('Failed to load notifications', err);
      }
    });
  }

  acceptInvite(workspaceId: string, workspaceName: string) {
    this.isProcessingInvitation.set(true);
    this.workspaceService.acceptInvitation(workspaceId).subscribe({
      next: () => {
        this.isProcessingInvitation.set(false);
        this.isNotificationOpen.set(false);
        this.uiService.success(`You joined the ${workspaceName} workspace!`);
        this.loadInvitationsAndNotifications();
      },
      error: (err) => {
        this.isProcessingInvitation.set(false);
        console.error(err);
        this.uiService.error(err.error?.message ?? 'Failed to accept invitation.');
      }
    });
  }

  rejectInvite(workspaceId: string, workspaceName: string) {
    this.isProcessingInvitation.set(true);
    this.workspaceService.rejectInvitation(workspaceId).subscribe({
      next: () => {
        this.isProcessingInvitation.set(false);
        this.isNotificationOpen.set(false);
        this.uiService.success(`Rejected invitation to "${workspaceName}".`);
        this.loadInvitationsAndNotifications();
      },
      error: (err) => {
        this.isProcessingInvitation.set(false);
        console.error(err);
        this.uiService.error(err.error?.message ?? 'Failed to reject invitation.');
      }
    });
  }

  markNotificationsAsRead() {
    if (this.unreadNotificationsCount() === 0) return;
    this.workspaceService.markNotificationsRead().subscribe({
      next: () => {
        this.loadInvitationsAndNotifications();
      },
      error: (err) => {
        console.error('Failed to mark notifications as read', err);
      }
    });
  }
}
