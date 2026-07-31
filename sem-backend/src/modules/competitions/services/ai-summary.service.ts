import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '../entities/match.entity';
import { MatchPlayer } from '../../players/entities/match-player.entity';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class AiSummaryService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayerRepo: Repository<MatchPlayer>,
    private readonly aiService: AiService,
  ) {}

  async generateAndSaveSummary(matchId: string): Promise<Match> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: {
        homeTeam: true,
        awayTeam: true,
        venue: true,
        stage: {
          competition: {
            sport: true,
            event: true,
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException(`Match "${matchId}" not found`);
    }

    const matchPlayers = await this.matchPlayerRepo.find({
      where: { matchId: match.id },
      relations: { player: { user: true }, team: true },
    });

    const summary = await this.buildSummary(match, matchPlayers);
    match.summaryDraft = summary;
    match.isSummaryPublished = false; // set as draft, awaiting human review
    return this.matchRepo.save(match);
  }

  async publishSummary(matchId: string): Promise<Match> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException(`Match "${matchId}" not found`);
    match.summary = match.summaryDraft || match.summary;
    match.isSummaryPublished = true;
    return this.matchRepo.save(match);
  }

  async updateSummaryDraft(
    matchId: string,
    summaryDraft: string,
  ): Promise<Match> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException(`Match "${matchId}" not found`);
    match.summaryDraft = summaryDraft;
    return this.matchRepo.save(match);
  }

  private async buildSummary(
    match: Match,
    matchPlayers: MatchPlayer[],
  ): Promise<string> {
    try {
      const prompt = this.buildPrompt(match, matchPlayers);
      const summary = await this.aiService.generateText(prompt);
      if (summary) return summary.trim();
    } catch (err) {
      console.error('Failed to generate summary with AI:', err);
    }

    return this.generateRuleBasedSummary(match, matchPlayers);
  }

  private buildPrompt(match: Match, matchPlayers: MatchPlayer[]): string {
    const homeTeam = match.homeTeam?.name || 'Home';
    const awayTeam = match.awayTeam?.name || 'Away';
    const sport = match.stage?.competition?.sport?.name || 'Sport';
    const venue = match.venue?.name || 'Unknown Venue';
    const events = match.liveData?.events || [];
    const inningsData = match.liveData?.inningsData || [];

    const playersInfo = matchPlayers
      .map((mp) => {
        const name =
          mp.player?.user?.username ||
          `Player #${mp.player?.jerseyNumber}` ||
          'Player';
        return `- ${name} (${mp.team?.name}): Rating ${mp.rating || 'N/A'}, Playing: ${mp.isPlaying}`;
      })
      .join('\n');

    return `
You are an expert sports writer. Generate a concise, human-readable match summary (2-4 paragraphs) suitable for a public event page based on the following data.
Highlight key events such as goals, wickets, cards, substitutions, and player performances.

Sport: ${sport}
Match: ${homeTeam} vs ${awayTeam}
Final Score: ${match.homeScore} - ${match.awayScore}
Status: ${match.status}
Venue: ${venue}

Events & Live Data:
${JSON.stringify({ events, inningsData }, null, 2)}

Player Stats and Ratings:
${playersInfo}

Make the summary engaging, direct, and professional. Return ONLY the markdown summary text without any surrounding JSON or extra commentary.
`;
  }

  private generateRuleBasedSummary(
    match: Match,
    matchPlayers: MatchPlayer[],
  ): string {
    const homeName = match.homeTeam?.name || 'Home Team';
    const awayName = match.awayTeam?.name || 'Away Team';
    const venueName = match.venue?.name ? ` at ${match.venue.name}` : '';
    const sportCode = match.stage?.competition?.sport?.code || 'football';

    let intro = `The match between **${homeName}** and **${awayName}**${venueName} concluded with a final score of **${match.homeScore} - ${match.awayScore}**. `;

    if (match.homeScore > match.awayScore) {
      intro += `**${homeName}** secured the victory after a hard-fought contest. `;
    } else if (match.awayScore > match.homeScore) {
      intro += `**${awayName}** emerged victorious with an impressive performance. `;
    } else {
      intro += `The match ended in a well-contested draw. `;
    }

    let highlights = '';
    const events = match.liveData?.events || [];

    // Map players for easy lookup
    const playerMap = new Map<string, string>();
    for (const mp of matchPlayers) {
      const name =
        mp.player?.user?.username ||
        `Player #${mp.player?.jerseyNumber}` ||
        'Player';
      playerMap.set(mp.playerId, name);
      if (mp.player?.userId) {
        playerMap.set(mp.player.userId, name);
      }
    }

    if (sportCode === 'football') {
      const goals: string[] = [];
      const cards: string[] = [];
      const subs: string[] = [];

      for (const ev of events) {
        const min = ev.minute ? `${ev.minute}'` : 'elapsed time';
        const pName = ev.playerUserId
          ? playerMap.get(ev.playerUserId)
          : ev.playerId
            ? playerMap.get(ev.playerId)
            : 'A player';
        const assistName = ev.assistPlayerUserId
          ? playerMap.get(ev.assistPlayerUserId)
          : ev.assistPlayerId
            ? playerMap.get(ev.assistPlayerId)
            : null;

        if (ev.type === 'goal') {
          if (ev.goalType === 'own_goal') {
            goals.push(`⚽ Own goal by **${pName}** in the ${min}`);
          } else {
            const assistStr = assistName
              ? ` (assisted by **${assistName}**)`
              : '';
            goals.push(
              `⚽ Goal scored by **${pName}** in the ${min}${assistStr}`,
            );
          }
        } else if (ev.type === 'card') {
          const type = ev.cardType || 'yellow';
          cards.push(
            `🟨/🟥 **${pName}** received a **${type}** card in the ${min}`,
          );
        } else if (ev.type === 'substitution') {
          const outName = ev.playerOutUserId
            ? playerMap.get(ev.playerOutUserId)
            : 'out';
          subs.push(
            `🔄 Substitution: **${pName}** replaced **${outName}** in the ${min}`,
          );
        }
      }

      if (goals.length > 0 || cards.length > 0 || subs.length > 0) {
        highlights += `### Key Match Events:\n`;
        if (goals.length > 0)
          highlights += goals.map((g) => `- ${g}`).join('\n') + '\n';
        if (cards.length > 0)
          highlights += cards.map((c) => `- ${c}`).join('\n') + '\n';
        if (subs.length > 0)
          highlights += subs.map((s) => `- ${s}`).join('\n') + '\n';
      }
    } else if (sportCode === 'cricket') {
      const innings = match.liveData?.inningsData || [];
      if (innings.length > 0) {
        highlights += `### Innings Breakdown:\n`;
        innings.forEach((inn: any, idx: number) => {
          const batTeam =
            inn.battingTeamId === match.homeTeamId ? homeName : awayName;
          highlights += `- **Innings ${idx + 1}**: **${batTeam}** scored **${inn.runs}/${inn.wickets}** in **${inn.overs}.${inn.balls || 0}** overs.\n`;
        });
      }

      const bats: Array<{ name: string; runs: number; balls: number }> = [];
      const bowls: Array<{
        name: string;
        wickets: number;
        runsConceded: number;
      }> = [];

      for (const inn of innings) {
        const batStats = inn.batsmanStats || {};
        for (const user of Object.keys(batStats)) {
          bats.push({
            name: user,
            runs: batStats[user].runs || 0,
            balls: batStats[user].balls || 0,
          });
        }
        const bowlStats = inn.bowlerStats || {};
        for (const user of Object.keys(bowlStats)) {
          bowls.push({
            name: user,
            wickets: bowlStats[user].wickets || 0,
            runsConceded: bowlStats[user].runsConceded || 0,
          });
        }
      }

      const topBats = bats.sort((a, b) => b.runs - a.runs).slice(0, 2);
      const topBowls = bowls.sort((a, b) => b.wickets - a.wickets).slice(0, 2);

      if (topBats.length > 0 || topBowls.length > 0) {
        highlights += `\n### Notable Performances:\n`;
        if (topBats.length > 0) {
          highlights +=
            `- **Batting**: ` +
            topBats
              .map((b) => `**${b.name}** (${b.runs} runs off ${b.balls} balls)`)
              .join(', ') +
            '\n';
        }
        if (topBowls.length > 0) {
          highlights +=
            `- **Bowling**: ` +
            topBowls
              .map(
                (b) =>
                  `**${b.name}** (${b.wickets} wickets for ${b.runsConceded} runs)`,
              )
              .join(', ') +
            '\n';
        }
      }
    } else {
      // Set/Game-based sports: badminton, volleyball, table-tennis, throwball
      const sets = match.liveData?.sets || match.liveData?.games || [];
      if (sets && sets.length > 0) {
        highlights += `### Sets Score:\n`;
        sets.forEach((set: any, idx: number) => {
          highlights += `- **Set ${idx + 1}**: ${set.homeScore} - ${set.awayScore}\n`;
        });
      }
    }

    // Player ratings/MVP performance
    const ratedPlayers = matchPlayers
      .filter((mp) => mp.rating !== null)
      .sort((a, b) => Number(b.rating) - Number(a.rating));

    if (ratedPlayers.length > 0) {
      highlights += `\n### Top Player Ratings:\n`;
      ratedPlayers.slice(0, 3).forEach((mp) => {
        const name = playerMap.get(mp.playerId) || 'Player';
        const teamName = mp.team?.name || 'Team';
        highlights += `- **${name}** (${teamName}): **${mp.rating}** rating\n`;
      });
    }

    return `${intro}\n\n${highlights.trim()}`;
  }
}
