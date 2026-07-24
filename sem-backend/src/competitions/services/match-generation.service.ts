import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompetitionStage } from '../../workspaces/entities/competition-stage.entity';
import { Match } from '../../workspaces/entities/match.entity';

@Injectable()
export class MatchGenerationService {
  constructor(
    @InjectRepository(CompetitionStage)
    private readonly stageRepo: Repository<CompetitionStage>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
  ) {}

  async generateKnockoutStageMatches(
    stage: CompetitionStage,
    teamIds: string[],
  ): Promise<void> {
    const twoLegged = stage.config?.twoLegged || stage.config?.legs === 2;
    const prevStages = await this.stageRepo.find({
      where: { competitionId: stage.competitionId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });
    const prevStage = prevStages[prevStages.indexOf(stage) - 1];

    let koTeamsCount = teamIds.length;
    if (prevStage) {
      if (prevStage.type === 'group' || prevStage.type === 'league') {
        koTeamsCount =
          prevStage.config?.advancingCount ??
          (prevStage.config?.groupsCount
            ? prevStage.config.groupsCount * 2
            : 4);
      }
    }

    const bracketSize = Math.pow(
      2,
      Math.ceil(Math.log2(Math.max(koTeamsCount, 2))),
    );
    const advancingTeams = teamIds.slice(0, bracketSize);

    const padded: (string | null)[] = [
      ...advancingTeams,
      ...Array(bracketSize - advancingTeams.length).fill(null),
    ];

    const fixtures: Array<{
      homeTeamId: string | null;
      awayTeamId: string | null;
      config: any;
    }> = [];

    const roundLabel =
      bracketSize === 2
        ? 'Final'
        : bracketSize === 4
          ? 'Semi-Final'
          : bracketSize === 8
            ? 'Quarter-Final'
            : `Round of ${bracketSize}`;

    const firstRoundPairs: [string | null, string | null][] = [];
    const half = bracketSize / 2;
    for (let i = 0; i < half; i++) {
      firstRoundPairs.push([padded[i], padded[bracketSize - 1 - i]]);
    }

    for (const pair of firstRoundPairs) {
      const home = pair[0];
      const away = pair[1];
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
        const home3rd =
          bracketSize === 2 && advancingTeams.length >= 4
            ? advancingTeams[2]
            : null;
        const away3rd =
          bracketSize === 2 && advancingTeams.length >= 4
            ? advancingTeams[3]
            : null;
        fixtures.push({
          homeTeamId: home3rd,
          awayTeamId: away3rd,
          config: twoLegged
            ? { round: 'Third Place Match', leg: 1 }
            : { round: 'Third Place Match' },
        });
        if (twoLegged) {
          fixtures.push({
            homeTeamId: away3rd,
            awayTeamId: home3rd,
            config: { round: 'Third Place Match', leg: 2 },
          });
        }
      }
      remainingTeams = remainingTeams / 2;
    }

    for (const f of fixtures) {
      const m = this.matchRepo.create({
        stageId: stage.id,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        status: 'scheduled',
        config: f.config,
        liveData: {},
      });
      await this.matchRepo.save(m);
    }
  }
}
