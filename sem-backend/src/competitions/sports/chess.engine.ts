import { SportEngine } from './sport-engine.interface';

export class ChessEngine implements SportEngine {
  readonly code = 'chess';

  getDefaultConfig(customConfig?: Record<string, any>): Record<string, any> {
    const config = customConfig ?? {};
    if (!config.timeControl) config.timeControl = '10+5';
    return config;
  }

  getInitialLiveData(
    homeTeamId: string,
    awayTeamId: string,
    config?: Record<string, any>,
  ): Record<string, any> {
    return {
      movesCount: 0,
      history: [],
      resultType: null,
    };
  }

  calculatePlayerRatings(
    match: any,
    matchPlayers: any[],
    winnerTeamId: string | null,
    loserTeamId: string | null,
  ): any[] {
    const playingStarters = matchPlayers.filter((mp) => mp.isPlaying);
    if (playingStarters.length === 0) return [];

    const toSave: any[] = [];

    for (const mp of playingStarters) {
      if (mp.rating !== null) continue;

      let rating = 5.0;

      if (winnerTeamId && mp.teamId === winnerTeamId) {
        rating += 1.5;
      } else if (!winnerTeamId) {
        // Draw
        rating += 0.5;
      } else {
        // Loser
        rating += 0.1;
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
    const { userUserIdMap } = context;
    const wins = new Map<string, any>();

    for (const m of completedMatches) {
      const winnerTeamId =
        m.homeScore > m.awayScore
          ? m.homeTeamId
          : m.awayScore > m.homeScore
            ? m.awayTeamId
            : null;
      if (!winnerTeamId) continue;

      const matchPlayersInMatch = allMatchPlayers.filter(
        (mp) => mp.matchId === m.id && mp.teamId === winnerTeamId,
      );
      for (const w of matchPlayersInMatch) {
        const pUserId = w.player?.userId;
        if (!pUserId) continue;

        let entry = wins.get(pUserId);
        if (!entry) {
          const info = userUserIdMap.get(pUserId) ?? {
            playerId: w.playerId,
            playerName: 'Unknown',
            teamName: 'Unknown',
          };
          entry = { ...info, wins: 0 };
          wins.set(pUserId, entry);
        }
        entry.wins++;
      }
    }

    return {
      topWinners: Array.from(wins.values())
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 10),
    };
  }
}
