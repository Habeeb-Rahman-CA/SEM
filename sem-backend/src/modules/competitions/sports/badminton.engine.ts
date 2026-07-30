import { SportEngine } from './sport-engine.interface';
import { MatchType } from '../entities/match.entity';

export class BadmintonEngine implements SportEngine {
  readonly code = 'badminton';

  getDefaultConfig(customConfig?: Record<string, any>): Record<string, any> {
    const config = customConfig ?? {};
    if (!config.setsToWin) config.setsToWin = 2;
    if (!config.matchType) config.matchType = MatchType.MENS_SINGLES;
    return config;
  }

  getInitialLiveData(
    homeTeamId: string,
    awayTeamId: string,
    config?: Record<string, any>,
  ): Record<string, any> {
    return {
      currentSet: 1,
      setsScore: [{ home: 0, away: 0 }],
      homeSetsWon: 0,
      awaySetsWon: 0,
      matchStatus: 'Scheduled',
      rallies: [],
    };
  }

  calculatePlayerRatings(
    match: any,
    matchPlayers: any[],
    winnerTeamId: string | null,
    loserTeamId: string | null,
  ): any[] {
    const liveData = match.liveData;
    if (!liveData) return [];

    const rallies = liveData.rallies || [];
    const starters = matchPlayers.filter((mp) => mp.isPlaying);
    const toSave: any[] = [];

    for (const mp of starters) {
      if (mp.rating !== null) continue;

      let rating = 5.0;
      let wonRallies = 0,
        lostRallies = 0;

      const isHomeTeam = mp.teamId === match.homeTeamId;

      for (const r of rallies) {
        if (r.winnerSide === 'none') continue;
        if (isHomeTeam) {
          if (r.winnerSide === 'home') wonRallies++;
          else lostRallies++;
        } else {
          if (r.winnerSide === 'away') wonRallies++;
          else lostRallies++;
        }
      }

      rating += wonRallies * 0.1;
      rating -= lostRallies * 0.05;

      if (winnerTeamId && mp.teamId === winnerTeamId) {
        rating += 0.5;
      } else if (loserTeamId && mp.teamId === loserTeamId) {
        rating -= 0.3;
      }

      mp.rating = Math.min(10.0, Math.max(5.0, Math.round(rating * 100) / 100));
      toSave.push(mp);
    }

    return toSave;
  }

  getCompetitionStats(
    completedMatches: any[],
    allMatchPlayers: any[],
    context: {
      userUserIdMap: Map<string, any>;
      userUsernameMap: Map<string, any>;
    },
  ): Record<string, any> {
    const ralliesWon = new Map<
      string,
      {
        playerId: string;
        playerName: string;
        teamName: string;
        ralliesWon: number;
      }
    >();

    for (const m of completedMatches) {
      const rallies = m.liveData?.rallies || [];
      const matchPlayersInMatch = allMatchPlayers.filter(
        (mp) => mp.matchId === m.id,
      );

      for (const r of rallies) {
        if (r.winnerSide === 'none') continue;

        const targetTeamId =
          r.winnerSide === 'home' ? m.homeTeamId : m.awayTeamId;
        const winners = matchPlayersInMatch.filter(
          (mp) => mp.teamId === targetTeamId,
        );

        for (const w of winners) {
          let entry = ralliesWon.get(w.playerId);
          if (!entry) {
            const playerName =
              w.player?.user?.username ??
              w.player?.jerseyNumber?.toString() ??
              w.playerId;
            const teamName = w.team?.name ?? 'Unknown';
            entry = {
              playerId: w.playerId,
              playerName,
              teamName,
              ralliesWon: 0,
            };
            ralliesWon.set(w.playerId, entry);
          }
          entry.ralliesWon++;
        }
      }
    }

    return {
      topRalliesWon: Array.from(ralliesWon.values())
        .sort((a, b) => b.ralliesWon - a.ralliesWon)
        .slice(0, 10),
    };
  }
}
