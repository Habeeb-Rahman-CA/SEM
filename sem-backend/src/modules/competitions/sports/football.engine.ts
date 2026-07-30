import { SportEngine } from './sport-engine.interface';

export class FootballEngine implements SportEngine {
  readonly code = 'football';

  getDefaultConfig(customConfig?: Record<string, any>): Record<string, any> {
    const config = customConfig ?? {};
    if (!config.timerDuration) config.timerDuration = 90;
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

    type PlayerTally = {
      goals: number;
      assists: number;
      ownGoals: number;
      yellowCards: number;
      redCards: number;
    };
    const tallies = new Map<string, PlayerTally>();
    for (const mp of playingStarters) {
      tallies.set(mp.playerId, {
        goals: 0,
        assists: 0,
        ownGoals: 0,
        yellowCards: 0,
        redCards: 0,
      });
    }

    for (const event of liveData.events as any[]) {
      let scorerPlayerId: string | undefined = undefined;
      let assistPlayerId: string | undefined = undefined;

      if (event.playerId) {
        scorerPlayerId = event.playerId;
      } else if (event.playerUserId) {
        scorerPlayerId = matchPlayers.find(
          (mp) => mp.player?.userId === event.playerUserId,
        )?.playerId;
      }

      if (event.assistPlayerUserId) {
        assistPlayerId = matchPlayers.find(
          (mp) => mp.player?.userId === event.assistPlayerUserId,
        )?.playerId;
      } else if (event.assistPlayerId) {
        assistPlayerId = event.assistPlayerId;
      }

      if (event.type === 'goal') {
        if (event.goalType === 'own_goal') {
          if (scorerPlayerId) {
            const t = tallies.get(scorerPlayerId);
            if (t) t.ownGoals++;
          }
        } else {
          if (scorerPlayerId) {
            const t = tallies.get(scorerPlayerId);
            if (t) t.goals++;
          }
          if (assistPlayerId) {
            const t = tallies.get(assistPlayerId);
            if (t) t.assists++;
          }
        }
      } else if (event.type === 'own_goal') {
        if (scorerPlayerId) {
          const t = tallies.get(scorerPlayerId);
          if (t) t.ownGoals++;
        }
      } else if (event.type === 'assist') {
        if (scorerPlayerId) {
          const t = tallies.get(scorerPlayerId);
          if (t) t.assists++;
        }
      } else if (event.type === 'card') {
        if (scorerPlayerId) {
          const t = tallies.get(scorerPlayerId);
          if (t) {
            if (event.cardType === 'yellow') {
              t.yellowCards++;
            } else if (
              event.cardType === 'red' ||
              event.cardType === 'second_yellow'
            ) {
              t.redCards++;
            }
          }
        }
      } else if (event.type === 'yellow_card') {
        if (scorerPlayerId) {
          const t = tallies.get(scorerPlayerId);
          if (t) t.yellowCards++;
        }
      } else if (event.type === 'red_card') {
        if (scorerPlayerId) {
          const t = tallies.get(scorerPlayerId);
          if (t) t.redCards++;
        }
      }
    }

    const homeGoalsAgainst = match.awayScore ?? 0;
    const awayGoalsAgainst = match.homeScore ?? 0;

    const toSave: any[] = [];

    for (const mp of playingStarters) {
      if (mp.rating !== null) continue;

      const tally = tallies.get(mp.playerId) ?? {
        goals: 0,
        assists: 0,
        ownGoals: 0,
        yellowCards: 0,
        redCards: 0,
      };
      let rating = 5.0;

      const goalBonus = mp.isGoalkeeper ? 0.3 : 0.5;
      rating += tally.goals * goalBonus;
      rating += tally.assists * 0.3;
      rating -= tally.ownGoals * 0.5;

      if (winnerTeamId && mp.teamId === winnerTeamId) {
        rating += 0.5;
      } else if (loserTeamId && mp.teamId === loserTeamId) {
        rating -= 0.3;
      }

      if (mp.isGoalkeeper) {
        const goalsConceded =
          mp.teamId === match.homeTeamId ? homeGoalsAgainst : awayGoalsAgainst;
        if (goalsConceded === 0) {
          rating += 0.5;
        }
      }

      rating -= tally.yellowCards * 0.3;
      rating -= tally.redCards * 0.8;

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
    const scorers = new Map<
      string,
      { playerId: string; playerName: string; teamName: string; goals: number }
    >();
    const assists = new Map<
      string,
      {
        playerId: string;
        playerName: string;
        teamName: string;
        assists: number;
      }
    >();
    const yellowCards = new Map<
      string,
      { playerId: string; playerName: string; teamName: string; cards: number }
    >();
    const redCards = new Map<
      string,
      { playerId: string; playerName: string; teamName: string; cards: number }
    >();

    const getOrCreateTally = (
      map: Map<string, any>,
      pUserId: string,
      initialValueKey: string,
    ) => {
      let entry = map.get(pUserId);
      if (!entry) {
        const info = userUserIdMap.get(pUserId) ?? {
          playerId: pUserId,
          playerName: 'Unknown',
          teamName: 'Unknown',
        };
        entry = { ...info, [initialValueKey]: 0 };
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

        if (ev.type === 'goal') {
          if (ev.goalType !== 'own_goal') {
            const scorer = getOrCreateTally(scorers, pUserId, 'goals');
            scorer.goals++;

            const assistUserId = ev.assistPlayerUserId;
            if (assistUserId) {
              const assister = getOrCreateTally(
                assists,
                assistUserId,
                'assists',
              );
              assister.assists++;
            }
          }
        } else if (ev.type === 'card') {
          if (ev.cardType === 'yellow') {
            const yc = getOrCreateTally(yellowCards, pUserId, 'cards');
            yc.cards++;
          } else if (ev.cardType === 'red' || ev.cardType === 'second_yellow') {
            const rc = getOrCreateTally(redCards, pUserId, 'cards');
            rc.cards++;
          }
        }
      }
    }

    return {
      topScorers: Array.from(scorers.values())
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 10),
      topAssists: Array.from(assists.values())
        .sort((a, b) => b.assists - a.assists)
        .slice(0, 10),
      mostYellowCards: Array.from(yellowCards.values())
        .sort((a, b) => b.cards - a.cards)
        .slice(0, 10),
      mostRedCards: Array.from(redCards.values())
        .sort((a, b) => b.cards - a.cards)
        .slice(0, 10),
    };
  }
}
