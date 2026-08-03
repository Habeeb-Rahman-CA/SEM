import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  computed,
  effect,
  model,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import {
  WorkspaceService,
  Workspace,
  WorkspaceMember,
  Team,
  Player,
  WorkspaceEvent,
  Sport,
  Competition,
  CompetitionStage,
  Match,
  MatchPlayer,
  CompetitionStats,
} from '../../workspaces/services/workspace.service';
import { VenueService, Venue } from '../../venues/services/venue.service';
import { AuthService } from '../../auth/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { SocketService } from '../../../core/services/socket.service';
import { EventService } from '../services/event.service';
import { EventFilterService } from '../services/event-filter.service';
import { CompetitionService } from '../../competitions/services/competition.service';

import { EventModalComponent } from '../components/event-modal';
import { CompetitionModalComponent } from '../../competitions/components/competition-modal';
import { FixturesModalComponent } from '../../competitions/components/fixtures-modal';
import { LineupModalComponent } from '../../competitions/components/lineup-modal';
import { ScheduleMatchModalComponent } from '../../competitions/components/schedule-match-modal';
import { DuplicateEventModalComponent } from '../components/duplicate-event-modal';
import { DoubleEliminationBracketComponent } from '../../competitions/components/double-elimination-bracket';
import { QualificationPreviewModalComponent } from '../../competitions/components/qualification-preview-modal';
import { EventTemplatesModalComponent } from '../components/event-templates-modal';

import { EventsListHeaderComponent } from '../components/events-list-header/events-list-header';
import { EventsFilterBarComponent } from '../components/events-filter-bar/events-filter-bar';
import { EventCardComponent } from '../components/event-card/event-card';
import { CompetitionCardComponent } from '../components/competition-card/competition-card';
import { EventStandingsPanelComponent } from '../components/event-standings-panel/event-standings-panel';
import { AttendanceForecastPanelComponent } from '../components/attendance-forecast-panel/attendance-forecast-panel';
import { MatchCardComponent } from '../components/match-card/match-card';
import { PointsTablePanelComponent } from '../components/points-table-panel/points-table-panel';
import { KnockoutBracketPanelComponent } from '../components/knockout-bracket-panel/knockout-bracket-panel';
import { CompetitionStatsPanelComponent } from '../components/competition-stats-panel/competition-stats-panel';
import { CompetitionPredictionsPanelComponent } from '../components/competition-predictions-panel/competition-predictions-panel';
import { MatchConsoleHostComponent } from '../components/match-console-host/match-console-host';

import {
  AttendanceForecast,
  CompetitionTab,
  EventFilterCriteria,
  EventStandingRow,
  EventView,
  PredictionsData,
  SavedEventFilter,
  StageWinnerResult,
} from '../models/event.interface';
import {
  availableGroups as availableGroupsFn,
  computeLeagueTable,
  isStageCompleted as isStageCompletedFn,
  stageWinnerAndRunnerUp,
} from '../utils/league-table.util';

