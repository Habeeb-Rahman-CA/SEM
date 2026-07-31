import {
  Component,
  OnInit,
  signal,
  inject,
  computed,
  effect,
  HostListener,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { QuicklinkDirective } from 'ngx-quicklink';
import {
  WorkspaceService,
  Workspace,
  WorkspaceMember,
  AppNotification,
  Role,
  Team,
  Player,
  WorkspaceEvent,
  Sport,
  Competition,
  CompetitionStage,
  CompetitionTeam,
  Match,
  PointsConfigEntry,
  MatchPlayer,
  CompetitionStats,
  WorkspaceFile,
} from '../services/workspace.service';
import { VenueService, Venue } from '../../venues/services/venue.service';
import { AuthService } from '../../auth/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { SocketService } from '../../../core/services/socket.service';
import { StorageService } from '../../../core/services/storage.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VenueListComponent } from '../../venues/pages/venue-list';
import { VenueModalComponent } from '../../venues/components/venue-modal';
import { TeamService } from '../../teams/services/team.service';
import { TeamListComponent } from '../../teams/pages/team-list';
import { PlayerService } from '../../players/services/player.service';
import { PlayerListComponent } from '../../players/pages/player-list';
import { PlayerModalComponent } from '../../players/components/player-modal';
import { EventService } from '../../events/services/event.service';
import { CompetitionService } from '../../competitions/services/competition.service';
import { WorkspaceEventsComponent } from '../../events/pages/events';
import { SidebarComponent } from '../../../layouts/sidebar/sidebar';
import { TopbarComponent } from '../../../layouts/topbar/topbar';
import { WorkspaceDashboardComponent } from './dashboard/dashboard';
import { WorkspaceMembersComponent } from './members/members';
import { WorkspaceSettingsComponent } from './settings/settings';
import { WorkspaceReportsComponent } from '../../reports/pages/reports';
import { WorkspaceFilesComponent } from './files/files';
import { VolunteersComponent } from '../../volunteers/pages/volunteers';
import { EquipmentComponent } from '../../equipment/pages/equipment';
import { MedicalComponent } from '../../medical/pages/medical';
import { RefereeDashboardComponent } from '../components/referee-dashboard/referee-dashboard';
import { FootballConsoleComponent } from '../../competitions/consoles/football-console/football-console';
import { CricketConsoleComponent } from '../../competitions/consoles/cricket-console/cricket-console';
import { BadmintonConsoleComponent } from '../../competitions/consoles/badminton-console/badminton-console';
import { GenericConsoleComponent } from '../../competitions/consoles/generic-console/generic-console';
import { LineupModalComponent } from '../../competitions/components/lineup-modal';
import { BottomNavComponent, BottomNavTab } from '../../../layouts/bottom-nav/bottom-nav';
import {
  getSportBadgeClass,
  getSportIconClass,
  formatMatchStatusDetail,
  roleBadgeClass,
} from '../../../shared';

declare const L: any;

@Component({
  selector: 'app-workspace-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    VenueListComponent,
    VenueModalComponent,
    TeamListComponent,
    PlayerListComponent,
    PlayerModalComponent,
    WorkspaceEventsComponent,
    SidebarComponent,
    TopbarComponent,
    WorkspaceDashboardComponent,
    WorkspaceMembersComponent,
    WorkspaceSettingsComponent,
    WorkspaceReportsComponent,
    WorkspaceFilesComponent,
    QuicklinkDirective,
    RefereeDashboardComponent,
    FootballConsoleComponent,
    CricketConsoleComponent,
    BadmintonConsoleComponent,
    GenericConsoleComponent,
    LineupModalComponent,
    BottomNavComponent,
    VolunteersComponent,
    EquipmentComponent,
    MedicalComponent,
  ],
  templateUrl: './workspace-detail.html',
  styleUrl: './workspace-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private storage = inject(StorageService);

  selectedPlayerId = signal<string | null>(null);
  selectedTeamId = signal<string | null>(null);

  constructor() {
    effect(() => {
      // Clear team/player/file details when main tab changes
      this.activeTab();
      this.selectedTeamId.set(null);
      this.selectedPlayerId.set(null);
      this.selectedFileId.set(null);
    });

    effect(
      () => {
        const query = this.globalSearchQuery().trim();
        const workspaceId = this.workspace()?.id;
        if (query && workspaceId) {
          this.workspaceService.globalSearch(workspaceId, query).subscribe({
            next: (res) => {
              this.serverSearchResults.set({
                files: res.files || [],
                teams: res.teams || [],
                players: res.players || [],
              });
            },
            error: (err) => {
              console.error('Server global search failed:', err);
              // Fallback: search locally
              const queryLower = query.toLowerCase();
              const matchedTeams = this.teams().filter(
                (t) =>
                  t.name.toLowerCase().includes(queryLower) ||
                  (t.code && t.code.toLowerCase().includes(queryLower)),
              );
              const matchedPlayers = this.players().filter(
                (p) =>
                  p.user.username.toLowerCase().includes(queryLower) ||
                  p.team.name.toLowerCase().includes(queryLower),
              );
              this.serverSearchResults.set({
                files: [],
                teams: matchedTeams,
                players: matchedPlayers,
              });
            },
          });
        } else {
          this.serverSearchResults.set({ files: [], teams: [], players: [] });
        }
      },
      { allowSignalWrites: true },
    );
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
  activeTab = signal<
    | 'overview'
    | 'members'
    | 'settings'
    | 'teams'
    | 'players'
    | 'events'
    | 'venues'
    | 'reports'
    | 'files'
    | 'volunteers'
    | 'equipment'
    | 'medical'
  >('overview');
  isSidebarOpen = signal(true);

  // ── Workspace Dashboard Overview Signals ─────────────────────────────────────
  overviewLiveMatches = signal<any[]>([]);
  overviewUpcomingMatches = signal<any[]>([]);
  overviewCompletedMatches = signal<any[]>([]);
  allWorkspaceMatches = computed(() => {
    return [
      ...this.overviewLiveMatches(),
      ...this.overviewUpcomingMatches(),
      ...this.overviewCompletedMatches(),
    ];
  });
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
  serverSearchResults = signal<{ files: any[]; teams: any[]; players: any[] }>({
    files: [],
    teams: [],
    players: [],
  });
  selectedFileId = signal<string | null>(null);

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
    return list.filter(
      (m) =>
        m.user.username.toLowerCase().includes(query) || m.role.name.toLowerCase().includes(query),
    );
  });

  filteredTeams = computed(() => {
    const query = this.teamSearchQuery().toLowerCase().trim();
    const list = this.teams();
    if (!query) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.code && t.code.toLowerCase().includes(query)) ||
        (t.description && t.description.toLowerCase().includes(query)),
    );
  });

  filteredPlayers = computed(() => {
    const query = this.playerSearchQuery().toLowerCase().trim();
    const list = this.players();
    if (!query) return list;
    return list.filter(
      (p) =>
        p.user.username.toLowerCase().includes(query) ||
        p.team.name.toLowerCase().includes(query) ||
        (p.jerseyNumber && String(p.jerseyNumber).toLowerCase().includes(query)),
    );
  });

  filteredEvents = computed(() => {
    const query = this.eventSearchQuery().toLowerCase().trim();
    const list = this.events();
    if (!query) return list;
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.status.toLowerCase().includes(query) ||
        (e.description && e.description.toLowerCase().includes(query)),
    );
  });

  filteredVenues = computed(() => {
    const query = this.venueSearchQuery().toLowerCase().trim();
    const list = this.venues();
    if (!query) return list;
    return list.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        (v.location && v.location.toLowerCase().includes(query)),
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
        files: [],
        totalCount: 0,
      };
    }

    const matchedEvents = this.events().filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.status.toLowerCase().includes(query) ||
        (e.description && e.description.toLowerCase().includes(query)),
    );

    const matchedCompetitions = this.allCompetitions().filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.status.toLowerCase().includes(query) ||
        (c.sport?.name && c.sport.name.toLowerCase().includes(query)),
    );

    const matchedVenues = this.venues().filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        (v.location && v.location.toLowerCase().includes(query)),
    );

    const matchedMembers = this.members().filter(
      (m) =>
        m.user.username.toLowerCase().includes(query) || m.role.name.toLowerCase().includes(query),
    );

    // Merge server-side search results (Elasticsearch / OpenSearch)
    const serverResults = this.serverSearchResults();
    const matchedTeams = serverResults.teams;
    const matchedPlayers = serverResults.players;
    const matchedFiles = serverResults.files;

    const totalCount =
      matchedTeams.length +
      matchedPlayers.length +
      matchedEvents.length +
      matchedCompetitions.length +
      matchedVenues.length +
      matchedMembers.length +
      matchedFiles.length;

    return {
      teams: matchedTeams,
      players: matchedPlayers,
      events: matchedEvents,
      competitions: matchedCompetitions,
      venues: matchedVenues,
      members: matchedMembers,
      files: matchedFiles,
      totalCount,
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
    this.selectedEvent.set(event);
    this.clearGlobalSearch();
  }

  selectGlobalCompetition(comp: Competition) {
    this.activeTab.set('events');
    const parentEvent = this.events().find((e) => e.id === comp.eventId);
    if (parentEvent) {
      this.selectedEvent.set(parentEvent);
      this.selectedCompetition.set(comp);
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

  selectGlobalFile(file: WorkspaceFile) {
    this.activeTab.set('files');
    this.selectedFileId.set(file.id);
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

  unreadNotificationsCount = computed(() => this.notifications().filter((n) => !n.isRead).length);
  totalBadgeCount = computed(
    () => this.pendingInvitations().length + this.unreadNotificationsCount(),
  );
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
  // ── Events & Competitions State (Shared with child component) ───────────────
  selectedEvent = signal<WorkspaceEvent | null>(null);
  competitions = signal<Competition[]>([]);
  selectedCompetition = signal<Competition | null>(null);
  stages = signal<CompetitionStage[]>([]);
  selectedStage = signal<CompetitionStage | null>(null);
  matches = signal<Match[]>([]);
  selectedMatch = signal<Match | null>(null);
  matchLineup = signal<MatchPlayer[]>([]);
  activeCompetitionTab = signal<'matches' | 'stats'>('matches');

  // ── Venues State ───────────────────────────────────────────────────────────
  venues = signal<Venue[]>([]);
  isVenueModalOpen = signal(false);
  editingVenue = signal<Venue | null>(null);
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
    return this.roles().filter((r) => r.slug !== 'owner');
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
          prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)),
        );

        // 2. Update in overviewLiveMatches
        this.overviewLiveMatches.update((prev) =>
          prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)),
        );

        // 3. Update in overviewUpcomingMatches
        this.overviewUpcomingMatches.update((prev) =>
          prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)),
        );

        // Update in overviewCompletedMatches
        this.overviewCompletedMatches.update((prev) =>
          prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)),
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
      const match = this.selectedMatch();
      if (match) {
        this.releaseActiveLock(match);
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
    if (this.uiService.isOffline()) {
      this.storage.getItem(`cached_dashboard_${workspaceId}`).then((cached) => {
        if (cached) {
          const data = JSON.parse(cached);
          this.applyDashboardData(data, workspaceId);
        }
      });
      return;
    }

    this.isOverviewLoading.set(true);
    this.workspaceService.getDashboardOverview().subscribe({
      next: (data) => {
        this.storage.setItem(`cached_dashboard_${workspaceId}`, JSON.stringify(data));
        this.applyDashboardData(data, workspaceId);
        this.isOverviewLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load workspace overview', err);
        this.isOverviewLoading.set(false);
      },
    });
  }

  private applyDashboardData(data: any, workspaceId: string) {
    const live = (data.liveMatches || []).filter(
      (m: any) =>
        m.workspaceId === workspaceId || m.stage?.competition?.event?.workspaceId === workspaceId,
    );
    this.overviewLiveMatches.set(live);

    const upcoming = (data.upcomingMatches || []).filter(
      (m: any) =>
        m.workspaceId === workspaceId || m.stage?.competition?.event?.workspaceId === workspaceId,
    );
    this.overviewUpcomingMatches.set(upcoming);

    const completed = (data.completedMatches || []).filter(
      (m: any) =>
        m.workspaceId === workspaceId || m.stage?.competition?.event?.workspaceId === workspaceId,
    );
    this.overviewCompletedMatches.set(completed);

    const runningComps = (data.runningCompetitions || []).filter(
      (c: any) => c.event?.workspaceId === workspaceId || c.workspaceId === workspaceId,
    );
    this.overviewRunningCompetitions.set(runningComps);
    if (runningComps.length > 0) {
      this.selectedOverviewCompId.set(runningComps[0].id);
      this.selectedOverviewComp.set(runningComps[0]);
    }

    this.overviewTopScorers.set(data.topScorers || []);
    this.overviewTopRatedPlayers.set(data.topRatedPlayers || []);
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

  getSportBadgeClass = getSportBadgeClass;
  getSportIconClass = getSportIconClass;

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

  formatMatchStatusDetail = formatMatchStatusDetail;

  // Map the sidebar's fine-grained activeTab down to the four visible
  // destinations rendered in the mobile bottom nav.
  bottomNavKey = computed<BottomNavTab>(() => {
    const tab = this.activeTab();
    if (
      tab === 'events' ||
      tab === 'venues' ||
      tab === 'reports' ||
      tab === 'settings' ||
      tab === 'files'
    ) {
      return tab === 'events' ? 'events' : 'overview';
    }
    if (tab === 'players' || tab === 'teams') return 'players';
    return 'overview';
  });

  onBottomNavTab(
    tab: 'overview' | 'events' | 'players' | 'venues' | 'reports' | 'settings' | 'files',
  ) {
    this.activeTab.set(tab);
  }

  /** Referee dashboard pull-to-refresh: reload workspace dashboard data. */
  onRefereeDashboardRefresh(done: () => void) {
    const ws = this.workspace();
    if (!ws) return done();
    this.workspaceService.getDashboardOverview().subscribe({
      next: (data) => {
        this.storage.setItem(`cached_dashboard_${ws.id}`, JSON.stringify(data));
        this.applyDashboardData(data, ws.id);
        done();
      },
      error: () => done(),
    });
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
                this.competitionService
                  .getMatches(ws.id, eventId, competitionId, stage.id)
                  .subscribe({
                    next: (matches) => {
                      this.matches.set(matches);
                      const m = matches.find((match) => match.id === matchId);
                      if (m) {
                        this.selectedMatch.set(m);
                      }
                    },
                  });
              },
            });
          },
        });
      },
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
    return this.members().find((m) => m.userId === userId)?.role?.slug ?? 'viewer';
  }

  canManageMembers(): boolean {
    const slug = this.getCurrentUserRoleSlug();
    return slug === 'owner' || slug === 'administrator';
  }

  hasPermission(permission: string): boolean {
    const userId = this.authService.currentUser()?.id;
    const member = this.members().find((m) => m.userId === userId);
    if (!member || !member.role) return false;
    if (member.role.slug === 'owner') return true;
    return member.role.permissions?.some((p) => p.slug === permission) ?? false;
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

  roleBadgeClass = roleBadgeClass;

  memberCountForRole(roleId: string): number {
    return this.members().filter((m) => m.role?.id === roleId).length;
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
      },
    });
  }

  // ── Update Member Role ─────────────────────────────────────────────────────

  onUpdateRole(member: WorkspaceMember, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newRoleSlug = select.value;
    const ws = this.workspace();
    if (!ws) return;

    const newRole = this.roles().find((r) => r.slug === newRoleSlug);
    if (!newRole) return;

    const originalRole = member.role;

    // Optimistic Update
    this.members.update((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)),
    );

    this.workspaceService.updateMemberRole(ws.id, member.userId, newRoleSlug).subscribe({
      next: (updated) => {
        this.members.update((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, role: updated.role } : m)),
        );
        this.uiService.success(`Role for ${member.user.username} updated to ${updated.role.name}.`);
      },
      error: (err) => {
        // Rollback
        this.members.update((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, role: originalRole } : m)),
        );
        select.value = originalRole?.slug ?? '';
        this.uiService.error(err.error?.message ?? 'Failed to update member role.');
      },
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

    const originalMembers = this.members();

    // Optimistic Update
    this.members.update((prev) => prev.filter((m) => m.userId !== member.userId));

    this.workspaceService.removeMember(ws.id, member.userId).subscribe({
      next: () => {
        this.uiService.success(`Removed "${member.user.username}" from workspace.`);
      },
      error: (err) => {
        // Rollback
        this.members.set(originalMembers);
        this.uiService.error(err.error?.message ?? 'Failed to remove member.');
      },
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
        this.roles.update((prev) => [...prev, role]);
      },
      error: (err) => {
        this.isCreatingRole.set(false);
        this.roleCreateError.set(err.error?.message ?? 'Failed to create role.');
      },
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

    const originalRoles = this.roles();

    // Optimistic Update
    this.roles.update((prev) => prev.filter((r) => r.id !== role.id));

    this.workspaceService.removeRole(ws.id, role.id).subscribe({
      next: () => {
        this.uiService.success(`Role "${role.name}" deleted successfully.`);
      },
      error: (err) => {
        // Rollback
        this.roles.set(originalRoles);
        this.uiService.error(err.error?.message ?? 'Failed to delete role.');
      },
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
    const isEdit = this.venues().some((v) => v.id === savedVenue.id);
    if (isEdit) {
      this.venues.update((prev) => prev.map((v) => (v.id === savedVenue.id ? savedVenue : v)));
      this.matches.update((prevMatches) =>
        prevMatches.map((m) => (m.venueId === savedVenue.id ? { ...m, venue: savedVenue } : m)),
      );
    } else {
      this.venues.update((prev) => [...prev, savedVenue]);
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

    const originalVenues = this.venues();
    const originalMatches = this.matches();

    // Optimistic Update
    this.venues.update((prev) => prev.filter((v) => v.id !== venue.id));
    this.matches.update((prevMatches) =>
      prevMatches.map((m) => (m.venueId === venue.id ? { ...m, venueId: null, venue: null } : m)),
    );

    this.venueService.removeVenue(ws.id, venue.id).subscribe({
      next: () => {
        this.uiService.success(`Venue "${venue.name}" deleted successfully.`);
      },
      error: (err) => {
        // Rollback
        this.venues.set(originalVenues);
        this.matches.set(originalMatches);
        this.uiService.error(err.error?.message ?? 'Failed to delete venue.');
      },
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
    const isEdit = this.teams().some((t) => t.id === savedTeam.id);
    if (isEdit) {
      this.teams.update((prev) => prev.map((t) => (t.id === savedTeam.id ? savedTeam : t)));
      this.matches.update((prevMatches) =>
        prevMatches.map((m) => {
          let updated = { ...m };
          if (m.homeTeamId === savedTeam.id) {
            updated.homeTeam = savedTeam;
          }
          if (m.awayTeamId === savedTeam.id) {
            updated.awayTeam = savedTeam;
          }
          return updated;
        }),
      );
    } else {
      this.teams.update((prev) => [...prev, savedTeam]);
    }
  }

  onTeamsImported(importedList: Team[]) {
    this.teams.update((prev) => [...prev, ...importedList]);
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

    const originalTeams = this.teams();
    const originalMatches = this.matches();

    // Optimistic Update
    this.teams.update((prev) => prev.filter((t) => t.id !== team.id));
    this.matches.update((prevMatches) =>
      prevMatches.map((m) => {
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
      }),
    );

    this.teamService.removeTeam(ws.id, team.id).subscribe({
      next: () => {
        this.uiService.success(`Team "${team.name}" deleted successfully.`);
      },
      error: (err) => {
        // Rollback
        this.teams.set(originalTeams);
        this.matches.set(originalMatches);
        this.uiService.error(err.error?.message ?? 'Failed to delete team.');
      },
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
    const exists = this.players().some((p) => p.id === player.id);
    if (exists) {
      this.players.update((prev) => prev.map((p) => (p.id === player.id ? player : p)));
    } else {
      this.players.update((prev) => [...prev, player]);
    }
  }

  onPlayersImported(importedList: Player[]) {
    if (importedList && importedList.length > 0) {
      this.players.update((prev) => {
        const list = [...prev];
        importedList.forEach((p) => {
          if (!list.some((x) => x.id === p.id)) {
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

    const originalPlayers = this.players();

    // Optimistic Update
    this.players.update((prev) => prev.filter((p) => p.id !== player.id));

    this.playerService.removePlayer(ws.id, player.id).subscribe({
      next: () => {
        this.uiService.success(`Player "${player.user.username}" deleted successfully.`);
      },
      error: (err) => {
        // Rollback
        this.players.set(originalPlayers);
        this.uiService.error(err.error?.message ?? 'Failed to delete player.');
      },
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
          this.allCompetitions.update((prev) => {
            const ids = new Set(prev.map((c) => c.id));
            const newComps = comps.filter((c) => !ids.has(c.id));
            return [...prev, ...newComps];
          });
        },
        error: (err) => console.error(`Failed to load competitions for event ${event.id}`, err),
      });
    }
  }

  loadInvitationsAndNotifications() {
    this.workspaceService.getPendingInvitations().subscribe({
      next: (data) => {
        this.pendingInvitations.set(data);
      },
      error: (err) => {
        console.error('Failed to load invitations', err);
      },
    });

    this.workspaceService.getNotifications().subscribe({
      next: (data) => {
        this.notifications.set(data);
      },
      error: (err) => {
        console.error('Failed to load notifications', err);
      },
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
      },
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
      },
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
      },
    });
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
            console.error(err);
            this.isUploadingAvatar.set(false);
            this.uiService.error('Failed to update profile picture.');
          },
        });
      },
      error: (err) => {
        console.error(err);
        this.isUploadingAvatar.set(false);
        this.uiService.error('Failed to upload image.');
      },
    });
  }

  isLineupModalOpen = signal(false);
  private lockInterval: any = null;

  onSelectMatch(match: any) {
    const previousMatch = this.selectedMatch();
    if (previousMatch) {
      this.releaseActiveLock(previousMatch);
    }

    if (!match) {
      this.selectedMatch.set(null);
      this.matchLineup.set([]);
      return;
    }

    const canScoreValue = this.hasPermission('match.score');
    if (match.status === 'completed' || !canScoreValue) {
      this.selectedMatch.set(match);
      this.matchLineup.set([]);
      return;
    }

    const ws = this.workspace();
    const eventId = match.stage?.competition?.eventId || match.eventId;
    const competitionId = match.stage?.competitionId || match.competitionId;
    const stageId = match.stageId;

    if (!ws || !eventId || !competitionId || !stageId) {
      this.selectedMatch.set(match);
      this.matchLineup.set([]);
      return;
    }

    // Set selected Event/Competition/Stage to ensure matching console parameters are fed properly
    const ev = this.events().find((e) => e.id === eventId);
    if (ev) this.selectedEvent.set(ev);
    const comp = this.allCompetitions().find((c) => c.id === competitionId);
    if (comp) this.selectedCompetition.set(comp);
    const stage =
      this.stages().find((s) => s.id === stageId) || ({ id: stageId, name: 'Stage' } as any);
    this.selectedStage.set(stage);

    if (this.uiService.isOffline()) {
      this.selectedMatch.set(match);
      this.matchLineup.set([]);
      this.loadMatchLineup(match.id);
      return;
    }

    this.competitionService
      .acquireMatchLock(ws.id, eventId, competitionId, stageId, match.id)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.selectedMatch.set(match);
            this.matchLineup.set([]);
            this.startLockHeartbeat(match);
            this.loadMatchLineup(match.id);
          } else {
            this.uiService.error(
              `This match is currently locked/being edited by ${res.lockedBy || 'another official'}.`,
            );
          }
        },
        error: (err) => {
          this.uiService.error(
            err.error?.message ||
              'Failed to acquire edit lock. The match may be currently edited by another official.',
          );
        },
      });
  }

  startLockHeartbeat(match: any) {
    this.stopLockHeartbeat();
    const ws = this.workspace();
    const eventId = match.stage?.competition?.eventId || match.eventId;
    const competitionId = match.stage?.competitionId || match.competitionId;
    const stageId = match.stageId;
    if (!ws || !eventId || !competitionId || !stageId) return;

    this.lockInterval = setInterval(() => {
      this.competitionService
        .acquireMatchLock(ws.id, eventId, competitionId, stageId, match.id)
        .subscribe({
          error: (err) => {
            console.warn('Failed to renew match lock', err);
            this.uiService.error(
              err.error?.message || 'Lock expired or lost. Another official may have taken over.',
            );
            this.stopLockHeartbeat();
            this.selectedMatch.set(null);
            this.matchLineup.set([]);
          },
        });
    }, 20000);
  }

  stopLockHeartbeat() {
    if (this.lockInterval) {
      clearInterval(this.lockInterval);
      this.lockInterval = null;
    }
  }

  releaseActiveLock(match: any) {
    this.stopLockHeartbeat();
    if (this.uiService.isOffline()) return;
    const ws = this.workspace();
    const eventId = match.stage?.competition?.eventId || match.eventId;
    const competitionId = match.stage?.competitionId || match.competitionId;
    const stageId = match.stageId;
    if (!ws || !eventId || !competitionId || !stageId) return;

    const canScoreValue = this.hasPermission('match.score');
    if (match.status !== 'completed' && canScoreValue) {
      this.competitionService
        .releaseMatchLock(ws.id, eventId, competitionId, stageId, match.id)
        .subscribe({
          error: (err) => console.warn('Failed to release match lock', err),
        });
    }
  }

  loadMatchLineup(matchId: string) {
    const ws = this.workspace();
    const match: any =
      this.selectedMatch() ||
      this.overviewLiveMatches().find((m) => m.id === matchId) ||
      this.overviewUpcomingMatches().find((m) => m.id === matchId);
    if (!match) return;
    const eventId = match.stage?.competition?.eventId || match.eventId;
    const competitionId = match.stage?.competitionId || match.competitionId;
    const stageId = match.stageId;
    if (!ws || !eventId || !competitionId || !stageId) return;

    if (this.uiService.isOffline()) {
      this.storage.getItem(`cached_lineup_${matchId}`).then((cached) => {
        if (cached) {
          this.matchLineup.set(JSON.parse(cached));
        }
      });
      return;
    }

    this.competitionService
      .getMatchLineup(ws.id, eventId, competitionId, stageId, matchId)
      .subscribe({
        next: (lineup) => this.matchLineup.set(lineup),
        error: (err) => console.error('Failed to load match lineup', err),
      });
  }

  openLineupModal() {
    this.isLineupModalOpen.set(true);
  }

  onLineupSaved(updatedLineup: any[]) {
    this.matchLineup.set(updatedLineup);
  }

  onMatchUpdated(updated: any) {
    this.selectedMatch.set(updated);
    this.matches.update((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    this.overviewLiveMatches.update((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    this.overviewUpcomingMatches.update((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m)),
    );
    this.overviewCompletedMatches.update((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m)),
    );
  }

  onMatchCompleted() {
    const ws = this.workspace();
    if (ws) {
      this.loadWorkspaceDashboard(ws.id);
    }
  }
}
