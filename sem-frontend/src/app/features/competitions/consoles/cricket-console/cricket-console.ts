import { Component, input, output, signal, inject, effect, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Match,
  Player,
  Team,
  MatchPlayer,
  CompetitionStage,
} from '../../../workspaces/services/workspace.service';
import { CompetitionService } from '../../services/competition.service';
import { UiService } from '../../../../core/services/ui.service';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';

@Component({
  selector: 'app-cricket-console',
  standalone: true,
  imports: [FormsModule, DatePipe, AvatarComponent],
  templateUrl: './cricket-console.html',
})
export class CricketConsoleComponent {
  private competitionService = inject(CompetitionService);
  private uiService = inject(UiService);

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

  cricketBowler = signal<string>('');
  cricketStriker = signal<string>('');
  cricketNonStriker = signal<string>('');
  cricketStatsTab = signal<'batting' | 'bowling'>('batting');
  cricketWicketType = signal<string>('Bowled');
  consoleMode = signal<'referee' | 'statistician'>('referee');

  hasUnpublishedBalls = computed(() => {
    const match = this.match();
    if (!match || !match.liveData || !match.liveData.inningsData) return false;
    const currentInnings = match.liveData.currentInnings || 1;
    const innings = match.liveData.inningsData[currentInnings - 1];
    if (!innings || !innings.ballsHistory) return false;
    return innings.ballsHistory.some((b: any) => b.published === false);
  });

  draftInningsStats = computed(() => {
    const match = this.match();
    if (!match || !match.liveData || !match.liveData.inningsData) return null;
    const currentInnings = match.liveData.currentInnings || 1;
    const innings = match.liveData.inningsData[currentInnings - 1];
    if (!innings) return null;

    let runs = innings.runs || 0;
    let wickets = innings.wickets || 0;
    let ballsCount = (innings.overs || 0) * 6 + (innings.balls || 0);

    const draftBalls = (innings.ballsHistory || []).filter((b: any) => b.published === false);
    for (const ball of draftBalls) {
      runs += (ball.runs || 0) + (ball.extras || 0);
      if (ball.wicket && ball.wicketType !== 'Retired Hurt') {
        wickets++;
      }
      if (ball.ballType !== 'wide' && ball.ballType !== 'no-ball') {
        ballsCount++;
      }
    }

    const overs = Math.floor(ballsCount / 6);
    const balls = ballsCount % 6;

    return { runs, wickets, overs, balls };
  });

  draftHomeScore = computed(() => {
    const match = this.match();
    if (!match) return 0;
    const live = match.liveData;
    if (!live || !live.inningsData) return match.homeScore;

    const homeInnings = live.inningsData.find((i: any) => i.battingTeamId === match.homeTeamId);
    if (!homeInnings) return 0;

    let runs = homeInnings.runs || 0;
    const draftBalls = (homeInnings.ballsHistory || []).filter((b: any) => b.published === false);
    for (const ball of draftBalls) {
      runs += (ball.runs || 0) + (ball.extras || 0);
    }
    return runs;
  });

  draftAwayScore = computed(() => {
    const match = this.match();
    if (!match) return 0;
    const live = match.liveData;
    if (!live || !live.inningsData) return match.awayScore;

    const awayInnings = live.inningsData.find((i: any) => i.battingTeamId === match.awayTeamId);
    if (!awayInnings) return 0;

    let runs = awayInnings.runs || 0;
    const draftBalls = (awayInnings.ballsHistory || []).filter((b: any) => b.published === false);
    for (const ball of draftBalls) {
      runs += (ball.runs || 0) + (ball.extras || 0);
    }
    return runs;
  });

  constructor() {
    effect(() => {
      const match = this.match();
      if (match) {
        // If the match state changes (like switching innings), we might need to reset/check striker lists.
        // Wait, the original code had:
        // this.cricketStriker.set(live.inningsData[inningsIndex].batsmanStats...)
        // But the user manually selects Bowler, Striker, and Non-Striker via select dropdowns in Cricket.
        // So we keep them as local interactive signals.
      }
    });
  }

