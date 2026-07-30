import { SportEngine } from './sport-engine.interface';

export class VolleyballEngine implements SportEngine {
  readonly code = 'volleyball';

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
    const playerStats = new Map<
      string,
      { kills: number; blocks: number; aces: number; digs: number }
    >();

    for (const mp of playingStarters) {
      playerStats.set(mp.playerId, { kills: 0, blocks: 0, aces: 0, digs: 0 });
    }

    for (const ev of liveData.events) {
      const pId =
        ev.playerId ||
        matchPlayers.find((mp) => mp.player?.userId === ev.playerUserId)
          ?.playerId;
      if (!pId) continue;

      const stats = playerStats.get(pId);
      if (!stats) continue;

      if (ev.type === 'kill') stats.kills++;
      else if (ev.type === 'block') stats.blocks++;
      else if (ev.type === 'ace') stats.aces++;
      else if (ev.type === 'dig') stats.digs++;
    }

    for (const mp of playingStarters) {
      if (mp.rating !== null) continue;

      const stats = playerStats.get(mp.playerId) || {
        kills: 0,
        blocks: 0,
        aces: 0,
        digs: 0,
      };
      let rating = 5.0;

      rating += stats.kills * 0.3;
      rating += stats.blocks * 0.4;
      rating += stats.aces * 0.3;
      rating += stats.digs * 0.2;

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
    const kills = new Map<string, any>();
    const blocks = new Map<string, any>();
    const aces = new Map<string, any>();

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

        if (ev.type === 'kill') {
          const entry = getOrCreateEntry(kills, pUserId, 'kills');
          entry.kills++;
        } else if (ev.type === 'block') {
          const entry = getOrCreateEntry(blocks, pUserId, 'blocks');
          entry.blocks++;
        } else if (ev.type === 'ace') {
          const entry = getOrCreateEntry(aces, pUserId, 'aces');
          entry.aces++;
        }
      }
    }

    return {
      topKills: Array.from(kills.values())
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 10),
      topBlocks: Array.from(blocks.values())
        .sort((a, b) => b.blocks - a.blocks)
        .slice(0, 10),
      topAces: Array.from(aces.values())
        .sort((a, b) => b.aces - a.aces)
        .slice(0, 10),
    };
  }
}
