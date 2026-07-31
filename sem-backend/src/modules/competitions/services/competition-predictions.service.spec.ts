import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompetitionPredictionsService } from './competition-predictions.service';
import { Competition } from '../entities/competition.entity';
import { CompetitionStage } from '../entities/competition-stage.entity';
import { Match } from '../entities/match.entity';
import { CompetitionTeam } from '../entities/competition-team.entity';
import * as aiClient from '../../../common/ai-client';

describe('CompetitionPredictionsService', () => {
  let service: CompetitionPredictionsService;
  let competitionRepoMock: any;
  let stageRepoMock: any;
  let matchRepoMock: any;
  let competitionTeamRepoMock: any;

  beforeEach(async () => {
    competitionRepoMock = {
      findOne: jest.fn(),
    };
    stageRepoMock = {
      find: jest.fn(),
    };
    matchRepoMock = {
      find: jest.fn(),
    };
    competitionTeamRepoMock = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitionPredictionsService,
        {
          provide: getRepositoryToken(Competition),
          useValue: competitionRepoMock,
        },
        {
          provide: getRepositoryToken(CompetitionStage),
          useValue: stageRepoMock,
        },
        {
          provide: getRepositoryToken(Match),
          useValue: matchRepoMock,
        },
        {
          provide: getRepositoryToken(CompetitionTeam),
          useValue: competitionTeamRepoMock,
        },
      ],
    }).compile();

    service = module.get<CompetitionPredictionsService>(
      CompetitionPredictionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPredictions', () => {
    const mockCompetition = {
      id: 'comp-1',
      name: 'Championship Bracket',
      sport: { name: 'Football', code: 'football' },
    };

    const mockStages = [{ id: 'stage-1', name: 'Group Stage', sequence: 1 }];

    const mockCompetitionTeams = [
      {
        competitionId: 'comp-1',
        teamId: 'team-1',
        team: { name: 'Team Alpha' },
      },
      {
        competitionId: 'comp-1',
        teamId: 'team-2',
        team: { name: 'Team Beta' },
      },
    ];

    const mockMatches = [
      {
        id: 'match-1',
        stageId: 'stage-1',
        status: 'completed',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        homeScore: 2,
        awayScore: 1,
        homeTeam: { name: 'Team Alpha' },
        awayTeam: { name: 'Team Beta' },
      },
    ];

    it('should throw NotFoundException if competition is not found', async () => {
      competitionRepoMock.findOne.mockResolvedValue(null);
      await expect(service.getPredictions('non-existent')).rejects.toThrow();
    });

    it('should generate predictions via rule-based fallback when AI is not responding', async () => {
      competitionRepoMock.findOne.mockResolvedValue(mockCompetition);
      stageRepoMock.find.mockResolvedValue(mockStages);
      competitionTeamRepoMock.find.mockResolvedValue(mockCompetitionTeams);
      matchRepoMock.find.mockResolvedValue(mockMatches);

      // Mock AI client to fail / return null
      jest.spyOn(aiClient, 'generateTextWithFallback').mockResolvedValue(null);

      const predictions = await service.getPredictions('comp-1');

      expect(predictions).toBeDefined();
      expect(predictions.likelyWinners.length).toBeGreaterThan(0);
      expect(predictions.qualificationProbabilities.length).toBeGreaterThan(0);
      expect(predictions.forecastedStandings.length).toBeGreaterThan(0);
      expect(predictions.confidenceScore).toBe(60); // standard fallback confidence
    });

    it('should parse predictions via AI client when successful JSON response is returned', async () => {
      competitionRepoMock.findOne.mockResolvedValue(mockCompetition);
      stageRepoMock.find.mockResolvedValue(mockStages);
      competitionTeamRepoMock.find.mockResolvedValue(mockCompetitionTeams);
      matchRepoMock.find.mockResolvedValue(mockMatches);

      const mockAiOutput = JSON.stringify({
        qualificationProbabilities: [
          {
            teamId: 'team-1',
            teamName: 'Team Alpha',
            probability: 90,
            confidence: 'High',
            reasoning: 'Strong stats',
          },
          {
            teamId: 'team-2',
            teamName: 'Team Beta',
            probability: 45,
            confidence: 'Medium',
            reasoning: 'Average form',
          },
        ],
        likelyWinners: [
          {
            rank: 1,
            teamId: 'team-1',
            teamName: 'Team Alpha',
            confidence: 'High',
            reasoning: 'Leading standings',
          },
        ],
        forecastedStandings: [
          { teamName: 'Team Alpha', projectedPoints: 12, projectedRank: 1 },
          { teamName: 'Team Beta', projectedPoints: 6, projectedRank: 2 },
        ],
        confidenceScore: 85,
        disclaimer: 'AI predictions for testing.',
      });

      jest
        .spyOn(aiClient, 'generateTextWithFallback')
        .mockResolvedValue(mockAiOutput);

      const predictions = await service.getPredictions('comp-1');

      expect(predictions).toBeDefined();
      expect(predictions.confidenceScore).toBe(85);
      expect(predictions.likelyWinners[0].teamName).toBe('Team Alpha');
      expect(predictions.qualificationProbabilities[0].probability).toBe(90);
    });
  });
});