  hasLineupForMatch(match: Match | null): boolean {
    if (!match) return false;
    const lineup = this.matchLineup();
    const homeHas = lineup.some((le) => le.teamId === match.homeTeamId && le.isPlaying);
    const awayHas = lineup.some((le) => le.teamId === match.awayTeamId && le.isPlaying);
    return homeHas && awayHas;
  }

  onRecordCricketToss(tossWinnerId: string, tossChoice: 'bat' | 'bowl', overs: number) {
    const match = this.match();
    if (!match) return;

    if (!this.hasLineupForMatch(match)) {
      this.openLineupModal.emit();
      return;
    }

    const live = match.liveData ? { ...match.liveData } : {};
    live.tossWinnerId = tossWinnerId;
    live.tossChoice = tossChoice;

    const battingTeamId =
      tossChoice === 'bat'
        ? tossWinnerId
        : tossWinnerId === match.homeTeamId
          ? match.awayTeamId
          : match.homeTeamId;
    const bowlingTeamId = battingTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

    live.inningsData = [
      {
        inningsNumber: 1,
        battingTeamId,
        bowlingTeamId,
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        batsmanStats: {},
        bowlerStats: {},
        extraRuns: 0,
        completed: false,
        ballsHistory: [],
      },
    ];
    live.currentInnings = 1;

    const updatedConfig = { ...match.config, overs };

    this.competitionService
      .updateMatch(
        this.workspaceId(),
        this.eventId(),
        this.competitionId(),
        this.stageId(),
        match.id,
        {
          liveData: live,
          status: 'live',
          config: updatedConfig,
        },
      )
      .subscribe({
        error: (err) => {
          const msg = err.error?.message || '';
          if (msg.toLowerCase().includes('lineup')) {
            this.openLineupModal.emit();
          } else {
            this.uiService.error(msg || 'Failed to start cricket match.');
          }
        },
      });
  }

  getCricketBallNumber(ballsHistory: any[] | undefined): string {
    if (!ballsHistory || ballsHistory.length === 0) {
      return '1.1';
    }
    let validBallsCount = 0;
    for (const ball of ballsHistory) {
      if (ball.ballType !== 'wide' && ball.ballType !== 'no-ball') {
        validBallsCount++;
      }
    }
    const over = Math.floor(validBallsCount / 6);
    const ballInOver = (validBallsCount % 6) + 1;
    return `${over + 1}.${ballInOver}`;
  }

