import { Test, TestingModule } from '@nestjs/testing';
import { PlayerInsightsService } from './player-insights.service';
import { Player } from '../entities/player.entity';
import { AiService } from '../../ai/ai.service';

describe('PlayerInsightsService', () => {
  let service: PlayerInsightsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerInsightsService,
        {
          provide: AiService,
          useValue: {
            generateText: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<PlayerInsightsService>(PlayerInsightsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlayerInsights', () => {
    it('should generate rule-based insights for a football player with good stats', async () => {
      const mockPlayer = {
        id: 'player-123',
        jerseyNumber: '10',
        position: 'Forward',
        user: { username: 'john_doe' },
      } as Player;

      const mockStats = {
        allTime: {
          gamesPlayed: 10,
          avgRating: 8.5,
          mvps: 3,
          goals: 8,
          assists: 4,
        },
        competitions: [
          {
            competitionId: 'comp-1',
            competitionName: 'Championship 2026',
            sportCode: 'football',
            avgRating: 8.5,
          },
        ],
      };

      const mockRecentMatches = [
        { rating: 8.8, sportCode: 'football' },
        { rating: 9.0, sportCode: 'football' },
      ];

      const result = await service.getPlayerInsights(
        mockPlayer,
        mockStats,
        mockRecentMatches,
      );

      expect(result).toBeDefined();
      expect(result.strengths).toContainEqual(
        expect.stringContaining('Elite Performer'),
      );
      expect(result.strengths).toContainEqual(
        expect.stringContaining('Clinical Finisher'),
      );
      expect(result.strengths).toContainEqual(
        expect.stringContaining('Playmaking Vision'),
      );
      expect(result.consistency).toContain(
        'outstanding performance consistency',
      );
      expect(result.recentForm).toContain('Excellent recent form');
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.aiAnalysisText).toContain('john_doe');
    });

    it('should generate rule-based insights for a cricket player', async () => {
      const mockPlayer = {
        id: 'player-456',
        jerseyNumber: '7',
        position: 'All-rounder',
        user: { username: 'virat_k' },
      } as Player;

      const mockStats = {
        allTime: {
          gamesPlayed: 15,
          avgRating: 7.2,
          mvps: 1,
          runs: 600,
          wickets: 25,
        },
        competitions: [
          {
            competitionId: 'comp-2',
            competitionName: 'T20 Cup 2026',
            sportCode: 'cricket',
            avgRating: 7.2,
          },
        ],
      };

      const mockRecentMatches = [
        { rating: 7.0, sportCode: 'cricket' },
        { rating: 7.5, sportCode: 'cricket' },
      ];

      const result = await service.getPlayerInsights(
        mockPlayer,
        mockStats,
        mockRecentMatches,
      );

      expect(result).toBeDefined();
      expect(result.strengths).toContainEqual(
        expect.stringContaining('Anchor Batsman'),
      );
      expect(result.strengths).toContainEqual(
        expect.stringContaining('Strike Bowler'),
      );
      expect(result.consistency).toContain('steady consistency');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});
