import { Component, input, output, signal, inject, effect, OnDestroy, computed } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Match, Player, Team, MatchPlayer, CompetitionStage } from '../../../../services/workspace.service';
import { CompetitionService } from '../../../../services/competition.service';
import { UiService } from '../../../../services/ui.service';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';
import { RatingColorPipe } from '../../../../shared/pipes/rating-color.pipe';

@Component({
  selector: 'app-badminton-console',
  standalone: true,
  imports: [NgClass, FormsModule, AvatarComponent, RatingColorPipe, DatePipe],
  templateUrl: './badminton-console.html',
})
export class BadmintonConsoleComponent implements OnDestroy {
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

  badmintonMatchType = signal<string>('Singles');
  badmintonMatchStatus = signal<string>('Scheduled');
  badmintonServer = signal<string>('');
  badmintonReceiver = signal<string>('');
  badmintonServiceCourt = signal<'Right' | 'Left'>('Right');
  badmintonServiceNumber = signal<number>(1);
  badmintonReason = signal<string>('Winner');
  badmintonLetReason = signal<string>('Shuttle touched net assembly');
  badmintonDuration = signal<number>(0);
  badmintonTimerRunning = signal<boolean>(false);
  badmintonTimerInterval: any = null;

  constructor() {
    effect(() => {
      const match = this.match();
      if (match) {
        this.badmintonMatchType.set(match.config?.matchType || 'Singles');
        this.badmintonMatchStatus.set(match.liveData?.matchStatus || 'Scheduled');
        this.badmintonServer.set(match.liveData?.currentServer || '');
        this.badmintonReceiver.set(match.liveData?.currentReceiver || '');
        this.badmintonServiceCourt.set(match.liveData?.currentServiceCourt || 'Right');
        this.badmintonServiceNumber.set(match.liveData?.serviceNumber || 1);
      }
    });
  }

  ngOnDestroy() {
    this.stopBadmintonTimer();
  }

  startBadmintonTimer() {
    if (this.badmintonTimerInterval) return;
    this.badmintonTimerRunning.set(true);
    this.badmintonTimerInterval = setInterval(() => {
      this.badmintonDuration.update(d => d + 1);
    }, 1000);
  }

  stopBadmintonTimer() {
    if (this.badmintonTimerInterval) {
      clearInterval(this.badmintonTimerInterval);
      this.badmintonTimerInterval = null;
    }
    this.badmintonTimerRunning.set(false);
  }

  toggleBadmintonTimer() {
    if (this.badmintonTimerRunning()) {
      this.stopBadmintonTimer();
    } else {
      this.startBadmintonTimer();
    }
  }

  onServerChange(serverName: string) {
    this.badmintonServer.set(serverName);
    const match = this.match();
    if (match) {
      const court = this.getAutoServiceCourt(match, serverName);
      this.badmintonServiceCourt.set(court);
      
      const homePlayers = this.getPlayersForTeam(match.homeTeamId);
      const isHomeServer = homePlayers.some(p => p.user.username === serverName);
      
      const serverTeamPlayers = isHomeServer ? homePlayers : this.getPlayersForTeam(match.awayTeamId);
      const receiverTeamPlayers = isHomeServer ? this.getPlayersForTeam(match.awayTeamId) : homePlayers;
      
      const currentReceiver = this.badmintonReceiver();
      const isReceiverInvalid = !currentReceiver || serverTeamPlayers.some(p => p.user.username === currentReceiver);
      
      if (isReceiverInvalid && receiverTeamPlayers.length > 0) {
        this.badmintonReceiver.set(receiverTeamPlayers[0].user.username);
      }
    }
  }

  hasLineupForMatch(match: Match | null): boolean {
    if (!match) return false;
    const lineup = this.matchLineup();
    const homeHas = lineup.some(le => le.teamId === match.homeTeamId && le.isPlaying);
    const awayHas = lineup.some(le => le.teamId === match.awayTeamId && le.isPlaying);
    return homeHas && awayHas;
  }

