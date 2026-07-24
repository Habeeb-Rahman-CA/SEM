import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competition } from '../../workspaces/entities/competition.entity';
import { CompetitionStage } from '../../workspaces/entities/competition-stage.entity';
import { Match } from '../../workspaces/entities/match.entity';

@Injectable()
export class CompetitionRankingsService {
  constructor(
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
  ) {}

  async getCompetitionRankings(
    competitionId: string,
  ): Promise<Map<string, number>> {
    const rankings = new Map<string, number>();
    const comp = await this.competitionRepo.findOne({
      where: { id: competitionId },
      relations: { stages: true },
    });
    if (!comp || comp.stages.length === 0) return rankings;

    const sortedStages = [...comp.stages].sort(
      (a, b) => a.sequence - b.sequence,
    );
    const lastStage = sortedStages[sortedStages.length - 1];

    const matches = await this.matchRepo.find({
      where: { stageId: lastStage.id },
      relations: { homeTeam: true, awayTeam: true },
    });
    if (matches.length === 0) return rankings;

    if (lastStage.type === 'league' || lastStage.type === 'group') {
      const winPoint = lastStage.config?.winPoint ?? 3;
      const drawPoint = lastStage.config?.drawPoint ?? 1;

      const teamStats = new Map<
        string,
        {
          teamId: string;
          group?: string;
          pts: number;
          gd: number;
          gf: number;
          ga: number;
        }
      >();
      for (const m of matches) {
        if (!m.homeTeamId || !m.awayTeamId) continue;
        const g = (m.config as any)?.round || 'Group Stage';

        if (!teamStats.has(m.homeTeamId)) {
          teamStats.set(m.homeTeamId, {
            teamId: m.homeTeamId,
            group: g,
            pts: 0,
            gd: 0,
            gf: 0,
            ga: 0,
          });
        }
        if (!teamStats.has(m.awayTeamId)) {
          teamStats.set(m.awayTeamId, {
            teamId: m.awayTeamId,
            group: g,
            pts: 0,
            gd: 0,
            gf: 0,
            ga: 0,
          });
        }

        const home = teamStats.get(m.homeTeamId)!;
        const away = teamStats.get(m.awayTeamId)!;

        if (m.status === 'completed') {
          const hScore = m.homeScore ?? 0;
          const aScore = m.awayScore ?? 0;

          home.gf += hScore;
          home.ga += aScore;
          away.gf += aScore;
          away.ga += hScore;

          if (hScore > aScore) {
            home.pts += winPoint;
          } else if (aScore > hScore) {
            away.pts += winPoint;
          } else {
            home.pts += drawPoint;
            away.pts += drawPoint;
          }
        }
      }

      for (const stats of teamStats.values()) {
        stats.gd = stats.gf - stats.ga;
      }

      const groups = new Map<string, any[]>();
      for (const stats of teamStats.values()) {
        const g = stats.group || 'Group Stage';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push(stats);
      }

      for (const [groupName, statsList] of groups.entries()) {
        statsList.sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if (b.gd !== a.gd) return b.gd - a.gd;
          return b.gf - a.gf;
        });
      }

      let rank = 1;
      const maxGroupSize = Math.max(
        ...Array.from(groups.values()).map((list) => list.length),
      );

