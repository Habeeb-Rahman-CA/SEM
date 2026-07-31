import { Test, TestingModule } from '@nestjs/testing';
import { PlayersService } from './players.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Player } from './entities/player.entity';
import { PlayerTransfer } from './entities/player-transfer.entity';
import { Team } from '../teams/entities/team.entity';
import { MatchPlayer } from './entities/match-player.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { Match } from '../competitions/entities/match.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { UsersService } from '../users/users.service';
import { SearchService } from '../search/search.service';
import { PlayerInsightsService } from './services/player-insights.service';

describe('PlayersService', () => {
  let service: PlayersService;
  let playerRepo: any;
  let playerTransferRepo: any;
  let teamRepo: any;
  let usersServiceMock: any;

  beforeEach(async () => {
    playerRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    playerTransferRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    teamRepo = {
      findOne: jest.fn(),
    };
    usersServiceMock = {
      findOneById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersService,
        {
          provide: getRepositoryToken(Player),
          useValue: playerRepo,
        },
        {
          provide: getRepositoryToken(Team),
          useValue: teamRepo,
        },
        {
          provide: getRepositoryToken(MatchPlayer),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(PlayerTransfer),
          useValue: playerTransferRepo,
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: {
            manager: {
              find: jest.fn().mockResolvedValue([]),
            },
          },
        },
        {
          provide: getRepositoryToken(Match),
          useValue: {},
        },
        {
          provide: WorkspacesService,
          useValue: {
            ensureMember: jest.fn(),
            ensurePermission: jest.fn(),
            sendNotification: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: SearchService,
          useValue: {
            indexPlayer: jest.fn(),
            deletePlayer: jest.fn(),
          },
        },
        {
          provide: PlayerInsightsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPlayer', () => {
    it('should create player and save an initial transfer entry', async () => {
      const mockWorkspaceId = 'ws-1';
      const mockUserId = 'user-1';
      const mockDto = {
        userId: 'player-user-id',
        teamId: 'team-1',
        jerseyNumber: '10',
      };

      teamRepo.findOne.mockResolvedValue({ id: 'team-1', name: 'Arsenal' });
      usersServiceMock.findOneById.mockResolvedValue({
        id: 'player-user-id',
        username: 'gunner',
      });

      await service.createPlayer(mockWorkspaceId, mockDto, mockUserId);

      expect(playerRepo.create).toHaveBeenCalled();
      expect(playerTransferRepo.create).toHaveBeenCalledWith({
        userId: 'player-user-id',
        fromTeamId: null,
        toTeamId: 'team-1',
      });
      expect(playerTransferRepo.save).toHaveBeenCalled();
    });
  });

  describe('updatePlayer transfers', () => {
    it('should record a transfer when updating to a new team', async () => {
      const mockWorkspaceId = 'ws-1';
      const mockUserId = 'user-1';
      const mockPlayer = {
        id: 'player-1',
        userId: 'player-user-id',
        teamId: 'team-1',
        team: { id: 'team-1', name: 'Arsenal' },
      };

      playerRepo.findOne.mockResolvedValueOnce(mockPlayer); // inside updatePlayer
      playerRepo.findOne.mockResolvedValueOnce(null); // check for existing registration
      teamRepo.findOne.mockResolvedValue({ id: 'team-2', name: 'Chelsea' });

      await service.updatePlayer(
        mockWorkspaceId,
        'player-1',
        { teamId: 'team-2' },
        mockUserId,
      );

      expect(playerTransferRepo.create).toHaveBeenCalledWith({
        userId: 'player-user-id',
        fromTeamId: 'team-1',
        toTeamId: 'team-2',
      });
      expect(playerTransferRepo.save).toHaveBeenCalled();
    });
  });
});
