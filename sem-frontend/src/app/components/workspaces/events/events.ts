import { Component, OnInit, OnDestroy, signal, inject, computed, effect, model, input, ChangeDetectionStrategy } from '@angular/core';
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

// Standalone Modal Components
import { EventModalComponent } from './event-modal';
import { CompetitionModalComponent } from './competition-modal';
import { FixturesModalComponent } from './fixtures-modal';
import { LineupModalComponent } from './lineup-modal';

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
    InitialsPipe,
    EventModalComponent,
    CompetitionModalComponent,
    FixturesModalComponent,
    LineupModalComponent
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
  isResettingStages = signal(false);

  // Search
  eventSearchQuery = signal('');

  // Standalone Modal States
  isEventModalOpen = signal(false);
  editingEvent = signal<WorkspaceEvent | null>(null);

  isCompetitionModalOpen = signal(false);
  editingCompetition = signal<Competition | null>(null);

  isGenerateFixturesModalOpen = signal(false);
  isLineupModalOpen = signal(false);

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
    const enrolledTeams = this.teams(); // Using workspace teams enrolled or stages team mappings
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

    for (const t of enrolledTeams) {
      if (isMultipleGroups && !groupTeamIds.has(t.id)) {
        continue;
      }
      statsMap.set(t.id, {
        teamId: t.id,
        teamName: t.name,
        teamLogoUrl: t.logoUrl,
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
      this.events.update(prev => prev.map(e => e.id === saved.id ? saved : e));
      const curEvent = this.selectedEvent();
      if (curEvent && curEvent.id === saved.id) {
        this.selectedEvent.set(saved);
      }
    } else {
      this.events.update(prev => [...prev, saved]);
    }
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

    // Optimistic Update
    this.events.update(prev => prev.filter(e => e.id !== event.id));
    if (this.selectedEvent()?.id === event.id) {
      this.selectedEvent.set(null);
      this.competitions.set([]);
    }

    this.eventService.removeEvent(ws.id, event.id).subscribe({
      next: () => {
        this.uiService.success(`Event "${event.name}" deleted successfully.`);
      },
      error: (err) => {
        // Rollback
        this.events.set(originalEvents);
        this.uiService.error(err.error?.message ?? 'Failed to delete event.');
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
      this.competitions.update(prev => prev.map(c => c.id === saved.id ? saved : c));
      const curComp = this.selectedCompetition();
      if (curComp && curComp.id === saved.id) {
        this.selectedCompetition.set(saved);
      }
    } else {
      this.competitions.update(prev => [...prev, saved]);
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

    // Optimistic Update
    this.competitions.update(prev => prev.filter(c => c.id !== comp.id));
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
        // Rollback
        this.competitions.set(originalCompetitions);
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
        // Here we can load or store competition team mappings if needed
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
    this.isGenerateFixturesModalOpen.set(true);
  }

  onFixturesGenerated() {
    const comp = this.selectedCompetition();
    if (comp) {
      this.loadStages(comp.id);
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
    this.isLineupModalOpen.set(true);
  }

  onLineupSaved(updatedLineup: any[]) {
    this.matchLineup.set(updatedLineup);
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
