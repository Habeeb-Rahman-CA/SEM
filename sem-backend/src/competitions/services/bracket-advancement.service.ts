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
    return this.competitionRankingsService.getCompetitionRankings(competitionId);
  }

  async checkAndAutoCompleteCompetition(competitionId: string): Promise<void> {
    return this.competitionCompletionService.checkAndAutoCompleteCompetition(competitionId);
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
    return this.matchGenerationService.generateKnockoutStageMatches(stage, teamIds);
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
}