@Component({
  selector: 'app-workspace-events',
  standalone: true,
  imports: [
    FormsModule,
    EventModalComponent,
    CompetitionModalComponent,
    FixturesModalComponent,
    LineupModalComponent,
    ScheduleMatchModalComponent,
    DuplicateEventModalComponent,
    DoubleEliminationBracketComponent,
    QualificationPreviewModalComponent,
    EventTemplatesModalComponent,
    EventsListHeaderComponent,
    EventsFilterBarComponent,
    EventCardComponent,
    CompetitionCardComponent,
    EventStandingsPanelComponent,
    AttendanceForecastPanelComponent,
    MatchCardComponent,
    PointsTablePanelComponent,
    KnockoutBracketPanelComponent,
    CompetitionStatsPanelComponent,
    CompetitionPredictionsPanelComponent,
    MatchConsoleHostComponent,
  ],
  templateUrl: './events.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceEventsComponent implements OnInit, OnDestroy {
  // SERVICES
  private workspaceService = inject(WorkspaceService);
  private venueService = inject(VenueService);
  private authService = inject(AuthService);
  private uiService = inject(UiService);
  private socketService = inject(SocketService);
  private eventService = inject(EventService);
  private competitionService = inject(CompetitionService);
  private eventFilterService = inject(EventFilterService);
  private matchUpdatedSub: Subscription | null = null;

  // INPUTS & MODELS (Bound to parent state for deep linking & sync)
  workspace = input.required<Workspace | null>();
  players = input<Player[]>([]);
  teams = input<Team[]>([]);
  venues = input<Venue[]>([]);
  members = input<WorkspaceMember[]>([]);

  events = model<WorkspaceEvent[]>([]);
  selectedEvent = model<WorkspaceEvent | null>(null);
  competitions = model<Competition[]>([]);
  selectedCompetition = model<Competition | null>(null);
  stages = model<CompetitionStage[]>([]);
  selectedStage = model<CompetitionStage | null>(null);
  selectedMatch = model<Match | null>(null);
  matches = model<Match[]>([]);
  matchLineup = model<MatchPlayer[]>([]);
  activeCompetitionTab = model<CompetitionTab>('matches');

  // LOCAL STATE SIGNALS
  sports = signal<Sport[]>([]);
  eventStandings = signal<EventStandingRow[]>([]);
  competitionStats = signal<CompetitionStats | null>(null);
  predictionsData = signal<PredictionsData | null>(null);
  attendanceForecast = signal<AttendanceForecast | null>(null);

  isLoadingCompetitions = signal(false);
  isLoadingStages = signal(false);
  isLoadingStats = signal(false);
  isLoadingCompetitionTeams = signal(false);
  isLoadingPredictions = signal(false);
  isLoadingAttendanceForecast = signal(false);
  isResettingStages = signal(false);

  // Archive & View
  archivedEvents = signal<WorkspaceEvent[]>([]);
  activeEventView = signal<EventView>('active');

  eventSearchQuery = signal('');

  // Advanced Search
  isAdvancedSearchOpen = signal(false);
  searchActive = signal(false);
  searchResults = signal<WorkspaceEvent[]>([]);
  searchCriteria = signal<EventFilterCriteria>(this.eventFilterService.emptyCriteria());

  userWorkspaces = signal<Workspace[]>([]);
  savedFilters = signal<SavedEventFilter[]>([]);
  newFilterName = signal('');

  // Standalone Modal States
  isEventModalOpen = signal(false);
  editingEvent = signal<WorkspaceEvent | null>(null);

  isDuplicateEventModalOpen = signal(false);
  duplicatingEvent = signal<WorkspaceEvent | null>(null);

  isCompetitionModalOpen = signal(false);
  editingCompetition = signal<Competition | null>(null);

  isGenerateFixturesModalOpen = signal(false);
  isLineupModalOpen = signal(false);
  isScheduleMatchModalOpen = signal(false);
  selectedMatchToSchedule = signal<Match | null>(null);
  isQualificationPreviewModalOpen = signal(false);

  // Template Modal
  isTemplatesModalOpen = signal(false);

  // Standings Group
  selectedPointsTableGroup = signal('Group A');

  // WebSocket connection tracking
  private currentSubscribedMatchId: string | null = null;

  constructor() {
    effect(
      () => {
        const match = this.selectedMatch();

        if (this.currentSubscribedMatchId) {
          this.socketService.unsubscribeMatch(this.currentSubscribedMatchId);
          this.currentSubscribedMatchId = null;
        }

        if (match) {
          this.socketService.subscribeMatch(match.id);
          this.currentSubscribedMatchId = match.id;
          this.loadMatchLineup(match.id);
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const event = this.selectedEvent();
        if (event) {
          this.loadCompetitions(event.id);
          this.loadEventStandings(event.id);
          this.loadAttendanceForecast(event.id);
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const comp = this.selectedCompetition();
        if (comp) {
          this.activeCompetitionTab.set('matches');
          this.competitionStats.set(null);
          this.predictionsData.set(null);
          this.selectedStage.set(null);
          this.selectedMatch.set(null);
          this.matches.set([]);
          this.loadStages(comp.id);
          this.loadCompetitionTeams(comp.id);
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const comp = this.selectedCompetition();
        const tab = this.activeCompetitionTab();
        if (comp && tab === 'predictions') {
          this.loadCompetitionPredictions(comp.id);
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const query = this.eventSearchQuery();
        if (this.searchActive()) {
          this.triggerAdvancedSearch();
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit() {
    this.loadSports();
    this.loadArchivedEvents();
    this.workspaceService.getAll().subscribe((list) => {
      this.userWorkspaces.set(list);
    });
    this.savedFilters.set(this.eventFilterService.loadSavedFilters());
    this.matchUpdatedSub = this.socketService.matchUpdated$.subscribe((updatedMatch) => {
      if (updatedMatch) {
        this.matches.update((prev) =>
          prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)),
        );
        const currentMatch = this.selectedMatch();
        if (currentMatch && currentMatch.id === updatedMatch.id) {
          this.selectedMatch.set(updatedMatch);
          this.loadMatchLineup(currentMatch.id);
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.currentSubscribedMatchId) {
      this.socketService.unsubscribeMatch(this.currentSubscribedMatchId);
    }
    if (this.matchUpdatedSub) {
      this.matchUpdatedSub.unsubscribe();
    }
    const match = this.selectedMatch();
    if (match) {
      this.releaseActiveLock(match);
    }
  }

  // COMPUTED SIGNALS
  filteredEvents = computed(() =>
    this.eventFilterService.quickFilter(this.events(), this.eventSearchQuery()),
  );

  filteredArchivedEvents = computed(() =>
    this.eventFilterService.quickFilter(this.archivedEvents(), this.eventSearchQuery()),
  );

  targetEvents = computed(() => {
    if (this.searchActive()) return this.searchResults();
    return this.activeEventView() === 'active'
      ? this.filteredEvents()
      : this.filteredArchivedEvents();
  });

  isStageCompleted = computed(() =>
    isStageCompletedFn(
      this.selectedStage(),
      this.matches(),
      this.selectedPointsTableGroup(),
      this.teams().length,
    ),
  );

  availableGroups = computed(() => availableGroupsFn(this.selectedStage()));

  leagueTable = computed(() =>
    computeLeagueTable(
      this.selectedStage(),
      this.matches(),
      this.teams(),
      this.selectedPointsTableGroup(),
    ),
  );

  stageWinnerResult = computed<StageWinnerResult | null>(() =>
    stageWinnerAndRunnerUp(this.selectedStage(), this.matches(), this.leagueTable()),
  );

  statusLine = computed(() => {
    if (this.searchActive()) {
      const n = this.searchResults().length;
      return `Found ${n} event${n !== 1 ? 's' : ''} matching filters`;
    }
    if (this.activeEventView() === 'active') {
      if (this.eventSearchQuery()) {
        return `Showing ${this.filteredEvents().length} of ${this.events().length} events`;
      }
      const n = this.events().length;
      return `${n} event${n !== 1 ? 's' : ''} registered`;
    }
    if (this.eventSearchQuery()) {
      return `Showing ${this.filteredArchivedEvents().length} of ${this.archivedEvents().length} archived events`;
    }
    const n = this.archivedEvents().length;
    return `${n} archived event${n !== 1 ? 's' : ''}`;
  });

  // HELPER METHODS
  hasPermission(permission: string): boolean {
    const userId = this.authService.currentUser()?.id;
    const member = this.members().find((m) => m.userId === userId);
    if (!member || !member.role) return false;
    if (member.role.slug === 'owner') return true;
    return member.role.permissions?.some((p) => p.slug === permission) ?? false;
  }

  // SPORTS
  loadSports() {
    this.workspaceService.getSports().subscribe({
      next: (sports) => this.sports.set(sports),
      error: (err) => console.error('Failed to load sports', err),
    });
  }

  // EVENT SELECTION & CRUD
  onSelectEvent(event: WorkspaceEvent) {
    this.selectedEvent.set(event);
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
      },
    });
  }

  loadEventStandings(eventId: string) {
    const ws = this.workspace();
    if (!ws) return;
    this.eventService.getEventStandings(ws.id, eventId).subscribe({
      next: (data) => {
        this.eventStandings.set(data as EventStandingRow[]);
      },
      error: (err) => {
        console.error('Failed to load event standings', err);
      },
    });
  }

  loadAttendanceForecast(eventId: string) {
    const ws = this.workspace();
    if (!ws) return;
    this.isLoadingAttendanceForecast.set(true);
    this.eventService.getAttendanceForecast(ws.id, eventId).subscribe({
      next: (data) => {
        this.attendanceForecast.set(data as AttendanceForecast);
        this.isLoadingAttendanceForecast.set(false);
      },
      error: (err) => {
        console.error('Failed to load attendance forecast', err);
        this.isLoadingAttendanceForecast.set(false);
      },
    });
  }

  loadCompetitionPredictions(compId: string) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!ws || !event) return;
    this.isLoadingPredictions.set(true);
    this.competitionService.getPredictions(ws.id, event.id, compId).subscribe({
      next: (data) => {
        this.predictionsData.set(data as PredictionsData);
        this.isLoadingPredictions.set(false);
      },
      error: (err) => {
        console.error('Failed to load competition predictions', err);
        this.isLoadingPredictions.set(false);
      },
    });
  }

  onAddEvent() {
    this.editingEvent.set(null);
    this.isEventModalOpen.set(true);
  }

  onEditEvent(event: WorkspaceEvent) {
    this.editingEvent.set(event);
    this.isEventModalOpen.set(true);
  }

  onEventSaved(saved: WorkspaceEvent) {
    const isEdit = !!this.editingEvent();
    if (isEdit) {
      if (saved.isArchived) {
        this.events.update((prev) => prev.filter((e) => e.id !== saved.id));
        this.archivedEvents.update((prev) => {
          const exists = prev.some((e) => e.id === saved.id);
          return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
        });
      } else {
        this.events.update((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
        this.archivedEvents.update((prev) => prev.filter((e) => e.id !== saved.id));
      }
      const curEvent = this.selectedEvent();
      if (curEvent && curEvent.id === saved.id) {
        this.selectedEvent.set(saved);
      }
    } else {
      if (saved.isArchived) {
        this.archivedEvents.update((prev) => [...prev, saved]);
      } else {
        this.events.update((prev) => [...prev, saved]);
      }
    }
  }

  openDuplicateEventModal(event: WorkspaceEvent) {
    this.duplicatingEvent.set(event);
    this.isDuplicateEventModalOpen.set(true);
  }

  onEventDuplicated(saved: WorkspaceEvent) {
    if (saved.isArchived) {
      this.archivedEvents.update((prev) => [...prev, saved]);
    } else {
      this.events.update((prev) => [...prev, saved]);
    }
  }

  openTemplatesModal() {
    this.isTemplatesModalOpen.set(true);
  }

  closeTemplatesModal() {
    this.isTemplatesModalOpen.set(false);
  }

  onTemplateEventCreated(newEvent: WorkspaceEvent) {
    if (newEvent.isArchived) {
      this.archivedEvents.update((prev) => [...prev, newEvent]);
    } else {
      this.events.update((prev) => [...prev, newEvent]);
    }
    this.isTemplatesModalOpen.set(false);
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

    const originalEvents = this.events();
    const originalArchivedEvents = this.archivedEvents();

    this.events.update((prev) => prev.filter((e) => e.id !== event.id));
    this.archivedEvents.update((prev) => prev.filter((e) => e.id !== event.id));
    if (this.selectedEvent()?.id === event.id) {
      this.selectedEvent.set(null);
      this.competitions.set([]);
    }

    this.eventService.removeEvent(ws.id, event.id).subscribe({
      next: () => {
        this.uiService.success(`Event "${event.name}" deleted successfully.`);
      },
      error: (err) => {
        this.events.set(originalEvents);
        this.archivedEvents.set(originalArchivedEvents);
        this.uiService.error(err.error?.message ?? 'Failed to delete event.');
      },
    });
  }

  loadArchivedEvents() {
    const ws = this.workspace();
    if (!ws) return;
    this.eventService.getEvents(ws.id, true).subscribe({
      next: (events) => this.archivedEvents.set(events),
      error: (err) => console.error('Failed to load archived events', err),
    });
  }

  async onArchiveEvent(event: WorkspaceEvent) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Archive Event',
      message: `Are you sure you want to archive event "${event.name}"?`,
      confirmText: 'Archive',
      type: 'warning',
    });
    if (!confirmed) return;

    this.eventService.archiveEvent(ws.id, event.id).subscribe({
      next: (updatedEvent) => {
        this.uiService.success(`Event "${event.name}" archived successfully.`);
        this.events.update((prev) => prev.filter((e) => e.id !== event.id));
        this.archivedEvents.update((prev) => {
          const exists = prev.some((e) => e.id === updatedEvent.id);
          return exists
            ? prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
            : [...prev, updatedEvent];
        });
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to archive event.');
      },
    });
  }

  async onRestoreEvent(event: WorkspaceEvent) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Restore Event',
      message: `Are you sure you want to restore event "${event.name}" to active status?`,
      confirmText: 'Restore',
      type: 'info',
    });
    if (!confirmed) return;

    this.eventService.restoreEvent(ws.id, event.id).subscribe({
      next: (updatedEvent) => {
        this.uiService.success(`Event "${event.name}" restored successfully.`);
        this.archivedEvents.update((prev) => prev.filter((e) => e.id !== event.id));
        this.events.update((prev) => {
          const exists = prev.some((e) => e.id === updatedEvent.id);
          return exists
            ? prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
            : [...prev, updatedEvent];
        });
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to restore event.');
      },
    });
  }

  // COMPETITIONS CRUD
  onSelectCompetition(comp: Competition) {
    this.selectedCompetition.set(comp);
    this.activeCompetitionTab.set('matches');
    this.competitionStats.set(null);
    this.selectedStage.set(null);
    this.selectedMatch.set(null);
    this.matches.set([]);
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
  }

  onAddCompetition() {
    this.editingCompetition.set(null);
    this.isCompetitionModalOpen.set(true);
  }

  onEditCompetition(comp: Competition) {
    this.editingCompetition.set(comp);
    this.isCompetitionModalOpen.set(true);
  }

  onCompetitionSaved(saved: Competition) {
    const isEdit = !!this.editingCompetition();
    if (isEdit) {
      this.competitions.update((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      const curComp = this.selectedCompetition();
      if (curComp && curComp.id === saved.id) {
        this.selectedCompetition.set(saved);
      }
    } else {
      this.competitions.update((prev) => [...prev, saved]);
    }
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

    const originalCompetitions = this.competitions();

    this.competitions.update((prev) => prev.filter((c) => c.id !== comp.id));
    if (this.selectedCompetition()?.id === comp.id) {
      this.selectedCompetition.set(null);
      this.stages.set([]);
      this.matches.set([]);
    }

    this.competitionService.removeCompetition(ws.id, event.id, comp.id).subscribe({
      next: () => {
        this.uiService.success(`Competition "${comp.name}" deleted successfully.`);
      },
      error: (err) => {
        this.competitions.set(originalCompetitions);
        this.uiService.error(err.error?.message ?? 'Failed to delete competition.');
      },
    });
  }

  // STAGE & STATS HANDLERS
  setCompetitionTab(tab: CompetitionTab) {
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
      error: () => {
        this.isLoadingStats.set(false);
        this.uiService.error('Failed to load competition statistics.');
      },
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
      },
    });
  }

  loadCompetitionTeams(competitionId: string) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!ws || !event) return;
    this.isLoadingCompetitionTeams.set(true);
    this.competitionService.getCompetitionTeams(ws.id, event.id, competitionId).subscribe({
      next: () => {
        this.isLoadingCompetitionTeams.set(false);
      },
      error: (err) => {
        console.error('Failed to load competition teams', err);
        this.isLoadingCompetitionTeams.set(false);
      },
    });
  }

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
      },
    });
  }

  // FIXTURE DRAFTING & GENERATION
  openGenerateFixturesModal() {
    this.isGenerateFixturesModalOpen.set(true);
  }

  onFixturesGenerated() {
    const comp = this.selectedCompetition();
    if (comp) {
      this.loadStages(comp.id);
    }
  }

  onQualificationPublished() {
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (comp) {
      this.loadStages(comp.id);
      if (stage) {
        this.onSelectStage(stage);
      }
    }
  }

  async onResetStagesAndFixtures() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;

    const confirmed = await this.uiService.confirm({
      title: 'Reset Stages & Fixtures',
      message:
        'Are you sure you want to delete all stages and all generated fixtures for this competition? This action cannot be undone.',
      confirmText: 'Reset',
      type: 'danger',
    });
    if (!confirmed) return;

    this.isResettingStages.set(true);
    try {
      await firstValueFrom(
        this.competitionService.resetStagesAndFixtures(ws.id, event.id, comp.id),
      );

      this.uiService.success('Stages and fixtures have been cleared successfully.');
      this.stages.set([]);
      this.selectedStage.set(null);
      this.matches.set([]);
      this.selectedMatch.set(null);

      this.loadStages(comp.id);
    } catch (err: any) {
      console.error('Failed to reset stages and fixtures', err);
      this.uiService.error(
        err.error?.message ?? 'Failed to clear stages and fixtures. Please try again.',
      );
    } finally {
      this.isResettingStages.set(false);
    }
  }

  // MATCHES & LINEUP
  private lockInterval: any = null;

  onSelectMatch(match: Match | null) {
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
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();

    if (!ws || !event || !comp || !stage) {
      this.selectedMatch.set(match);
      this.matchLineup.set([]);
      return;
    }

    this.competitionService
      .acquireMatchLock(ws.id, event.id, comp.id, stage.id, match.id)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.selectedMatch.set(match);
            this.matchLineup.set([]);
            this.startLockHeartbeat(match);
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

  startLockHeartbeat(match: Match) {
    this.stopLockHeartbeat();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!ws || !event || !comp || !stage) return;

    this.lockInterval = setInterval(() => {
      this.competitionService
        .acquireMatchLock(ws.id, event.id, comp.id, stage.id, match.id)
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

  releaseActiveLock(match: Match) {
    this.stopLockHeartbeat();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!ws || !event || !comp || !stage) return;

    const canScoreValue = this.hasPermission('match.score');
    if (match.status !== 'completed' && canScoreValue) {
      this.competitionService
        .releaseMatchLock(ws.id, event.id, comp.id, stage.id, match.id)
        .subscribe({
          error: (err) => console.warn('Failed to release match lock', err),
        });
    }
  }

  onMatchUpdated(updated: any) {
    this.selectedMatch.set(updated);
    this.matches.update((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  onMatchCompleted() {
    const event = this.selectedEvent();
    if (event) {
      this.loadCompetitions(event.id);
      this.loadEventStandings(event.id);
    }
  }

  loadMatchLineup(matchId: string) {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!ws || !event || !comp || !stage) return;

    this.competitionService.getMatchLineup(ws.id, event.id, comp.id, stage.id, matchId).subscribe({
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

  onOpenScheduleModal(match: Match) {
    this.selectedMatchToSchedule.set(match);
    this.isScheduleMatchModalOpen.set(true);
  }

  onMatchScheduled(updated: Match) {
    this.matches.update((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    if (this.selectedMatch() && this.selectedMatch()!.id === updated.id) {
      this.selectedMatch.set(updated);
    }
  }

  openPublicPage(event: WorkspaceEvent) {
    const url = `/public/events/${event.id}`;
    window.open(url, '_blank');
  }

  applySavedFilter(filters: EventFilterCriteria) {
    this.searchCriteria.set({ ...this.eventFilterService.emptyCriteria(), ...filters });
    this.triggerAdvancedSearch();
  }

  saveCurrentFilter() {
    const name = this.newFilterName().trim();
    if (!name) return;
    const filters = { ...this.searchCriteria() };
    const current = this.savedFilters();
    const updated = current.filter((sf) => sf.name.toLowerCase() !== name.toLowerCase());
    updated.push({ name, filters });
    this.savedFilters.set(updated);
    this.eventFilterService.persistSavedFilters(updated);
    this.newFilterName.set('');
  }

  deleteSavedFilter(name: string) {
    const updated = this.savedFilters().filter((sf) => sf.name !== name);
    this.savedFilters.set(updated);
    this.eventFilterService.persistSavedFilters(updated);
  }

  resetAdvancedSearch() {
    this.searchCriteria.set(this.eventFilterService.emptyCriteria());
    this.searchActive.set(false);
    this.searchResults.set([]);
  }

  triggerAdvancedSearch() {
    const ws = this.workspace();
    if (!ws) return;
    this.searchActive.set(true);
    const criteria = this.searchCriteria();
    const params = {
      query: this.eventSearchQuery(),
      ...criteria,
    };
    this.eventService.searchEvents(ws.id, params).subscribe({
      next: (results) => {
        this.searchResults.set(results);
      },
      error: (err) => {
        console.error('Advanced search failed:', err);
      },
    });
  }
}
