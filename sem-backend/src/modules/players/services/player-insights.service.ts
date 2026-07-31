import { Injectable } from '@nestjs/common';
import { Player } from '../entities/player.entity';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class PlayerInsightsService {
  constructor(private readonly aiService: AiService) {}
  async getPlayerInsights(
    player: Player,
    stats: any,
    recentFormMatches: any[],
  ): Promise<any> {
    try {
      const prompt = `
You are an expert sports analyst. Analyze the following player profile and statistics:
Player Name: ${player.user?.username || 'Player'}
Jersey Number: ${player.jerseyNumber || 'N/A'}
Position: ${player.position || 'Unknown'}
All-Time Career Stats: ${JSON.stringify(stats.allTime)}
Competition Breakdown: ${JSON.stringify(stats.competitions)}
Recent Matches (Last 5): ${JSON.stringify(recentFormMatches)}

Please generate:
1. Strengths: List of 2-3 key strengths based on the stats.
2. Weaknesses: List of 1-2 weaknesses or areas of improvement based on the stats.
3. Consistency: Short paragraph assessing the player's rating consistency.
4. Recent Form: Assess the player's recent form based on the last 5 matches.
5. Recommendations: 2-3 actionable training or tactical recommendations.
6. Comparison/Trend Text: Trend analysis comparing different competitions.
7. AiAnalysisText: A concise summary paragraph combining these insights.

Provide the response STRICTLY in the following JSON format:
{
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "consistency": "consistency analysis text...",
  "recentForm": "recent form analysis text...",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "comparisonTrendText": "comparison trend text...",
  "aiAnalysisText": "AI-generated text analysis..."
}
`;
      const text = await this.aiService.generateText(prompt);
      if (text) {
        // Attempt to clean markdown wrapper if present
        const cleanJsonStr = text
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        return JSON.parse(cleanJsonStr);
      }
    } catch (e) {
      console.warn(
        'AI player insights generation failed, falling back to rule-based analysis.',
        e,
      );
    }

    return this.generateRuleBasedInsights(player, stats, recentFormMatches);
  }

  private generateRuleBasedInsights(
    player: Player,
    stats: any,
    recentFormMatches: any[],
  ): any {
    const allTime = stats.allTime || {};
    const gamesPlayed = allTime.gamesPlayed || 0;
    const avgRating = allTime.avgRating || 0;
    const mvps = allTime.mvps || 0;

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // Analyze by sport type / stats
    const primarySport = stats.competitions?.[0]?.sportCode || 'football';

    // 1. Strengths
    if (avgRating >= 7.5) {
      strengths.push(
        'Elite Performer: Consistently delivers high-impact match performances.',
      );
    } else if (avgRating >= 6.8) {
      strengths.push(
        'Reliable Team Member: Maintains a dependable work rate and stable game influence.',
      );
    }

    if (mvps > 0) {
      strengths.push(
        `Clutch Player: Has been awarded Match MVP ${mvps} time(s), indicating high performance in key moments.`,
      );
    }

    if (primarySport === 'football') {
      const goals = allTime.goals || 0;
      const assists = allTime.assists || 0;
      if (goals > 0 && gamesPlayed > 0 && goals / gamesPlayed >= 0.4) {
        strengths.push(
          `Clinical Finisher: Possesses a strong scoring record averaging ${(goals / gamesPlayed).toFixed(2)} goals per game.`,
        );
      }
      if (assists > 0 && gamesPlayed > 0 && assists / gamesPlayed >= 0.3) {
        strengths.push(
          `Playmaking Vision: Threat in the final third with an assist rate of ${(assists / gamesPlayed).toFixed(2)} assists per match.`,
        );
      }
      if (goals === 0 && gamesPlayed >= 4) {
        weaknesses.push(
          'Goal Scoring: Low threat in front of goal; has not registered any goals.',
        );
      }
      if (assists === 0 && gamesPlayed >= 4) {
        weaknesses.push(
          'Chances Created: Limited key passes or assists; needs to improve playmaking involvement.',
        );
      }
    } else if (primarySport === 'cricket') {
      const runs = allTime.runs || 0;
      const wickets = allTime.wickets || 0;
      if (runs > 0 && gamesPlayed > 0 && runs / gamesPlayed >= 30) {
        strengths.push(
          `Anchor Batsman: High run-scoring reliability, averaging ${(runs / gamesPlayed).toFixed(0)} runs per innings.`,
        );
      }
      if (wickets > 0 && gamesPlayed > 0 && wickets / gamesPlayed >= 1.2) {
        strengths.push(
          `Strike Bowler: Effective wicket-taker, averaging ${(wickets / gamesPlayed).toFixed(1)} wickets per match.`,
        );
      }
      if (runs / gamesPlayed < 15 && gamesPlayed >= 4) {
        weaknesses.push(
          'Batting Pacing: Struggles to build partnerships or rotate strike under pressure.',
        );
      }
      if (wickets === 0 && gamesPlayed >= 4) {
        weaknesses.push(
          'Bowling Variations: Lacks wicket-taking deliveries; needs to work on line and length.',
        );
      }
    } else if (primarySport === 'basketball') {
      const points = allTime.points || 0;
      const rebounds = allTime.rebounds || 0;
      if (points / gamesPlayed >= 12) {
        strengths.push(
          `Offensive Focus: Leading scorer with ${(points / gamesPlayed).toFixed(1)} average points per game.`,
        );
      }
      if (rebounds / gamesPlayed >= 7) {
        strengths.push(
          `Board Dominance: Strong paint presence with ${(rebounds / gamesPlayed).toFixed(1)} rebounds per game.`,
        );
      }
    } else if (primarySport === 'volleyball') {
      const kills = allTime.kills || 0;
      const blocks = allTime.blocks || 0;
      if (kills / gamesPlayed >= 6) {
        strengths.push(
          `Spiking efficiency: Threat at the net with ${(kills / gamesPlayed).toFixed(1)} kills per match.`,
        );
      }
      if (blocks / gamesPlayed >= 2.5) {
        strengths.push(
          `Front-line Blocker: Defensive presence at the net, shutting down opponent drives.`,
        );
      }
    }

    if (strengths.length === 0) {
      strengths.push(
        'Adaptability: Willing to support various roles and team configurations.',
      );
    }
    if (weaknesses.length === 0) {
      weaknesses.push(
        'Card/Foul management: Needs to ensure defensive discipline is maintained.',
      );
    }

    // 2. Consistency
    let consistency = '';
    if (gamesPlayed === 0) {
      consistency = 'Insufficient data to evaluate performance consistency.';
    } else if (avgRating >= 7.5) {
      consistency = `Exhibits outstanding performance consistency, maintaining an elite average rating of ${avgRating.toFixed(2)} across all competitions.`;
    } else if (avgRating >= 6.5) {
      consistency = `Displays steady consistency. The player serves as a stable contributor, averaging a solid ${avgRating.toFixed(2)} rating.`;
    } else {
      consistency = `Performance fluctuates. Average rating is currently ${avgRating.toFixed(2)}, indicating a need for stable positioning or conditioning.`;
    }

    // 3. Recent Form
    let recentForm = '';
    if (recentFormMatches.length === 0) {
      recentForm = 'No recent matches available to evaluate form trends.';
    } else {
      const validRatings = recentFormMatches.filter((m) => m.rating !== null);
      if (validRatings.length === 0) {
        recentForm =
          'Recent matches played, but no performance ratings are recorded.';
      } else {
        const recentAvg =
          validRatings.reduce((sum, m) => sum + m.rating, 0) /
          validRatings.length;
        if (recentAvg >= 8.0) {
          recentForm = `Excellent recent form! Averaging an outstanding ${recentAvg.toFixed(2)} rating over the last ${validRatings.length} matches, representing a peak performance cycle.`;
        } else if (recentAvg >= 6.8) {
          recentForm = `Good, steady form. Averaging a solid ${recentAvg.toFixed(2)} rating in recent matches, keeping up with team expectations.`;
        } else {
          recentForm = `Dip in recent performance. Average rating dropped to ${recentAvg.toFixed(2)} in the last ${validRatings.length} matches, which may indicate fatigue or tactical struggles.`;
        }
      }
    }

    // 4. Recommendations
    if (primarySport === 'football') {
      if (weaknesses.some((w) => w.includes('Goal'))) {
        recommendations.push(
          'Work on finishing and shooting drills to improve scoring conversion.',
        );
      }
      if (weaknesses.some((w) => w.includes('Chances'))) {
        recommendations.push(
          'Develop key pass execution and playmaking runs during transitional play.',
        );
      }
      recommendations.push(
        'Maintain high-intensity conditioning to support tracking back and pitch coverage.',
      );
    } else if (primarySport === 'cricket') {
      if (weaknesses.some((w) => w.includes('Batting'))) {
        recommendations.push(
          'Focus on strike-rotation drills and defensive batting postures against spinners.',
        );
      }
      if (weaknesses.some((w) => w.includes('Bowling'))) {
        recommendations.push(
          'Incorporate bowling variations like slower balls or cutters to surprise batsman.',
        );
      }
      recommendations.push(
        'Focus on fielding agility and throwing accuracy to build pressure on the field.',
      );
    } else {
      recommendations.push(
        'Enhance spatial awareness and positional transitions to avoid defensive gaps.',
      );
      recommendations.push(
        'Work on explosive acceleration and fast-recovery conditioning.',
      );
    }

    // 5. Season / Competition Trend
    let comparisonTrendText = '';
    const comps = stats.competitions || [];
    if (comps.length <= 1) {
      comparisonTrendText =
        'Single competition data available. Season comparison trends will expand as the player registers in new tournaments.';
    } else {
      const sortedByRating = [...comps].sort(
        (a, b) => b.avgRating - a.avgRating,
      );
      const best = sortedByRating[0];
      const worst = sortedByRating[sortedByRating.length - 1];
      comparisonTrendText = `The player has shown their strongest performance in the "${best.competitionName}" (average rating: ${best.avgRating.toFixed(2)}), while facing their toughest challenge in the "${worst.competitionName}" (average rating: ${worst.avgRating.toFixed(2)}).`;
    }

    // 6. Overall AI analysis text
    const aiAnalysisText = `Statistical analysis for ${player.user?.username || 'Player'} shows key strengths in ${strengths[0]?.split(':')[0] || 'general play'}. Recent form suggests the player is ${recentForm.toLowerCase().includes('excellent') ? 'performing at an elite level' : 'contributing steadily'}. Adhering to tactical recommendations will optimize performance in upcoming matches.`;

    return {
      strengths,
      weaknesses,
      consistency,
      recentForm,
      recommendations,
      comparisonTrendText,
      aiAnalysisText,
    };
  }
}
