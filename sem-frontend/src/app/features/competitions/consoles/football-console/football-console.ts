import {
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CompetitionStage,
  Match,
  MatchPlayer,
  Player,
  Team,
} from '../../../workspaces/services/workspace.service';
import { UiService } from '../../../../core/services/ui.service';
import { MatchEvidencePanelComponent } from '../../components/match-evidence/match-evidence-panel';
import { MatchHighlightsPanelComponent } from '../../components/match-highlights/match-highlights-panel';
import { ConsoleMatchService } from '../_shared/services/console-match.service';
import { ConsoleTimerService } from '../_shared/services/console-timer.service';
import {
  ConsoleMode,
  FilteredFootballEvent,
  FootballCardPayload,
  FootballEditEventPayload,
  FootballEvent,
  FootballGoalPayload,
  FootballLiveData,
  FootballMatchStartOptions,
  FootballPenaltyPayload,
  FootballShootoutPenaltyPayload,
  FootballSubstitutionPayload,
} from './models/football-console.interface';
import { FootballEventLogService } from './services/football-event-log.service';
import { FootballRosterService } from './services/football-roster.service';
import { FootballTimerService } from './services/football-timer.service';
import { ModeSelectorComponent } from './components/mode-selector/mode-selector.component';
import {
  RefereeCardIntent,
  RefereeGoalIntent,
  RefereeQuickEntryComponent,
} from './components/referee-quick-entry/referee-quick-entry.component';
import { ScoreboardHeaderComponent } from './components/scoreboard-header/scoreboard-header.component';
import { MatchConfigFormComponent } from './components/match-config-form/match-config-form.component';
import { PeriodControlsComponent } from './components/period-controls/period-controls.component';
import { TeamEventsPanelComponent } from './components/team-events-panel/team-events-panel.component';
import { PenaltyShootoutComponent } from './components/penalty-shootout/penalty-shootout.component';
import { EndMatchFormComponent } from './components/end-match-form/end-match-form.component';
import { TimelinePanelComponent } from './components/timeline-panel/timeline-panel.component';
import { EditEventModalComponent } from './components/edit-event-modal/edit-event-modal.component';

@Component({
  selector: 'app-football-console',
  standalone: true,
  imports: [
    FormsModule,
    MatchEvidencePanelComponent,
    MatchHighlightsPanelComponent,
    ModeSelectorComponent,
    RefereeQuickEntryComponent,
    ScoreboardHeaderComponent,
    MatchConfigFormComponent,
    PeriodControlsComponent,
    TeamEventsPanelComponent,
    PenaltyShootoutComponent,
    EndMatchFormComponent,
    TimelinePanelComponent,
    EditEventModalComponent,
  ],
  providers: [ConsoleMatchService, ConsoleTimerService, FootballTimerService],
  templateUrl: './football-console.html',
})
export class FootballConsoleComponent implements OnDestroy {
  private uiService = inject(UiService);
  private matchApi = inject(ConsoleMatchService);
  private eventLog = inject(FootballEventLogService);
  private roster = inject(FootballRosterService);
  private footballTimer = inject(FootballTimerService);

  workspaceId = input.required<string>();
  eventId = input.required<string>();
  competitionId = input.required<string>();
  stageId = input.required<string>();
  match = input.required<Match>();
  players = input.required<Player[]>();
  teams = input.required<Team[]>();
  matchLineup = input.required<MatchPlayer[]>();
  canScore = input<boolean>(false);
  stage = input<CompetitionStage | null>(null);

  matchCompleted = output<void>();
  openLineupModal = output<void>();
  matchUpdated = output<Match>();

  readonly localElapsedSeconds = this.footballTimer.elapsedSeconds;
  readonly consoleMode = signal<ConsoleMode>('referee');
  readonly editingEvent = signal<FilteredFootballEvent | null>(null);

  readonly hasUnpublishedEvents = computed(() => {
    const events = this.match()?.liveData?.events || [];
    return events.some((e: FootballEvent) => e.published === false);
  });

  readonly draftHomeScore = computed(() => this.computeDraftScore(true));
  readonly draftAwayScore = computed(() => this.computeDraftScore(false));

  readonly periodStatus = computed(() => this.getFootballPeriodStatus());
  readonly isFootballHalfTime = computed(() => this.checkHalfTime());
  readonly isFootballFullTime = computed(() => this.checkFullTime());
  readonly isFootballExtra1Pending = computed(() => this.checkExtra1Pending());
  readonly isFootballShootoutPending = computed(() => this.checkShootoutPending());

