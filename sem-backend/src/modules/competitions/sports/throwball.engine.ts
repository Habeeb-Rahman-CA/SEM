import { SportEngine } from './sport-engine.interface';

export class ThrowballEngine implements SportEngine {
  readonly code = 'throwball';

  getDefaultConfig(customConfig?: Record<string, any>): Record<string, any> {
    const config = customConfig ?? {};
    if (!config.setsToWin) config.setsToWin = 3;
    if (!config.pointsPerSet) config.pointsPerSet = 25;
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
      events: [],
    };
  }

  calculatePlayerRatings(
    match: any,
    matchPlayers: any[],
    winnerTeamId: string | null,
    loserTeamId: string | null,
  ): any[] {
    const liveData = match.liveData;
    if (!liveData || !Array.isArray(liveData.events)) return [];

    const playingStarters = matchPlayers.filter((mp) => mp.isPlaying);
    if (playingStarters.length === 0) return [];

    const toSave: any[] = [];
    const playerStats = new Map<string, { catches: number; drops: number }>();

    for (const mp of playingStarters) {
      playerStats.set(mp.playerId, { catches: 0, drops: 0 });
    }

    for (const ev of liveData.events) {
      const pId =
        ev.playerId ||
        matchPlayers.find((mp) => mp.player?.userId === ev.playerUserId)
          ?.playerId;
      if (!pId) continue;

      const stats = playerStats.get(pId);
      if (!stats) continue;

      if (ev.type === 'catch') stats.catches++;
      else if (ev.type === 'drop') stats.drops++;
    }

    for (const mp of playingStarters) {
      if (mp.rating !== null) continue;

      const stats = playerStats.get(mp.playerId) || { catches: 0, drops: 0 };
      let rating = 5.0;

      rating += stats.catches * 0.3;
      rating -= stats.drops * 0.2;

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
    const { userUserIdMap } = context;
    const catches = new Map<string, any>();

    const getOrCreateEntry = (
      map: Map<string, any>,
      pUserId: string,
      metricKey: string,
    ) => {
      let entry = map.get(pUserId);
      if (!entry) {
        const info = userUserIdMap.get(pUserId) ?? {
          playerId: pUserId,
          playerName: 'Unknown',
          teamName: 'Unknown',
        };
        entry = { ...info, [metricKey]: 0 };
        map.set(pUserId, entry);
      }
      return entry;
    };

    for (const m of completedMatches) {
      const events = m.liveData?.events;
      if (!Array.isArray(events)) continue;

      for (const ev of events) {
        const pUserId = ev.playerUserId;
        if (!pUserId) continue;

        if (ev.type === 'catch') {
          const entry = getOrCreateEntry(catches, pUserId, 'catches');
          entry.catches++;
        }
      }
    }

    return {
      topCatches: Array.from(catches.values())
        .sort((a, b) => b.catches - a.catches)
        .slice(0, 10),
    };
  }
}
