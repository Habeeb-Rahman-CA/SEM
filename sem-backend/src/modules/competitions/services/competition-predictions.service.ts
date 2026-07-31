import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Competition } from '../entities/competition.entity';
import { CompetitionStage } from '../entities/competition-stage.entity';
import { Match } from '../entities/match.entity';
import { CompetitionTeam } from '../entities/competition-team.entity';
import { generateTextWithFallback } from '../../../common/ai-client';

export interface PredictionResponse {
  qualificationProbabilities: Array<{
    teamId: string;
    teamName: string;
    probability: number;
    confidence: 'High' | 'Medium' | 'Low';
    reasoning: string;
  }>;
  likelyWinners: Array<{
    rank: number;
    teamId: string;
    teamName: string;
    confidence: 'High' | 'Medium' | 'Low';
    reasoning: string;
  }>;
  forecastedStandings: Array<{
    teamName: string;
    projectedPoints: number;
    projectedRank: number;
  }>;
  confidenceScore: number;
  disclaimer: string;
}

@Injectable()
export class CompetitionPredictionsService {
  constructor(
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(CompetitionStage)
    private readonly stageRepo: Repository<CompetitionStage>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(CompetitionTeam)
    private readonly competitionTeamRepo: Repository<CompetitionTeam>,
  ) {}

