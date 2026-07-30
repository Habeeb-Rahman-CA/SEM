import { SportEngine } from './sport-engine.interface';

export class KabaddiEngine implements SportEngine {
  readonly code = 'kabaddi';

  getDefaultConfig(customConfig?: Record<string, any>): Record<string, any> {
    const config = customConfig ?? {};
    if (!config.halfDuration) config.halfDuration = 20;
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
      currentHalf: 1,
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
        raidPoints: number;
        tacklePoints: number;
        superRaids: number;
        superTackles: number;
      }
    >();

    for (const mp of playingStarters) {
      playerStats.set(mp.playerId, {
        raidPoints: 0,
        tacklePoints: 0,
        superRaids: 0,
        superTackles: 0,
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

      if (ev.type === 'raid_touch') stats.raidPoints += Number(ev.points || 1);
      else if (ev.type === 'raid_tackle') stats.tacklePoints++;
      else if (ev.type === 'super_raid') {
        stats.raidPoints += 3;
        stats.superRaids++;
      } else if (ev.type === 'super_tackle') {
        stats.tacklePoints += 2;
        stats.superTackles++;
      }
    }

    for (const mp of playingStarters) {
      if (mp.rating !== null) continue;

      const stats = playerStats.get(mp.playerId) || {
        raidPoints: 0,
        tacklePoints: 0,
        superRaids: 0,
        superTackles: 0,
      };
      let rating = 5.0;

      rating += stats.raidPoints * 0.3;
      rating += stats.tacklePoints * 0.4;
      rating += stats.superRaids * 0.5;
      rating += stats.superTackles * 0.6;

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
    const raidPoints = new Map<string, any>();
    const tacklePoints = new Map<string, any>();

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

        if (ev.type === 'raid_touch') {
          const entry = getOrCreateEntry(raidPoints, pUserId, 'raidPoints');
          entry.raidPoints += Number(ev.points || 1);
        } else if (ev.type === 'super_raid') {
          const entry = getOrCreateEntry(raidPoints, pUserId, 'raidPoints');
          entry.raidPoints += 3;
        } else if (ev.type === 'raid_tackle') {
          const entry = getOrCreateEntry(tacklePoints, pUserId, 'tacklePoints');
          entry.tacklePoints++;
        } else if (ev.type === 'super_tackle') {
          const entry = getOrCreateEntry(tacklePoints, pUserId, 'tacklePoints');
          entry.tacklePoints += 2;
        }
      }
    }

    return {
      topRaiders: Array.from(raidPoints.values())
        .sort((a, b) => b.raidPoints - a.raidPoints)
        .slice(0, 10),
      topDefenders: Array.from(tacklePoints.values())
        .sort((a, b) => b.tacklePoints - a.tacklePoints)
        .slice(0, 10),
    };
  }
}
