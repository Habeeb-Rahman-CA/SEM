import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AttendanceForecastingService } from './attendance-forecasting.service';
import { Event } from '../entities/event.entity';
import { Venue } from '../../venues/entities/venue.entity';
import { Competition } from '../../competitions/entities/competition.entity';
import { AiService } from '../../ai/ai.service';

describe('AttendanceForecastingService', () => {
  let service: AttendanceForecastingService;
  let aiService: AiService;
  let eventRepoMock: any;
  let venueRepoMock: any;
  let competitionRepoMock: any;

  beforeEach(async () => {
    eventRepoMock = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    venueRepoMock = {
      findOne: jest.fn(),
    };
    competitionRepoMock = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceForecastingService,
        {
          provide: getRepositoryToken(Event),
          useValue: eventRepoMock,
        },
        {
          provide: getRepositoryToken(Venue),
          useValue: venueRepoMock,
        },
        {
          provide: getRepositoryToken(Competition),
          useValue: competitionRepoMock,
        },
        {
          provide: AiService,
          useValue: {
            generateText: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AttendanceForecastingService>(
      AttendanceForecastingService,
    );
    aiService = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAttendanceForecast', () => {
    const mockEvent = {
      id: 'event-1',
      name: 'Summer Sports Festival',
      workspaceId: 'workspace-1',
      venue: 'Main Arena',
      teams: [
        { id: 'team-1', name: 'Team Alpha' },
        { id: 'team-2', name: 'Team Beta' },
      ],
      competitions: [{ id: 'comp-1', name: 'Football Championship' }],
    };

    const mockVenue = {
      id: 'venue-1',
      name: 'Main Arena',
      capacity: 5000,
      workspaceId: 'workspace-1',
    };

    it('should throw NotFoundException if event is not found', async () => {
      eventRepoMock.findOne.mockResolvedValue(null);
      await expect(
        service.getAttendanceForecast('workspace-1', 'non-existent'),
      ).rejects.toThrow();
    });

    it('should generate attendance forecast via rule-based fallback when AI fails', async () => {
      eventRepoMock.findOne.mockResolvedValue(mockEvent);
      venueRepoMock.findOne.mockResolvedValue(mockVenue);
      eventRepoMock.find.mockResolvedValue([]);
      jest.spyOn(aiService, 'generateText').mockResolvedValue('');

      const forecast = await service.getAttendanceForecast(
        'workspace-1',
        'event-1',
      );

      expect(forecast).toBeDefined();
      expect(forecast.venueCapacity).toBe(5000);
      expect(forecast.forecastedParticipants).toBe(36);
      expect(forecast.forecastedSpectators).toBe(120);
      expect(forecast.totalForecasted).toBe(156);
      expect(forecast.resourceEstimates.staffRequired).toBe(5);
      expect(forecast.resourceEstimates.securityGuards).toBe(2);
    });

    it('should parse attendance forecast via AI client when successful JSON response is returned', async () => {
      eventRepoMock.findOne.mockResolvedValue(mockEvent);
      venueRepoMock.findOne.mockResolvedValue(mockVenue);
      eventRepoMock.find.mockResolvedValue([]);

      const mockAiOutput = JSON.stringify({
        forecastedSpectators: 3000,
        forecastedParticipants: 60,
        totalForecasted: 3060,
        confidenceScore: 90,
        venueCapacity: 5000,
        capacityUtilization: 61.2,
        warning: {
          level: 'info',
          message: 'Safe utilization limits.',
        },
        resourceEstimates: {
          staffRequired: 60,
          securityGuards: 30,
          firstAidResponders: 6,
          concessionStands: 12,
        },
        trendReport: {
          summary: 'High expected attendance based on local popularity.',
          historicalAverages: {
            spectatorsPerMatch: 1500,
            participantsPerTeam: 30,
          },
        },
        aiAnalysisText: 'Detailed AI analysis',
      });

      jest.spyOn(aiService, 'generateText').mockResolvedValue(mockAiOutput);

      const forecast = await service.getAttendanceForecast(
        'workspace-1',
        'event-1',
      );

      expect(forecast).toBeDefined();
      expect(forecast.forecastedSpectators).toBe(3000);
      expect(forecast.totalForecasted).toBe(3060);
      expect(forecast.confidenceScore).toBe(90);
      expect(forecast.resourceEstimates.securityGuards).toBe(30);
    });
  });
});