  readonly homePlayers = computed(() =>
    this.roster.playing(this.match()?.homeTeamId, this.match(), this.players(), this.matchLineup()),
  );
  readonly awayPlayers = computed(() =>
    this.roster.playing(this.match()?.awayTeamId, this.match(), this.players(), this.matchLineup()),
  );
  readonly homeBenchPlayers = computed(() =>
    this.roster.bench(this.match()?.homeTeamId, this.match(), this.players(), this.matchLineup()),
  );
  readonly awayBenchPlayers = computed(() =>
    this.roster.bench(this.match()?.awayTeamId, this.match(), this.players(), this.matchLineup()),
  );

  constructor() {
    effect(
      () => {
        const match = this.match();
        if (match) {
          this.footballTimer.setElapsed(match.liveData?.elapsedSeconds || 0);
          if (match.status === 'live' && match.liveData?.timerRunning) {
            this.startFootballTimer();
          } else {
            this.footballTimer.stop();
          }
        } else {
          this.footballTimer.stop();
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnDestroy() {
    this.footballTimer.stop();
  }

  // ─── Timer ────────────────────────────────────────────────────────────────

  private startFootballTimer() {
    this.footballTimer.start(
      () => this.match()?.liveData ?? null,
      (cappedSeconds) => {
        const live: FootballLiveData = {
          ...this.match()!.liveData,
          timerRunning: false,
          elapsedSeconds: cappedSeconds,
        };
        this.saveFootballLiveData(live);
      },
    );
  }

  hasLineupForMatch(match: Match | null): boolean {
    if (!match) return false;
    const lineup = this.matchLineup();
    const homeHas = lineup.some((le) => le.teamId === match.homeTeamId && le.isPlaying);
    const awayHas = lineup.some((le) => le.teamId === match.awayTeamId && le.isPlaying);
    return homeHas && awayHas;
  }

  onToggleFootballTimer() {
    const match = this.match();
    if (!match) return;

    if (match.status !== 'live' && !this.hasLineupForMatch(match)) {
      this.openLineupModal.emit();
      return;
    }

    const live: FootballLiveData = { ...match.liveData };
    live.timerRunning = !live.timerRunning;
    live.elapsedSeconds = this.localElapsedSeconds();

    this.patch({ liveData: live, status: 'live' }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        if (live.timerRunning) this.startFootballTimer();
        else this.footballTimer.stop();
      },
      error: (err) => {
        const msg = err.error?.message || '';
        if (msg.toLowerCase().includes('lineup')) {
          this.openLineupModal.emit();
        } else {
          this.uiService.error(msg || 'Failed to update match status.');
        }
      },
    });
  }

  onStartFootballMatch(options: FootballMatchStartOptions) {
    const match = this.match();
    if (!match) return;

    if (!this.hasLineupForMatch(match)) {
      this.openLineupModal.emit();
      return;
    }

    const live: FootballLiveData = {
      started: true,
      halfDurationMinutes: options.halfDurationMinutes,
      enableExtraTime: options.enableExtraTime,
      enablePenaltyShootout: options.enablePenaltyShootout,
      extraTimeHalfDurationMinutes: options.extraTimeHalfDurationMinutes,
      currentHalf: 1,
      elapsedSeconds: 0,
      timerRunning: true,
      events: [],
    };

    this.patch({ liveData: live, status: 'live' }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        this.startFootballTimer();
      },
      error: (err) => {
        const msg = err.error?.message || '';
        if (msg.toLowerCase().includes('lineup')) {
          this.openLineupModal.emit();
        } else {
          this.uiService.error(msg || 'Failed to start football match.');
        }
      },
    });
  }