      for (let pos = 0; pos < maxGroupSize; pos++) {
        const teamsAtPos: any[] = [];
        for (const list of groups.values()) {
          if (list[pos]) teamsAtPos.push(list[pos]);
        }

        teamsAtPos.sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if (b.gd !== a.gd) return b.gd - a.gd;
          return b.gf - a.gf;
        });

        for (const t of teamsAtPos) {
          rankings.set(t.teamId, rank++);
        }
      }
    } else if (
      lastStage.type === 'knockout' ||
      lastStage.type === 'group_knockout'
    ) {
      const groupMatches = matches.filter((m: any) => {
        const r = m.config?.round || '';
        return (
          r.toLowerCase().includes('group') ||
          r.toLowerCase().includes('league')
        );
      });
      const knockoutMatches = matches.filter((m: any) => {
        const r = m.config?.round || '';
        return (
          !r.toLowerCase().includes('group') &&
          !r.toLowerCase().includes('league')
        );
      });

      const teamHighestRound = new Map<string, string>();
      const teamFinalStatus = new Map<
        string,
        'won_final' | 'lost_final' | 'won_third' | 'lost_third' | 'lost'
      >();

      const allTeamIds = new Set<string>();
      for (const m of matches) {
        if (m.homeTeamId) allTeamIds.add(m.homeTeamId);
        if (m.awayTeamId) allTeamIds.add(m.awayTeamId);
      }

      const finalMatch = knockoutMatches.find(
        (m: any) => m.config?.round?.toLowerCase() === 'final',
      );
      if (finalMatch && finalMatch.status === 'completed') {
        const hScore = finalMatch.homeScore ?? 0;
        const aScore = finalMatch.awayScore ?? 0;
        if (hScore > aScore) {
          teamFinalStatus.set(finalMatch.homeTeamId!, 'won_final');
          teamFinalStatus.set(finalMatch.awayTeamId!, 'lost_final');
        } else if (aScore > hScore) {
          teamFinalStatus.set(finalMatch.awayTeamId!, 'won_final');
          teamFinalStatus.set(finalMatch.homeTeamId!, 'lost_final');
        }
      }

      const thirdPlaceMatch = knockoutMatches.find((m: any) => {
        const r = m.config?.round?.toLowerCase() || '';
        return r.includes('third') || r.includes('3rd') || r.includes('bronze');
      });
      if (thirdPlaceMatch && thirdPlaceMatch.status === 'completed') {
        const hScore = thirdPlaceMatch.homeScore ?? 0;
        const aScore = thirdPlaceMatch.awayScore ?? 0;
        if (hScore > aScore) {
          teamFinalStatus.set(thirdPlaceMatch.homeTeamId!, 'won_third');
          teamFinalStatus.set(thirdPlaceMatch.awayTeamId!, 'lost_third');
        } else if (aScore > hScore) {
          teamFinalStatus.set(thirdPlaceMatch.awayTeamId!, 'won_third');
          teamFinalStatus.set(thirdPlaceMatch.homeTeamId!, 'lost_third');
        }
      }

      const getRoundRankWeight = (roundName: string): number => {
        const r = roundName.toLowerCase();
        if (r === 'final') return 10;
        if (r.includes('third') || r.includes('3rd') || r.includes('bronze'))
          return 9;
        if (r.includes('semi')) return 8;
        if (r.includes('quarter')) return 7;
        if (r.includes('round of 16') || r.includes('1/8')) return 6;
        if (r.includes('round of 32') || r.includes('1/16')) return 5;
        return 1;
      };

      for (const m of knockoutMatches) {
        const r = (m.config as any)?.round || '';
        if (m.homeTeamId) {
          const prev = teamHighestRound.get(m.homeTeamId);
          if (!prev || getRoundRankWeight(r) > getRoundRankWeight(prev)) {
            teamHighestRound.set(m.homeTeamId, r);
          }
        }
        if (m.awayTeamId) {
          const prev = teamHighestRound.get(m.awayTeamId);
          if (!prev || getRoundRankWeight(r) > getRoundRankWeight(prev)) {
            teamHighestRound.set(m.awayTeamId, r);
          }
        }
      }

      const winner = Array.from(allTeamIds).find(
        (id) => teamFinalStatus.get(id) === 'won_final',
      );
      const runner = Array.from(allTeamIds).find(
        (id) => teamFinalStatus.get(id) === 'lost_final',
      );
      const third = Array.from(allTeamIds).find(
        (id) => teamFinalStatus.get(id) === 'won_third',
      );
      const fourth = Array.from(allTeamIds).find(
        (id) => teamFinalStatus.get(id) === 'lost_third',
      );

      if (winner) rankings.set(winner, 1);
      if (runner) rankings.set(runner, 2);
      if (third) rankings.set(third, 3);
      if (fourth) rankings.set(fourth, 4);

      const semiLosers = Array.from(allTeamIds).filter((id) => {
        const hr = teamHighestRound.get(id)?.toLowerCase() || '';
        return (
          hr.includes('semi') &&
          id !== winner &&
          id !== runner &&
          id !== third &&
          id !== fourth
        );
      });
      const semiPos = third ? 4 : 3;
      semiLosers.forEach((id) => rankings.set(id, semiPos));

      const quarterLosers = Array.from(allTeamIds).filter((id) => {
        const hr = teamHighestRound.get(id)?.toLowerCase() || '';
        return hr.includes('quarter');
      });
      quarterLosers.forEach((id) => rankings.set(id, 5));

      const r16Losers = Array.from(allTeamIds).filter((id) => {
        const hr = teamHighestRound.get(id)?.toLowerCase() || '';
        return hr.includes('round of 16') || hr.includes('1/8');
      });
      r16Losers.forEach((id) => rankings.set(id, 9));

      const groupOnlyTeams = Array.from(allTeamIds).filter(
        (id) => !teamHighestRound.has(id),
      );
      if (groupOnlyTeams.length > 0 && groupMatches.length > 0) {
        const winPoint = lastStage.config?.winPoint ?? 3;
        const drawPoint = lastStage.config?.drawPoint ?? 1;

        const groupStats = new Map<
          string,
          { teamId: string; pts: number; gd: number; gf: number; ga: number }
        >();
        for (const id of groupOnlyTeams) {
          groupStats.set(id, { teamId: id, pts: 0, gd: 0, gf: 0, ga: 0 });
        }

        for (const m of groupMatches) {
          if (!m.homeTeamId || !m.awayTeamId) continue;
          if (m.status !== 'completed') continue;

          const hStats = groupStats.get(m.homeTeamId);
          const aStats = groupStats.get(m.awayTeamId);
          const hScore = m.homeScore ?? 0;
          const aScore = m.awayScore ?? 0;

          if (hStats) {
            hStats.gf += hScore;
            hStats.ga += aScore;
            if (hScore > aScore) hStats.pts += winPoint;
            else if (hScore === aScore) hStats.pts += drawPoint;
          }
          if (aStats) {
            aStats.gf += aScore;
            aStats.ga += hScore;
            if (aScore > hScore) aStats.pts += winPoint;
            else if (hScore === aScore) aStats.pts += drawPoint;
          }
        }

        for (const stats of groupStats.values()) {
          stats.gd = stats.gf - stats.ga;
        }

        const sortedGroupOnly = Array.from(groupStats.values()).sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if (b.gd !== a.gd) return b.gd - a.gd;
          return b.gf - a.gf;
        });

        const startPos = 17;
        sortedGroupOnly.forEach((s, idx) => {
          rankings.set(s.teamId, startPos + idx);
        });
      }

      if (lastStage.type === 'knockout') {
        const prevStage = sortedStages[sortedStages.indexOf(lastStage) - 1];
        if (
          prevStage &&
          (prevStage.type === 'group' || prevStage.type === 'league')
        ) {
          const prevRankings = await this.getStageRankings(prevStage);
          const groupOnlyTeamsPrev = prevRankings.filter(
            (id) => !allTeamIds.has(id),
          );

          let nextRank = 5;
          for (const r of rankings.values()) {
            if (r >= nextRank) nextRank = r + 1;
          }

          groupOnlyTeamsPrev.forEach((id) => {
            rankings.set(id, nextRank++);
          });
        }
      }
    }

    return rankings;
  }

  async getStageRankings(stage: CompetitionStage): Promise<string[]> {
    const matches = await this.matchRepo.find({
      where: { stageId: stage.id },
    });

    const winPoint = stage.config?.winPoint ?? 3;
    const drawPoint = stage.config?.drawPoint ?? 1;

    const teamIds = new Set<string>();
    for (const m of matches) {
      if (m.homeTeamId) teamIds.add(m.homeTeamId);
      if (m.awayTeamId) teamIds.add(m.awayTeamId);
    }

    const standings = new Map<
      string,
      { teamId: string; pts: number; gd: number; gf: number }
    >();
    for (const teamId of teamIds) {
      standings.set(teamId, { teamId, pts: 0, gd: 0, gf: 0 });
    }

    for (const m of matches) {
      if (m.status !== 'completed' || !m.homeTeamId || !m.awayTeamId) continue;

      const homeStats = standings.get(m.homeTeamId);
      const awayStats = standings.get(m.awayTeamId);
      if (!homeStats || !awayStats) continue;

      const hScore = m.homeScore ?? 0;
      const aScore = m.awayScore ?? 0;

      homeStats.gf += hScore;
      awayStats.gf += aScore;
      homeStats.gd += hScore - aScore;
      awayStats.gd += aScore - hScore;

      if (hScore > aScore) {
        homeStats.pts += winPoint;
      } else if (aScore > hScore) {
        awayStats.pts += winPoint;
      } else {
        homeStats.pts += drawPoint;
        awayStats.pts += drawPoint;
      }
    }

    return Array.from(teamIds).sort((a, b) => {
      const statsA = standings.get(a)!;
      const statsB = standings.get(b)!;
      if (statsB.pts !== statsA.pts) return statsB.pts - statsA.pts;
      if (statsB.gd !== statsA.gd) return statsB.gd - statsA.gd;
      return statsB.gf - statsA.gf;
    });
  }
}
