import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BracketAdvancementService } from './bracket-advancement.service';
import { Competition } from '../../workspaces/entities/competition.entity';
import { CompetitionStage } from '../../workspaces/entities/competition-stage.entity';
import { Match } from '../../workspaces/entities/match.entity';
import { CompetitionTeam } from '../../workspaces/entities/competition-team.entity';
import { Team } from '../../workspaces/entities/team.entity';
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
        { provide: getRepositoryToken(Competition), useFactory: mockRepository },
        { provide: getRepositoryToken(CompetitionStage), useFactory: mockRepository },
        { provide: getRepositoryToken(Match), useFactory: mockRepository },
        { provide: getRepositoryToken(CompetitionTeam), useFactory: mockRepository },
        { provide: getRepositoryToken(Team), useFactory: mockRepository },
        { provide: WorkspacesService, useFactory: mockWorkspacesService },
        { provide: CompetitionRankingsService, useFactory: mockCompetitionRankingsService },
        { provide: MatchGenerationService, useFactory: mockMatchGenerationService },
        { provide: CompetitionCompletionService, useFactory: mockCompetitionCompletionService },
      ],
    }).compile();

    service = module.get<BracketAdvancementService>(BracketAdvancementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
