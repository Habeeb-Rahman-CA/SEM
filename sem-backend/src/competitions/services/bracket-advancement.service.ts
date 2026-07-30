import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competition } from '../../workspaces/entities/competition.entity';
import { CompetitionStage } from '../../workspaces/entities/competition-stage.entity';
import { Match } from '../../workspaces/entities/match.entity';
import { CompetitionTeam } from '../../workspaces/entities/competition-team.entity';
import { Team } from '../../workspaces/entities/team.entity';
import { NotificationType } from '../../workspaces/entities/notification.entity';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { CompetitionRankingsService } from './competition-rankings.service';
import { MatchGenerationService } from './match-generation.service';
import { CompetitionCompletionService } from './competition-completion.service';

@Injectable()
export class BracketAdvancementService {
  constructor(
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(CompetitionStage)
    private readonly stageRepo: Repository<CompetitionStage>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(CompetitionTeam)
    private readonly competitionTeamRepo: Repository<CompetitionTeam>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    private readonly workspacesService: WorkspacesService,
    private readonly competitionRankingsService: CompetitionRankingsService,
    private readonly matchGenerationService: MatchGenerationService,
    private readonly competitionCompletionService: CompetitionCompletionService,
  ) {}

  async getCompetitionRankings(
    competitionId: string,
  ): Promise<Map<string, number>> {
    return this.competitionRankingsService.getCompetitionRankings(
      competitionId,
    );
  }

  async checkAndAutoCompleteCompetition(competitionId: string): Promise<void> {
    return this.competitionCompletionService.checkAndAutoCompleteCompetition(
      competitionId,
    );
  }

