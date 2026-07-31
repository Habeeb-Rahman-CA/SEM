import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AiSummaryService } from './ai-summary.service';
import { Match } from '../entities/match.entity';
import { MatchPlayer } from '../../players/entities/match-player.entity';
import { AiService } from '../../ai/ai.service';

describe('AiSummaryService', () => {
  let service: AiSummaryService;
  let matchRepoMock: any;
  let matchPlayerRepoMock: any;

  beforeEach(async () => {
    matchRepoMock = {
      findOne: jest.fn(),
      save: jest.fn((m) => Promise.resolve(m)),
    };
    matchPlayerRepoMock = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSummaryService,
        {
          provide: getRepositoryToken(Match),
          useValue: matchRepoMock,
        },
        {
          provide: getRepositoryToken(MatchPlayer),
          useValue: matchPlayerRepoMock,
        },
        {
          provide: AiService,
          useValue: {
            generateText: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<AiSummaryService>(AiSummaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAndSaveSummary', () => {
    it('should generate and save a football summary correctly', async () => {
      const mockMatch = {
        id: 'match-1',
        homeScore: 3,
        awayScore: 1,
        status: 'completed',
        homeTeam: { name: 'Arsenal' },
        awayTeam: { name: 'Chelsea' },
        venue: { name: 'Emirates Stadium' },
        stage: {
          competition: {
            sport: { code: 'football', name: 'Football' },
          },
        },
        liveData: {
          events: [
            {
              type: 'goal',
              minute: 12,
              playerUserId: 'player-1',
              goalType: 'normal',
            },
            {
              type: 'goal',
              minute: 45,
              playerUserId: 'player-2',
              goalType: 'normal',
              assistPlayerUserId: 'player-1',
            },
            {
              type: 'card',
              minute: 60,
              playerUserId: 'player-3',
              cardType: 'yellow',
            },
          ],
        },
        summary: null,
      };

      const mockMatchPlayers = [
        {
          playerId: 'player-1',
          rating: 8.5,
          team: { name: 'Arsenal' },
          player: { user: { username: 'Saka' } },
        },
        {
          playerId: 'player-2',
          rating: 9.0,
          team: { name: 'Arsenal' },
          player: { user: { username: 'Odegaard' } },
        },
        {
          playerId: 'player-3',
          rating: 6.0,
          team: { name: 'Chelsea' },
          player: { user: { username: 'Jackson' } },
        },
      ];

      matchRepoMock.findOne.mockResolvedValue(mockMatch);
      matchPlayerRepoMock.find.mockResolvedValue(mockMatchPlayers);

      const result = await service.generateAndSaveSummary('match-1');

      expect(result.summaryDraft).toContain('Arsenal');
      expect(result.summaryDraft).toContain('Chelsea');
      expect(result.summaryDraft).toContain('3 - 1');
      expect(result.summaryDraft).toContain('Saka');
      expect(result.summaryDraft).toContain('Odegaard');
      expect(result.isSummaryPublished).toBe(false);
      expect(matchRepoMock.save).toHaveBeenCalled();
    });
  });

  describe('publishSummary', () => {
    it('should copy summaryDraft to summary and publish it', async () => {
      const mockMatch = {
        id: 'match-1',
        summary: null,
        summaryDraft: 'Generated draft',
        isSummaryPublished: false,
      } as any;
      matchRepoMock.findOne.mockResolvedValue(mockMatch);

      const result = await service.publishSummary('match-1');
      expect(result.summary).toBe('Generated draft');
      expect(result.isSummaryPublished).toBe(true);
      expect(matchRepoMock.save).toHaveBeenCalled();
    });
  });

  describe('updateSummaryDraft', () => {
    it('should update the summaryDraft text', async () => {
      const mockMatch = {
        id: 'match-1',
        summaryDraft: 'Old draft',
      } as any;
      matchRepoMock.findOne.mockResolvedValue(mockMatch);

      const result = await service.updateSummaryDraft('match-1', 'New draft');
      expect(result.summaryDraft).toBe('New draft');
      expect(matchRepoMock.save).toHaveBeenCalled();
    });
  });
});