  onStartSecondHalf() {
    const match = this.match();
    if (!match) return;
    const live: FootballLiveData = { ...match.liveData };
    const halfDurationMinutes = live.halfDurationMinutes || 45;
    live.currentHalf = 2;
    live.elapsedSeconds = halfDurationMinutes * 60;
    live.timerRunning = true;
    this.patch({ liveData: live }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        this.startFootballTimer();
      },
    });
  }

  onStartFirstExtraHalf() {
    const match = this.match();
    if (!match) return;
    const live: FootballLiveData = { ...match.liveData };
    const halfDurationMinutes = live.halfDurationMinutes || 45;
    live.currentHalf = 3;
    live.elapsedSeconds = halfDurationMinutes * 2 * 60;
    live.timerRunning = true;
    this.patch({ liveData: live }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        this.startFootballTimer();
      },
    });
  }

  onStartSecondExtraHalf() {
    const match = this.match();
    if (!match) return;
    const live: FootballLiveData = { ...match.liveData };
    const halfDurationMinutes = live.halfDurationMinutes || 45;
    const extraHalfMinutes = live.extraTimeHalfDurationMinutes || 15;
    live.currentHalf = 4;
    live.elapsedSeconds = halfDurationMinutes * 2 * 60 + extraHalfMinutes * 60;
    live.timerRunning = true;
    this.patch({ liveData: live }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        this.startFootballTimer();
      },
    });
  }

  onStartPenaltyShootout() {
    const match = this.match();
    if (!match) return;
    const live: FootballLiveData = { ...match.liveData };
    live.currentHalf = 5;
    live.timerRunning = false;
    this.patch({ liveData: live }).subscribe({
      next: (updated) => this.matchUpdated.emit(updated),
    });
  }

  private saveFootballLiveData(live: FootballLiveData) {
    const match = this.match();
    if (!match) return;
    this.patch({ liveData: live }).subscribe({
      next: (updated) => this.matchUpdated.emit(updated),
    });
  }

  // ─── Period-status logic ──────────────────────────────────────────────────

  private getFootballPeriodStatus(): string {
    const match = this.match();
    if (!match || !match.liveData?.started) return 'Not Started';
    const live: FootballLiveData = match.liveData;
    const halfSecs = (live.halfDurationMinutes || 45) * 60;
    const currentSeconds = this.localElapsedSeconds();
    if (live.currentHalf === 1) {
      return currentSeconds >= halfSecs ? 'Half Time' : '1st Half';
    }
    if (live.currentHalf === 2) {
      if (currentSeconds >= halfSecs * 2) {
        if (live.enableExtraTime && match.homeScore === match.awayScore) {
          return 'Extra Time Pending';
        }
        return 'Full Time';
      }
      return '2nd Half';
    }
    if (live.currentHalf === 3) {
      const extraHalfMinutes = live.extraTimeHalfDurationMinutes || 15;
      const extra1Limit = halfSecs * 2 + extraHalfMinutes * 60;
      return currentSeconds >= extra1Limit ? 'Extra Half Time' : '1st Extra Half';
    }
    if (live.currentHalf === 4) {
      const extraHalfMinutes = live.extraTimeHalfDurationMinutes || 15;
      const extra2Limit = halfSecs * 2 + extraHalfMinutes * 2 * 60;
      if (currentSeconds >= extra2Limit) {
        if (live.enablePenaltyShootout && match.homeScore === match.awayScore) {
          return 'Penalty Shootout Pending';
        }
        return 'Extra Full Time';
      }
      return '2nd Extra Half';
    }
    if (live.currentHalf === 5) return 'Penalty Shootout';
    return '';
  }

  private checkHalfTime(): boolean {
    const match = this.match();
    if (!match || !match.liveData?.started) return false;
    const live: FootballLiveData = match.liveData;
    const halfSecs = (live.halfDurationMinutes || 45) * 60;
    return live.currentHalf === 1 && this.localElapsedSeconds() >= halfSecs;
  }

  private checkFullTime(): boolean {
    const match = this.match();
    if (!match || !match.liveData?.started) return false;
    const live: FootballLiveData = match.liveData;
    const halfSecs = (live.halfDurationMinutes || 45) * 60;
    return live.currentHalf === 2 && this.localElapsedSeconds() >= halfSecs * 2;
  }

  private checkExtra1Pending(): boolean {
    const match = this.match();
    if (!match || !match.liveData?.started) return false;
    const live: FootballLiveData = match.liveData;
    const halfSecs = (live.halfDurationMinutes || 45) * 60;
    return (
      live.currentHalf === 2 &&
      this.localElapsedSeconds() >= halfSecs * 2 &&
      !!live.enableExtraTime &&
      match.homeScore === match.awayScore
    );
  }

  private checkShootoutPending(): boolean {
    const match = this.match();
    if (!match || !match.liveData?.started) return false;
    const live: FootballLiveData = match.liveData;
    const halfSecs = (live.halfDurationMinutes || 45) * 60;
    const extraHalfMinutes = live.extraTimeHalfDurationMinutes || 15;
    const extra2Limit = halfSecs * 2 + extraHalfMinutes * 2 * 60;
    return (
      live.currentHalf === 4 &&
      this.localElapsedSeconds() >= extra2Limit &&
      !!live.enablePenaltyShootout &&
      match.homeScore === match.awayScore
    );
  }

  // ─── Event recording ──────────────────────────────────────────────────────

  onRecordFootballGoal(payload: FootballGoalPayload) {
    const match = this.match();
    if (!match) return;

    const isDraft = this.consoleMode() === 'statistician';
    let live = this.eventLog.cloneLive(match.liveData);
    const currentMin = this.eventLog.minuteFromSeconds(this.localElapsedSeconds());

    const { teamId, goalType, scorerId, scorerCustomName, assistId, assistCustomName } = payload;

    live = this.eventLog.pushEvent(live, {
      type: 'goal',
      goalType: goalType || 'regular',
      teamId,
      playerUserId: scorerId && scorerId !== 'unregistered' ? scorerId : undefined,
      playerName: scorerId === 'unregistered' ? scorerCustomName : undefined,
      assistPlayerUserId: assistId && assistId !== 'unregistered' ? assistId : undefined,
      assistPlayerName: assistId === 'unregistered' ? assistCustomName : undefined,
      minute: currentMin,
      published: !isDraft,
    });

    const isHome = teamId === match.homeTeamId;
    let newHomeScore = match.homeScore;
    let newAwayScore = match.awayScore;

    if (!isDraft) {
      if (goalType === 'own_goal') {
        if (isHome) newAwayScore += 1;
        else newHomeScore += 1;
      } else {
        if (isHome) newHomeScore += 1;
        else newAwayScore += 1;
      }
    }

    live.elapsedSeconds = this.localElapsedSeconds();

    this.patch({ homeScore: newHomeScore, awayScore: newAwayScore, liveData: live }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        if (isDraft) {
          this.uiService.success("Draft goal recorded. Don't forget to Validate & Publish!");
        }
      },
    });
  }

  onRecordFootballCard(payload: FootballCardPayload) {
    const match = this.match();
    if (!match) return;

    const isDraft = this.consoleMode() === 'statistician';
    let live = this.eventLog.cloneLive(match.liveData);
    const currentMin = this.eventLog.minuteFromSeconds(this.localElapsedSeconds());

    const { teamId, playerId, cardType } = payload;
    let finalCardType: 'yellow' | 'red' | 'second_yellow' = cardType;
    if (cardType === 'yellow' && this.eventLog.countYellowsFor(live, playerId) >= 1) {
      finalCardType = 'second_yellow';
    }

    live = this.eventLog.pushEvent(live, {
      type: 'card',
      teamId,
      playerUserId: playerId,
      cardType: finalCardType,
      minute: currentMin,
      published: !isDraft,
    });
    live.elapsedSeconds = this.localElapsedSeconds();

    this.patch({ liveData: live }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        if (isDraft) {
          this.uiService.success("Draft card recorded. Don't forget to Validate & Publish!");
        }
      },
    });
  }

  onRecordFootballPenalty(payload: FootballPenaltyPayload) {
    const match = this.match();
    if (!match) return;

    const isDraft = this.consoleMode() === 'statistician';
    let live = this.eventLog.cloneLive(match.liveData);
    const currentMin = this.eventLog.minuteFromSeconds(this.localElapsedSeconds());

    const { teamId, kickerId, outcome } = payload;

    live = this.eventLog.pushEvent(live, {
      type: 'penalty',
      teamId,
      playerUserId: kickerId,
      outcome,
      minute: currentMin,
      published: !isDraft,
    });

    let newHomeScore = match.homeScore;
    let newAwayScore = match.awayScore;

    if (outcome === 'scored') {
      live = this.eventLog.pushEvent(live, {
        type: 'goal',
        goalType: 'penalty',
        teamId,
        playerUserId: kickerId,
        minute: currentMin,
        published: !isDraft,
      });

      if (!isDraft) {
        if (teamId === match.homeTeamId) newHomeScore += 1;
        else newAwayScore += 1;
      }
    }

    live.elapsedSeconds = this.localElapsedSeconds();

    this.patch({ homeScore: newHomeScore, awayScore: newAwayScore, liveData: live }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        if (isDraft) {
          this.uiService.success("Draft penalty recorded. Don't forget to Validate & Publish!");
        }
      },
    });
  }

  onRecordFootballSubstitution(payload: FootballSubstitutionPayload) {
    const match = this.match();
    if (!match) return;
    const isDraft = this.consoleMode() === 'statistician';
    let live = this.eventLog.cloneLive(match.liveData);
    const currentMin = this.eventLog.minuteFromSeconds(this.localElapsedSeconds());
    const { teamId, playerOutId, playerInId, reason } = payload;

    live = this.eventLog.pushEvent(live, {
      type: 'substitution',
      teamId,
      playerOutId,
      playerInId,
      reason,
      minute: currentMin,
      published: !isDraft,
    });
    live.elapsedSeconds = this.localElapsedSeconds();

    this.patch({ liveData: live }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        if (isDraft) this.uiService.success('Draft substitution recorded.');
      },
    });
  }

  onRecordFootballShootoutPenalty(payload: FootballShootoutPenaltyPayload) {
    const match = this.match();
    if (!match) return;
    let live = this.eventLog.cloneLive(match.liveData);
    const { teamId, playerUserId, outcome } = payload;

    const shootoutEvents = (live.events ?? []).filter((e) => e.type === 'shootout_penalty');
    const order = shootoutEvents.length + 1;

    live = this.eventLog.pushEvent(live, {
      type: 'shootout_penalty',
      teamId,
      playerUserId,
      outcome,
      order,
      minute: 120,
    });

    live.shootoutHomeScore = live.shootoutHomeScore ?? 0;
    live.shootoutAwayScore = live.shootoutAwayScore ?? 0;

    if (outcome === 'scored') {
      if (teamId === match.homeTeamId) live.shootoutHomeScore += 1;
      else live.shootoutAwayScore += 1;
    }

    this.patch({ liveData: live }).subscribe({
      next: (updated) => this.matchUpdated.emit(updated),
    });
  }

  onEndMatchWithResult(result: string) {
    const match = this.match();
    if (!match || !result) return;
    const live: FootballLiveData = match.liveData ? { ...match.liveData } : {};
    live.result = result;
    live.elapsedSeconds = this.localElapsedSeconds();

    this.patch({ status: 'completed', liveData: live }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        this.footballTimer.stop();
        this.matchCompleted.emit();
      },
    });
  }

  // ─── Timeline: edit + delete ──────────────────────────────────────────────

  openEditEvent(event: FilteredFootballEvent) {
    this.editingEvent.set({ ...event });
  }

  cancelEditEvent() {
    this.editingEvent.set(null);
  }

  saveEditedEvent(payload: FootballEditEventPayload) {
    const match = this.match();
    if (!match) return;
    let live = this.eventLog.cloneLive(match.liveData);
    live = this.eventLog.applyEdit(live, payload.originalIndex, payload.minute, payload.note ?? '');

    this.patch({ liveData: live }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        this.editingEvent.set(null);
        this.uiService.success('Event updated and audit trail recorded.');
      },
      error: () => this.uiService.error('Failed to update event.'),
    });
  }

  deleteEvent(originalIndex: number) {
    const match = this.match();
    if (!match) return;
    let live = this.eventLog.cloneLive(match.liveData);
    const { live: nextLive, removed } = this.eventLog.removeAt(live, originalIndex);
    if (!removed) return;
    live = this.eventLog.archiveDeleted(nextLive, removed);

    if (removed.type === 'goal') {
      const isHome = removed.teamId === match.homeTeamId;
      const isOwnGoal = removed.goalType === 'own_goal';
      let newHomeScore = match.homeScore;
      let newAwayScore = match.awayScore;
      if (isOwnGoal) {
        if (isHome) newAwayScore = Math.max(0, newAwayScore - 1);
        else newHomeScore = Math.max(0, newHomeScore - 1);
      } else {
        if (isHome) newHomeScore = Math.max(0, newHomeScore - 1);
        else newAwayScore = Math.max(0, newAwayScore - 1);
      }
      this.patch({ homeScore: newHomeScore, awayScore: newAwayScore, liveData: live }).subscribe({
        next: (updated) => {
          this.matchUpdated.emit(updated);
          this.uiService.success('Goal event removed and score adjusted.');
        },
        error: () => this.uiService.error('Failed to remove event.'),
      });
      return;
    }

    this.patch({ liveData: live }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        this.uiService.success('Event removed.');
      },
      error: () => this.uiService.error('Failed to remove event.'),
    });
  }

  // ─── Referee quick-entry ──────────────────────────────────────────────────

  onRefereeGoal(intent: RefereeGoalIntent) {
    const match = this.match();
    if (!match) return;
    const { teamId, delta } = intent;

    const isHome = teamId === match.homeTeamId;
    const newHomeScore = Math.max(0, match.homeScore + (isHome ? delta : 0));
    const newAwayScore = Math.max(0, match.awayScore + (isHome ? 0 : delta));

    let live = this.eventLog.cloneLive(match.liveData);

    if (delta > 0) {
      const currentMin = this.eventLog.minuteFromSeconds(this.localElapsedSeconds());
      live = this.eventLog.pushEvent(live, {
        type: 'goal',
        goalType: 'normal',
        teamId,
        minute: currentMin,
        playerName: 'Quick Goal',
        published: true,
      });
    } else {
      const lastGoalIdx = this.eventLog.findLastGoalIndex(live, teamId);
      if (lastGoalIdx !== -1) {
        const { live: nextLive, removed } = this.eventLog.removeAt(live, lastGoalIdx);
        if (removed) live = this.eventLog.archiveDeleted(nextLive, removed);
      }
    }

    live.elapsedSeconds = this.localElapsedSeconds();
    this.patch({ homeScore: newHomeScore, awayScore: newAwayScore, liveData: live }).subscribe({
      next: (updated) => this.matchUpdated.emit(updated),
    });
  }

  onRefereeCard(intent: RefereeCardIntent) {
    const match = this.match();
    if (!match) return;
    let live = this.eventLog.cloneLive(match.liveData);
    const currentMin = this.eventLog.minuteFromSeconds(this.localElapsedSeconds());

    live = this.eventLog.pushEvent(live, {
      type: 'card',
      teamId: intent.teamId,
      cardType: intent.cardType,
      minute: currentMin,
      playerName: 'Quick Card',
      published: true,
    });
    live.elapsedSeconds = this.localElapsedSeconds();

    this.patch({ liveData: live }).subscribe({
      next: (updated) => this.matchUpdated.emit(updated),
    });
  }

  onPublishStats() {
    const match = this.match();
    if (!match) return;
    let live = this.eventLog.cloneLive(match.liveData);

    let newHomeScore = match.homeScore;
    let newAwayScore = match.awayScore;

    const draftGoals = (live.events ?? []).filter(
      (e) => e.published === false && e.type === 'goal',
    );
    for (const dg of draftGoals) {
      const isHomeGoal =
        dg.goalType === 'own_goal'
          ? dg.teamId === match.awayTeamId
          : dg.teamId === match.homeTeamId;
      if (isHomeGoal) newHomeScore++;
      else newAwayScore++;
    }

    live = this.eventLog.publishAll(live);
    live.elapsedSeconds = this.localElapsedSeconds();

    this.patch({ homeScore: newHomeScore, awayScore: newAwayScore, liveData: live }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        this.uiService.success('Statistics validated and published successfully!');
      },
    });
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private computeDraftScore(forHome: boolean): number {
    const match = this.match();
    if (!match) return 0;
    const base = forHome ? match.homeScore || 0 : match.awayScore || 0;
    let score = base;
    const draftGoals = ((match.liveData?.events || []) as FootballEvent[]).filter(
      (e) => e.published === false && e.type === 'goal',
    );
    for (const dg of draftGoals) {
      const isHomeGoal =
        dg.goalType === 'own_goal'
          ? dg.teamId === match.awayTeamId
          : dg.teamId === match.homeTeamId;
      if (forHome && isHomeGoal) score++;
      else if (!forHome && !isHomeGoal) score++;
    }
    return score;
  }

  private patch(payload: Parameters<ConsoleMatchService['patch']>[1]) {
    return this.matchApi.patch(
      {
        workspaceId: this.workspaceId(),
        eventId: this.eventId(),
        competitionId: this.competitionId(),
        stageId: this.stageId(),
        matchId: this.match()!.id,
      },
      payload,
    );
  }
}
