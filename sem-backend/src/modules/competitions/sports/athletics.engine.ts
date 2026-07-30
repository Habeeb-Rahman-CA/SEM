import { SportEngine } from './sport-engine.interface';

export class AthleticsEngine implements SportEngine {
  readonly code = 'athletics';

  getDefaultConfig(customConfig?: Record<string, any>): Record<string, any> {
    const config = customConfig ?? {};
    if (!config.eventType) config.eventType = 'sprint';
    return config;
  }

  getInitialLiveData(
    homeTeamId: string,
    awayTeamId: string,
    config?: Record<string, any>,
  ): Record<string, any> {
    return {
      results: [],
    };
  }

  calculatePlayerRatings(
    match: any,
    matchPlayers: any[],
    winnerTeamId: string | null,
    loserTeamId: string | null,
  ): any[] {
    const liveData = match.liveData;
    if (!liveData || !Array.isArray(liveData.results)) return [];

    const playingStarters = matchPlayers.filter((mp) => mp.isPlaying);
    if (playingStarters.length === 0) return [];

    const toSave: any[] = [];

    for (const mp of playingStarters) {
      if (mp.rating !== null) continue;

      const playerResult = liveData.results.find(
        (r: any) =>
          r.playerId === mp.playerId || r.playerUserId === mp.player?.userId,
      );
      let rating = 5.0;

      if (playerResult) {
        const pos = Number(playerResult.position);
        if (pos === 1) rating += 2.0;
        else if (pos === 2) rating += 1.5;
        else if (pos === 3) rating += 1.0;
        else rating += 0.2;
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
    const medals = new Map<
      string,
      {
        playerId: string;
        playerName: string;
        teamName: string;
        gold: number;
        silver: number;
        bronze: number;
      }
    >();

    for (const m of completedMatches) {
      const results = m.liveData?.results;
      if (!Array.isArray(results)) continue;

      for (const res of results) {
        const pUserId = res.playerUserId;
        if (!pUserId) continue;

        let entry = medals.get(pUserId);
        if (!entry) {
          const info = userUserIdMap.get(pUserId) ?? {
            playerId: pUserId,
            playerName: 'Unknown',
            teamName: 'Unknown',
          };
          const newEntry = { ...info, gold: 0, silver: 0, bronze: 0 };
          medals.set(pUserId, newEntry);
          entry = newEntry;
        }

        const pos = Number(res.position);
        if (entry) {
          if (pos === 1) entry.gold++;
          else if (pos === 2) entry.silver++;
          else if (pos === 3) entry.bronze++;
        }
      }
    }

    return {
      topAthletes: Array.from(medals.values())
        .sort(
          (a, b) =>
            b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze,
        )
        .slice(0, 10),
    };
  }
}
