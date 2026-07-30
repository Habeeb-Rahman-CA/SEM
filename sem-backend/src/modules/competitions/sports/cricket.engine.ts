import { SportEngine } from './sport-engine.interface';

export class CricketEngine implements SportEngine {
  readonly code = 'cricket';

  getDefaultConfig(customConfig?: Record<string, any>): Record<string, any> {
    const config = customConfig ?? {};
    if (!config.overs) config.overs = 20;
    return config;
  }

  getInitialLiveData(
    homeTeamId: string,
    awayTeamId: string,
    config?: Record<string, any>,
  ): Record<string, any> {
    return {
      tossWinnerId: null,
      tossChoice: null,
      currentInnings: 1,
      inningsData: [
        {
          battingTeamId: homeTeamId,
          bowlingTeamId: awayTeamId,
          runs: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
          batsmanStats: {},
          bowlerStats: {},
          extraRuns: 0,
          completed: false,
        },
      ],
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

    const inningsList = liveData.inningsData || [];
    const toSave: any[] = [];

    for (const mp of matchPlayers) {
      if (mp.rating !== null) continue;

      const username = mp.player?.user?.username;
      if (!username) continue;

      const hasStats = inningsList.some(
        (inn: any) =>
          inn.batsmanStats?.[username] || inn.bowlerStats?.[username],
      );
      if (!mp.isPlaying && !hasStats) continue;

      let rating = 5.0;

      let batRuns = 0,
        batBalls = 0,
        batFours = 0,
        batSixes = 0;
      let bowledOut = false;

      let bowlOvers = 0,
        bowlBalls = 0,
        bowlRunsConceded = 0,
        bowlWickets = 0,
        bowlMaidens = 0;

      for (const inn of inningsList) {
        const bStats = inn.batsmanStats?.[username];
        if (bStats) {
          batRuns += bStats.runs ?? 0;
          batBalls += bStats.balls ?? 0;
          batFours += bStats.fours ?? 0;
          batSixes += bStats.sixes ?? 0;
        }
        const bwStats = inn.bowlerStats?.[username];
        if (bwStats) {
          bowlOvers += bwStats.overs ?? 0;
          bowlBalls += bwStats.balls ?? 0;
          bowlRunsConceded += bwStats.runsConceded ?? 0;
          bowlWickets += bwStats.wickets ?? 0;
          bowlMaidens += bwStats.maidens ?? 0;
        }
        if (inn.ballsHistory) {
          for (const ball of inn.ballsHistory) {
            if (
              ball.wicket &&
              ball.striker === username &&
              ball.wicketType !== 'Retired Hurt'
            ) {
              bowledOut = true;
            }
          }
        }
      }

      rating += batRuns * 0.05;
      rating += batFours * 0.1;
      rating += batSixes * 0.2;

      if (batBalls > 5) {
        const sr = (batRuns / batBalls) * 100;
        if (sr > 150) rating += 0.5;
        else if (sr > 120) rating += 0.3;
        else if (sr < 80) rating -= 0.3;
      }

      if (bowledOut && batRuns === 0 && batBalls > 0) {
        rating -= 0.5;
      }

      rating += bowlWickets * 0.8;
      rating += bowlMaidens * 0.5;
      rating -= bowlRunsConceded * 0.02;

      const totalOvers = bowlOvers + bowlBalls / 6;
      if (totalOvers > 1.0) {
        const econ = bowlRunsConceded / totalOvers;
        if (econ < 6.0) rating += 0.5;
        else if (econ < 8.0) rating += 0.2;
        else if (econ > 10.0) rating -= 0.4;
      }

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
    const { userUsernameMap } = context;
    const runs = new Map<
      string,
      {
        playerId: string;
        playerName: string;
        teamName: string;
        runs: number;
        innings: number;
      }
    >();
    const wickets = new Map<
      string,
      {
        playerId: string;
        playerName: string;
        teamName: string;
        wickets: number;
        innings: number;
      }
    >();

    for (const m of completedMatches) {
      const innings = m.liveData?.inningsData;
      if (!Array.isArray(innings)) continue;

      for (const inn of innings) {
        const batStats = inn.batsmanStats || {};
        for (const username of Object.keys(batStats)) {
          const playerRuns = batStats[username]?.runs ?? 0;
          if (playerRuns > 0) {
            if (!runs.has(username)) {
              const info = userUsernameMap.get(username) ?? {
                playerId: username,
                playerName: username,
                teamName: 'Unknown',
              };
              runs.set(username, { ...info, runs: 0, innings: 0 });
            }
            const entry = runs.get(username)!;
            entry.runs += playerRuns;
            entry.innings++;
          }
        }

        const bowlStats = inn.bowlerStats || {};
        for (const username of Object.keys(bowlStats)) {
          const playerWickets = bowlStats[username]?.wickets ?? 0;
          if (playerWickets > 0) {
            if (!wickets.has(username)) {
              const info = userUsernameMap.get(username) ?? {
                playerId: username,
                playerName: username,
                teamName: 'Unknown',
              };
              wickets.set(username, { ...info, wickets: 0, innings: 0 });
            }
            const entry = wickets.get(username)!;
            entry.wickets += playerWickets;
            entry.innings++;
          }
        }
      }
    }

    return {
      topRuns: Array.from(runs.values())
        .sort((a, b) => b.runs - a.runs)
        .slice(0, 10),
      topWickets: Array.from(wickets.values())
        .sort((a, b) => b.wickets - a.wickets)
        .slice(0, 10),
    };
  }
}