  onRecordBadmintonRally(winnerSide: 'home' | 'away') {
    const match = this.match();
    if (!match) return;

    const live = match.liveData ? { ...match.liveData } : {};
    if (!live.setsScore) {
      live.setsScore = [{ home: 0, away: 0 }];
      live.currentSet = 1;
      live.homeSetsWon = 0;
      live.awaySetsWon = 0;
      live.rallies = [];
    }
    if (!live.rallies) {
      live.rallies = [];
    }

    const currentSetNum = live.currentSet ?? 1;
    const setIndex = currentSetNum - 1;
    if (!live.setsScore[setIndex]) {
      live.setsScore[setIndex] = { home: 0, away: 0 };
    }

    const setScore = { ...live.setsScore[setIndex] };
    if (winnerSide === 'home') {
      setScore.home += 1;
    } else {
      setScore.away += 1;
    }
    live.setsScore[setIndex] = setScore;

    const server = this.badmintonServer() || 'Unknown';
    const receiver = this.badmintonReceiver() || 'Unknown';
    const reason = this.badmintonReason() || 'Winner';
    const duration = this.badmintonDuration();
    const serviceCourt = this.badmintonServiceCourt();
    const serviceNumber = this.badmintonServiceNumber();

    live.rallies.push({
      set: currentSetNum,
      server,
      receiver,
      serviceCourt,
      serviceNumber,
      winner: winnerSide === 'home' ? (match.homeTeam?.name || 'Home') : (match.awayTeam?.name || 'Away'),
      winnerSide,
      reason,
      duration,
      scoreAfter: { home: setScore.home, away: setScore.away }
    });

    const homeScore = setScore.home;
    const awayScore = setScore.away;
    const setsToWin = match.config.setsToWin ?? 2;
    let setWon = false;
    let setWinner: 'home' | 'away' | null = null;

    if ((homeScore >= 21 && homeScore - awayScore >= 2) || homeScore === 30) {
      setWon = true;
      setWinner = 'home';
    } else if ((awayScore >= 21 && awayScore - homeScore >= 2) || awayScore === 30) {
      setWon = true;
      setWinner = 'away';
    }

    let dbStatus = match.status;

    if (setWon) {
      if (setWinner === 'home') {
        live.homeSetsWon += 1;
      } else {
        live.awaySetsWon += 1;
      }

      if (live.homeSetsWon >= setsToWin || live.awaySetsWon >= setsToWin) {
        dbStatus = 'completed';
        live.matchStatus = 'Finished';
      } else {
        live.currentSet += 1;
        live.setsScore.push({ home: 0, away: 0 });
        live.matchStatus = live.currentSet === 2 ? 'SecondGame' : 'ThirdGame';
      }
    } else {
      dbStatus = 'live';
      live.matchStatus = currentSetNum === 1 ? 'FirstGame' : currentSetNum === 2 ? 'SecondGame' : 'ThirdGame';
    }

    this.stopBadmintonTimer();
    this.badmintonDuration.set(0);

    const isDoubles = (match.config?.matchType || "").toLowerCase().includes('doubles');
    this.rotateBadmintonPlayers(live, winnerSide, isDoubles);

    this.competitionService.updateMatch(this.workspaceId(), this.eventId(), this.competitionId(), this.stageId(), match.id, {
      homeScore: live.homeSetsWon,
      awayScore: live.awaySetsWon,
      status: dbStatus,
      liveData: live,
    }).subscribe({
      next: (updated) => {
        if (dbStatus === 'completed') {
          this.matchCompleted.emit();
        }
      }
    });
  }

