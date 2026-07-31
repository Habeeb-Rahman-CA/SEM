import { Injectable } from '@nestjs/common';
import { Team } from '../entities/team.entity';
import { Match } from '../../competitions/entities/match.entity';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class TeamInsightsService {
  constructor(private readonly aiService: AiService) {}
  async getTeamAnalytics(team: Team, matches: Match[]): Promise<any> {
    const completedMatches = matches.filter((m) => m.status === 'completed');

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let totalGoalsScored = 0;
    let totalGoalsConceded = 0;
    let cleanSheets = 0;
    const totalMatches = completedMatches.length;

    for (const m of completedMatches) {
      const isHome = m.homeTeamId === team.id;
      const scored = isHome ? m.homeScore : m.awayScore;
      const conceded = isHome ? m.awayScore : m.homeScore;

      totalGoalsScored += scored;
      totalGoalsConceded += conceded;

      if (conceded === 0) {
        cleanSheets++;
      }

      if (scored > conceded) {
        wins++;
      } else if (scored < conceded) {
        losses++;
      } else {
        draws++;
      }
    }

    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
    const drawRate = totalMatches > 0 ? (draws / totalMatches) * 100 : 0;
    const lossRate = totalMatches > 0 ? (losses / totalMatches) * 100 : 0;
    const avgGoalsScored =
      totalMatches > 0 ? totalGoalsScored / totalMatches : 0;
    const avgGoalsConceded =
      totalMatches > 0 ? totalGoalsConceded / totalMatches : 0;

    // Efficiency scores on a 30-100 scale
    const attackingEfficiency =
      totalMatches > 0
        ? Math.min(
            100,
            Math.max(
              30,
              Math.round(
                (avgGoalsScored / (avgGoalsScored + avgGoalsConceded || 1)) *
                  100 +
                  winRate * 0.2,
              ),
            ),
          )
        : 50;
    const defensiveEfficiency =
      totalMatches > 0
        ? Math.min(
            100,
            Math.max(
              30,
              Math.round(
                (1 -
                  avgGoalsConceded / (avgGoalsScored + avgGoalsConceded || 1)) *
                  100 +
                  (cleanSheets / totalMatches) * 50,
              ),
            ),
          )
        : 50;
    const overallEfficiency = Math.round(
      (attackingEfficiency + defensiveEfficiency) / 2,
    );

    // Identify primary sport code
    const sportCodes = completedMatches
      .map((m) => m.stage?.competition?.sport?.code)
      .filter(Boolean);
    const sportCount = sportCodes.reduce(
      (acc, code) => {
        acc[code] = (acc[code] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const sportCode =
      Object.entries(sportCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      'football';

    // Group matches by Event
    const eventMap = new Map<
      string,
      { eventId: string; eventName: string; matches: Match[] }
    >();
    for (const m of completedMatches) {
      const comp = m.stage?.competition;
      const eventId = comp?.eventId || 'unknown-event';
      const eventName = comp?.event?.name || 'Other Tournament';
      if (!eventMap.has(eventId)) {
        eventMap.set(eventId, { eventId, eventName, matches: [] });
      }
      eventMap.get(eventId)!.matches.push(m);
    }

    const eventBreakdowns = Array.from(eventMap.values()).map((ev) => {
      let evWins = 0;
      let evDraws = 0;
      let evLosses = 0;
      let evScored = 0;
      let evConceded = 0;

      for (const m of ev.matches) {
        const isHome = m.homeTeamId === team.id;
        const scored = isHome ? m.homeScore : m.awayScore;
        const conceded = isHome ? m.awayScore : m.homeScore;
        evScored += scored;
        evConceded += conceded;

        if (scored > conceded) {
          evWins++;
        } else if (scored < conceded) {
          evLosses++;
        } else {
          evDraws++;
        }
      }

      const total = ev.matches.length;
      return {
        eventId: ev.eventId,
        eventName: ev.eventName,
        matchesCount: total,
        wins: evWins,
        draws: evDraws,
        losses: evLosses,
        goalsScored: evScored,
        goalsConceded: evConceded,
        winRate: total > 0 ? (evWins / total) * 100 : 0,
      };
    });

    // Recent outcomes (last 10 chronologically)
    const recentOutcomes = [...completedMatches]
      .sort((a, b) => {
        const at = a.scheduledAt
          ? new Date(a.scheduledAt).getTime()
          : new Date(a.createdAt).getTime();
        const bt = b.scheduledAt
          ? new Date(b.scheduledAt).getTime()
          : new Date(b.createdAt).getTime();
        return at - bt;
      })
      .slice(-10)
      .map((m) => {
        const isHome = m.homeTeamId === team.id;
        const scored = isHome ? m.homeScore : m.awayScore;
        const conceded = isHome ? m.awayScore : m.homeScore;
        let outcome: 'win' | 'draw' | 'loss' = 'draw';
        if (scored > conceded) outcome = 'win';
        else if (scored < conceded) outcome = 'loss';

        return {
          matchId: m.id,
          date: m.scheduledAt || m.createdAt,
          opponentName: isHome ? m.awayTeam?.name : m.homeTeam?.name,
          opponentLogoUrl: isHome ? m.awayTeam?.logoUrl : m.homeTeam?.logoUrl,
          scored,
          conceded,
          outcome,
          competitionName: m.stage?.competition?.name || 'Tournament',
        };
      });

    // Stats payload for AI and UI response
    const statsSummary = {
      totalMatches,
      wins,
      draws,
      losses,
      winRate,
      drawRate,
      lossRate,
      totalGoalsScored,
      avgGoalsScored,
      totalGoalsConceded,
      avgGoalsConceded,
      cleanSheets,
      efficiency: {
        attacking: attackingEfficiency,
        defensive: defensiveEfficiency,
        overall: overallEfficiency,
      },
      eventBreakdowns,
      recentOutcomes,
    };

    if (totalMatches === 0) {
      return {
        ...statsSummary,
        aiInsights: this.generateRuleBasedAnalytics(
          team,
          sportCode,
          totalMatches,
          winRate,
          drawRate,
          lossRate,
          totalGoalsScored,
          avgGoalsScored,
          totalGoalsConceded,
          avgGoalsConceded,
          cleanSheets,
          overallEfficiency,
        ),
      };
    }

    try {
      const termScored = sportCode === 'football' ? 'goals' : 'points';
      const prompt = `
You are an expert sports analyst. Analyze the performance of the following sports team:
Team Name: ${team.name}
Sport: ${sportCode}
Total Matches Played: ${totalMatches}
Overall Win Rate: ${winRate.toFixed(1)}%
Draw Rate: ${drawRate.toFixed(1)}%
Loss Rate: ${lossRate.toFixed(1)}%
Attacking Stats: Total ${termScored} scored = ${totalGoalsScored}, Average Per Match = ${avgGoalsScored.toFixed(2)}
Defensive Stats: Total ${termScored} conceded = ${totalGoalsConceded}, Average Per Match = ${avgGoalsConceded.toFixed(2)}, Clean Sheets = ${cleanSheets}
Event Breakdown: ${JSON.stringify(eventBreakdowns)}
Recent Match Outcomes (Last 10): ${JSON.stringify(recentOutcomes)}

Please generate:
1. Strengths: 2-3 key strengths based on the statistical data.
2. Weaknesses/Areas for Improvement: 1-2 areas where the team is underperforming or needs tactical adjustments.
3. Recommendations: 2-3 actionable tactical or training recommendations for the coaching staff.
4. Summary: A concise, professional summary paragraph of the team's performance trends over multiple events.

Provide the response STRICTLY in the following JSON format:
{
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "summary": "Concise summary of team analytics and trends..."
}
`;

      const text = await this.aiService.generateText(prompt);
      if (text) {
        const cleanJsonStr = text
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        const aiInsights = JSON.parse(cleanJsonStr);
        return {
          ...statsSummary,
          aiInsights,
        };
      }
    } catch (e) {
      console.warn(
        'AI team insights generation failed, falling back to rule-based analysis.',
        e,
      );
    }

    return {
      ...statsSummary,
      aiInsights: this.generateRuleBasedAnalytics(
        team,
        sportCode,
        totalMatches,
        winRate,
        drawRate,
        lossRate,
        totalGoalsScored,
        avgGoalsScored,
        totalGoalsConceded,
        avgGoalsConceded,
        cleanSheets,
        overallEfficiency,
      ),
    };
  }

  private generateRuleBasedAnalytics(
    team: Team,
    sportCode: string,
    totalMatches: number,
    winRate: number,
    drawRate: number,
    lossRate: number,
    totalGoalsScored: number,
    avgGoalsScored: number,
    totalGoalsConceded: number,
    avgGoalsConceded: number,
    cleanSheets: number,
    overallEfficiency: number,
  ) {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    if (totalMatches === 0) {
      return {
        strengths: [
          'No completed match data available to determine strengths.',
        ],
        weaknesses: [
          'No completed match data available to determine weaknesses.',
        ],
        recommendations: [
          'Play and complete matches to receive actionable insights.',
        ],
        summary:
          'The team has no completed matches registered yet. Performance analytics and trend visualization will populate as matches are recorded.',
      };
    }

    if (winRate >= 65) {
      strengths.push(
        `Dominant Force: High win rate of ${winRate.toFixed(0)}% indicates strong tournament competitiveness.`,
      );
    } else if (winRate >= 45) {
      strengths.push(
        `Consistent Contender: Solid performance profile, winning ${winRate.toFixed(0)}% of matches.`,
      );
    }

    const termScored = sportCode === 'football' ? 'goals' : 'points';
    if (avgGoalsScored >= 2.0) {
      strengths.push(
        `Prolific Attack: Averaging ${avgGoalsScored.toFixed(1)} ${termScored} scored per game, showing offensive dominance.`,
      );
    } else if (avgGoalsScored >= 1.2) {
      strengths.push(
        `Steady Offence: Reliably breaks down opponents with ${avgGoalsScored.toFixed(1)} average ${termScored} per game.`,
      );
    }

    if (cleanSheets > 0 && cleanSheets / totalMatches >= 0.3) {
      strengths.push(
        `Defensive Solidity: Kept clean sheets in ${Math.round((cleanSheets / totalMatches) * 100)}% of games.`,
      );
    }

    if (strengths.length === 0) {
      strengths.push(
        'Resilient Play: Highly competitive match structures showing great team adaptation.',
      );
    }

    // Weaknesses
    if (winRate < 35) {
      weaknesses.push(
        `Struggling to Close Games: Low win rate of ${winRate.toFixed(0)}% highlights a need for late-game tactical focus.`,
      );
    }
    if (avgGoalsConceded >= 1.8) {
      weaknesses.push(
        `Vulnerable Backline: Conceding an average of ${avgGoalsConceded.toFixed(1)} ${termScored} per match.`,
      );
    }
    if (cleanSheets === 0 && totalMatches >= 3) {
      weaknesses.push(
        'Defensive Leakage: Unable to keep clean sheets, putting excessive pressure on the attackers.',
      );
    }

    if (weaknesses.length === 0) {
      weaknesses.push(
        'Match Control: Roster needs to maintain high defensive discipline under counter-attacking pressure.',
      );
    }

    // Recommendations
    if (avgGoalsConceded >= 1.5) {
      recommendations.push(
        'Incorporate transitional defensive training and back-four defensive positioning drills.',
      );
    }
    if (avgGoalsScored < 1.3) {
      recommendations.push(
        'Enhance attacking movement and final third build-up plays to increase scoring opportunities.',
      );
    }
    recommendations.push(
      'Implement stamina conditioning and defensive press routines to maintain match control in final phases.',
    );
    recommendations.push(
      'Perform match video reviews to improve marking during set-pieces and dead ball scenarios.',
    );

    const summary = `Statistical analysis for ${team.name} shows an overall efficiency of ${overallEfficiency}%. The team's attack averages ${avgGoalsScored.toFixed(1)} goals/points per match, while the defense concedes ${avgGoalsConceded.toFixed(1)}. Implementing tactical training will optimize results in upcoming matches.`;

    return {
      strengths,
      weaknesses,
      recommendations,
      summary,
    };
  }
}
