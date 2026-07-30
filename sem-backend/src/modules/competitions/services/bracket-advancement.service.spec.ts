import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BracketAdvancementService } from './bracket-advancement.service';
import { Competition } from '../entities/competition.entity';
import { CompetitionStage } from '../entities/competition-stage.entity';
import { Match } from '../entities/match.entity';
import { CompetitionTeam } from '../entities/competition-team.entity';
import { Team } from '../../teams/entities/team.entity';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { CompetitionRankingsService } from './competition-rankings.service';
import { MatchGenerationService } from './match-generation.service';
import { CompetitionCompletionService } from './competition-completion.service';

describe('BracketAdvancementService', () => {
  let service: BracketAdvancementService;

  const mockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  });

  const mockWorkspacesService = () => ({
    sendNotificationToMany: jest.fn(),
  });

  const mockCompetitionRankingsService = () => ({
    getCompetitionRankings: jest.fn(),
  });

  const mockMatchGenerationService = () => ({});

  const mockCompetitionCompletionService = () => ({
    checkAndAutoCompleteCompetition: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BracketAdvancementService,
        {
          provide: getRepositoryToken(Competition),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(CompetitionStage),
          useFactory: mockRepository,
        },
        { provide: getRepositoryToken(Match), useFactory: mockRepository },
        {
          provide: getRepositoryToken(CompetitionTeam),
          useFactory: mockRepository,
        },
        { provide: getRepositoryToken(Team), useFactory: mockRepository },
        { provide: WorkspacesService, useFactory: mockWorkspacesService },
        {
          provide: CompetitionRankingsService,
          useFactory: mockCompetitionRankingsService,
        },
        {
          provide: MatchGenerationService,
          useFactory: mockMatchGenerationService,
        },
        {
          provide: CompetitionCompletionService,
          useFactory: mockCompetitionCompletionService,
        },
      ],
    }).compile();

    service = module.get<BracketAdvancementService>(BracketAdvancementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getQualificationPreview', () => {
    it('should correctly preview qualification standings, including best runners-up', async () => {
      const stage = {
        id: 'stage-1',
        competitionId: 'comp-1',
        config: {
          tieBreaks: ['points', 'gd', 'gf'],
          runnersUpCount: 1,
          advancingCount: 1,
        },
      } as any;

      const mockMatches = [
        {
          id: 'match-1',
          stageId: 'stage-1',
          homeTeamId: 'team-a',
          awayTeamId: 'team-b',
          status: 'completed',
          homeScore: 2,
          awayScore: 0,
          config: { round: 'Group A' },
        },
        {
          id: 'match-2',
          stageId: 'stage-1',
          homeTeamId: 'team-c',
          awayTeamId: 'team-d',
          status: 'completed',
          homeScore: 3,
          awayScore: 1,
          config: { round: 'Group B' },
        },
      ] as any[];

      const mockCompTeams = [
        { teamId: 'team-a', team: { id: 'team-a', name: 'Team A' } },
        { teamId: 'team-b', team: { id: 'team-b', name: 'Team B' } },
        { teamId: 'team-c', team: { id: 'team-c', name: 'Team C' } },
        { teamId: 'team-d', team: { id: 'team-d', name: 'Team D' } },
      ] as any[];

      jest.spyOn(service['matchRepo'], 'find').mockResolvedValue(mockMatches);
      jest
        .spyOn(service['competitionTeamRepo'], 'find')
        .mockResolvedValue(mockCompTeams);

      const result = await service.getQualificationPreview(stage);

      expect(result).toBeDefined();
      expect(result.groups['Group A']).toBeDefined();
      expect(result.groups['Group B']).toBeDefined();

      // Team A has 3 pts, Team B has 0 pts. Team A should be Rank 1 (qualified)
      expect(result.groups['Group A'][0].teamId).toBe('team-a');
      expect(result.groups['Group A'][0].status).toBe('qualified');

      // Team C has 3 pts, Team D has 0 pts. Team C should be Rank 1 (qualified)
      expect(result.groups['Group B'][0].teamId).toBe('team-c');
      expect(result.groups['Group B'][0].status).toBe('qualified');

      // Best runner-up should be team B or team D depending on tiebreakers
      // Team D has 0 pts, GD -2 (gf 1, ga 3), Team B has 0 pts, GD -2 (gf 0, ga 2).
      // Team B has better GD/GA orGF. Team D has more GF (1 vs 0), so Team D should be best runner-up.
      expect(
        result.qualifiedTeams.some((t: any) => t.teamId === 'team-d'),
      ).toBe(true);
    });
  });

  describe('advanceGroupStageWinners', () => {
    it('should not advance if manualQualification is true and forcePublish is false', async () => {
      const stage = {
        id: 'stage-1',
        competitionId: 'comp-1',
        config: {
          manualQualification: true,
        },
      } as any;

      const spyMatchesFind = jest.spyOn(service['matchRepo'], 'find');

      await service.advanceGroupStageWinners(stage, false);

      expect(spyMatchesFind).not.toHaveBeenCalled();
    });
  });
});
