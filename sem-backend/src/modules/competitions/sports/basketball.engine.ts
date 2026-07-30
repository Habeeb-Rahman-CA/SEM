import { SportEngine } from './sport-engine.interface';

export class BasketballEngine implements SportEngine {
  readonly code = 'basketball';

  getDefaultConfig(customConfig?: Record<string, any>): Record<string, any> {
    const config = customConfig ?? {};
    if (!config.quarterDuration) config.quarterDuration = 10;
    if (!config.totalQuarters) config.totalQuarters = 4;
    return config;
  }

  getInitialLiveData(
    homeTeamId: string,
    awayTeamId: string,
    config?: Record<string, any>,
  ): Record<string, any> {
    return {
      elapsedSeconds: 0,
      timerRunning: false,
      currentQuarter: 1,
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
    const playerStats = new Map<
      string,
      {
        points: number;
        assists: number;
        rebounds: number;
        steals: number;
        blocks: number;
        fouls: number;
      }
    >();

    for (const mp of playingStarters) {
      playerStats.set(mp.playerId, {
        points: 0,
        assists: 0,
        rebounds: 0,
        steals: 0,
        blocks: 0,
        fouls: 0,
      });
    }

    for (const ev of liveData.events) {
      const pId =
        ev.playerId ||
        matchPlayers.find((mp) => mp.player?.userId === ev.playerUserId)
          ?.playerId;
      if (!pId) continue;

      const stats = playerStats.get(pId);
      if (!stats) continue;

      if (ev.type === 'point') stats.points += Number(ev.pointsVal || 2);
      else if (ev.type === 'assist') stats.assists++;
      else if (ev.type === 'rebound') stats.rebounds++;
      else if (ev.type === 'steal') stats.steals++;
      else if (ev.type === 'block') stats.blocks++;
      else if (ev.type === 'foul') stats.fouls++;
    }

    for (const mp of playingStarters) {
      if (mp.rating !== null) continue;

      const stats = playerStats.get(mp.playerId) || {
        points: 0,
        assists: 0,
        rebounds: 0,
        steals: 0,
        blocks: 0,
        fouls: 0,
      };
      let rating = 5.0;

      rating += stats.points * 0.2;
      rating += stats.assists * 0.3;
      rating += stats.rebounds * 0.2;
      rating += stats.steals * 0.4;
      rating += stats.blocks * 0.4;
      rating -= stats.fouls * 0.2;

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
    const points = new Map<string, any>();
    const assists = new Map<string, any>();
    const rebounds = new Map<string, any>();

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

        if (ev.type === 'point') {
          const entry = getOrCreateEntry(points, pUserId, 'points');
          entry.points += Number(ev.pointsVal || 2);
        } else if (ev.type === 'assist') {
          const entry = getOrCreateEntry(assists, pUserId, 'assists');
          entry.assists++;
        } else if (ev.type === 'rebound') {
          const entry = getOrCreateEntry(rebounds, pUserId, 'rebounds');
          entry.rebounds++;
        }
      }
    }

    return {
      topScorers: Array.from(points.values())
        .sort((a, b) => b.points - a.points)
        .slice(0, 10),
      topAssists: Array.from(assists.values())
        .sort((a, b) => b.assists - a.assists)
        .slice(0, 10),
      topRebounds: Array.from(rebounds.values())
        .sort((a, b) => b.rebounds - a.rebounds)
        .slice(0, 10),
    };
  }
}
