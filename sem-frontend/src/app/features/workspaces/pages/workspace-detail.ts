import {
  Component,
  OnInit,
  signal,
  inject,
  computed,
  effect,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  WorkspaceService,
  Workspace,
  WorkspaceMember,
  AppNotification,
  Role,
  Team,
  Player,
  WorkspaceEvent,
  Competition,
  CompetitionStage,
  Match,
  MatchPlayer,
  WorkspaceFile,
} from '../services/workspace.service';
import { VenueService, Venue } from '../../venues/services/venue.service';
import { AuthService } from '../../auth/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { SocketService } from '../../../core/services/socket.service';
import { StorageService } from '../../../core/services/storage.service';
import { TeamService } from '../../teams/services/team.service';
import { PlayerService } from '../../players/services/player.service';
import { EventService } from '../../events/services/event.service';
import { CompetitionService } from '../../competitions/services/competition.service';
import { MatchLockService } from '../services/match-lock.service';
import { WorkspaceCrudService } from '../services/workspace-crud.service';
import { RecentlyViewedService } from '../../../core/services/recently-viewed.service';
import { SessionRestoreService } from '../../../core/services/session-restore.service';

import { PlayerModalComponent } from '../../players/components/player-modal';
import { VenueModalComponent } from '../../venues/components/venue-modal';
import { LineupModalComponent } from '../../competitions/components/lineup-modal';
import { SidebarComponent } from '../../../layouts/sidebar/sidebar';
import { TopbarComponent } from '../../../layouts/topbar/topbar';
import { BottomNavComponent, BottomNavTab } from '../../../layouts/bottom-nav/bottom-nav';
import { RefereeDashboardComponent } from '../components/referee-dashboard/referee-dashboard';
import { RefereeMatchConsoleComponent } from '../components/referee-match-console/referee-match-console';
import { WorkspaceDetailSkeletonComponent } from '../components/workspace-detail-skeleton/workspace-detail-skeleton';
import { WorkspaceDetailErrorComponent } from '../components/workspace-detail-error/workspace-detail-error';
import { WorkspaceTabsOutletComponent } from '../components/workspace-tabs-outlet/workspace-tabs-outlet';
import { GlobalSearchHotkeyDirective } from '../directives/global-search-hotkey.directive';

import {
  WorkspaceTab,
  ServerSearchResults,
  GlobalSearchResults,
  EMPTY_SERVER_SEARCH,
} from '../models/workspace-tab.type';
import {
  DashboardMatch,
  DashboardCompetition,
  DashboardScorer,
  DashboardRatedPlayer,
  DashboardOverviewResponse,
  DeepLinkParams,
} from '../models/dashboard.interface';
import { filterDashboardForWorkspace } from '../utils/dashboard-filter.util';
import {
  memberHasPermission,
  findMemberRoleSlug,
  isWorkspaceOwner,
  canManageMembersForSlug,
  assignableRolesFor,
} from '../utils/permission.util';
import { mapTabToBottomNav } from '../utils/tab-mapping.util';
import { computeGlobalSearchResults } from '../utils/global-search.util';
import { extractMatchIds } from '../utils/match-context.util';

