import { Component, OnInit, OnDestroy, signal, inject, computed, effect, model, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { WorkspaceService, Workspace, WorkspaceMember, Team, Player, WorkspaceEvent, Sport, Competition, CompetitionStage, CompetitionTeam, Match, PointsConfigEntry, MatchPlayer, CompetitionStats } from '../../../services/workspace.service';
import { VenueService, Venue } from '../../../services/venue.service';
import { AuthService } from '../../../services/auth.service';
import { UiService } from '../../../services/ui.service';
import { SocketService } from '../../../services/socket.service';
import { EventService } from '../../../services/event.service';
import { CompetitionService } from '../../../services/competition.service';
import { FootballConsoleComponent } from '../consoles/football-console/football-console';
import { CricketConsoleComponent } from '../consoles/cricket-console/cricket-console';
import { BadmintonConsoleComponent } from '../consoles/badminton-console/badminton-console';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { InitialsPipe } from '../../../shared/pipes/initials.pipe';
import { getSportBadgeClass, getSportIconClass, formatMatchStatusDetail } from '../../../shared';

@Component({
  selector: 'app-workspace-events',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    FootballConsoleComponent,
    CricketConsoleComponent,
    BadmintonConsoleComponent,
    AvatarComponent,
    InitialsPipe
  ],
  templateUrl: './events.html',
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
  activeCompetitionTab = model<'matches' | 'stats'>('matches');

  // LOCAL STATE SIGNALS
  sports = signal<Sport[]>([]);
  eventStandings = signal<any[]>([]);
  competitionStats = signal<CompetitionStats | null>(null);
  
  isLoadingCompetitions = signal(false);
  isLoadingStages = signal(false);
  isLoadingStats = signal(false);
  isLoadingCompetitionTeams = signal(false);

  // Search
  eventSearchQuery = signal('');

  // Event Modals
  isEventModalOpen = signal(false);
  editingEvent = signal<WorkspaceEvent | null>(null);
  isUploadingEventLogo = signal(false);

  newEventName = signal('');
  newEventDescription = signal('');
  newEventStartDate = signal('');
  newEventEndDate = signal('');
  newEventStatus = signal<string>('upcoming');
  newEventLogoUrl = signal('');
  selectedEventTeamIds = signal<string[]>([]);
  isCreatingEvent = signal(false);
  isUpdatingEvent = signal(false);

  editEventName = signal('');
  editEventDescription = signal('');
  editEventStartDate = signal('');
  editEventEndDate = signal('');
  editEventStatus = signal<string>('upcoming');
  editEventLogoUrl = signal('');

  eventCreateError = signal('');
  eventCreateSuccess = signal('');
  eventUpdateError = signal('');
  eventUpdateSuccess = signal('');

  // Competition Modals
  isCompetitionModalOpen = signal(false);
  editingCompetition = signal<Competition | null>(null);
  isCreatingCompetition = signal(false);
  isUpdatingCompetition = signal(false);

  newCompetitionName = signal('');
  newCompetitionSportId = signal('');
  newCompetitionStatus = signal<string>('upcoming');
  newCompetitionPointsConfig = signal<PointsConfigEntry[]>([]);

  editCompetitionName = signal('');
  editCompetitionSportId = signal('');
  editCompetitionStatus = signal<string>('upcoming');
  editCompetitionPointsConfig = signal<PointsConfigEntry[]>([]);

  competitionCreateError = signal('');
  competitionCreateSuccess = signal('');
  competitionUpdateError = signal('');
  competitionUpdateSuccess = signal('');

  // Fixtures Modal
  isGenerateFixturesModalOpen = signal(false);
  isGeneratingFixturesSubmit = signal(false);
  generateFixturesSubmitError = signal('');

  newStageName = signal('Main Stage');
  newStageType = signal<'league' | 'group' | 'knockout' | 'group_knockout'>('league');
  newStageWinPoint = signal(3);
  newStageDrawPoint = signal(1);
  newStageTwoLegged = signal(false);
  newStageLegs = signal(1);
  newStageGamesPerTeam = signal(3);
  newStageVenueId = signal('');
  newStageGroupKnockoutSubtype = signal<'multiple_groups' | 'single_group'>('multiple_groups');
  newStageGroupsCount = signal(2);
  newStageAdvancingType = signal<'winner_and_runner' | 'winner'>('winner_and_runner');
  newStageSingleGroupAdvancing = signal(2);
  newStageAdvancingCount = signal(2);
  selectedFixtureTeamIds = signal<string[]>([]);
  competitionTeams = signal<CompetitionTeam[]>([]);
  isResettingStages = signal(false);

  // Lineup Modal
  isLineupModalOpen = signal(false);
  lineupForm = signal<{ playerId: string; isPlaying: boolean; isGoalkeeper: boolean; teamId: string; player: Player }[]>([]);

  // Standings Group
  selectedPointsTableGroup = signal('Group A');

  // WebSocket connection tracking
  private currentSubscribedMatchId: string | null = null;

  constructor() {
    // Automatically manage match socket subscription and lineup load when selectedMatch changes
    effect(() => {
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
    }, { allowSignalWrites: true });

    // Load competitions and standings when selectedEvent changes
    effect(() => {
      const event = this.selectedEvent();
      if (event) {
        this.loadCompetitions(event.id);
        this.loadEventStandings(event.id);
      }
    }, { allowSignalWrites: true });

    // Load stages and teams when selectedCompetition changes
    effect(() => {
      const comp = this.selectedCompetition();
      if (comp) {
        this.activeCompetitionTab.set('matches');
        this.competitionStats.set(null);
        this.selectedStage.set(null);
        this.selectedMatch.set(null);
        this.matches.set([]);
        this.competitionTeams.set([]);
        this.loadStages(comp.id);
        this.loadCompetitionTeams(comp.id);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.loadSports();
  }

  ngOnDestroy() {
    if (this.currentSubscribedMatchId) {
      this.socketService.unsubscribeMatch(this.currentSubscribedMatchId);
    }
  }

  // COMPUTED SIGNALS
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

    const groupTeamIds = new Set<string>();
    if (isMultipleGroups) {
      for (const m of matchesList) {
        if (m.config?.round === currentGroup) {
          if (m.homeTeamId) groupTeamIds.add(m.homeTeamId);
          if (m.awayTeamId) groupTeamIds.add(m.awayTeamId);
        }
      }
    }
    
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

    for (const ct of enrolledTeams) {
      if (isMultipleGroups && !groupTeamIds.has(ct.teamId)) {
        continue;
      }
      statsMap.set(ct.teamId, {
        teamId: ct.teamId,
        teamName: ct.team.name,
        teamLogoUrl: ct.team.logoUrl,
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0
      });
    }

    const winPts = stage.config?.winPoint ?? 3;
    const drawPts = stage.config?.drawPoint ?? 1;

    for (const match of matchesList) {
      const isGroupMatch = !match.config?.round || match.config.round.toLowerCase().includes('group') || match.config.round.toLowerCase().includes('stage');
      if (stage.type === 'group_knockout' && !isGroupMatch) {
        continue;
      }

      if (isMultipleGroups && match.config?.round !== currentGroup) {
        continue;
      }

      if (match.status !== 'completed') continue;
      if (!match.homeTeamId || !match.awayTeamId) continue;

      const home = statsMap.get(match.homeTeamId);
      const away = statsMap.get(match.awayTeamId);

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

    return Array.from(statsMap.values()).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  });

  // HELPER METHODS
  hasPermission(permission: string): boolean {
    const userId = this.authService.currentUser()?.id;
    const member = this.members().find(m => m.userId === userId);
    if (!member || !member.role) return false;
    if (member.role.slug === 'owner') return true;
    return member.role.permissions?.some(p => p.slug === permission) ?? false;
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

  // COMPETITIONS CRUD
  onSelectCompetition(comp: Competition) {
    this.selectedCompetition.set(comp);
    this.activeCompetitionTab.set('matches');
    this.competitionStats.set(null);
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
        this.uiService.success(`Competition "${comp.name}" deleted successfully.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete competition.');
      }
    });
  }

  getCompetitionWinnerAndRunnerUp(comp: Competition): { winner?: string; runnerUp?: string } | null {
    if (!comp.stages || comp.stages.length === 0) return null;

    const sortedStages = [...comp.stages].sort((a, b) => a.sequence - b.sequence);
    const lastStage = sortedStages[sortedStages.length - 1];

    if (!lastStage.matches || lastStage.matches.length === 0) return null;

    const allMatchesCompleted = lastStage.matches.every((m: any) => m.status === 'completed');
    if (!allMatchesCompleted) return null;

    if (lastStage.type === 'knockout' || lastStage.type === 'group_knockout') {
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

  // STAGE & STATS HANDLERS
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

  // FIXTURE DRAFTING & GENERATION
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
      const refreshedTeams = await firstValueFrom(this.competitionService.getCompetitionTeams(ws.id, event.id, comp.id));
      this.competitionTeams.set(refreshedTeams);

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

      const result = await firstValueFrom(
        this.competitionService.generateFixtures(ws.id, event.id, comp.id)
      );

      this.uiService.success(`Fixtures generated successfully! Created ${result.matchesCreated} matches.`);
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
      this.stages.set([]);
      this.selectedStage.set(null);
      this.matches.set([]);
      this.selectedMatch.set(null);

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

  // MATCHES & LINEUP
  onSelectMatch(match: Match | null) {
    this.selectedMatch.set(match);
    this.matchLineup.set([]);
  }

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

  getKnockoutRounds(): string[] {
    const list = this.matches();
    const stage = this.selectedStage();
    if (!stage) return [];
    
    const roundsSet = new Set<string>();
    for (const m of list) {
      const round = m.config?.round;
      if (round) {
        const isGroup = round.toLowerCase().includes('group') || round.toLowerCase().includes('stage');
        if (stage.type === 'group_knockout' && isGroup) {
          continue;
        }
        roundsSet.add(round);
      }
    }
    
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
    return this.matches().filter(m => m.config?.round === roundName && (m.config?.leg === undefined || m.config?.leg === 1));
  }
}