  async advanceGroupStageWinners(stage: CompetitionStage): Promise<void> {
    const allMatches = await this.matchRepo.find({
      where: { stageId: stage.id },
      order: { id: 'ASC', createdAt: 'ASC' },
    });

    const groupMatches = allMatches.filter((m) => {
      const r = (m.config as any)?.round || '';
      return (
        r.toLowerCase().includes('group') || r.toLowerCase().includes('league')
      );
    });

    const knockoutMatches = allMatches.filter((m) => {
      const r = (m.config as any)?.round || '';
      return (
        !r.toLowerCase().includes('group') &&
        !r.toLowerCase().includes('league')
      );
    });

    if (groupMatches.length === 0 || knockoutMatches.length === 0) return;

    const allGroupMatchesCompleted = groupMatches.every(
      (m) => m.status === 'completed',
    );
    if (!allGroupMatchesCompleted) return;

    const winPoint = stage.config?.winPoint ?? 3;
    const drawPoint = stage.config?.drawPoint ?? 1;

    const roundTeams = new Map<string, Set<string>>();
    for (const m of groupMatches) {
      const r = (m.config as any)?.round || 'Group Stage';
      if (!roundTeams.has(r)) {
        roundTeams.set(r, new Set());
      }
      if (m.homeTeamId) roundTeams.get(r)!.add(m.homeTeamId);
      if (m.awayTeamId) roundTeams.get(r)!.add(m.awayTeamId);
    }

    const standings = new Map<
      string,
      { teamId: string; pts: number; gd: number; gf: number }
    >();
    for (const [r, teams] of roundTeams.entries()) {
      for (const teamId of teams) {
        standings.set(`${r}-${teamId}`, { teamId, pts: 0, gd: 0, gf: 0 });
      }
    }

    for (const m of groupMatches) {
      const r = (m.config as any)?.round || 'Group Stage';
      if (!m.homeTeamId || !m.awayTeamId) continue;

      const homeKey = `${r}-${m.homeTeamId}`;
      const awayKey = `${r}-${m.awayTeamId}`;

      const homeStats = standings.get(homeKey);
      const awayStats = standings.get(awayKey);
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

    const roundRankings = new Map<string, string[]>();
    for (const [r, teams] of roundTeams.entries()) {
      const sorted = Array.from(teams).sort((a, b) => {
        const statsA = standings.get(`${r}-${a}`)!;
        const statsB = standings.get(`${r}-${b}`)!;
        if (statsB.pts !== statsA.pts) return statsB.pts - statsA.pts;
        if (statsB.gd !== statsA.gd) return statsB.gd - statsA.gd;
        return statsB.gf - statsA.gf;
      });
      roundRankings.set(r, sorted);
    }

    const koRoundCounts: { [round: string]: number } = {};
    for (const m of knockoutMatches) {
      const rName = (m.config as any)?.round;
      if (!rName) continue;
      if (
        rName.toLowerCase().includes('third') ||
        rName.toLowerCase().includes('3rd')
      )
        continue;
      const isLeg1OrNone =
        (m.config as any)?.leg === undefined || (m.config as any)?.leg === 1;
      if (isLeg1OrNone) {
        koRoundCounts[rName] = (koRoundCounts[rName] || 0) + 1;
      }
    }
    const sortedKoRounds = Object.keys(koRoundCounts).sort(
      (a, b) => koRoundCounts[b] - koRoundCounts[a],
    );
    if (sortedKoRounds.length === 0) return;

    const firstKoRoundName = sortedKoRounds[0];
    const firstKoRoundMatches = knockoutMatches.filter(
      (m) =>
        (m.config as any)?.round === firstKoRoundName &&
        ((m.config as any)?.leg === undefined || (m.config as any)?.leg === 1),
    );

    const isSingleGroup = stage.config?.groupKnockoutSubtype === 'single_group';
    const advancingType = stage.config?.advancingType || 'winner';
    const groupsCount = stage.config?.groupsCount ?? 2;
    const twoLegged =
      (stage.config as any)?.twoLegged || (stage.config as any)?.legs === 2;

    const promotedTeams: { home: string; away: string }[] = [];

    if (isSingleGroup) {
      const sortedTeams = roundRankings.get('Group Stage') || [];
      if (firstKoRoundMatches.length === 1) {
        if (sortedTeams.length >= 2) {
          promotedTeams.push({ home: sortedTeams[0], away: sortedTeams[1] });
        }
        if (sortedTeams.length >= 4) {
          const thirdPlaceLeg1Match = knockoutMatches.find(
            (m) =>
              (m.config as any)?.round === 'Third Place Match' &&
              ((m.config as any)?.leg === undefined ||
                (m.config as any)?.leg === 1),
          );
          if (thirdPlaceLeg1Match) {
            thirdPlaceLeg1Match.homeTeamId = sortedTeams[2];
            thirdPlaceLeg1Match.awayTeamId = sortedTeams[3];
            await this.matchRepo.save(thirdPlaceLeg1Match);

            if (twoLegged) {
              const thirdPlaceLeg2Match = knockoutMatches.find(
                (m) =>
                  (m.config as any)?.round === 'Third Place Match' &&
                  (m.config as any)?.leg === 2,
              );
              if (thirdPlaceLeg2Match) {
                thirdPlaceLeg2Match.homeTeamId = sortedTeams[3];
                thirdPlaceLeg2Match.awayTeamId = sortedTeams[2];
                await this.matchRepo.save(thirdPlaceLeg2Match);
              }
            }
          }
        }
      } else if (firstKoRoundMatches.length === 2) {
        if (sortedTeams.length >= 4) {
          promotedTeams.push({ home: sortedTeams[0], away: sortedTeams[3] });
          promotedTeams.push({ home: sortedTeams[1], away: sortedTeams[2] });
        }
      }
    } else {
      const getWinner = (gIdx: number) => {
        const groupChar = String.fromCharCode(65 + gIdx);
        const sorted = roundRankings.get(`Group ${groupChar}`) || [];
        return sorted[0] || null;
      };
      const getRunner = (gIdx: number) => {
        const groupChar = String.fromCharCode(65 + gIdx);
        const sorted = roundRankings.get(`Group ${groupChar}`) || [];
        return sorted[1] || null;
      };

      if (groupsCount === 2) {
        if (advancingType === 'winner') {
          const wA = getWinner(0);
          const wB = getWinner(1);
          if (wA && wB) {
            promotedTeams.push({ home: wA, away: wB });
          }
          const rA = getRunner(0);
          const rB = getRunner(1);
          if (rA && rB) {
            const thirdPlaceLeg1Match = knockoutMatches.find(
              (m) =>
                (m.config as any)?.round === 'Third Place Match' &&
                ((m.config as any)?.leg === undefined ||
                  (m.config as any)?.leg === 1),
            );
            if (thirdPlaceLeg1Match) {
              thirdPlaceLeg1Match.homeTeamId = rA;
              thirdPlaceLeg1Match.awayTeamId = rB;
              await this.matchRepo.save(thirdPlaceLeg1Match);

              if (twoLegged) {
                const thirdPlaceLeg2Match = knockoutMatches.find(
                  (m) =>
                    (m.config as any)?.round === 'Third Place Match' &&
                    (m.config as any)?.leg === 2,
                );
                if (thirdPlaceLeg2Match) {
                  thirdPlaceLeg2Match.homeTeamId = rB;
                  thirdPlaceLeg2Match.awayTeamId = rA;
                  await this.matchRepo.save(thirdPlaceLeg2Match);
                }
              }
            }
          }
        } else if (advancingType === 'winner_and_runner') {
          const wA = getWinner(0);
          const rA = getRunner(0);
          const wB = getWinner(1);
          const rB = getRunner(1);
          if (wA && rB) promotedTeams.push({ home: wA, away: rB });
          if (wB && rA) promotedTeams.push({ home: wB, away: rA });
        }
      } else if (groupsCount === 4) {
        if (advancingType === 'winner') {
          const wA = getWinner(0);
          const wB = getWinner(1);
          const wC = getWinner(2);
          const wD = getWinner(3);
          if (wA && wB) promotedTeams.push({ home: wA, away: wB });
          if (wC && wD) promotedTeams.push({ home: wC, away: wD });
        } else if (advancingType === 'winner_and_runner') {
          const wA = getWinner(0);
          const rA = getRunner(0);
          const wB = getWinner(1);
          const rB = getRunner(1);
          const wC = getWinner(2);
          const rC = getRunner(2);
          const wD = getWinner(3);
          const rD = getRunner(3);
          if (wA && rB) promotedTeams.push({ home: wA, away: rB });
          if (wB && rA) promotedTeams.push({ home: wB, away: rA });
          if (wC && rD) promotedTeams.push({ home: wC, away: rD });
          if (wD && rC) promotedTeams.push({ home: wD, away: rC });
        }
      }
    }

    for (let i = 0; i < promotedTeams.length; i++) {
      const targetMatch = firstKoRoundMatches[i];
      if (!targetMatch) continue;

      targetMatch.homeTeamId = promotedTeams[i].home;
      targetMatch.awayTeamId = promotedTeams[i].away;
      await this.matchRepo.save(targetMatch);

      if (twoLegged) {
        const nextRoundLeg2Matches = knockoutMatches.filter(
          (m) =>
            (m.config as any)?.round === firstKoRoundName &&
            (m.config as any)?.leg === 2,
        );
        const targetLeg2Match = nextRoundLeg2Matches[i];
        if (targetLeg2Match) {
          targetLeg2Match.homeTeamId = promotedTeams[i].away;
          targetLeg2Match.awayTeamId = promotedTeams[i].home;
          await this.matchRepo.save(targetLeg2Match);
        }
      }
    }

    try {
      const comp = await this.competitionRepo.findOne({
        where: { id: stage.competitionId },
        relations: { event: true },
      });
      if (comp) {
        const workspaceId = comp.event?.workspaceId || null;
        const qualifiedTeamIds = [
          ...new Set(promotedTeams.flatMap((p) => [p.home, p.away])),
        ];

        for (const tId of qualifiedTeamIds) {
          const team = await this.teamRepo.findOne({ where: { id: tId } });
          if (team) {
            const players =
              await this.workspacesService.getTeamPlayerUserIds(tId);
            await this.workspacesService.sendNotificationToMany(
              players,
              NotificationType.TEAM_QUALIFIED_FROM_GROUP,
              `🎯 ${team.name} has qualified from the group stage in ${comp.name}!`,
              workspaceId,
              { competitionId: comp.id, competitionName: comp.name },
            );
          }
        }

        const allCompTeams = await this.competitionTeamRepo.find({
          where: { competitionId: stage.competitionId },
        });
        const enrolledTeamIds = allCompTeams.map((ct) => ct.teamId);
        const eliminatedTeamIds = enrolledTeamIds.filter(
          (id) => !qualifiedTeamIds.includes(id),
        );

        for (const tId of eliminatedTeamIds) {
          const team = await this.teamRepo.findOne({ where: { id: tId } });
          if (team) {
            const players =
              await this.workspacesService.getTeamPlayerUserIds(tId);
            await this.workspacesService.sendNotificationToMany(
              players,
              NotificationType.TEAM_ELIMINATED,
              `💔 ${team.name} has been eliminated from ${comp.name}.`,
              workspaceId,
              { competitionId: comp.id, competitionName: comp.name },
            );
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  async getStageRankings(stage: CompetitionStage): Promise<string[]> {
    return this.competitionRankingsService.getStageRankings(stage);
  }

  async generateKnockoutStageMatches(
    stage: CompetitionStage,
    teamIds: string[],
  ): Promise<void> {
    return this.matchGenerationService.generateKnockoutStageMatches(
      stage,
      teamIds,
    );
  }

  async advanceTeamsBetweenStages(
    currentStage: CompetitionStage,
  ): Promise<void> {
    const stages = await this.stageRepo.find({
      where: { competitionId: currentStage.competitionId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });

    const currIdx = stages.findIndex((s) => s.id === currentStage.id);
    if (currIdx === -1 || currIdx === stages.length - 1) return;

    const nextStage = stages[currIdx + 1];
    if (nextStage.type !== 'knockout') return;

    const currentMatches = await this.matchRepo.find({
      where: { stageId: currentStage.id },
    });
    if (currentMatches.length === 0) return;

    const allCompleted = currentMatches.every((m) => m.status === 'completed');
    if (!allCompleted) return;

    const sortedTeams = await this.getStageRankings(currentStage);
    if (sortedTeams.length === 0) return;

    let nextMatches = await this.matchRepo.find({
      where: { stageId: nextStage.id },
      order: { id: 'ASC', createdAt: 'ASC' },
    });

    if (nextMatches.length === 0) {
      await this.generateKnockoutStageMatches(nextStage, sortedTeams);
      nextMatches = await this.matchRepo.find({
        where: { stageId: nextStage.id },
        order: { id: 'ASC', createdAt: 'ASC' },
      });
    }

    if (nextMatches.length === 0) return;

    const roundCounts: { [round: string]: number } = {};
    for (const m of nextMatches) {
      const rName = (m.config as any)?.round;
      if (!rName) continue;
      if (
        rName.toLowerCase().includes('third') ||
        rName.toLowerCase().includes('3rd')
      )
        continue;
      const isLeg1OrNone =
        (m.config as any)?.leg === undefined || (m.config as any)?.leg === 1;
      if (isLeg1OrNone) {
        roundCounts[rName] = (roundCounts[rName] || 0) + 1;
      }
    }

    const sortedRounds = Object.keys(roundCounts).sort(
      (a, b) => roundCounts[b] - roundCounts[a],
    );
    if (sortedRounds.length === 0) return;

    const firstKoRoundName = sortedRounds[0];
    const firstKoRoundMatches = nextMatches.filter(
      (m) =>
        (m.config as any)?.round === firstKoRoundName &&
        ((m.config as any)?.leg === undefined || (m.config as any)?.leg === 1),
    );

    const matchesCount = firstKoRoundMatches.length;
    const teamsCountNeeded = matchesCount * 2;

    const advancingTeams = sortedTeams.slice(0, teamsCountNeeded);

    const twoLegged =
      (nextStage.config as any)?.twoLegged ||
      (nextStage.config as any)?.legs === 2;

    for (let i = 0; i < matchesCount; i++) {
      const targetMatch = firstKoRoundMatches[i];
      if (!targetMatch) continue;

      const homeTeam = advancingTeams[i] || null;
      const awayTeam = advancingTeams[teamsCountNeeded - 1 - i] || null;

      targetMatch.homeTeamId = homeTeam;
      targetMatch.awayTeamId = awayTeam;
      await this.matchRepo.save(targetMatch);

      if (twoLegged) {
        const nextRoundLeg2Matches = nextMatches.filter(
          (m) =>
            (m.config as any)?.round === firstKoRoundName &&
            (m.config as any)?.leg === 2,
        );
        const targetLeg2Match = nextRoundLeg2Matches[i];
        if (targetLeg2Match) {
          targetLeg2Match.homeTeamId = awayTeam;
          targetLeg2Match.awayTeamId = homeTeam;
          await this.matchRepo.save(targetLeg2Match);
        }
      }
    }

    if (matchesCount === 1 && sortedTeams.length >= 4) {
      const thirdPlaceMatches = nextMatches.filter((m) => {
        const r = (m.config as any)?.round || '';
        const rLower = r.toLowerCase();
        return (
          rLower.includes('third') ||
          rLower.includes('3rd') ||
          rLower.includes('loser')
        );
      });

      const thirdPlaceLeg1Matches = thirdPlaceMatches.filter(
        (m) =>
          (m.config as any)?.leg === undefined || (m.config as any)?.leg === 1,
      );

      for (let i = 0; i < thirdPlaceLeg1Matches.length; i++) {
        const targetMatch = thirdPlaceLeg1Matches[i];
        if (!targetMatch) continue;

        const homeTeam = sortedTeams[2] || null;
        const awayTeam = sortedTeams[3] || null;

        targetMatch.homeTeamId = homeTeam;
        targetMatch.awayTeamId = awayTeam;
        await this.matchRepo.save(targetMatch);

        if (twoLegged) {
          const nextRoundLeg2Matches = thirdPlaceMatches.filter(
            (m) => (m.config as any)?.leg === 2,
          );
          const targetLeg2Match = nextRoundLeg2Matches[i];
          if (targetLeg2Match) {
            targetLeg2Match.homeTeamId = awayTeam;
            targetLeg2Match.awayTeamId = homeTeam;
            await this.matchRepo.save(targetLeg2Match);
          }
        }
      }
    }
  }

  async advanceKnockoutWinner(
    completedMatch: Match,
    stage: CompetitionStage,
  ): Promise<void> {
    const roundName = (completedMatch.config as any)?.round;
    if (
      !roundName ||
      roundName.toLowerCase() === 'final' ||
      roundName.toLowerCase().includes('third') ||
      roundName.toLowerCase().includes('3rd')
    )
      return;

    const roundLower = roundName.toLowerCase();
    if (roundLower.includes('group') || roundLower.includes('league')) return;

    const allMatches = await this.matchRepo.find({
      where: { stageId: stage.id },
      order: { id: 'ASC', createdAt: 'ASC' },
    });

    const roundCounts: { [round: string]: number } = {};
    for (const m of allMatches) {
      const rName = (m.config as any)?.round;
      if (!rName) continue;
      if (
        rName.toLowerCase().includes('third') ||
        rName.toLowerCase().includes('3rd')
      )
        continue;
      const isLeg1OrNone =
        (m.config as any)?.leg === undefined || (m.config as any)?.leg === 1;
      if (isLeg1OrNone) {
        roundCounts[rName] = (roundCounts[rName] || 0) + 1;
      }
    }

    const sortedRounds = Object.keys(roundCounts).sort(
      (a, b) => roundCounts[b] - roundCounts[a],
    );
    const currRoundIdx = sortedRounds.indexOf(roundName);
    if (currRoundIdx === -1 || currRoundIdx === sortedRounds.length - 1) return;

    const nextRoundName = sortedRounds[currRoundIdx + 1];

    let winnerId: string | null = null;
    const homeScore = completedMatch.homeScore ?? 0;
    const awayScore = completedMatch.awayScore ?? 0;

    if ((completedMatch.config as any)?.leg === 1) {
      return;
    }

    if ((completedMatch.config as any)?.leg === 2) {
      const leg1 = allMatches.find(
        (m) =>
          (m.config as any)?.round === roundName &&
          (m.config as any)?.leg === 1 &&
          m.homeTeamId === completedMatch.awayTeamId &&
          m.awayTeamId === completedMatch.homeTeamId,
      );
      if (leg1) {
        const teamAScore =
          (leg1.homeScore ?? 0) + (completedMatch.awayScore ?? 0);
        const teamBScore =
          (leg1.awayScore ?? 0) + (completedMatch.homeScore ?? 0);
        if (teamAScore > teamBScore) {
          winnerId = leg1.homeTeamId;
        } else if (teamBScore > teamAScore) {
          winnerId = leg1.awayTeamId;
        } else {
          const live = completedMatch.liveData || {};
          const shHome = live.shootoutHomeScore ?? 0;
          const shAway = live.shootoutAwayScore ?? 0;
          if (shHome > shAway) {
            winnerId = completedMatch.homeTeamId;
          } else if (shAway > shHome) {
            winnerId = completedMatch.awayTeamId;
          } else {
            winnerId =
              homeScore > awayScore
                ? completedMatch.homeTeamId
                : completedMatch.awayTeamId;
          }
        }
      } else {
        const live = completedMatch.liveData || {};
        const shHome = live.shootoutHomeScore ?? 0;
        const shAway = live.shootoutAwayScore ?? 0;
        if (shHome > shAway) {
          winnerId = completedMatch.homeTeamId;
        } else if (shAway > shHome) {
          winnerId = completedMatch.awayTeamId;
        } else {
          winnerId =
            homeScore > awayScore
              ? completedMatch.homeTeamId
              : completedMatch.awayTeamId;
        }
      }
    } else {
      const live = completedMatch.liveData || {};
      const result = live.result;
      if (result === 'Home Win' || result === 'Walkover (Home Win)') {
        winnerId = completedMatch.homeTeamId;
      } else if (result === 'Away Win' || result === 'Walkover (Away Win)') {
        winnerId = completedMatch.awayTeamId;
      } else if (homeScore > awayScore) {
        winnerId = completedMatch.homeTeamId;
      } else if (awayScore > homeScore) {
        winnerId = completedMatch.awayTeamId;
      } else {
        const shHome = live.shootoutHomeScore ?? 0;
        const shAway = live.shootoutAwayScore ?? 0;
        if (shHome > shAway) {
          winnerId = completedMatch.homeTeamId;
        } else if (shAway > shHome) {
          winnerId = completedMatch.awayTeamId;
        }
      }
    }

    if (!winnerId) return;

    const currRoundMatches = allMatches.filter(
      (m) =>
        (m.config as any)?.round === roundName &&
        ((m.config as any)?.leg === undefined || (m.config as any)?.leg === 1),
    );
    const matchIndex = currRoundMatches.findIndex(
      (m) =>
        m.id === completedMatch.id ||
        ((completedMatch.config as any)?.leg === 2 &&
          m.homeTeamId === completedMatch.awayTeamId &&
          m.awayTeamId === completedMatch.homeTeamId),
    );
    if (matchIndex === -1) return;

    const nextRoundMatches = allMatches.filter(
      (m) =>
        (m.config as any)?.round === nextRoundName &&
        ((m.config as any)?.leg === undefined || (m.config as any)?.leg === 1),
    );

    const nextMatchIndex = Math.floor(matchIndex / 2);
    const targetLeg1Match = nextRoundMatches[nextMatchIndex];
    if (!targetLeg1Match) return;

    const isHomeSlot = matchIndex % 2 === 0;

    if (isHomeSlot) {
      targetLeg1Match.homeTeamId = winnerId;
    } else {
      targetLeg1Match.awayTeamId = winnerId;
    }
    await this.matchRepo.save(targetLeg1Match);

    const twoLegged =
      (stage.config as any)?.twoLegged || (stage.config as any)?.legs === 2;
    if (twoLegged) {
      const nextRoundLeg2Matches = allMatches.filter(
        (m) =>
          (m.config as any)?.round === nextRoundName &&
          (m.config as any)?.leg === 2,
      );
      const targetLeg2MatchSec = nextRoundLeg2Matches[nextMatchIndex];
      if (targetLeg2MatchSec) {
        if (isHomeSlot) {
          targetLeg2MatchSec.awayTeamId = winnerId;
        } else {
          targetLeg2MatchSec.homeTeamId = winnerId;
        }
        await this.matchRepo.save(targetLeg2MatchSec);
      }
    }

    let loserId: string | null = null;
    if (completedMatch.homeTeamId === winnerId) {
      loserId = completedMatch.awayTeamId;
    } else {
      loserId = completedMatch.homeTeamId;
    }

    if (loserId && roundName.toLowerCase() === 'semi-final') {
      const thirdPlaceMatches = allMatches.filter(
        (m) =>
          (m.config as any)?.round === 'Third Place Match' &&
          ((m.config as any)?.leg === undefined ||
            (m.config as any)?.leg === 1),
      );
      const targetThirdPlaceMatch = thirdPlaceMatches[0];
      if (targetThirdPlaceMatch) {
        if (isHomeSlot) {
          targetThirdPlaceMatch.homeTeamId = loserId;
        } else {
          targetThirdPlaceMatch.awayTeamId = loserId;
        }
        await this.matchRepo.save(targetThirdPlaceMatch);

        if (twoLegged) {
          const thirdPlaceLeg2Matches = allMatches.filter(
            (m) =>
              (m.config as any)?.round === 'Third Place Match' &&
              (m.config as any)?.leg === 2,
          );
          const targetThirdPlaceLeg2Match = thirdPlaceLeg2Matches[0];
          if (targetThirdPlaceLeg2Match) {
            if (isHomeSlot) {
              targetThirdPlaceLeg2Match.awayTeamId = loserId;
            } else {
              targetThirdPlaceLeg2Match.homeTeamId = loserId;
            }
            await this.matchRepo.save(targetThirdPlaceLeg2Match);
          }
        }
      }
    }

    try {
      const comp = await this.competitionRepo.findOne({
        where: { id: stage.competitionId },
        relations: { event: true },
      });
      if (comp) {
        const workspaceId = comp.event?.workspaceId || null;
        if (winnerId) {
          const winnerTeam = await this.teamRepo.findOne({
            where: { id: winnerId },
          });
          const winningPlayers =
            await this.workspacesService.getTeamPlayerUserIds(winnerId);
          await this.workspacesService.sendNotificationToMany(
            winningPlayers,
            NotificationType.TEAM_ADVANCED,
            `🎯 ${winnerTeam?.name ?? 'Your team'} has advanced to the ${nextRoundName} in ${comp.name}!`,
            workspaceId,
            {
              competitionId: comp.id,
              competitionName: comp.name,
              nextRound: nextRoundName,
            },
          );
        }
        if (loserId) {
          const loserTeam = await this.teamRepo.findOne({
            where: { id: loserId },
          });
          const losingPlayers =
            await this.workspacesService.getTeamPlayerUserIds(loserId);
          await this.workspacesService.sendNotificationToMany(
            losingPlayers,
            NotificationType.TEAM_ELIMINATED,
            `💔 ${loserTeam?.name ?? 'Your team'} has been eliminated from ${comp.name}.`,
            workspaceId,
            { competitionId: comp.id, competitionName: comp.name },
          );
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DOUBLE ELIMINATION ADVANCEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  async advanceDoubleEliminationOnComplete(
    completedMatch: Match,
    stage: CompetitionStage,
  ): Promise<void> {
    const cfg = completedMatch.config as any;
    const bracket: string = cfg?.bracket ?? '';
    const roundName: string = cfg?.round ?? '';
    const matchSlot: number = cfg?.matchSlot ?? 0;

    // Resolve winner / loser
    const homeScore = completedMatch.homeScore ?? 0;
    const awayScore = completedMatch.awayScore ?? 0;
    const live = (completedMatch.liveData ?? {}) as any;
    const shHome = live.shootoutHomeScore ?? 0;
    const shAway = live.shootoutAwayScore ?? 0;

    let winnerId: string | null = null;
    let loserId: string | null = null;

    if (homeScore > awayScore) {
      winnerId = completedMatch.homeTeamId;
      loserId = completedMatch.awayTeamId;
    } else if (awayScore > homeScore) {
      winnerId = completedMatch.awayTeamId;
      loserId = completedMatch.homeTeamId;
    } else if (shHome > shAway) {
      winnerId = completedMatch.homeTeamId;
      loserId = completedMatch.awayTeamId;
    } else {
      winnerId = completedMatch.homeTeamId;
      loserId = completedMatch.awayTeamId;
    }

    if (!winnerId) return;

    const allMatches = await this.matchRepo.find({
      where: { stageId: stage.id },
      order: { createdAt: 'ASC' },
    });

    const matchesByRound = (b: string, r: string) =>
      allMatches
        .filter((m) => (m.config as any)?.bracket === b && (m.config as any)?.round === r)
        .sort((a, b2) => ((a.config as any)?.matchSlot ?? 0) - ((b2.config as any)?.matchSlot ?? 0));

    const findSlot = (b: string, r: string, slot: number) =>
      allMatches.find(
        (m) =>
          (m.config as any)?.bracket === b &&
          (m.config as any)?.round === r &&
          (m.config as any)?.matchSlot === slot,
      ) ?? null;

    // Helper: place a team into a match slot
    const place = async (match: Match | null, side: 'home' | 'away', teamId: string | null) => {
      if (!match || !teamId) return;
      if (side === 'home') match.homeTeamId = teamId;
      else match.awayTeamId = teamId;
      await this.matchRepo.save(match);
    };

    // ── WINNER BRACKET ────────────────────────────────────────────────────────
    if (bracket === 'winner') {
      const isWbFinal = roundName === 'WB Final';

      if (!isWbFinal) {
        // Winner advances to next WB round
        const wbRounds = [...new Set(
          allMatches
            .filter((m) => (m.config as any)?.bracket === 'winner')
            .map((m) => (m.config as any)?.round as string),
        )];
        const currIdx = wbRounds.indexOf(roundName);
        const nextWbRound = wbRounds[currIdx + 1] ?? null;

        if (nextWbRound) {
          const nextSlot = Math.floor(matchSlot / 2);
          const side = matchSlot % 2 === 0 ? 'home' : 'away';
          const nextMatch = findSlot('winner', nextWbRound, nextSlot);
          await place(nextMatch, side, winnerId);
        }

        // Loser drops to LB
        const lbDropRoundIdx = currIdx * 2; 
        const lbRounds = [...new Set(
          allMatches
            .filter((m) => (m.config as any)?.bracket === 'loser')
            .map((m) => (m.config as any)?.round as string),
        )];
        const lbTargetRoundName = lbRounds[lbDropRoundIdx] ?? null;
        if (lbTargetRoundName && loserId) {
          const lbRoundMatches = matchesByRound('loser', lbTargetRoundName);
          if (currIdx === 0) {
            const lbSlot = Math.floor(matchSlot / 2);
            const lbSide = matchSlot % 2 === 0 ? 'home' : 'away';
            const lbMatch = findSlot('loser', lbTargetRoundName, lbSlot);
            await place(lbMatch, lbSide, loserId);
          } else {
            const lbMatch = lbRoundMatches[matchSlot] ?? null;
            await place(lbMatch, 'away', loserId);
          }
        }
      } else {
        // WB Final: winner -> Grand Final home; loser -> LB Final home/away
        const gfMatch = findSlot('grand_final', 'Grand Final', 0);
        await place(gfMatch, 'home', winnerId);

        const lbFinalMatch = allMatches.find(
          (m) => (m.config as any)?.bracket === 'loser' && (m.config as any)?.round === 'LB Final',
        ) ?? null;
        await place(lbFinalMatch, 'away', loserId);
      }
    }

    // ── LOSER BRACKET ─────────────────────────────────────────────────────────
    else if (bracket === 'loser') {
      const isLbFinal = roundName === 'LB Final';

      if (!isLbFinal) {
        // Winner advances to next LB round
        const lbRounds = [...new Set(
          allMatches
            .filter((m) => (m.config as any)?.bracket === 'loser')
            .map((m) => (m.config as any)?.round as string),
        )];
        const currIdx = lbRounds.indexOf(roundName);
        const nextLbRound = lbRounds[currIdx + 1] ?? null;

        if (nextLbRound) {
          const isEvenRound = (currIdx + 1) % 2 === 0;
          const nextSlot = isEvenRound ? matchSlot : Math.floor(matchSlot / 2);
          const side = isEvenRound ? 'home' : (matchSlot % 2 === 0 ? 'home' : 'away');
          const nextMatch = findSlot('loser', nextLbRound, nextSlot);
          await place(nextMatch, side, winnerId);
        }

        // LB loser is eliminated
        await this.notifyEliminated(loserId, stage, 'LB');
      } else {
        // LB Final: winner -> Grand Final away
        const gfMatch = findSlot('grand_final', 'Grand Final', 0);
        await place(gfMatch, 'away', winnerId);
        // Loser eliminated
        await this.notifyEliminated(loserId, stage, 'LB');
      }
    }

    // ── GRAND FINAL ───────────────────────────────────────────────────────────
    else if (bracket === 'grand_final') {
      const bracketReset = stage.config?.bracketReset !== false;
      const wbChampionId = completedMatch.homeTeamId;
      const lbChampionId = completedMatch.awayTeamId;
      const wbChampionWon = winnerId === wbChampionId;

      if (wbChampionWon || !bracketReset) {
        // WB champ wins, OR no bracket reset configured -> competition over
        await this.checkAndAutoCompleteCompetition(stage.competitionId);
        await this.notifyAdvanced(winnerId, 'Champion', stage);
        await this.notifyEliminated(loserId, stage, 'GF');
      } else {
        // LB champ won first Grand Final -> trigger bracket reset
        const resetMatch = allMatches.find(
          (m) => (m.config as any)?.bracket === 'grand_final_reset',
        ) ?? null;
        if (resetMatch) {
          resetMatch.homeTeamId = wbChampionId;
          resetMatch.awayTeamId = lbChampionId;
          resetMatch.status = 'scheduled';
          await this.matchRepo.save(resetMatch);
          await this.notifyBracketReset(stage);
        } else {
          await this.checkAndAutoCompleteCompetition(stage.competitionId);
        }
      }
    }

    // ── GRAND FINAL RESET ─────────────────────────────────────────────────────
    else if (bracket === 'grand_final_reset') {
      await this.checkAndAutoCompleteCompetition(stage.competitionId);
      await this.notifyAdvanced(winnerId, 'Champion (Reset)', stage);
      await this.notifyEliminated(loserId, stage, 'GF Reset');
    }
  }

  private async notifyEliminated(
    teamId: string | null,
    stage: CompetitionStage,
    context: string,
  ): Promise<void> {
    if (!teamId) return;
    try {
      const comp = await this.competitionRepo.findOne({
        where: { id: stage.competitionId },
        relations: { event: true },
      });
      if (!comp) return;
      const team = await this.teamRepo.findOne({ where: { id: teamId } });
      const players = await this.workspacesService.getTeamPlayerUserIds(teamId);
      await this.workspacesService.sendNotificationToMany(
        players,
        NotificationType.TEAM_ELIMINATED,
        `${team?.name ?? 'Your team'} has been eliminated from ${comp.name} (${context}).`,
        comp.event?.workspaceId ?? null,
        { competitionId: comp.id, competitionName: comp.name },
      );
    } catch {}
  }

  private async notifyAdvanced(
    teamId: string | null,
    roundLabel: string,
    stage: CompetitionStage,
  ): Promise<void> {
    if (!teamId) return;
    try {
      const comp = await this.competitionRepo.findOne({
        where: { id: stage.competitionId },
        relations: { event: true },
      });
      if (!comp) return;
      const team = await this.teamRepo.findOne({ where: { id: teamId } });
      const players = await this.workspacesService.getTeamPlayerUserIds(teamId);
      await this.workspacesService.sendNotificationToMany(
        players,
        NotificationType.TEAM_ADVANCED,
        `${team?.name ?? 'Your team'} advanced: ${roundLabel} in ${comp.name}!`,
        comp.event?.workspaceId ?? null,
        { competitionId: comp.id, competitionName: comp.name, nextRound: roundLabel },
      );
    } catch {}
  }

  private async notifyBracketReset(stage: CompetitionStage): Promise<void> {
    try {
      const comp = await this.competitionRepo.findOne({
        where: { id: stage.competitionId },
        relations: { event: true },
      });
      if (!comp) return;
      const allCompTeams = await this.competitionTeamRepo.find({
        where: { competitionId: stage.competitionId },
      });
      const allPlayerIds = (
        await Promise.all(
          allCompTeams.map((ct) =>
            this.workspacesService.getTeamPlayerUserIds(ct.teamId),
          ),
        )
      ).flat();
      await this.workspacesService.sendNotificationToMany(
        allPlayerIds,
        NotificationType.TEAM_ADVANCED,
        `Bracket Reset! The Grand Final will be replayed in ${comp.name}.`,
        comp.event?.workspaceId ?? null,
        { competitionId: comp.id, competitionName: comp.name },
      );
    } catch {}
  }

  async advanceSwissRound(
    completedMatch: Match,
    stage: CompetitionStage,
  ): Promise<void> {
    const currentRound = completedMatch.config?.swissRound;
    if (!currentRound) return;

    // Fetch all matches of this stage
    const allMatches = await this.matchRepo.find({
      where: { stageId: stage.id },
      relations: { homeTeam: true, awayTeam: true },
    });

    // Filter matches of the current round
    const currentRoundMatches = allMatches.filter(
      (m) => m.config?.swissRound === currentRound,
    );

    // Check if all matches of the current round are completed
    const allCompleted = currentRoundMatches.every(
      (m) => m.status === 'completed',
    );
    if (!allCompleted) return;

    // Get all unique team IDs that participated in any match of this stage
    const teamIdsSet = new Set<string>();
    for (const m of allMatches) {
      if (m.homeTeamId) teamIdsSet.add(m.homeTeamId);
      if (m.awayTeamId) teamIdsSet.add(m.awayTeamId);
    }
    const teamIds = Array.from(teamIdsSet);

    // Check if we have reached the maximum number of rounds
    const maxRounds = stage.config?.roundsCount || Math.ceil(Math.log2(teamIds.length || 2));
    if (currentRound >= maxRounds) {
      return;
    }

    const nextRound = currentRound + 1;

    // Calculate current points, GD, GF, and bye count
    const statsMap = new Map<
      string,
      {
        teamId: string;
        pts: number;
        gd: number;
        gf: number;
        byesCount: number;
        opponents: Set<string>;
      }
    >();

    for (const tId of teamIds) {
      statsMap.set(tId, {
        teamId: tId,
        pts: 0,
        gd: 0,
        gf: 0,
        byesCount: 0,
        opponents: new Set<string>(),
      });
    }

    const winPts = stage.config?.winPoint ?? 3;
    const drawPts = stage.config?.drawPoint ?? 1;

    for (const m of allMatches) {
      if (m.status !== 'completed') continue;

      if (m.config?.isBye) {
        const teamId = m.homeTeamId;
        if (teamId && statsMap.has(teamId)) {
          const stats = statsMap.get(teamId)!;
          stats.pts += winPts;
          stats.byesCount++;
          stats.gd += 1;
          stats.gf += 1;
        }
        continue;
      }

      if (!m.homeTeamId || !m.awayTeamId) continue;

      const home = statsMap.get(m.homeTeamId);
      const away = statsMap.get(m.awayTeamId);
      if (!home || !away) continue;

      home.opponents.add(m.awayTeamId);
      away.opponents.add(m.homeTeamId);

      const hScore = m.homeScore ?? 0;
      const aScore = m.awayScore ?? 0;

      home.gf += hScore;
      home.gd += hScore - aScore;
      away.gf += aScore;
      away.gd += aScore - hScore;

      if (hScore > aScore) {
        home.pts += winPts;
      } else if (aScore > hScore) {
        away.pts += winPts;
      } else {
        home.pts += drawPts;
        away.pts += drawPts;
      }
    }

    let byeTeamId: string | null = null;
    let pairingTeams = [...teamIds];

    if (teamIds.length % 2 !== 0) {
      const eligibleForBye = teamIds.filter(
        (tId) => (statsMap.get(tId)?.byesCount || 0) === 0,
      );

      if (eligibleForBye.length > 0) {
        eligibleForBye.sort((a, b) => {
          const statsA = statsMap.get(a)!;
          const statsB = statsMap.get(b)!;
          if (statsA.pts !== statsB.pts) return statsA.pts - statsB.pts;
          if (statsA.gd !== statsB.gd) return statsA.gd - statsB.gd;
          return statsA.gf - statsB.gf;
        });
        byeTeamId = eligibleForBye[0];
      } else {
        const sortedAll = [...teamIds].sort((a, b) => {
          const statsA = statsMap.get(a)!;
          const statsB = statsMap.get(b)!;
          if (statsA.pts !== statsB.pts) return statsA.pts - statsB.pts;
          if (statsA.gd !== statsB.gd) return statsA.gd - statsB.gd;
          return statsA.gf - statsB.gf;
        });
        byeTeamId = sortedAll[0];
      }

      pairingTeams = pairingTeams.filter((id) => id !== byeTeamId);
    }

    pairingTeams.sort((a, b) => {
      const statsA = statsMap.get(a)!;
      const statsB = statsMap.get(b)!;
      if (statsB.pts !== statsA.pts) return statsB.pts - statsA.pts;
      if (statsB.gd !== statsA.gd) return statsB.gd - statsA.gd;
      return statsB.gf - statsA.gf;
    });

    const playedMap = new Map<string, Set<string>>();
    for (const tId of teamIds) {
      playedMap.set(tId, statsMap.get(tId)?.opponents || new Set());
    }

    const findPairings = (
      teams: string[],
      pMap: Map<string, Set<string>>,
    ): [string, string][] | null => {
      if (teams.length === 0) return [];
      const first = teams[0];
      for (let i = 1; i < teams.length; i++) {
        const second = teams[i];
        if (!pMap.get(first)?.has(second)) {
          const subPairings = findPairings(
            teams.slice(1, i).concat(teams.slice(i + 1)),
            pMap,
          );
          if (subPairings !== null) {
            return [[first, second], ...subPairings];
          }
        }
      }
      return null;
    };

    let pairings = findPairings(pairingTeams, playedMap);
    if (!pairings) {
      pairings = [];
      const tempTeams = [...pairingTeams];
      while (tempTeams.length >= 2) {
        const first = tempTeams.shift()!;
        let index = tempTeams.findIndex((t) => !playedMap.get(first)?.has(t));
        if (index === -1) index = 0;
        const second = tempTeams.splice(index, 1)[0];
        pairings.push([first, second]);
      }
    }

    const nextRoundMatches: Match[] = [];

    if (byeTeamId) {
      const m = this.matchRepo.create({
        stageId: stage.id,
        homeTeamId: byeTeamId,
        awayTeamId: null,
        status: 'completed',
        homeScore: 1,
        awayScore: 0,
        config: {
          round: `Round ${nextRound}`,
          swissRound: nextRound,
          isBye: true,
          status: 'completed',
        },
        liveData: {},
      });
      nextRoundMatches.push(m);
    }

    for (const pair of pairings) {
      const m = this.matchRepo.create({
        stageId: stage.id,
        homeTeamId: pair[0],
        awayTeamId: pair[1],
        status: 'scheduled',
        config: {
          round: `Round ${nextRound}`,
          swissRound: nextRound,
        },
        liveData: {},
      });
      nextRoundMatches.push(m);
    }

    await this.matchRepo.save(nextRoundMatches);
  }
}