  onRecordBadmintonLet(letReason: string) {
    const match = this.match();
    if (!match) return;

    const live = match.liveData ? { ...match.liveData } : {};
    if (!live.setsScore) {
      live.setsScore = [{ home: 0, away: 0 }];
      live.currentSet = 1;
      live.homeSetsWon = 0;
      live.awaySetsWon = 0;
      live.rallies = [];
    }
    if (!live.rallies) {
      live.rallies = [];
    }

    const currentSetNum = live.currentSet ?? 1;
    const setIndex = currentSetNum - 1;
    if (!live.setsScore[setIndex]) {
      live.setsScore[setIndex] = { home: 0, away: 0 };
    }
    const setScore = live.setsScore[setIndex];

    live.rallies.push({
      set: currentSetNum,
      server: this.badmintonServer() || 'Unknown',
      receiver: this.badmintonReceiver() || 'Unknown',
      serviceCourt: this.badmintonServiceCourt(),
      serviceNumber: this.badmintonServiceNumber(),
      winner: 'None',
      winnerSide: 'none',
      reason: letReason,
      duration: this.badmintonDuration(),
      scoreAfter: { home: setScore.home, away: setScore.away }
    });

    this.stopBadmintonTimer();
    this.badmintonDuration.set(0);

    this.competitionService.updateMatch(this.workspaceId(), this.eventId(), this.competitionId(), this.stageId(), match.id, {
      liveData: live,
    }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
      }
    });
  }

  rotateBadmintonPlayers(live: any, winnerSide: 'home' | 'away', isDoubles: boolean) {
    const match = this.match();
    if (!match) return;

    const prevServer = live.currentServer || this.badmintonServer();
    const homePlayers = this.getPlayersForTeam(match.homeTeamId);
    const isHomeServer = homePlayers.some(p => p.user.username === prevServer);
    const prevServingSide: 'home' | 'away' = isHomeServer ? 'home' : 'away';

    let homeRight = live.homeRightPlayer || (homePlayers[0]?.user?.username ?? '');
    let homeLeft = live.homeLeftPlayer || (homePlayers[1]?.user?.username ?? '');
    const awayPlayers = this.getPlayersForTeam(match.awayTeamId);
    let awayRight = live.awayRightPlayer || (awayPlayers[0]?.user?.username ?? '');
    let awayLeft = live.awayLeftPlayer || (awayPlayers[1]?.user?.username ?? '');

    const currentSetNum = live.currentSet ?? 1;
    const setScore = live.setsScore[currentSetNum - 1] || { home: 0, away: 0 };

    if (winnerSide === prevServingSide) {
      if (winnerSide === 'home') {
        if (isDoubles) {
          const temp = homeRight;
          homeRight = homeLeft;
          homeLeft = temp;
        }
        live.currentServer = prevServer;
      } else {
        if (isDoubles) {
          const temp = awayRight;
          awayRight = awayLeft;
          awayLeft = temp;
        }
        live.currentServer = prevServer;
      }
      live.serviceNumber = (live.serviceNumber || 1) + 1;
    } else {
      const newServingSideScore = winnerSide === 'home' ? setScore.home : setScore.away;
      if (newServingSideScore % 2 === 0) {
        live.currentServer = winnerSide === 'home' ? homeRight : awayRight;
      } else {
        live.currentServer = winnerSide === 'home' ? homeLeft : awayLeft;
      }
      live.serviceNumber = 1;
    }

    const newServerScore = winnerSide === 'home' ? setScore.home : setScore.away;
    if (newServerScore % 2 === 0) {
      live.currentReceiver = winnerSide === 'home' ? awayRight : homeRight;
      live.currentServiceCourt = 'Right';
    } else {
      live.currentReceiver = winnerSide === 'home' ? awayLeft : homeLeft;
      live.currentServiceCourt = 'Left';
    }

    live.homeRightPlayer = homeRight;
    live.homeLeftPlayer = homeLeft;
    live.awayRightPlayer = awayRight;
    live.awayLeftPlayer = awayLeft;
  }

  getAutoServiceCourt(match: Match | null, serverName: string): 'Right' | 'Left' {
    if (!match || !serverName) return 'Right';
    
    const homePlayers = this.getPlayersForTeam(match.homeTeamId);
    const isHome = homePlayers.some(p => p.user.username === serverName);
    
    const awayPlayers = this.getPlayersForTeam(match.awayTeamId);
    const isAway = awayPlayers.some(p => p.user.username === serverName);

    const servingSide: 'home' | 'away' = isAway && !isHome ? 'away' : 'home';

    const currentSetNum = match.liveData?.currentSet ?? 1;
    const setScore = match.liveData?.setsScore?.[currentSetNum - 1] || { home: 0, away: 0 };
    const score = servingSide === 'home' ? setScore.home : setScore.away;

    return score % 2 === 0 ? 'Right' : 'Left';
  }

  onRecordBadmintonPoint(side: 'home' | 'away', change: number) {
    const match = this.match();
    if (!match) return;

    const live = match.liveData ? { ...match.liveData } : {};
    if (!live.setsScore) {
      live.setsScore = [{ home: 0, away: 0 }];
      live.currentSet = 1;
      live.homeSetsWon = 0;
      live.awaySetsWon = 0;
      live.rallies = [];
    }

    const currentSetNum = live.currentSet ?? 1;
    const setIndex = currentSetNum - 1;
    if (!live.setsScore[setIndex]) {
      live.setsScore[setIndex] = { home: 0, away: 0 };
    }

    const setScore = { ...live.setsScore[setIndex] };
    if (side === 'home') {
      setScore.home = Math.max(0, setScore.home + change);
    } else {
      setScore.away = Math.max(0, setScore.away + change);
    }
    live.setsScore[setIndex] = setScore;

    const homeScore = setScore.home;
    const awayScore = setScore.away;
    const setsToWin = match.config.setsToWin ?? 2;
    let setWon = false;
    let setWinner: 'home' | 'away' | null = null;

    if ((homeScore >= 21 && homeScore - awayScore >= 2) || homeScore === 30) {
      setWon = true;
      setWinner = 'home';
    } else if ((awayScore >= 21 && awayScore - homeScore >= 2) || awayScore === 30) {
      setWon = true;
      setWinner = 'away';
    }

    let dbStatus = match.status;

    if (setWon) {
      if (setWinner === 'home') {
        live.homeSetsWon += 1;
      } else {
        live.awaySetsWon += 1;
      }

      if (live.homeSetsWon >= setsToWin || live.awaySetsWon >= setsToWin) {
        dbStatus = 'completed';
        live.matchStatus = 'Finished';
      } else {
        live.currentSet += 1;
        live.setsScore.push({ home: 0, away: 0 });
        live.matchStatus = live.currentSet === 2 ? 'SecondGame' : 'ThirdGame';
      }
    } else {
      dbStatus = 'live';
      live.matchStatus = currentSetNum === 1 ? 'FirstGame' : currentSetNum === 2 ? 'SecondGame' : 'ThirdGame';
    }

    this.recalculateLiveServiceDetails(match, live);

    this.competitionService.updateMatch(this.workspaceId(), this.eventId(), this.competitionId(), this.stageId(), match.id, {
      homeScore: live.homeSetsWon,
      awayScore: live.awaySetsWon,
      status: dbStatus,
      liveData: live,
    }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        if (dbStatus === 'completed') {
          this.matchCompleted.emit();
        }
      }
    });
  }

  onSwapHomePositions() {
    const match = this.match();
    if (!match) return;

    const live = match.liveData ? { ...match.liveData } : {};
    const homePlayers = this.getPlayersForTeam(match.homeTeamId);
    const homeRight = live.homeRightPlayer || (homePlayers[0]?.user?.username ?? '');
    const homeLeft = live.homeLeftPlayer || (homePlayers[1]?.user?.username ?? '');

    live.homeRightPlayer = homeLeft;
    live.homeLeftPlayer = homeRight;

    this.recalculateLiveServiceDetails(match, live);

    this.competitionService.updateMatch(this.workspaceId(), this.eventId(), this.competitionId(), this.stageId(), match.id, {
      liveData: live
    }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
      }
    });
  }

  onSwapAwayPositions() {
    const match = this.match();
    if (!match) return;

    const live = match.liveData ? { ...match.liveData } : {};
    const awayPlayers = this.getPlayersForTeam(match.awayTeamId);
    const awayRight = live.awayRightPlayer || (awayPlayers[0]?.user?.username ?? '');
    const awayLeft = live.awayLeftPlayer || (awayPlayers[1]?.user?.username ?? '');

    live.awayRightPlayer = awayLeft;
    live.awayLeftPlayer = awayRight;

    this.recalculateLiveServiceDetails(match, live);

    this.competitionService.updateMatch(this.workspaceId(), this.eventId(), this.competitionId(), this.stageId(), match.id, {
      liveData: live
    }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
      }
    });
  }

  recalculateLiveServiceDetails(match: Match, live: any) {
    const serverName = this.badmintonServer();
    if (!serverName) return;

    const homeRight = live.homeRightPlayer || '';
    const homeLeft = live.homeLeftPlayer || '';
    const awayRight = live.awayRightPlayer || '';
    const awayLeft = live.awayLeftPlayer || '';

    const homePlayers = this.getPlayersForTeam(match.homeTeamId);
    const isHomeServer = homePlayers.some(p => p.user.username === serverName);

    const currentSetNum = live.currentSet ?? 1;
    const setScore = live.setsScore?.[currentSetNum - 1] || { home: 0, away: 0 };
    const score = isHomeServer ? setScore.home : setScore.away;

    if (score % 2 === 0) {
      live.currentServiceCourt = 'Right';
      live.currentReceiver = isHomeServer ? awayRight : homeRight;
    } else {
      live.currentServiceCourt = 'Left';
      live.currentReceiver = isHomeServer ? awayLeft : homeLeft;
    }

    this.badmintonReceiver.set(live.currentReceiver || '');
    this.badmintonServiceCourt.set(live.currentServiceCourt || 'Right');
  }

  onUndoBadmintonRally() {
    const match = this.match();
    if (!match) return;

    const live = match.liveData ? { ...match.liveData } : {};
    if (!live.rallies || live.rallies.length === 0) return;

    live.rallies.pop();

    live.currentSet = 1;
    live.setsScore = [{ home: 0, away: 0 }];
    live.homeSetsWon = 0;
    live.awaySetsWon = 0;
    live.matchStatus = 'FirstGame';
    
    const homePlayers = this.getPlayersForTeam(match.homeTeamId);
    const awayPlayers = this.getPlayersForTeam(match.awayTeamId);
    live.homeRightPlayer = homePlayers[0]?.user?.username ?? '';
    live.homeLeftPlayer = homePlayers[1]?.user?.username ?? '';
    live.awayRightPlayer = awayPlayers[0]?.user?.username ?? '';
    live.awayLeftPlayer = awayPlayers[1]?.user?.username ?? '';
    live.currentServer = live.homeRightPlayer;
    live.currentReceiver = live.awayRightPlayer;
    live.currentServiceCourt = 'Right';
    live.serviceNumber = 1;

    const setsToWin = match.config.setsToWin ?? 2;
    const isDoubles = (match.config?.matchType || "").toLowerCase().includes('doubles');

    for (const rally of live.rallies) {
      if (rally.winnerSide === 'none') {
        continue;
      }

      const sIdx = live.currentSet - 1;
      if (!live.setsScore[sIdx]) {
        live.setsScore[sIdx] = { home: 0, away: 0 };
      }

      if (rally.winnerSide === 'home') {
        live.setsScore[sIdx].home += 1;
      } else {
        live.setsScore[sIdx].away += 1;
      }

      this.rotateBadmintonPlayers(live, rally.winnerSide, isDoubles);

      const hScore = live.setsScore[sIdx].home;
      const aScore = live.setsScore[sIdx].away;

      let setWon = false;
      if ((hScore >= 21 && hScore - aScore >= 2) || hScore === 30) {
        setWon = true;
        live.homeSetsWon += 1;
      } else if ((aScore >= 21 && aScore - hScore >= 2) || aScore === 30) {
        setWon = true;
        live.awaySetsWon += 1;
      }

      if (setWon) {
        if (live.homeSetsWon < setsToWin && live.awaySetsWon < setsToWin) {
          live.currentSet += 1;
          live.setsScore.push({ home: 0, away: 0 });
        }
      }
    }

    if (live.homeSetsWon >= setsToWin || live.awaySetsWon >= setsToWin) {
      live.matchStatus = 'Finished';
    } else {
      live.matchStatus = live.currentSet === 1 ? 'FirstGame' : live.currentSet === 2 ? 'SecondGame' : 'ThirdGame';
    }

    let dbStatus = 'live';
    if (live.matchStatus === 'Scheduled') {
      dbStatus = 'scheduled';
    } else if (['Finished', 'Walkover', 'Retired', 'Abandoned'].includes(live.matchStatus)) {
      dbStatus = 'completed';
    }

    this.competitionService.updateMatch(this.workspaceId(), this.eventId(), this.competitionId(), this.stageId(), match.id, {
      homeScore: live.homeSetsWon,
      awayScore: live.awaySetsWon,
      status: dbStatus,
      liveData: live,
    }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
      }
    });
  }

  onUpdateBadmintonMatchType(matchType: string) {
    const match = this.match();
    if (!match) return;

    const config = { ...match.config, matchType };
    this.competitionService.updateMatch(this.workspaceId(), this.eventId(), this.competitionId(), this.stageId(), match.id, {
      config
    }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
      }
    });
  }

  onUpdateBadmintonStatus(matchStatus: string) {
    const match = this.match();
    if (!match) return;

    const live = match.liveData ? { ...match.liveData } : {};
    live.matchStatus = matchStatus;

    let dbStatus = match.status;
    if (matchStatus === 'Scheduled') {
      dbStatus = 'scheduled';
    } else if (['Finished', 'Walkover', 'Retired', 'Abandoned'].includes(matchStatus)) {
      dbStatus = 'completed';
    } else {
      dbStatus = 'live';
    }

    if (dbStatus === 'live' && !this.hasLineupForMatch(match)) {
      this.openLineupModal.emit();
      return;
    }

    this.competitionService.updateMatch(this.workspaceId(), this.eventId(), this.competitionId(), this.stageId(), match.id, {
      status: dbStatus,
      liveData: live
    }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
      },
      error: (err) => {
        const msg = err.error?.message || '';
        if (msg.toLowerCase().includes('lineup')) {
          this.openLineupModal.emit();
        } else {
          this.uiService.error(msg || 'Failed to update match status.');
        }
      }
    });
  }

  onEndMatch() {
    const match = this.match();
    if (!match) return;

    this.competitionService.updateMatch(this.workspaceId(), this.eventId(), this.competitionId(), this.stageId(), match.id, {
      status: 'completed',
    }).subscribe({
      next: (updated) => {
        this.matchUpdated.emit(updated);
        this.matchCompleted.emit();
      }
    });
  }

  getPlayersForTeam(teamId: string | null): Player[] {
    if (!teamId) return [];
    return this.players().filter(p => p.teamId === teamId);
  }

  getSortedMatchLineup(teamId: string | null): any[] {
    if (!teamId) return [];
    const match = this.match();
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
      
      // For Badminton/others, rating is simply matchEntry?.rating or null (no live calculation)
      const rating = matchEntry?.rating ?? null;

      return {
        id: p.id,
        player: p,
        isPlaying: isOriginalStarter,
        isGoalkeeper,
        subStatus,
        isRedCarded,
        isCurrentlyPlaying,
        rating
      };
    }).sort((a, b) => {
      // Sort: Starters first, then by rating, then by name
      if (a.isPlaying && !b.isPlaying) return -1;
      if (!a.isPlaying && b.isPlaying) return 1;
      return (a.player.user?.username || '').localeCompare(b.player.user?.username || '');
    });
  }


  // ─── Match Timeline Management (Badminton Rallies) ────────────────────────

  timelineFilterSet = signal<number>(0);       // 0 = All sets
  timelineFilterWinner = signal<string>('all'); // 'all' | 'home' | 'away' | 'let'
  showTimelinePanel = signal<boolean>(true);

  editingRally = signal<any | null>(null);
  editRallyDuration = signal<number>(0);
  editRallyNote = signal<string>('');

  get timelineSets(): number[] {
    const sets = this.match()?.liveData?.setsScore || [];
    return sets.map((_: any, i: number) => i + 1);
  }

  filteredRallies = computed(() => {
    const rallies: any[] = this.match()?.liveData?.rallies ?? [];
    const setFilter = this.timelineFilterSet();
    const winnerFilter = this.timelineFilterWinner();

    return rallies
      .map((r, i) => ({ ...r, _originalIndex: i }))
      .filter(r => {
        if (setFilter !== 0 && r.set !== setFilter) return false;
        if (winnerFilter === 'let' && r.winnerSide !== 'none') return false;
        if (winnerFilter === 'home' && r.winnerSide !== 'home') return false;
        if (winnerFilter === 'away' && r.winnerSide !== 'away') return false;
        return true;
      })
      .reverse();
  });

  openEditRally(rally: any) {
    this.editingRally.set({ ...rally });
    this.editRallyDuration.set(rally.duration ?? 0);
    this.editRallyNote.set(rally._note ?? '');
  }

  cancelEditRally() {
    this.editingRally.set(null);
  }

  saveEditedRally() {
    const match = this.match();
    const editing = this.editingRally();
    if (!match || !editing) return;

    const live = { ...match.liveData };
    if (!live.rallies) return;

    const idx: number = editing._originalIndex;
    const original = { ...live.rallies[idx] };

    const auditEntry = {
      action: 'edited',
      at: new Date().toISOString(),
      previousDuration: original.duration,
      previousNote: original._note ?? null,
    };

    live.rallies = live.rallies.map((r: any, i: number) => {
      if (i !== idx) return r;
      const audit: any[] = Array.isArray(r._audit) ? [...r._audit, auditEntry] : [auditEntry];
      return {
        ...r,
        duration: this.editRallyDuration(),
        _note: this.editRallyNote() || undefined,
        _audit: audit,
      };
    });

    this.competitionService
      .updateMatch(
        this.workspaceId(), this.eventId(), this.competitionId(),
        this.stageId(), match.id, { liveData: live },
      )
      .subscribe({
        next: (updated) => {
          this.matchUpdated.emit(updated);
          this.editingRally.set(null);
          this.uiService.success('Rally updated and audit trail recorded.');
        },
        error: () => this.uiService.error('Failed to update rally.'),
      });
  }

  deleteRally(originalIndex: number) {
    const match = this.match();
    if (!match) return;

    const live = { ...match.liveData };
    if (!live.rallies || originalIndex < 0 || originalIndex >= live.rallies.length) return;

    const removed = { ...live.rallies[originalIndex] };

    const deletedEntry = { ...removed, _deletedAt: new Date().toISOString(), _action: 'deleted' };
    live._deletedRallies = Array.isArray(live._deletedRallies)
      ? [...live._deletedRallies, deletedEntry]
      : [deletedEntry];

    live.rallies = live.rallies.filter((_: any, i: number) => i !== originalIndex);

    this.competitionService
      .updateMatch(
        this.workspaceId(), this.eventId(), this.competitionId(),
        this.stageId(), match.id, { liveData: live },
      )
      .subscribe({
        next: (updated) => {
          this.matchUpdated.emit(updated);
          this.uiService.success('Rally removed.');
        },
        error: () => this.uiService.error('Failed to remove rally.'),
      });
  }
}