@Component({
  selector: 'app-workspace-detail',
  standalone: true,
  imports: [
    SidebarComponent,
    TopbarComponent,
    BottomNavComponent,
    RefereeDashboardComponent,
    RefereeMatchConsoleComponent,
    WorkspaceDetailSkeletonComponent,
    WorkspaceDetailErrorComponent,
    WorkspaceTabsOutletComponent,
    GlobalSearchHotkeyDirective,
    PlayerModalComponent,
    VenueModalComponent,
    LineupModalComponent,
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
  private matchLock = inject(MatchLockService);
  private crud = inject(WorkspaceCrudService);
  private recentlyViewedService = inject(RecentlyViewedService);
  private sessionRestore = inject(SessionRestoreService);

  // ── Core workspace state ───────────────────────────────────────────────────
  workspace = signal<Workspace | null>(null);
  allWorkspaces = signal<Workspace[]>([]);
  members = signal<WorkspaceMember[]>([]);
  roles = signal<Role[]>([]);
  isLoading = signal(true);
  error = signal('');
  activeTab = signal<WorkspaceTab>('overview');
  isSidebarOpen = signal(true);

  // ── Selection state ────────────────────────────────────────────────────────
  selectedPlayerId = signal<string | null>(null);
  selectedTeamId = signal<string | null>(null);
  selectedFileId = signal<string | null>(null);

  // ── Overview dashboard signals ─────────────────────────────────────────────
  overviewLiveMatches = signal<DashboardMatch[]>([]);
  overviewUpcomingMatches = signal<DashboardMatch[]>([]);
  overviewCompletedMatches = signal<DashboardMatch[]>([]);
  overviewRunningCompetitions = signal<DashboardCompetition[]>([]);
  overviewTopScorers = signal<DashboardScorer[]>([]);
  overviewTopRatedPlayers = signal<DashboardRatedPlayer[]>([]);
  selectedOverviewCompId = signal<string>('');
  selectedOverviewComp = signal<DashboardCompetition | null>(null);
  isOverviewLoading = signal<boolean>(false);

  allWorkspaceMatches = computed<DashboardMatch[]>(() => [
    ...this.overviewLiveMatches(),
    ...this.overviewUpcomingMatches(),
    ...this.overviewCompletedMatches(),
  ]);

  // ── Global Search State ────────────────────────────────────────────────────
  globalSearchQuery = signal<string>('');
  showGlobalSearchResults = signal<boolean>(false);
  allCompetitions = signal<Competition[]>([]);
  serverSearchResults = signal<ServerSearchResults>(EMPTY_SERVER_SEARCH);

  globalSearchResults = computed<GlobalSearchResults>(() =>
    computeGlobalSearchResults({
      query: this.globalSearchQuery(),
      events: this.events(),
      competitions: this.allCompetitions(),
      venues: this.venues(),
      members: this.members(),
      serverResults: this.serverSearchResults(),
    }),
  );

  // ── Invitation & notification state ────────────────────────────────────────
  pendingInvitations = signal<WorkspaceMember[]>([]);
  notifications = signal<AppNotification[]>([]);
  isNotificationOpen = signal(false);
  isProcessingInvitation = signal(false);
  unreadNotificationsCount = computed(() => this.notifications().filter((n) => !n.isRead).length);

  // ── Image upload state ─────────────────────────────────────────────────────
  isUploadingAvatar = signal(false);

  // ── Domain data signals ────────────────────────────────────────────────────
  teams = signal<Team[]>([]);
  players = signal<Player[]>([]);
  events = signal<WorkspaceEvent[]>([]);
  venues = signal<Venue[]>([]);

  // ── Events + competitions traversal state (shared with events child) ───────
  selectedEvent = signal<WorkspaceEvent | null>(null);
  competitions = signal<Competition[]>([]);
  selectedCompetition = signal<Competition | null>(null);
  stages = signal<CompetitionStage[]>([]);
  selectedStage = signal<CompetitionStage | null>(null);
  matches = signal<Match[]>([]);
  selectedMatch = signal<Match | null>(null);
  matchLineup = signal<MatchPlayer[]>([]);
  activeCompetitionTab = signal<'matches' | 'stats' | 'predictions'>('matches');

  // ── Modal state ────────────────────────────────────────────────────────────
  isPlayerModalOpen = signal(false);
  editingPlayer = signal<Player | null>(null);
  isVenueModalOpen = signal(false);
  editingVenue = signal<Venue | null>(null);
  isUserDropdownOpen = signal(false);
  isLineupModalOpen = signal(false);

  private currentSubscribedWorkspaceId: string | null = null;

  constructor() {
    // When the top-level tab changes, clear any deep selections and persist tab state
    effect(() => {
      const tab = this.activeTab();
      this.selectedTeamId.set(null);
      this.selectedPlayerId.set(null);
      this.selectedFileId.set(null);
      if (tab) {
        void this.sessionRestore.saveTabState(tab);
      }
    });

    effect(
      () => {
        const query = this.globalSearchQuery().trim();
        const workspaceId = this.workspace()?.id;
        if (!query || !workspaceId) {
          this.serverSearchResults.set(EMPTY_SERVER_SEARCH);
          return;
        }
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
      },
      { allowSignalWrites: true },
    );
  }

  async ngOnInit() {
    const savedTab = await this.sessionRestore.getTabState();
    if (savedTab) {
      this.activeTab.set(savedTab as WorkspaceTab);
    }

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
        this.mergeMatchUpdate(updatedMatch);
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
      if (id) this.loadWorkspaceDetails(id);
    });

    this.route.queryParams.subscribe((params) => {
      if (params['matchId'] || params['eventId']) {
        this.handleDeepLink({
          eventId: params['eventId'],
          competitionId: params['competitionId'],
          stageId: params['stageId'],
          matchId: params['matchId'],
        });
      }
    });
  }

  onGlobalSearchHotkey(): void {
    this.showGlobalSearchResults.set(true);
  }

  // ── Workspace loading ──────────────────────────────────────────────────────
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
        this.recentlyViewedService.loadRecentlyViewed(id).subscribe();
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
        if (cached) this.applyDashboardData(JSON.parse(cached), workspaceId);
      });
      return;
    }

    this.isOverviewLoading.set(true);
    this.workspaceService.getDashboardOverview().subscribe({
      next: (data: DashboardOverviewResponse) => {
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

  private applyDashboardData(data: DashboardOverviewResponse, workspaceId: string) {
    const filtered = filterDashboardForWorkspace(data, workspaceId);
    this.overviewLiveMatches.set(filtered.live);
    this.overviewUpcomingMatches.set(filtered.upcoming);
    this.overviewCompletedMatches.set(filtered.completed);
    this.overviewRunningCompetitions.set(filtered.runningCompetitions);
    if (filtered.runningCompetitions.length > 0) {
      this.selectedOverviewCompId.set(filtered.runningCompetitions[0].id);
      this.selectedOverviewComp.set(filtered.runningCompetitions[0]);
    }
    this.overviewTopScorers.set(filtered.topScorers);
    this.overviewTopRatedPlayers.set(filtered.topRatedPlayers);
  }

  onEnterLiveMatchFromOverview(match: DashboardMatch) {
    const { eventId, competitionId, stageId } = extractMatchIds(match as never);
    if (eventId) {
      this.handleDeepLink({
        eventId,
        competitionId: competitionId ?? undefined,
        stageId: stageId ?? undefined,
        matchId: match.id,
      });
    }
  }

  // ── Bottom navigation ──────────────────────────────────────────────────────
  bottomNavKey = computed<BottomNavTab>(() => mapTabToBottomNav(this.activeTab()));

  onBottomNavTab(
    tab: 'overview' | 'events' | 'players' | 'venues' | 'reports' | 'settings' | 'files',
  ) {
    this.activeTab.set(tab);
  }

  // ── Referee dashboard refresh ──────────────────────────────────────────────
  onRefereeDashboardRefresh(done: () => void) {
    const ws = this.workspace();
    if (!ws) return done();
    this.workspaceService.getDashboardOverview().subscribe({
      next: (data: DashboardOverviewResponse) => {
        this.storage.setItem(`cached_dashboard_${ws.id}`, JSON.stringify(data));
        this.applyDashboardData(data, ws.id);
        done();
      },
      error: () => done(),
    });
  }

  // ── Deep link navigation ───────────────────────────────────────────────────
  handleDeepLink(params: DeepLinkParams) {
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
                      if (m) this.selectedMatch.set(m);
                    },
                  });
              },
            });
          },
        });
      },
    });
  }

  // ── Members ────────────────────────────────────────────────────────────────
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

  get assignableRoles(): Role[] {
    return assignableRolesFor(this.roles());
  }

  isOwner(): boolean {
    return isWorkspaceOwner(this.workspace(), this.authService.currentUser()?.id);
  }

  getCurrentUserRoleSlug(): string {
    return findMemberRoleSlug(this.members(), this.authService.currentUser()?.id);
  }

  canManageMembers(): boolean {
    return canManageMembersForSlug(this.getCurrentUserRoleSlug());
  }

  hasPermission(permission: string): boolean {
    return memberHasPermission(this.members(), this.authService.currentUser()?.id, permission);
  }

  onSignOut(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ── Global search click handlers ───────────────────────────────────────────
  selectGlobalTeam(team: Team) {
    this.activeTab.set('teams');
    this.selectedTeamId.set(team.id);
    this.clearGlobalSearch();
    if (this.workspace()?.id) {
      this.recentlyViewedService
        .recordView(this.workspace()!.id, {
          entityType: 'team',
          entityId: team.id,
          title: team.name,
          subtitle: `Team (${team.code || 'Roster'})`,
          url: this.router.url,
          icon: 'fi fi-rr-users-alt',
        })
        .subscribe();
    }
  }

  selectGlobalPlayer(player: Player) {
    this.activeTab.set('players');
    this.selectedPlayerId.set(player.id);
    this.clearGlobalSearch();
    if (this.workspace()?.id) {
      this.recentlyViewedService
        .recordView(this.workspace()!.id, {
          entityType: 'player',
          entityId: player.id,
          title: player.user.username || 'Player',
          subtitle: `Player - ${player.team?.name || 'Roster'}`,
          url: this.router.url,
          icon: 'fi fi-rr-running',
        })
        .subscribe();
    }
  }

  selectGlobalEvent(event: WorkspaceEvent) {
    this.activeTab.set('events');
    this.selectedEvent.set(event);
    this.clearGlobalSearch();
    if (this.workspace()?.id) {
      this.recentlyViewedService
        .recordView(this.workspace()!.id, {
          entityType: 'event',
          entityId: event.id,
          title: event.name,
          subtitle: `Event (${event.sport || 'Tournament'})`,
          url: this.router.url,
          icon: 'fi fi-rr-calendar',
        })
        .subscribe();
    }
  }

  selectGlobalCompetition(comp: Competition) {
    this.activeTab.set('events');
    const parentEvent = this.events().find((e) => e.id === comp.eventId);
    if (parentEvent) {
      this.selectedEvent.set(parentEvent);
      this.selectedCompetition.set(comp);
    }
    this.clearGlobalSearch();
    if (this.workspace()?.id) {
      this.recentlyViewedService
        .recordView(this.workspace()!.id, {
          entityType: 'competition',
          entityId: comp.id,
          title: comp.name,
          subtitle: 'Competition Stage',
          url: this.router.url,
          icon: 'fi fi-rr-trophy',
        })
        .subscribe();
    }
  }

  selectGlobalVenue(venue: Venue) {
    this.activeTab.set('venues');
    this.clearGlobalSearch();
    if (this.workspace()?.id) {
      this.recentlyViewedService
        .recordView(this.workspace()!.id, {
          entityType: 'venue',
          entityId: venue.id,
          title: venue.name,
          subtitle: venue.location || 'Venue Location',
          url: this.router.url,
          icon: 'fi fi-rr-marker',
        })
        .subscribe();
    }
  }

  selectGlobalMember(_member: WorkspaceMember) {
    this.activeTab.set('members');
    this.clearGlobalSearch();
  }

  selectGlobalFile(file: WorkspaceFile) {
    this.activeTab.set('files');
    this.selectedFileId.set(file.id);
    this.clearGlobalSearch();
    if (this.workspace()?.id) {
      this.recentlyViewedService
        .recordView(this.workspace()!.id, {
          entityType: 'custom',
          entityId: file.id,
          title: file.name,
          subtitle: 'Workspace Document',
          url: this.router.url,
          icon: 'fi fi-rr-file',
        })
        .subscribe();
    }
  }

  clearGlobalSearch() {
    this.globalSearchQuery.set('');
    this.showGlobalSearchResults.set(false);
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
    this.crud.mergeSavedVenue(savedVenue, this.venues, this.matches);
  }

  onDeleteVenue(venue: Venue) {
    const ws = this.workspace();
    if (!ws) return;
    this.crud.deleteVenue({
      workspaceId: ws.id,
      venue,
      venues: this.venues,
      matches: this.matches,
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
    // Team add/edit is handled by the child TeamList component; kept as no-op
    // for parity with historical wiring — the child triggers its own modal.
  }

  onEditTeam(_team: Team) {
    // See onAddTeam.
  }

  onTeamsImported(importedList: Team[]) {
    this.teams.update((prev) => [...prev, ...importedList]);
  }

  onDeleteTeam(team: Team) {
    const ws = this.workspace();
    if (!ws) return;
    this.crud.deleteTeam({
      workspaceId: ws.id,
      team,
      teams: this.teams,
      matches: this.matches,
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
    this.crud.mergeSavedPlayer(player, this.players);
  }

  onPlayersImported(importedList: Player[]) {
    this.crud.mergeImportedPlayers(importedList, this.players);
  }

  onDeletePlayer(player: Player) {
    const ws = this.workspace();
    if (!ws) return;
    this.crud.deletePlayer({
      workspaceId: ws.id,
      player,
      players: this.players,
    });
  }

  // ── Events + competitions loading ──────────────────────────────────────────
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
            const additions = comps.filter((c) => !ids.has(c.id));
            return [...prev, ...additions];
          });
        },
        error: (err) => console.error(`Failed to load competitions for event ${event.id}`, err),
      });
    }
  }

  // ── Invitations + notifications ────────────────────────────────────────────
  loadInvitationsAndNotifications() {
    this.workspaceService.getPendingInvitations().subscribe({
      next: (data) => this.pendingInvitations.set(data),
      error: (err) => console.error('Failed to load invitations', err),
    });

    this.workspaceService.getNotifications().subscribe({
      next: (data) => this.notifications.set(data),
      error: (err) => console.error('Failed to load notifications', err),
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
      next: () => this.loadInvitationsAndNotifications(),
      error: (err) => console.error('Failed to mark notifications as read', err),
    });
  }

  onAvatarUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
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

  // ── Match selection / scoring lock lifecycle ──────────────────────────────
  onSelectMatch(match: Match | null) {
    const previousMatch = this.selectedMatch();
    if (previousMatch) this.releaseActiveLock(previousMatch);

    if (!match) {
      this.selectedMatch.set(null);
      this.matchLineup.set([]);
      return;
    }

    const canScore = this.hasPermission('match.score');
    if (match.status === 'completed' || !canScore) {
      this.selectedMatch.set(match);
      this.matchLineup.set([]);
      return;
    }

    const ws = this.workspace();
    const { eventId, competitionId, stageId } = extractMatchIds(match as never);

    if (!ws || !eventId || !competitionId || !stageId) {
      this.selectedMatch.set(match);
      this.matchLineup.set([]);
      return;
    }

    // Populate the currently selected event/competition/stage so the console
    // renders with the correct context.
    const ev = this.events().find((e) => e.id === eventId);
    if (ev) this.selectedEvent.set(ev);
    const comp = this.allCompetitions().find((c) => c.id === competitionId);
    if (comp) this.selectedCompetition.set(comp);
    const stage =
      this.stages().find((s) => s.id === stageId) ||
      ({ id: stageId, name: 'Stage' } as unknown as CompetitionStage);
    this.selectedStage.set(stage);

    if (this.uiService.isOffline()) {
      this.selectedMatch.set(match);
      this.matchLineup.set([]);
      this.loadMatchLineup(match.id);
      return;
    }

    this.matchLock.acquire({ workspaceId: ws.id, match }).then((res) => {
      if (res.success) {
        this.selectedMatch.set(match);
        this.matchLineup.set([]);
        this.matchLock.startHeartbeat({ workspaceId: ws.id, match }, () => {
          this.selectedMatch.set(null);
          this.matchLineup.set([]);
        });
        this.loadMatchLineup(match.id);
      } else if (res.lockedBy) {
        this.uiService.error(`This match is currently locked/being edited by ${res.lockedBy}.`);
      }
    });
  }

  releaseActiveLock(match: Match) {
    const ws = this.workspace();
    if (!ws) return;
    const canScore = this.hasPermission('match.score');
    if (match.status === 'completed' || !canScore) {
      this.matchLock.stopHeartbeat();
      return;
    }
    this.matchLock.release({ workspaceId: ws.id, match });
  }

  loadMatchLineup(matchId: string) {
    const ws = this.workspace();
    const match =
      this.selectedMatch() ||
      this.overviewLiveMatches().find((m) => m.id === matchId) ||
      this.overviewUpcomingMatches().find((m) => m.id === matchId);
    if (!match) return;
    const { eventId, competitionId, stageId } = extractMatchIds(match as never);
    if (!ws || !eventId || !competitionId || !stageId) return;

    if (this.uiService.isOffline()) {
      this.storage.getItem(`cached_lineup_${matchId}`).then((cached) => {
        if (cached) this.matchLineup.set(JSON.parse(cached));
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

  onLineupSaved(updatedLineup: MatchPlayer[]) {
    this.matchLineup.set(updatedLineup);
  }

  onMatchUpdated(updated: Match) {
    this.selectedMatch.set(updated);
    this.mergeMatchUpdate(updated);
  }

  onMatchCompleted() {
    const ws = this.workspace();
    if (ws) this.loadWorkspaceDashboard(ws.id);
  }

  private mergeMatchUpdate(updated: Match | DashboardMatch): void {
    const id = (updated as { id: string }).id;
    const patch = <T extends { id: string }>(list: T[]) =>
      list.map((m) => (m.id === id ? ({ ...m, ...(updated as object) } as T) : m));
    this.matches.update(patch);
    this.overviewLiveMatches.update(patch);
    this.overviewUpcomingMatches.update(patch);
    this.overviewCompletedMatches.update(patch);
  }
}
