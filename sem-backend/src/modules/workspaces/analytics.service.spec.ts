import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { Team } from '../teams/entities/team.entity';
import { Player } from '../players/entities/player.entity';
import { Event } from '../events/entities/event.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { Match } from '../competitions/entities/match.entity';
import { Venue } from '../venues/entities/venue.entity';
import { AuditLog } from './entities/audit-log.entity';
import { WorkspaceAnalyticsSnapshot } from './entities/workspace-analytics-snapshot.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { AiService } from '../ai/ai.service';
import { NotFoundException } from '@nestjs/common';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let workspaceRepo: Repository<Workspace>;
  let eventRepo: Repository<Event>;
  let teamRepo: Repository<Team>;
  let playerRepo: Repository<Player>;
  let venueRepo: Repository<Venue>;
  let matchRepo: Repository<Match>;
  let auditLogRepo: Repository<AuditLog>;
  let invoiceRepo: Repository<Invoice>;

  const mockWorkspace = {
    id: 'ws-1',
    name: 'Test Workspace',
    slug: 'test-ws',
  } as Workspace;

  const mockQueryBuilder = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Workspace),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockWorkspace),
          },
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(Team),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(Player),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(Competition),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(Match),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Venue),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(WorkspaceAnalyticsSnapshot),
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
          },
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: AiService,
          useValue: {
            generateText: jest.fn().mockResolvedValue(
              JSON.stringify({
                bottlenecksIdentified: ['bottleneck 1'],
                recommendations: ['recommendation 1'],
                predictedEfficiencyGain: 'Some forecast',
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    workspaceRepo = module.get<Repository<Workspace>>(
      getRepositoryToken(Workspace),
    );
    eventRepo = module.get<Repository<Event>>(getRepositoryToken(Event));
    teamRepo = module.get<Repository<Team>>(getRepositoryToken(Team));
    playerRepo = module.get<Repository<Player>>(getRepositoryToken(Player));
    venueRepo = module.get<Repository<Venue>>(getRepositoryToken(Venue));
    matchRepo = module.get<Repository<Match>>(getRepositoryToken(Match));
    auditLogRepo = module.get<Repository<AuditLog>>(
      getRepositoryToken(AuditLog),
    );
    invoiceRepo = module.get<Repository<Invoice>>(getRepositoryToken(Invoice));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateWorkspace', () => {
    it('should throw NotFoundException if workspace does not exist', async () => {
      jest.spyOn(workspaceRepo, 'findOne').mockResolvedValueOnce(null);
      await expect(service.getEventReports('invalid-ws')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getEventReports', () => {
    it('should return KPI dashboard data for a workspace', async () => {
      const mockEvent = {
        id: 'evt-1',
        name: 'Event 1',
        status: 'ongoing',
        competitions: [],
      } as any;
      jest.spyOn(eventRepo, 'find').mockResolvedValueOnce([mockEvent]);
      jest
        .spyOn(teamRepo, 'find')
        .mockResolvedValueOnce([{ id: 'team-1' } as Team]);
      jest
        .spyOn(playerRepo, 'find')
        .mockResolvedValueOnce([
          { id: 'player-1', teamId: 'team-1' } as Player,
        ]);
      jest
        .spyOn(venueRepo, 'find')
        .mockResolvedValueOnce([{ id: 'venue-1' } as Venue]);

      const result = await service.getEventReports('ws-1');
      expect(result).toBeDefined();
      expect(result.kpis.totalEvents).toBe(1);
      expect(result.kpis.totalRegisteredTeams).toBe(1);
      expect(result.kpis.totalRegisteredPlayers).toBe(1);
      expect(result.eventBreakdowns.length).toBe(1);
    });
  });

  describe('getParticipationTrends', () => {
    it('should calculate cumulative growth and seasonal patterns', async () => {
      const mockPlayer = { id: 'player-1', createdAt: new Date() } as Player;
      const mockTeam = { id: 'team-1', createdAt: new Date() } as Team;
      const mockEvent = {
        id: 'evt-1',
        sport: 'Soccer',
        competitions: [],
      } as any;

      jest.spyOn(playerRepo, 'find').mockResolvedValueOnce([mockPlayer]);
      jest.spyOn(teamRepo, 'find').mockResolvedValueOnce([mockTeam]);
      jest.spyOn(eventRepo, 'find').mockResolvedValueOnce([mockEvent]);

      const result = await service.getParticipationTrends('ws-1');
      expect(result).toBeDefined();
      expect(result.growthTrend.length).toBeGreaterThan(0);
      expect(result.sportsData.length).toBe(1);
      expect(result.sportsData[0].sport).toBe('Soccer');
    });
  });

  describe('getHistoricalComparisons', () => {
    it('should return yearly benchmarking comparisons', async () => {
      const mockEvent = {
        id: 'evt-1',
        name: 'Annual Cup 2025',
        startDate: new Date('2025-01-01'),
        status: 'completed',
        competitions: [],
        teams: [],
      } as any;
      jest.spyOn(eventRepo, 'find').mockResolvedValueOnce([mockEvent]);

      const result = await service.getHistoricalComparisons('ws-1');
      expect(result).toBeDefined();
      expect(result.yearlyData.length).toBe(1);
      expect(result.yearlyData[0].year).toBe(2025);
    });
  });

  describe('getOrganizerInsights', () => {
    it('should fetch audit logs and compute organizer productivity / operational bottlenecks', async () => {
      const mockAuditLog = {
        id: 1,
        action: 'Update score',
        performedByName: 'Admin',
        performedById: 'user-1',
        createdAt: new Date(),
      } as unknown as AuditLog;
      jest.spyOn(auditLogRepo, 'find').mockResolvedValueOnce([mockAuditLog]);

      const result = await service.getOrganizerInsights('ws-1');
      expect(result).toBeDefined();
      expect(result.productivity.length).toBe(1);
      expect(result.productivity[0].name).toBe('Admin');
      expect(result.bottlenecks).toBeDefined();
      expect(result.aiRecommendation).toBeDefined();
    });
  });

  describe('getOrganizationStats', () => {
    it('should aggregate financial, participation, and attendance stats', async () => {
      const mockEvent = {
        id: 'evt-1',
        name: 'Event 1',
        status: 'completed',
        startDate: new Date('2026-07-15'),
        venue: 'Main Stadium',
        competitions: [],
        teams: [{ id: 'team-1' }, { id: 'team-2' }],
      } as any;

      const mockInvoice = {
        id: 'inv-1',
        status: 'paid',
        totalCents: 10000,
        issuedAt: new Date('2026-07-20'),
        payments: [{ status: 'succeeded', method: 'card', amountCents: 10000 }],
      } as any;

      const mockVenue = {
        id: 'venue-1',
        name: 'Main Stadium',
        capacity: 500,
      } as any;

      jest.spyOn(eventRepo, 'find').mockResolvedValueOnce([mockEvent]);
      jest
        .spyOn(teamRepo, 'find')
        .mockResolvedValueOnce([
          { id: 'team-1' } as Team,
          { id: 'team-2' } as Team,
        ]);
      jest
        .spyOn(playerRepo, 'find')
        .mockResolvedValueOnce([
          { id: 'player-1', createdAt: new Date() } as Player,
        ]);
      jest.spyOn(venueRepo, 'find').mockResolvedValueOnce([mockVenue]);
      jest.spyOn(invoiceRepo, 'find').mockResolvedValueOnce([mockInvoice]);

      const result = await service.getOrganizationStats('ws-1');
      expect(result).toBeDefined();
      expect(result.participation.totalRegisteredTeams).toBe(2);
      expect(result.participation.totalRegisteredPlayers).toBe(1);
      expect(result.finance.totalRevenue).toBe(10000);
      expect(result.finance.averageInvoiceValue).toBe(10000);
      expect(result.attendance.totalAttendance).toBeGreaterThan(0);
      expect(result.seasonalTrends.length).toBeGreaterThan(0);
      expect(result.predictiveInsights).toBeDefined();
    });
  });
});
