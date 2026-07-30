import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Competition } from '../../workspaces/entities/competition.entity';
import { CompetitionStage } from '../../workspaces/entities/competition-stage.entity';
import { Match } from '../../workspaces/entities/match.entity';
import { CompetitionTeam } from '../../workspaces/entities/competition-team.entity';
import { Event } from '../../workspaces/entities/event.entity';
import { Venue } from '../../workspaces/entities/venue.entity';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { NotificationType } from '../../workspaces/entities/notification.entity';
import { FixtureTemplatesService } from './fixture-templates.service';

@Injectable()
export class FixturesGeneratorService {
  constructor(
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(CompetitionStage)
    private readonly stageRepo: Repository<CompetitionStage>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(CompetitionTeam)
    private readonly competitionTeamRepo: Repository<CompetitionTeam>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    private readonly workspacesService: WorkspacesService,
    private readonly fixtureTemplatesService: FixtureTemplatesService,
  ) {}

  async generateFixtures(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
    fixtureTemplateId?: string,
  ): Promise<{ stagesGenerated: number; matchesCreated: number }> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );

    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
      relations: { teams: true },
    });
    if (!event) throw new NotFoundException(`Event not found`);

    const venues = await this.venueRepo.find({
      where: { workspaceId },
    });

    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
    });
    if (!competition) throw new NotFoundException(`Competition not found`);

    const eventTeams = event.teams || [];
    const uniqueTeams = Array.from(
      new Map(eventTeams.map((t) => [t.id, t])).values(),
    );
    if (uniqueTeams.length < 2) {
      throw new BadRequestException(
        'At least 2 teams must be mapped to the event before generating fixtures.',
      );
    }

    const stages = await this.stageRepo.find({
      where: { competitionId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });
    if (stages.length === 0) {
      throw new BadRequestException(
        'Configure at least one stage before generating fixtures.',
      );
    }

    const teamIds = uniqueTeams.map((t) => t.id);
    this.shuffleArray(teamIds);

    let scheduleConfig: any = null;
    if (fixtureTemplateId) {
      scheduleConfig = await this.fixtureTemplatesService.resolveConfig(
        workspaceId,
        fixtureTemplateId,
        userId,
      );
    }

    let totalMatches = 0;

    for (const stage of stages) {
      const existing = await this.matchRepo.find({
        where: { stageId: stage.id },
      });
      if (existing.length) {
        existing.forEach((m) => (m.deletedAt = new Date()));
        await this.matchRepo.save(existing);
      }

      const fixtures: Array<{
        homeTeamId: string | null;
        awayTeamId: string | null;
        scheduledAt?: Date | null;
        venueId?: string | null;
        config: any;
      }> = [];

      if (stage.type === 'league' || stage.type === 'group') {
        const twoLegged = stage.config?.twoLegged || stage.config?.legs === 2;
        const restDays = stage.config?.restDays ?? 1;
        const baseDate = event.startDate
          ? new Date(event.startDate)
          : new Date();
        const baseLabel = stage.type === 'league' ? 'Round' : 'League Stage';
        const rrFixtures = this.generateRoundRobinSchedule(
          teamIds,
          twoLegged,
          restDays,
          baseDate,
          venues,
          baseLabel,
        );
        fixtures.push(...rrFixtures);
      } else if (stage.type === 'knockout') {
        const twoLegged = stage.config?.twoLegged || stage.config?.legs === 2;
        const isFirstStage = stage.id === stages[0].id;

        if (isFirstStage) {
          const n = teamIds.length;
          const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));
          const padded: (string | null)[] = [
            ...teamIds,
            ...Array(bracketSize - n).fill(null),
          ];

          const roundLabel =
            bracketSize === 2
              ? 'Final'
              : bracketSize === 4
                ? 'Semi-Final'
                : bracketSize === 8
                  ? 'Quarter-Final'
                  : `Round of ${bracketSize}`;
          for (let i = 0; i < padded.length; i += 2) {
            const home = padded[i];
            const away = padded[i + 1];
            if (home === null && away === null) continue;
            fixtures.push({
              homeTeamId: home,
              awayTeamId: away,
              config: twoLegged
                ? { round: roundLabel, leg: 1 }
                : { round: roundLabel },
            });
            if (twoLegged && home !== null && away !== null) {
              fixtures.push({
                homeTeamId: away,
                awayTeamId: home,
                config: { round: roundLabel, leg: 2 },
              });
            }
          }

          let remainingTeams = bracketSize / 2;
          while (remainingTeams >= 2) {
            const subRoundLabel =
              remainingTeams === 2
                ? 'Final'
                : remainingTeams === 4
                  ? 'Semi-Final'
                  : remainingTeams === 8
                    ? 'Quarter-Final'
                    : `Round of ${remainingTeams * 2}`;
            const matchesInRound = remainingTeams / 2;
            for (let m = 0; m < matchesInRound; m++) {
              fixtures.push({
                homeTeamId: null,
                awayTeamId: null,
                config: twoLegged
                  ? { round: subRoundLabel, leg: 1 }
                  : { round: subRoundLabel },
              });
              if (twoLegged) {
                fixtures.push({
                  homeTeamId: null,
                  awayTeamId: null,
                  config: { round: subRoundLabel, leg: 2 },
                });
              }
            }
            if (remainingTeams === 2) {
              fixtures.push({
                homeTeamId: null,
                awayTeamId: null,
                config: twoLegged
                  ? { round: 'Third Place Match', leg: 1 }
                  : { round: 'Third Place Match' },
              });
              if (twoLegged) {
                fixtures.push({
                  homeTeamId: null,
                  awayTeamId: null,
                  config: { round: 'Third Place Match', leg: 2 },
                });
              }
            }
            remainingTeams = remainingTeams / 2;
          }
        }
      } else if (stage.type === 'group_knockout') {
        // ... (existing group_knockout code) ...
        const isSingleGroup =
          stage.config?.groupKnockoutSubtype === 'single_group';
        const twoLeggedGroup =
          stage.config?.twoLegged || stage.config?.legs === 2;
        const twoLeggedKO = stage.config?.twoLegged || stage.config?.legs === 2;

        let totalAdvancing = 2;

        if (isSingleGroup) {
          const restDays = stage.config?.restDays ?? 1;
          const baseDate = event.startDate
            ? new Date(event.startDate)
            : new Date();
          const rrFixtures = this.generateRoundRobinSchedule(
            teamIds,
            twoLeggedGroup,
            restDays,
            baseDate,
            venues,
            'Group Stage',
          );
          fixtures.push(...rrFixtures);
          totalAdvancing = Number(stage.config?.singleGroupAdvancing ?? 2);
        } else {
          const groupsCount = stage.config?.groupsCount ?? 2;
          const groups: string[][] = Array.from(
            { length: groupsCount },
            () => [],
          );
          teamIds.forEach((id, idx) => groups[idx % groupsCount].push(id));

          const restDays = stage.config?.restDays ?? 1;
          const baseDate = event.startDate
            ? new Date(event.startDate)
            : new Date();

          for (let gIndex = 0; gIndex < groups.length; gIndex++) {
            const group = groups[gIndex];
            const groupChar = String.fromCharCode(65 + gIndex);
            if (group.length < 2) continue;
            const rrFixtures = this.generateRoundRobinSchedule(
              group,
              twoLeggedGroup,
              restDays,
              baseDate,
              venues,
              `Group ${groupChar}`,
            );
            fixtures.push(...rrFixtures);
          }

          const isWinnerAndRunner =
            stage.config?.advancingType === 'winner_and_runner';
          totalAdvancing = groupsCount * (isWinnerAndRunner ? 2 : 1);
        }

        const koTeamsCount = totalAdvancing;
        const bracketSize = Math.pow(
          2,
          Math.ceil(Math.log2(Math.max(koTeamsCount, 2))),
        );

        let remainingTeams = bracketSize;
        while (remainingTeams >= 2) {
          const koRoundLabel =
            remainingTeams === 2
              ? 'Final'
              : remainingTeams === 4
                ? 'Semi-Final'
                : remainingTeams === 8
                  ? 'Quarter-Final'
                  : `Round of ${remainingTeams}`;
          const matchesInRound = remainingTeams / 2;
          for (let m = 0; m < matchesInRound; m++) {
            fixtures.push({
              homeTeamId: null,
              awayTeamId: null,
              config: twoLeggedKO
                ? { round: koRoundLabel, leg: 1 }
                : { round: koRoundLabel },
            });
            if (twoLeggedKO) {
              fixtures.push({
                homeTeamId: null,
                awayTeamId: null,
                config: { round: koRoundLabel, leg: 2 },
              });
            }
          }
          if (remainingTeams === 2) {
            fixtures.push({
              homeTeamId: null,
              awayTeamId: null,
              config: twoLeggedKO
                ? { round: 'Third Place Match', leg: 1 }
                : { round: 'Third Place Match' },
            });
            if (twoLeggedKO) {
              fixtures.push({
                homeTeamId: null,
                awayTeamId: null,
                config: { round: 'Third Place Match', leg: 2 },
              });
            }
          }
          remainingTeams = remainingTeams / 2;
        }
      } else if (stage.type === 'double_elimination') {
        const bracketReset = stage.config?.bracketReset !== false; // default true
        const n = teamIds.length;
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 4))));
        const padded: (string | null)[] = [
          ...teamIds,
          ...Array(bracketSize - n).fill(null),
        ];

        const wbRoundNames = this.getDeWbRoundNames(bracketSize);
        const lbRoundNames = this.getDeLbRoundNames(bracketSize);
        const lbMatchCounts = this.getDeLbMatchCounts(bracketSize);

        // WB Round 1: seeded teams
        const wbR1Count = bracketSize / 2;
        for (let i = 0; i < wbR1Count; i++) {
          fixtures.push({
            homeTeamId: padded[i * 2] ?? null,
            awayTeamId: padded[i * 2 + 1] ?? null,
            config: { bracket: 'winner', round: wbRoundNames[0], matchSlot: i },
          });
        }

        // Remaining WB rounds (null slots)
        for (let r = 1; r < wbRoundNames.length; r++) {
          const matchCount = Math.pow(2, wbRoundNames.length - 1 - r);
          for (let i = 0; i < matchCount; i++) {
            fixtures.push({
              homeTeamId: null,
              awayTeamId: null,
              config: {
                bracket: 'winner',
                round: wbRoundNames[r],
                matchSlot: i,
              },
            });
          }
        }

        // LB rounds (all null slots)
        for (let r = 0; r < lbRoundNames.length; r++) {
          for (let i = 0; i < lbMatchCounts[r]; i++) {
            fixtures.push({
              homeTeamId: null,
              awayTeamId: null,
              config: {
                bracket: 'loser',
                round: lbRoundNames[r],
                matchSlot: i,
              },
            });
          }
        }

        // Grand Final
        fixtures.push({
          homeTeamId: null,
          awayTeamId: null,
          config: {
            bracket: 'grand_final',
            round: 'Grand Final',
            matchSlot: 0,
          },
        });

        // Bracket Reset (optional)
        if (bracketReset) {
          fixtures.push({
            homeTeamId: null,
            awayTeamId: null,
            config: {
              bracket: 'grand_final_reset',
              round: 'Grand Final Reset',
              matchSlot: 0,
              status: 'inactive', // only activated if needed
            },
          });
        }
      } else if (stage.type === 'swiss') {
        const roundsCount =
          stage.config?.roundsCount || Math.ceil(Math.log2(teamIds.length));
        stage.config = { ...stage.config, roundsCount };
        await this.stageRepo.save(stage);

        const n = teamIds.length;
        const hasBye = n % 2 !== 0;
        const pairTeams = [...teamIds];

        if (hasBye) {
          const byeTeamId = pairTeams.pop()!;
          fixtures.push({
            homeTeamId: byeTeamId,
            awayTeamId: null,
            config: {
              round: 'Round 1',
              swissRound: 1,
              isBye: true,
              status: 'completed',
            },
          });
        }

        for (let i = 0; i < pairTeams.length; i += 2) {
          fixtures.push({
            homeTeamId: pairTeams[i],
            awayTeamId: pairTeams[i + 1],
            config: {
              round: 'Round 1',
              swissRound: 1,
            },
          });
        }
      }

      const roundList: string[] = [];
      const roundCounts: Record<string, number> = {};
      let venueIndex = 0;

      for (const f of fixtures) {
        let scheduledAt = f.scheduledAt || null;
        let venueId = f.venueId || null;

        if (scheduleConfig) {
          const roundName = f.config?.round || 'Default Round';
          if (!roundList.includes(roundName)) {
            roundList.push(roundName);
          }
          const roundIndex = roundList.indexOf(roundName);
          if (roundCounts[roundName] === undefined) {
            roundCounts[roundName] = 0;
          }
          const matchIndexInRound = roundCounts[roundName]++;

          const baseDate = event.startDate
            ? new Date(event.startDate)
            : new Date();
          scheduledAt = scheduleConfig.getMatchDate(
            baseDate,
            roundIndex,
            matchIndexInRound,
          );

          const venueIds = scheduleConfig.resolvedVenueIds || [];
          const effectiveVenues =
            venueIds.length > 0
              ? venues.filter((v) => venueIds.includes(v.id))
              : venues;

          if (effectiveVenues.length > 0) {
            if (scheduleConfig.venueStrategy === 'single_venue') {
              venueId = effectiveVenues[0].id;
            } else {
              venueId = effectiveVenues[venueIndex % effectiveVenues.length].id;
              venueIndex++;
            }
          }
        }

        const m = this.matchRepo.create({
          stageId: stage.id,
          homeTeamId: f.homeTeamId,
          awayTeamId: f.awayTeamId,
          status: f.config?.status || 'scheduled',
          homeScore:
            f.config?.status === 'completed' ? (f.config?.isBye ? 1 : 0) : 0,
          awayScore: 0,
          scheduledAt,
          venueId,
          config: f.config,
          liveData: {},
        });
        await this.matchRepo.save(m);
        totalMatches++;
      }
    }

    const compTeams = await this.competitionTeamRepo.find({
      where: { competitionId },
    });
    const teamIdsNotify = compTeams.map((ct) => ct.teamId);
    const players =
      await this.workspacesService.getTeamsPlayerUserIds(teamIdsNotify);
    await this.workspacesService.sendNotificationToMany(
      players,
      NotificationType.FIXTURES_GENERATED,
      `Fixtures generated for competition "${competition.name}".`,
      workspaceId,
      { competitionId, competitionName: competition.name },
    );

    return { stagesGenerated: stages.length, matchesCreated: totalMatches };
  }

  async resetStagesAndFixtures(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
    });
    if (!event) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }
    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
    });
    if (!competition) {
      throw new NotFoundException(
        `Competition "${competitionId}" not found in event`,
      );
    }

    const stages = await this.stageRepo.find({ where: { competitionId } });
    if (stages.length > 0) {
      stages.forEach((s) => (s.deletedAt = new Date()));
      await this.stageRepo.save(stages);
    }

    const compTeams = await this.competitionTeamRepo.find({
      where: { competitionId },
    });
    const teamIds = compTeams.map((ct) => ct.teamId);
    const players = await this.workspacesService.getTeamsPlayerUserIds(teamIds);
    await this.workspacesService.sendNotificationToMany(
      players,
      NotificationType.FIXTURES_RESET,
      `Fixtures for competition "${competition.name}" have been reset.`,
      workspaceId,
      { competitionId, competitionName: competition.name },
    );
  }

  private shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private generateRoundRobinSchedule(
    teams: string[],
    twoLegged: boolean,
    restDays: number,
    baseDate: Date,
    venues: Venue[],
    baseLabel: string,
  ): Array<{
    homeTeamId: string | null;
    awayTeamId: string | null;
    scheduledAt: Date | null;
    venueId: string | null;
    config: {
      round: string;
      leg?: number;
    };
  }> {
    const list = [...teams];
    const isOdd = list.length % 2 !== 0;
    if (isOdd) {
      list.push('BYE'); // Placeholder for bye
    }

    const n = list.length;
    const roundsCount = n - 1;
    const roundMatches: Array<Array<{ home: string; away: string }>> = [];

    // Circle method to generate rounds
    for (let r = 0; r < roundsCount; r++) {
      const matches: Array<{ home: string; away: string }> = [];
      for (let i = 0; i < n / 2; i++) {
        const homeIdx = i;
        const awayIdx = n - 1 - i;

        let home = list[homeIdx];
        let away = list[awayIdx];

        // Alternate home/away for the fixed element (index 0) to balance
        if (i === 0 && r % 2 === 0) {
          [home, away] = [away, home];
        }

        if (home !== 'BYE' && away !== 'BYE') {
          matches.push({ home, away });
        }
      }
      roundMatches.push(matches);

      // Rotate list clockwise (index 0 stays fixed)
      const last = list.pop()!;
      list.splice(1, 0, last);
    }

    const totalLegs = twoLegged ? 2 : 1;
    const allFixtures: Array<{
      homeTeamId: string | null;
      awayTeamId: string | null;
      scheduledAt: Date | null;
      venueId: string | null;
      config: {
        round: string;
        leg?: number;
      };
    }> = [];

    let venueIndex = 0;

    for (let leg = 1; leg <= totalLegs; leg++) {
      for (let r = 0; r < roundsCount; r++) {
        const roundNum = (leg - 1) * roundsCount + (r + 1);
        const totalRounds = roundsCount * totalLegs;

        let roundLabel = '';
        if (baseLabel === 'Round') {
          roundLabel = `Round ${roundNum}`;
        } else {
          if (totalRounds === 1) {
            roundLabel = baseLabel;
          } else {
            roundLabel = `${baseLabel} - Round ${roundNum}`;
          }
        }

        const roundMatchesInRound = roundMatches[r];

        // Calculate schedule date based on restDays
        const daysToAdd = (roundNum - 1) * (restDays + 1);
        const scheduledAt = new Date(
          baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000,
        );

        for (const match of roundMatchesInRound) {
          const homeTeamId = leg === 1 ? match.home : match.away;
          const awayTeamId = leg === 1 ? match.away : match.home;

          let venueId: string | null = null;
          if (venues.length > 0) {
            venueId = venues[venueIndex % venues.length].id;
            venueIndex++;
          }

          allFixtures.push({
            homeTeamId,
            awayTeamId,
            scheduledAt,
            venueId,
            config: {
              round: roundLabel,
              ...(twoLegged ? { leg } : {}),
            },
          });
        }
      }
    }

    return allFixtures;
  }

  /** WB round labels from R1 to WB Final (bracketSize must be power of 2, >= 4) */
  getDeWbRoundNames(bracketSize: number): string[] {
    const numRounds = Math.log2(bracketSize);
    const names: string[] = [];
    for (let r = 0; r < numRounds; r++) {
      const matchCount = bracketSize / Math.pow(2, r + 1);
      if (matchCount === 1) names.push('WB Final');
      else if (matchCount === 2) names.push('WB Semi-Final');
      else if (matchCount === 4) names.push('WB Quarter-Final');
      else names.push(`WB Round ${r + 1}`);
    }
    return names;
  }

  /** LB round labels from R1 to LB Final */
  getDeLbRoundNames(bracketSize: number): string[] {
    const numWbRounds = Math.log2(bracketSize);
    const numLbRounds = 2 * (numWbRounds - 1);
    const names: string[] = [];
    for (let r = 1; r <= numLbRounds; r++) {
      if (r === numLbRounds) names.push('LB Final');
      else if (r === numLbRounds - 1) names.push('LB Semi-Final');
      else names.push(`LB Round ${r}`);
    }
    return names;
  }

  /** Number of matches per LB round */
  getDeLbMatchCounts(bracketSize: number): number[] {
    const numWbRounds = Math.log2(bracketSize);
    const numLbRounds = 2 * (numWbRounds - 1);
    const counts: number[] = [];
    let size = bracketSize / 4;
    for (let i = 1; i <= numLbRounds; i++) {
      counts.push(size);
      if (i % 2 === 0 && size > 1) size = Math.floor(size / 2);
    }
    return counts;
  }
}