  async getPredictions(competitionId: string): Promise<PredictionResponse> {
    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId },
      relations: { sport: true },
    });
    if (!competition) {
      throw new NotFoundException(`Competition "${competitionId}" not found`);
    }

    const stages = await this.stageRepo.find({
      where: { competitionId },
      order: { sequence: 'ASC' },
    });

    const stageIds = stages.map((s) => s.id);
    const matches =
      stageIds.length > 0
        ? await this.matchRepo.find({
            where: { stageId: In(stageIds) },
            relations: { homeTeam: true, awayTeam: true },
          })
        : [];

    const competitionTeams = await this.competitionTeamRepo.find({
      where: { competitionId },
      relations: { team: true },
    });

    const teamStatsMap = new Map<
      string,
      {
        teamId: string;
        teamName: string;
        played: number;
        won: number;
        lost: number;
        drawn: number;
        scored: number;
        conceded: number;
        points: number;
      }
    >();

    for (const ct of competitionTeams) {
      if (ct.team) {
        teamStatsMap.set(ct.teamId, {
          teamId: ct.teamId,
          teamName: ct.team.name,
          played: 0,
          won: 0,
          lost: 0,
          drawn: 0,
          scored: 0,
          conceded: 0,
          points: 0,
        });
      }
    }

    for (const m of matches) {
      if (m.status !== 'completed') continue;
      if (!m.homeTeamId || !m.awayTeamId) continue;

      const home = teamStatsMap.get(m.homeTeamId);
      const away = teamStatsMap.get(m.awayTeamId);

      if (home && away) {
        home.played += 1;
        away.played += 1;
        home.scored += m.homeScore;
        home.conceded += m.awayScore;
        away.scored += m.awayScore;
        away.conceded += m.homeScore;

        if (m.homeScore > m.awayScore) {
          home.won += 1;
          home.points += 3;
          away.lost += 1;
        } else if (m.awayScore > m.homeScore) {
          away.won += 1;
          away.points += 3;
          home.lost += 1;
        } else {
          home.drawn += 1;
          away.drawn += 1;
          home.points += 1;
          away.points += 1;
        }
      }
    }

    const sortedStats = Array.from(teamStatsMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.scored - a.conceded;
      const gdB = b.scored - b.conceded;
      if (gdB !== gdA) return gdB - gdA;
      return b.scored - a.scored;
    });

    const prompt = this.buildPrompt(competition, stages, matches, sortedStats);

    try {
      const aiResponse = await generateTextWithFallback(prompt);
      if (aiResponse) {
        const cleaned = this.extractJson(aiResponse);
        if (cleaned) {
          const parsed = JSON.parse(cleaned) as PredictionResponse;
          if (
            parsed.qualificationProbabilities &&
            parsed.likelyWinners &&
            parsed.forecastedStandings
          ) {
            return parsed;
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate AI predictions:', err);
    }

    return this.generateRuleBasedPredictions(sortedStats);
  }

  private buildPrompt(
    competition: Competition,
    stages: CompetitionStage[],
    matches: Match[],
    sortedStats: any[],
  ): string {
    const stagesInfo = stages
      .map((s) => `- Stage: ${s.name} (${s.type})`)
      .join('\n');
    const matchesInfo = matches
      .map(
        (m) =>
          `- ${m.homeTeam?.name || 'Home'} vs ${m.awayTeam?.name || 'Away'}: ${
            m.status === 'completed'
              ? `${m.homeScore} - ${m.awayScore}`
              : 'Scheduled'
          }`,
      )
      .join('\n');
    const standingsInfo = sortedStats
      .map(
        (s, idx) =>
          `${idx + 1}. ${s.teamName}: Points ${s.points}, Played ${s.played}, GD ${s.scored - s.conceded}`,
      )
      .join('\n');

    return `
You are an expert sports analyst and statistical modeler. Based on the following current competition progress, matches, and standings, estimate stage qualification probabilities, forecast likely winners, and project the final standings.

Competition Name: ${competition.name}
Sport: ${competition.sport?.name || 'Sport'}

Stages:
${stagesInfo}

Matches:
${matchesInfo}

Current Standing & Metrics:
${standingsInfo}

Please estimate:
1. "qualificationProbabilities": The probability (0-100) of each team qualifying to the next stage or finishing in a qualifying position, alongside a confidence rank (High/Medium/Low) and key reason.
2. "likelyWinners": The top 3 projected teams with their rank, confidence level, and detailed explanation.
3. "forecastedStandings": The projected rank and points for every team at the end of the competition.
4. "confidenceScore": An overall model confidence score from 0 to 100.

Return ONLY a valid JSON object matching the following structure (no extra text, markdown wrappers, or explanations):
{
  "qualificationProbabilities": [
    { "teamId": "team-uuid-or-placeholder", "teamName": "Team Name", "probability": 85, "confidence": "High", "reasoning": "Brief analysis..." }
  ],
  "likelyWinners": [
    { "rank": 1, "teamId": "team-uuid", "teamName": "Team Name", "confidence": "High", "reasoning": "Reason..." }
  ],
  "forecastedStandings": [
    { "teamName": "Team Name", "projectedPoints": 18, "projectedRank": 1 }
  ],
  "confidenceScore": 85,
  "disclaimer": "These predictions are AI-generated based on current statistics and historical patterns. They do not represent official tournament results."
}
`;
  }

  private extractJson(text: string): string | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return text.substring(start, end + 1);
    }
    return null;
  }

  private generateRuleBasedPredictions(sortedStats: any[]): PredictionResponse {
    const qualificationProbabilities = sortedStats.map((team, idx) => {
      let probability = 50;
      let confidence: 'High' | 'Medium' | 'Low' = 'Medium';
      if (idx === 0) {
        probability = 95;
        confidence = 'High';
      } else if (idx === 1) {
        probability = 85;
        confidence = 'High';
      } else if (idx === 2) {
        probability = 70;
        confidence = 'Medium';
      } else if (idx === sortedStats.length - 1) {
        probability = 15;
        confidence = 'High';
      }

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        probability,
        confidence,
        reasoning: `Rule-based forecast based on current ranking position (${idx + 1}) with ${team.points} points.`,
      };
    });

    const likelyWinners: PredictionResponse['likelyWinners'] = sortedStats
      .slice(0, 3)
      .map((team, idx) => ({
        rank: idx + 1,
        teamId: team.teamId,
        teamName: team.teamName,
        confidence: idx === 0 ? 'High' : 'Medium',
        reasoning: `Currently sitting in rank ${idx + 1} with ${team.points} points.`,
      }));

    const forecastedStandings = sortedStats.map((team, idx) => ({
      teamName: team.teamName,
      projectedPoints:
        team.points +
        (team.played > 0 ? Math.round(team.points / team.played) : 0),
      projectedRank: idx + 1,
    }));

    return {
      qualificationProbabilities,
      likelyWinners,
      forecastedStandings,
      confidenceScore: 60,
      disclaimer:
        'These predictions are calculated via a statistical fallback algorithm based on current points and standings. They do not represent official tournament results.',
    };
  }
}