  isFreeHitActive(innings: any): boolean {
    if (!innings || !innings.ballsHistory || innings.ballsHistory.length === 0) {
      return false;
    }
    const lastBall = innings.ballsHistory[innings.ballsHistory.length - 1];
    return lastBall.ballType === 'no-ball';
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  getCricketMatchResult(match: any): string {
    if (
      !match ||
      !match.liveData ||
      !match.liveData.inningsData ||
      match.liveData.inningsData.length === 0
    ) {
      return 'Match in progress';
    }
    const inningsData = match.liveData.inningsData;
    const inn1 = inningsData[0];
    const inn2 = inningsData[1];

    const team1Name =
      inn1.battingTeamId === match.homeTeamId ? match.homeTeam?.name : match.awayTeam?.name;
    const team2Name = inn2
      ? inn2.battingTeamId === match.homeTeamId
        ? match.homeTeam?.name
        : match.awayTeam?.name
      : 'Opponent';

    if (!inn2) {
      return `${team1Name} scored ${inn1.runs}/${inn1.wickets}. 2nd innings not started.`;
    }

    if (inn2.runs > inn1.runs) {
      const wicketsLeft = 10 - inn2.wickets;
      return `${team2Name} won by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}`;
    }

    if (inn2.completed || inn2.overs >= (match.config?.overs ?? 20) || inn2.wickets >= 10) {
      if (inn1.runs > inn2.runs) {
        const runDiff = inn1.runs - inn2.runs;
        return `${team1Name} won by ${runDiff} run${runDiff > 1 ? 's' : ''}`;
      } else if (inn1.runs === inn2.runs) {
        return `Match Tied`;
      }
    }

    return 'Match in progress';
  }

  getPowerplayStatus(innings: any, targetOvers: number): string {
    if (!innings) return '';
    const currentOver = innings.overs + 1;
    if (targetOvers <= 20) {
      if (currentOver <= 6) {
        return 'Powerplay (Max 2 fielders outside)';
      }
      return 'Normal Play (Max 5 fielders outside)';
    } else {
      if (currentOver <= 10) {
        return 'Powerplay 1 (Max 2 outside)';
      } else if (currentOver <= 40) {
        return 'Powerplay 2 (Max 4 outside)';
      } else {
        return 'Powerplay 3 (Max 5 outside)';
      }
    }
  }

  onRecordCricketBall(
    runs: number,
    extraRuns: number,
    wicket: boolean,
    ballType: string,
    wicketType?: string,
  ) {
    const match = this.match();
    if (!match) return;

    const isDraft = this.consoleMode() === 'statistician';

    // Fallbacks to enable quick scoring without strict selection
    const striker = this.cricketStriker() || 'Batter 1';
    const nonStriker = this.cricketNonStriker() || 'Batter 2';
    const bowler = this.cricketBowler() || 'Bowler';

    const live = { ...match.liveData };
    const inningsIndex = (live.currentInnings ?? 1) - 1;
    if (!live.inningsData || !live.inningsData[inningsIndex]) return;

    const innings = { ...live.inningsData[inningsIndex] };

    if (!innings.ballsHistory) {
      innings.ballsHistory = [];
    }
    const ballNumber = this.getCricketBallNumber(innings.ballsHistory);
    const newBall = {
      ballNumber,
      bowler,
      striker,
      nonStriker,
      runs,
      extras: extraRuns,
      wicket,
      ballType,
      wicketType,
      published: !isDraft,
      timestamp: new Date().toISOString(),
    };
    innings.ballsHistory.push(newBall);

    if (isDraft) {
      live.inningsData[inningsIndex] = innings;
      this.competitionService
        .updateMatch(
          this.workspaceId(),
          this.eventId(),
          this.competitionId(),
          this.stageId(),
          match.id,
          {
            liveData: live,
          },
        )
        .subscribe({
          next: (updated) => {
            this.matchUpdated.emit(updated);
            this.uiService.success("Draft ball recorded. Don't forget to Validate & Publish!");
          },
        });
      return;
    }

    innings.runs += runs + extraRuns;
    innings.extraRuns = (innings.extraRuns ?? 0) + extraRuns;

    if (wicket) {
      if (wicketType !== 'Retired Hurt') {
        innings.wickets += 1;
      }
      this.cricketStriker.set('');
    }

    if (ballType !== 'wide' && ballType !== 'no-ball') {
      innings.balls += 1;
      if (innings.balls >= 6) {
        innings.overs += 1;
        innings.balls = 0;
      }
    }

    if (!innings.batsmanStats) innings.batsmanStats = {};
    if (!innings.batsmanStats[striker]) {
      innings.batsmanStats[striker] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
    }
    if (ballType !== 'wide') {
      innings.batsmanStats[striker].balls += 1;
      innings.batsmanStats[striker].runs += runs;
      if (runs === 4) innings.batsmanStats[striker].fours += 1;
      if (runs === 6) innings.batsmanStats[striker].sixes += 1;
    }

    if (!innings.bowlerStats) innings.bowlerStats = {};
    if (!innings.bowlerStats[bowler]) {
      innings.bowlerStats[bowler] = {
        overs: 0,
        balls: 0,
        runsConceded: 0,
        wickets: 0,
        extraRuns: 0,
        maidens: 0,
        currentOverRuns: 0,
      };
    }
    const bowlerRunsConceded =
      ballType === 'bye' || ballType === 'leg-bye' ? runs : runs + extraRuns;
    innings.bowlerStats[bowler].runsConceded += bowlerRunsConceded;
    innings.bowlerStats[bowler].currentOverRuns =
      (innings.bowlerStats[bowler].currentOverRuns || 0) + bowlerRunsConceded;

    const bowlerExtraRuns = ballType === 'bye' || ballType === 'leg-bye' ? 0 : extraRuns;
    innings.bowlerStats[bowler].extraRuns += bowlerExtraRuns;
    if (wicket) {
      const bowlerGetsWicket = wicketType !== 'Run Out' && wicketType !== 'Retired Hurt';
      if (bowlerGetsWicket) {
        innings.bowlerStats[bowler].wickets += 1;

        const bowlerDeliveries = innings.ballsHistory.filter((b: any) => b.bowler === bowler);
        if (bowlerDeliveries.length >= 3) {
          const last3 = bowlerDeliveries.slice(-3);
          const isHatTrick = last3.every((b: any) => {
            return b.wicket && b.wicketType !== 'Run Out' && b.wicketType !== 'Retired Hurt';
          });
          if (isHatTrick) {
            this.uiService.success(
              `HAT-TRICK! ${bowler} has taken 3 wickets in 3 consecutive deliveries!`,
            );
          }
        }
      }
    }

    if (ballType !== 'wide' && ballType !== 'no-ball') {
      innings.bowlerStats[bowler].balls += 1;
      if (innings.bowlerStats[bowler].balls >= 6) {
        innings.bowlerStats[bowler].overs += 1;
        innings.bowlerStats[bowler].balls = 0;

        if (innings.bowlerStats[bowler].currentOverRuns === 0) {
          innings.bowlerStats[bowler].maidens = (innings.bowlerStats[bowler].maidens || 0) + 1;
        }
        innings.bowlerStats[bowler].currentOverRuns = 0;
      }
    }

    let runsForStrikeChange = runs;
    if (ballType === 'bye' || ballType === 'leg-bye') {
      runsForStrikeChange = extraRuns;
    }
    const shouldRotateStrike = runsForStrikeChange % 2 !== 0;

    let currentStriker = this.cricketStriker();
    let currentNonStriker = this.cricketNonStriker();

    if (wicket) {
      this.cricketStriker.set('');
    } else {
      if (shouldRotateStrike) {
        const temp = currentStriker;
        currentStriker = currentNonStriker;
        currentNonStriker = temp;
      }
      const overCompleted = ballType !== 'wide' && ballType !== 'no-ball' && innings.balls === 0;
      if (overCompleted) {
        const temp = currentStriker;
        currentStriker = currentNonStriker;
        currentNonStriker = temp;
      }
      this.cricketStriker.set(currentStriker);
      this.cricketNonStriker.set(currentNonStriker);
    }

    live.inningsData[inningsIndex] = innings;

    const homeInnings = live.inningsData.find((i: any) => i.battingTeamId === match.homeTeamId);
    const homeScore = homeInnings ? homeInnings.runs : 0;
    const awayInnings = live.inningsData.find((i: any) => i.battingTeamId === match.awayTeamId);
    const awayScore = awayInnings ? awayInnings.runs : 0;

    const targetOvers = match.config.overs ?? 20;
    const firstInnings = live.inningsData[0];
    const targetChased =
      live.currentInnings === 2 && firstInnings && innings.runs > firstInnings.runs;

    let nextStatus = match.status;

    if (innings.wickets >= 10 || innings.overs >= targetOvers || targetChased) {
      innings.completed = true;
      if (live.currentInnings === 1) {
        live.currentInnings = 2;
        live.inningsData.push({
          inningsNumber: 2,
          battingTeamId: innings.bowlingTeamId,
          bowlingTeamId: innings.battingTeamId,
          runs: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
          batsmanStats: {},
          bowlerStats: {},
          extraRuns: 0,
          completed: false,
          ballsHistory: [],
        });
        this.cricketStriker.set('');
        this.cricketNonStriker.set('');
        this.cricketBowler.set('');
      } else {
        nextStatus = 'completed';
        this.cricketStriker.set('');
        this.cricketNonStriker.set('');
        this.cricketBowler.set('');
      }
    }

    this.competitionService
      .updateMatch(
        this.workspaceId(),
        this.eventId(),
        this.competitionId(),
        this.stageId(),
        match.id,
        {
          homeScore,
          awayScore,
          status: nextStatus,
          liveData: live,
        },
      )
      .subscribe({
        next: (updated) => {
          this.matchUpdated.emit(updated);
          if (nextStatus === 'completed') {
            this.matchCompleted.emit();
          }
        },
      });
  }

  onRecordCricketWicket() {
    let type = this.cricketWicketType();
    const match = this.match();
    const currentInningsNum = match?.liveData?.currentInnings ?? 1;
    const innings = match?.liveData?.inningsData?.[currentInningsNum - 1];
    if (this.isFreeHitActive(innings)) {
      if (type !== 'Run Out' && type !== 'Retired Hurt') {
        type = 'Run Out';
      }
    }
    this.onRecordCricketBall(0, 0, true, 'wicket', type);
  }

  onUndoCricketBall() {
    const match = this.match();
    if (!match) return;

    const live = { ...match.liveData };
    const inningsIndex = (live.currentInnings ?? 1) - 1;
    if (!live.inningsData || !live.inningsData[inningsIndex]) return;

    const innings = { ...live.inningsData[inningsIndex] };
    if (!innings.ballsHistory || innings.ballsHistory.length === 0) return;

    innings.ballsHistory.pop();

    innings.runs = 0;
    innings.wickets = 0;
    innings.balls = 0;
    innings.overs = 0;
    innings.extraRuns = 0;
    innings.batsmanStats = {};
    innings.bowlerStats = {};

    const history = [...innings.ballsHistory];
    innings.ballsHistory = [];

    for (const ball of history) {
      innings.runs += ball.runs + ball.extras;
      innings.extraRuns += ball.extras;
      if (ball.wicket && ball.wicketType !== 'Retired Hurt') {
        innings.wickets += 1;
      }
      if (ball.ballType !== 'wide' && ball.ballType !== 'no-ball') {
        innings.balls += 1;
        if (innings.balls >= 6) {
          innings.overs += 1;
          innings.balls = 0;
        }
      }

      const bName = ball.striker;
      if (!innings.batsmanStats[bName]) {
        innings.batsmanStats[bName] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
      }
      if (ball.ballType !== 'wide') {
        innings.batsmanStats[bName].balls += 1;
        innings.batsmanStats[bName].runs += ball.runs;
        if (ball.runs === 4) innings.batsmanStats[bName].fours += 1;
        if (ball.runs === 6) innings.batsmanStats[bName].sixes += 1;
      }

      const bwName = ball.bowler;
      if (!innings.bowlerStats[bwName]) {
        innings.bowlerStats[bwName] = {
          overs: 0,
          balls: 0,
          runsConceded: 0,
          wickets: 0,
          extraRuns: 0,
          maidens: 0,
          currentOverRuns: 0,
        };
      }
      const bowlerRunsConceded =
        ball.ballType === 'bye' || ball.ballType === 'leg-bye'
          ? ball.runs
          : ball.runs + ball.extras;
      innings.bowlerStats[bwName].runsConceded += bowlerRunsConceded;
      innings.bowlerStats[bwName].currentOverRuns =
        (innings.bowlerStats[bwName].currentOverRuns || 0) + bowlerRunsConceded;

      const bowlerExtraRuns =
        ball.ballType === 'bye' || ball.ballType === 'leg-bye' ? 0 : ball.extras;
      innings.bowlerStats[bwName].extraRuns += bowlerExtraRuns;
      if (ball.wicket) {
        const bowlerGetsWicket =
          ball.wicketType !== 'Run Out' && ball.wicketType !== 'Retired Hurt';
        if (bowlerGetsWicket) {
          innings.bowlerStats[bwName].wickets += 1;
        }
      }
      if (ball.ballType !== 'wide' && ball.ballType !== 'no-ball') {
        innings.bowlerStats[bwName].balls += 1;
        if (innings.bowlerStats[bwName].balls >= 6) {
          innings.bowlerStats[bwName].overs += 1;
          innings.bowlerStats[bwName].balls = 0;

          if (innings.bowlerStats[bwName].currentOverRuns === 0) {
            innings.bowlerStats[bwName].maidens = (innings.bowlerStats[bwName].maidens || 0) + 1;
          }
          innings.bowlerStats[bwName].currentOverRuns = 0;
        }
      }

      innings.ballsHistory.push(ball);
    }

    live.inningsData[inningsIndex] = innings;

    const homeInnings = live.inningsData.find((i: any) => i.battingTeamId === match.homeTeamId);
    const homeScore = homeInnings ? homeInnings.runs : 0;
    const awayInnings = live.inningsData.find((i: any) => i.battingTeamId === match.awayTeamId);
    const awayScore = awayInnings ? awayInnings.runs : 0;

    let nextStatus = match.status;
    if (match.status === 'completed') {
      nextStatus = 'live';
    }

    this.competitionService
      .updateMatch(
        this.workspaceId(),
        this.eventId(),
        this.competitionId(),
        this.stageId(),
        match.id,
        {
          homeScore,
          awayScore,
          status: nextStatus,
          liveData: live,
        },
      )
      .subscribe({
        next: (updated) => {
          this.matchUpdated.emit(updated);
        },
      });
  }

  onSwitchCricketStrikers() {
    const s = this.cricketStriker();
    const ns = this.cricketNonStriker();
    this.cricketStriker.set(ns);
    this.cricketNonStriker.set(s);
  }

  getPlayersForTeam(teamId: string | null): Player[] {
    if (!teamId) return [];
    return this.players().filter((p) => p.teamId === teamId);
  }

  // ─── Match Timeline Management (Cricket Ball History) ────────────────────

  timelineFilterInnings = signal<number>(0); // 0 = All innings
  timelineFilterBallType = signal<string>('all'); // ball type filter
  timelineFilterBowler = signal<string>('all');
  timelineFilterBatsman = signal<string>('all');
  showTimelinePanel = signal<boolean>(true);

  get totalBallsCount(): number {
    const innings = this.match()?.liveData?.inningsData || [];
    return innings.reduce((acc: number, inn: any) => acc + (inn.ballsHistory?.length || 0), 0);
  }

  editingBall = signal<any | null>(null);
  editBallNote = signal<string>('');

  /** All unique bowler names across all innings */
  get timelineBowlerNames(): string[] {
    const innings: any[] = this.match()?.liveData?.inningsData ?? [];
    const names = new Set<string>();
    for (const inn of innings) {
      for (const ball of inn.ballsHistory ?? []) {
        if (ball.bowler) names.add(ball.bowler);
      }
    }
    return Array.from(names);
  }

  /** All unique batsman names across all innings */
  get timelineBatsmanNames(): string[] {
    const innings: any[] = this.match()?.liveData?.inningsData ?? [];
    const names = new Set<string>();
    for (const inn of innings) {
      for (const ball of inn.ballsHistory ?? []) {
        if (ball.striker) names.add(ball.striker);
      }
    }
    return Array.from(names);
  }

  /** All ball-history entries across innings, filtered and indexed for display */
  filteredBalls = computed(() => {
    const innings: any[] = this.match()?.liveData?.inningsData ?? [];
    const inningsFilter = this.timelineFilterInnings();
    const typeFilter = this.timelineFilterBallType();
    const bowlerFilter = this.timelineFilterBowler();
    const batsmanFilter = this.timelineFilterBatsman();

    const results: any[] = [];
    for (const inn of innings) {
      if (inningsFilter !== 0 && inn.inningsNumber !== inningsFilter) continue;
      const balls: any[] = inn.ballsHistory ?? [];
      const reversed = [...balls].reverse();
      for (let i = 0; i < reversed.length; i++) {
        const ball = reversed[i];
        if (typeFilter !== 'all' && ball.ballType !== typeFilter) continue;
        if (bowlerFilter !== 'all' && ball.bowler !== bowlerFilter) continue;
        if (batsmanFilter !== 'all' && ball.striker !== batsmanFilter) continue;
        results.push({
          ...ball,
          _inningsNumber: inn.inningsNumber,
          _originalIndex: balls.length - 1 - i, // index in the original (non-reversed) array
        });
      }
    }
    return results;
  });

  openEditBall(ball: any) {
    this.editingBall.set({ ...ball });
    this.editBallNote.set(ball._note ?? '');
  }

  cancelEditBall() {
    this.editingBall.set(null);
  }

  saveEditedBall() {
    const match = this.match();
    const editing = this.editingBall();
    if (!match || !editing) return;

    const live = { ...match.liveData };
    const inningsIdx = editing._inningsNumber - 1;
    if (!live.inningsData || !live.inningsData[inningsIdx]) return;

    const balls = [...live.inningsData[inningsIdx].ballsHistory];
    const ballIdx: number = editing._originalIndex;
    const original = { ...balls[ballIdx] };

    const auditEntry = {
      action: 'edited',
      at: new Date().toISOString(),
      previousNote: original._note ?? null,
    };

    balls[ballIdx] = {
      ...balls[ballIdx],
      _note: this.editBallNote() || undefined,
      _audit: Array.isArray(balls[ballIdx]._audit)
        ? [...balls[ballIdx]._audit, auditEntry]
        : [auditEntry],
    };

    const updatedInnings = [...live.inningsData];
    updatedInnings[inningsIdx] = { ...updatedInnings[inningsIdx], ballsHistory: balls };
    live.inningsData = updatedInnings;

    this.competitionService
      .updateMatch(
        this.workspaceId(),
        this.eventId(),
        this.competitionId(),
        this.stageId(),
        match.id,
        { liveData: live },
      )
      .subscribe({
        next: (updated) => {
          this.matchUpdated.emit(updated);
          this.editingBall.set(null);
          this.uiService.success('Ball updated and audit trail recorded.');
        },
        error: () => this.uiService.error('Failed to update ball.'),
      });
  }

  /**
   * Soft-delete a ball delivery by moving it to a _deletedBalls audit archive.
   * Note: score is NOT auto-recalculated — use "Undo Last Ball" for score correction.
   */
  deleteBall(inningsNumber: number, originalIndex: number) {
    const match = this.match();
    if (!match) return;

    const live = { ...match.liveData };
    const inningsIdx = inningsNumber - 1;
    if (!live.inningsData || !live.inningsData[inningsIdx]) return;

    const balls = [...live.inningsData[inningsIdx].ballsHistory];
    if (originalIndex < 0 || originalIndex >= balls.length) return;

    const removed = { ...balls[originalIndex] };

    const deletedEntry = {
      ...removed,
      _inningsNumber: inningsNumber,
      _deletedAt: new Date().toISOString(),
      _action: 'deleted',
    };
    live._deletedBalls = Array.isArray(live._deletedBalls)
      ? [...live._deletedBalls, deletedEntry]
      : [deletedEntry];

    balls.splice(originalIndex, 1);
    const updatedInnings = [...live.inningsData];
    updatedInnings[inningsIdx] = { ...updatedInnings[inningsIdx], ballsHistory: balls };
    live.inningsData = updatedInnings;

    this.competitionService
      .updateMatch(
        this.workspaceId(),
        this.eventId(),
        this.competitionId(),
        this.stageId(),
        match.id,
        { liveData: live },
      )
      .subscribe({
        next: (updated) => {
          this.matchUpdated.emit(updated);
          this.uiService.success('Ball removed from timeline.');
        },
        error: () => this.uiService.error('Failed to remove ball.'),
      });
  }

  onPublishCricketStats() {
    const match = this.match();
    if (!match) return;

    const live = { ...match.liveData };
    const inningsIndex = (live.currentInnings ?? 1) - 1;
    if (!live.inningsData || !live.inningsData[inningsIndex]) return;

    const innings = { ...live.inningsData[inningsIndex] };
    const balls = innings.ballsHistory || [];

    // Reset stats to replay all balls (published and draft)
    innings.runs = 0;
    innings.wickets = 0;
    innings.overs = 0;
    innings.balls = 0;
    innings.extraRuns = 0;
    innings.batsmanStats = {};
    innings.bowlerStats = {};

    for (const ball of balls) {
      ball.published = true;

      innings.runs += ball.runs + ball.extras;
      innings.extraRuns = (innings.extraRuns ?? 0) + ball.extras;

      if (ball.wicket) {
        if (ball.wicketType !== 'Retired Hurt') {
          innings.wickets += 1;
        }
      }

      if (ball.ballType !== 'wide' && ball.ballType !== 'no-ball') {
        innings.balls += 1;
        if (innings.balls >= 6) {
          innings.overs += 1;
          innings.balls = 0;
        }
      }

      const striker = ball.striker || 'Unknown Batter';
      if (!innings.batsmanStats[striker]) {
        innings.batsmanStats[striker] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
      }
      if (ball.ballType !== 'wide') {
        innings.batsmanStats[striker].balls += 1;
        innings.batsmanStats[striker].runs += ball.runs;
        if (ball.runs === 4) innings.batsmanStats[striker].fours += 1;
        if (ball.runs === 6) innings.batsmanStats[striker].sixes += 1;
      }

      const bowler = ball.bowler || 'Unknown Bowler';
      if (!innings.bowlerStats[bowler]) {
        innings.bowlerStats[bowler] = {
          overs: 0,
          balls: 0,
          runsConceded: 0,
          wickets: 0,
          extraRuns: 0,
          maidens: 0,
          currentOverRuns: 0,
        };
      }
      const bowlerRunsConceded =
        ball.ballType === 'bye' || ball.ballType === 'leg-bye'
          ? ball.runs
          : ball.runs + ball.extras;
      innings.bowlerStats[bowler].runsConceded += bowlerRunsConceded;
      innings.bowlerStats[bowler].currentOverRuns =
        (innings.bowlerStats[bowler].currentOverRuns || 0) + bowlerRunsConceded;

      const bowlerExtraRuns =
        ball.ballType === 'bye' || ball.ballType === 'leg-bye' ? 0 : ball.extras;
      innings.bowlerStats[bowler].extraRuns += bowlerExtraRuns;

      if (ball.wicket) {
        const bowlerGetsWicket =
          ball.wicketType !== 'Run Out' && ball.wicketType !== 'Retired Hurt';
        if (bowlerGetsWicket) {
          innings.bowlerStats[bowler].wickets += 1;
        }
      }

      if (ball.ballType !== 'wide' && ball.ballType !== 'no-ball') {
        innings.bowlerStats[bowler].balls += 1;
        if (innings.bowlerStats[bowler].balls >= 6) {
          innings.bowlerStats[bowler].overs += 1;
          innings.bowlerStats[bowler].balls = 0;
          if (innings.bowlerStats[bowler].currentOverRuns === 0) {
            innings.bowlerStats[bowler].maidens = (innings.bowlerStats[bowler].maidens || 0) + 1;
          }
          innings.bowlerStats[bowler].currentOverRuns = 0;
        }
      }
    }

    live.inningsData[inningsIndex] = innings;

    const homeInnings = live.inningsData.find((i: any) => i.battingTeamId === match.homeTeamId);
    const homeScore = homeInnings ? homeInnings.runs : 0;
    const awayInnings = live.inningsData.find((i: any) => i.battingTeamId === match.awayTeamId);
    const awayScore = awayInnings ? awayInnings.runs : 0;

    const targetOvers = match.config.overs ?? 20;
    const firstInnings = live.inningsData[0];
    const targetChased =
      live.currentInnings === 2 && firstInnings && innings.runs > firstInnings.runs;

    let nextStatus = match.status;

    if (innings.wickets >= 10 || innings.overs >= targetOvers || targetChased) {
      innings.completed = true;
      if (live.currentInnings === 1) {
        live.currentInnings = 2;
        live.inningsData.push({
          inningsNumber: 2,
          battingTeamId: innings.bowlingTeamId,
          bowlingTeamId: innings.battingTeamId,
          runs: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
          batsmanStats: {},
          bowlerStats: {},
          extraRuns: 0,
          completed: false,
          ballsHistory: [],
        });
        this.cricketStriker.set('');
        this.cricketNonStriker.set('');
        this.cricketBowler.set('');
      } else {
        nextStatus = 'completed';
        this.cricketStriker.set('');
        this.cricketNonStriker.set('');
        this.cricketBowler.set('');
      }
    }

    this.competitionService
      .updateMatch(
        this.workspaceId(),
        this.eventId(),
        this.competitionId(),
        this.stageId(),
        match.id,
        {
          homeScore,
          awayScore,
          status: nextStatus,
          liveData: live,
        },
      )
      .subscribe({
        next: (updated) => {
          this.matchUpdated.emit(updated);
          this.uiService.success('Cricket statistics validated and published to live scoreboards!');
          if (nextStatus === 'completed') {
            this.matchCompleted.emit();
          }
        },
      });
  }
}
