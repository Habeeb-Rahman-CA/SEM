import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Competition } from './entities/competition.entity';
import { CompetitionStage } from './entities/competition-stage.entity';
import { Match } from './entities/match.entity';
import { MatchPlayer } from '../players/entities/match-player.entity';
import { CompetitionTeam } from './entities/competition-team.entity';
import { Sport } from '../workspaces/entities/sport.entity';
import { Event } from '../events/entities/event.entity';
import { Team } from '../teams/entities/team.entity';
import { Player } from '../players/entities/player.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { NotificationType } from '../workspaces/entities/notification.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { FixturesGeneratorService } from './services/fixtures-generator.service';
import { MatchLineupService } from './services/match-lineup.service';
import { StatisticsRatingsService } from './services/statistics-ratings.service';
import { BracketAdvancementService } from './services/bracket-advancement.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { MatchLockService } from './services/match-lock.service';
import { AiSummaryService } from './services/ai-summary.service';
import { CompetitionPredictionsService } from './services/competition-predictions.service';

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(CompetitionStage)
    private readonly stageRepo: Repository<CompetitionStage>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayerRepo: Repository<MatchPlayer>,
    @InjectRepository(CompetitionTeam)
    private readonly competitionTeamRepo: Repository<CompetitionTeam>,
    @InjectRepository(Sport)
    private readonly sportRepo: Repository<Sport>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    private readonly workspacesService: WorkspacesService,
    private readonly fixturesGeneratorService: FixturesGeneratorService,
    private readonly matchLineupService: MatchLineupService,
    private readonly statisticsRatingsService: StatisticsRatingsService,
    private readonly bracketAdvancementService: BracketAdvancementService,
    private readonly matchLockService: MatchLockService,
    private readonly aiSummaryService: AiSummaryService,
    private readonly predictionsService: CompetitionPredictionsService,
  ) {}

  // ─── Validation Helpers ───────────────────────────────────────────────────

  async validateCompetitionContext(
    workspaceId: string,
    eventId: string,
    competitionId: string,
  ): Promise<Competition> {
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
    });
    if (!event) {
      throw new NotFoundException(
        `Event "${eventId}" not found in this workspace`,
      );
    }
    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
      relations: { sport: true },
    });
    if (!competition) {
      throw new NotFoundException(
        `Competition "${competitionId}" not found in this event`,
      );
    }
    return competition;
  }

  async validateStageContext(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
  ): Promise<CompetitionStage> {
    await this.validateCompetitionContext(workspaceId, eventId, competitionId);
    const stage = await this.stageRepo.findOne({
      where: { id: stageId, competitionId },
    });
    if (!stage) {
      throw new NotFoundException(
        `Stage "${stageId}" not found in this competition`,
      );
    }
    return stage;
  }

  // ─── Competitions CRUD ────────────────────────────────────────────────────

  async getCompetitions(
    workspaceId: string,
    eventId: string,
    userId: string,
  ): Promise<Competition[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const eventExists = await this.eventRepo.exists({
      where: { id: eventId, workspaceId },
    });
    if (!eventExists) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }

    const competitions = await this.competitionRepo.find({
      where: { eventId },
      relations: { sport: true, stages: true },
      order: { name: 'ASC' },
    });

    const allStageIds = competitions.flatMap((c) =>
      (c.stages ?? []).map((s) => s.id),
    );
    const allMatchesMap = new Map<string, any[]>();

    if (allStageIds.length > 0) {
      const allMatches = await this.matchRepo.find({
        where: { stageId: In(allStageIds) },
        relations: { homeTeam: true, awayTeam: true },
      });
      for (const m of allMatches) {
        if (!allMatchesMap.has(m.stageId)) allMatchesMap.set(m.stageId, []);
        allMatchesMap.get(m.stageId)!.push(m);
      }
    }

    return competitions.map((comp) => {
      const compJson = JSON.parse(JSON.stringify(comp));
      for (const stage of compJson.stages ?? []) {
        stage.matches = allMatchesMap.get(stage.id) ?? [];
      }
      return compJson;
    });
  }

  async createCompetition(
    workspaceId: string,
    eventId: string,
    dto: CreateCompetitionDto,
    userId: string,
  ): Promise<Competition> {
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

    const sport = await this.sportRepo.findOne({ where: { id: dto.sportId } });
    if (!sport) {
      throw new NotFoundException(`Sport with ID "${dto.sportId}" not found`);
    }

    const competition = this.competitionRepo.create({
      name: dto.name,
      eventId,
      sportId: dto.sportId,
      status: dto.status || 'upcoming',
      pointsConfig: dto.pointsConfig ?? null,
    });

    const saved = await this.competitionRepo.save(competition);
    const found = await this.competitionRepo.findOne({
      where: { id: saved.id },
      relations: { sport: true },
    });
    if (!found) {
      throw new NotFoundException(`Competition "${saved.id}" not found`);
    }

    const memberIds = await this.workspacesService.getWorkspaceMemberUserIds(
      workspaceId,
      userId,
    );
    await this.workspacesService.sendNotificationToMany(
      memberIds,
      NotificationType.COMPETITION_CREATED,
      `New competition "${found.name}" added to ${event.name}.`,
      workspaceId,
      {
        eventId,
        competitionId: found.id,
        competitionName: found.name,
        eventName: event.name,
      },
    );

    return found;
  }

  async updateCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    dto: UpdateCompetitionDto,
    userId: string,
  ): Promise<Competition> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );

    const eventExists = await this.eventRepo.exists({
      where: { id: eventId, workspaceId },
    });
    if (!eventExists) {
      throw new NotFoundException(`Event "${eventId}" not found in workspace`);
    }

    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
      relations: { sport: true },
    });
    if (!competition) {
      throw new NotFoundException(
        `Competition "${competitionId}" not found in event`,
      );
    }

    if (dto.sportId) {
      const sport = await this.sportRepo.findOne({
        where: { id: dto.sportId },
      });
      if (!sport) {
        throw new NotFoundException(`Sport with ID "${dto.sportId}" not found`);
      }
      competition.sportId = dto.sportId;
      competition.sport = sport;
    }

    if (dto.name !== undefined) competition.name = dto.name;
    if (dto.status !== undefined) competition.status = dto.status;
    if (dto.pointsConfig !== undefined)
      competition.pointsConfig = dto.pointsConfig ?? null;

    return this.competitionRepo.save(competition);
  }

  async removeCompetition(
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
    const eventExists = await this.eventRepo.exists({
      where: { id: eventId, workspaceId },
    });
    if (!eventExists) {
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

    competition.deletedAt = new Date();
    await this.competitionRepo.save(competition);
  }

  // ─── Competition Teams ───────────────────────────────────────────────────

  async getCompetitionTeams(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<CompetitionTeam[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
      relations: { teams: true },
    });
    if (!event) throw new NotFoundException(`Event not found`);
    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
    });
    if (!competition)
      throw new NotFoundException(`Competition "${competitionId}" not found`);

    const eventTeams = event.teams || [];
    const uniqueTeams = Array.from(
      new Map(eventTeams.map((t) => [t.id, t])).values(),
    );
    return uniqueTeams.map((t) => ({
      id: `${competitionId}-${t.id}`,
      competitionId,
      teamId: t.id,
      team: t,
      createdAt: event.createdAt,
    })) as CompetitionTeam[];
  }

  async addTeamToCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    teamId: string,
    userId: string,
  ): Promise<CompetitionTeam> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );
    await this.validateCompetitionContext(workspaceId, eventId, competitionId);
    const team = await this.teamRepo.findOne({
      where: { id: teamId, workspaceId },
    });
    if (!team)
      throw new NotFoundException(`Team "${teamId}" not found in workspace`);
    const existing = await this.competitionTeamRepo.findOne({
      where: { competitionId, teamId },
    });
    if (existing)
      throw new ConflictException(
        `Team is already enrolled in this competition`,
      );
    const entry = this.competitionTeamRepo.create({ competitionId, teamId });
    const saved = await this.competitionTeamRepo.save(entry);
    const foundEntry = await this.competitionTeamRepo.findOne({
      where: { id: saved.id },
      relations: { team: true },
    });

    if (foundEntry) {
      const comp = await this.competitionRepo.findOne({
        where: { id: competitionId },
      });
      const players = await this.workspacesService.getTeamPlayerUserIds(teamId);
      await this.workspacesService.sendNotificationToMany(
        players,
        NotificationType.TEAM_ADDED_TO_COMPETITION,
        `Your team ${foundEntry.team.name} has been registered for ${comp?.name ?? 'a competition'}.`,
        workspaceId,
        {
          teamId,
          teamName: foundEntry.team.name,
          competitionId,
          competitionName: comp?.name,
        },
      );
    }

    return foundEntry as any;
  }

  async removeTeamFromCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    teamId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );
    await this.validateCompetitionContext(workspaceId, eventId, competitionId);
    const entry = await this.competitionTeamRepo.findOne({
      where: { competitionId, teamId },
    });
    if (!entry)
      throw new NotFoundException(`Team is not enrolled in this competition`);

    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    const comp = await this.competitionRepo.findOne({
      where: { id: competitionId },
    });

    entry.deletedAt = new Date();
    await this.competitionTeamRepo.save(entry);

    const players = await this.workspacesService.getTeamPlayerUserIds(teamId);
    await this.workspacesService.sendNotificationToMany(
      players,
      NotificationType.TEAM_REMOVED_FROM_COMPETITION,
      `Your team ${team?.name ?? 'Unknown'} has been withdrawn from ${comp?.name ?? 'the competition'}.`,
      workspaceId,
      {
        teamId,
        teamName: team?.name,
        competitionId,
        competitionName: comp?.name,
      },
    );
  }

  // ─── Fixture Generator ──────────────────────────────────────────────────

  async generateFixtures(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
    fixtureTemplateId?: string,
  ): Promise<{ stagesGenerated: number; matchesCreated: number }> {
    return this.fixturesGeneratorService.generateFixtures(
      workspaceId,
      eventId,
      competitionId,
      userId,
      fixtureTemplateId,
    );
  }

  // ─── Competition Stages ─────────────────────────────────────────────────

  async getStages(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<CompetitionStage[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const compExists = await this.competitionRepo
      .createQueryBuilder('c')
      .innerJoin(
        'c.event',
        'e',
        'e.id = :eventId AND e.workspaceId = :workspaceId',
        { eventId, workspaceId },
      )
      .where('c.id = :competitionId', { competitionId })
      .getExists();
    if (!compExists) {
      throw new NotFoundException(
        `Competition "${competitionId}" not found in event`,
      );
    }

    return this.stageRepo.find({
      where: { competitionId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });
  }

  async createStage(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    dto: CreateStageDto,
    userId: string,
  ): Promise<CompetitionStage> {
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

    const sequence =
      dto.sequence ??
      (await this.stageRepo.count({ where: { competitionId } })) + 1;

    const stage = this.stageRepo.create({
      name: dto.name,
      type: dto.type,
      sequence,
      competitionId,
      config: dto.config ?? {},
    });

    return this.stageRepo.save(stage);
  }

  async updateStage(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    dto: UpdateStageDto,
    userId: string,
  ): Promise<CompetitionStage> {
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

    const stage = await this.stageRepo.findOne({
      where: { id: stageId, competitionId },
    });
    if (!stage) {
      throw new NotFoundException(
        `Stage "${stageId}" not found in competition`,
      );
    }

    if (dto.name !== undefined) stage.name = dto.name;
    if (dto.type !== undefined) stage.type = dto.type;
    if (dto.sequence !== undefined) stage.sequence = dto.sequence;
    if (dto.config !== undefined) {
      stage.config = { ...stage.config, ...dto.config };
    }

    return this.stageRepo.save(stage);
  }

  async removeStage(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
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

    const stage = await this.stageRepo.findOne({
      where: { id: stageId, competitionId },
    });
    if (!stage) {
      throw new NotFoundException(
        `Stage "${stageId}" not found in competition`,
      );
    }

    stage.deletedAt = new Date();
    await this.stageRepo.save(stage);
  }

  async getQualificationPreview(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    userId: string,
  ): Promise<any> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const stage = await this.stageRepo.findOne({
      where: { id: stageId, competitionId },
    });
    if (!stage) {
      throw new NotFoundException(
        `Stage "${stageId}" not found in competition`,
      );
    }
    return this.bracketAdvancementService.getQualificationPreview(stage);
  }

  async publishQualification(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );
    const stage = await this.stageRepo.findOne({
      where: { id: stageId, competitionId },
    });
    if (!stage) {
      throw new NotFoundException(
        `Stage "${stageId}" not found in competition`,
      );
    }
    await this.bracketAdvancementService.advanceGroupStageWinners(stage, true);
  }

  async resetStagesAndFixtures(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<void> {
    return this.fixturesGeneratorService.resetStagesAndFixtures(
      workspaceId,
      eventId,
      competitionId,
      userId,
    );
  }

  // ─── Matches ────────────────────────────────────────────────────────────

  async getMatches(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    userId: string,
  ): Promise<Match[]> {
    return this.matchLineupService.getMatches(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      userId,
    );
  }

  async createMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    dto: CreateMatchDto,
    userId: string,
  ): Promise<Match> {
    return this.matchLineupService.createMatch(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      dto,
      userId,
    );
  }

  async updateMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    dto: UpdateMatchDto,
    userId: string,
  ): Promise<Match> {
    return this.matchLineupService.updateMatch(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      dto,
      userId,
    );
  }

  async generateMatchSummary(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    userId: string,
  ): Promise<Match> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'match.score',
    );
    const stage = await this.stageRepo.findOne({
      where: { id: stageId, competitionId },
    });
    if (!stage) {
      throw new NotFoundException(
        `Stage "${stageId}" not found in this competition`,
      );
    }
    const match = await this.matchRepo.findOne({
      where: { id: matchId, stageId },
    });
    if (!match) {
      throw new NotFoundException(`Match "${matchId}" not found in this stage`);
    }

    return this.aiSummaryService.generateAndSaveSummary(matchId);
  }

  async publishMatchSummary(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    userId: string,
  ): Promise<Match> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'match.score',
    );
    const stage = await this.stageRepo.findOne({
      where: { id: stageId, competitionId },
    });
    if (!stage) {
      throw new NotFoundException(
        `Stage "${stageId}" not found in this competition`,
      );
    }
    return this.aiSummaryService.publishSummary(matchId);
  }

  async updateMatchSummaryDraft(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    summaryDraft: string,
    userId: string,
  ): Promise<Match> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'match.score',
    );
    const stage = await this.stageRepo.findOne({
      where: { id: stageId, competitionId },
    });
    if (!stage) {
      throw new NotFoundException(
        `Stage "${stageId}" not found in this competition`,
      );
    }
    return this.aiSummaryService.updateSummaryDraft(matchId, summaryDraft);
  }

  async acquireMatchLock(
    workspaceId: string,
    matchId: string,
    userId: string,
    username: string,
  ): Promise<{ success: boolean; lockedBy?: string; expiresAt?: number }> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'match.score',
    );
    return this.matchLockService.acquireLock(matchId, userId, username);
  }

  async releaseMatchLock(
    workspaceId: string,
    matchId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'match.score',
    );
    const success = this.matchLockService.releaseLock(matchId, userId);
    return { success };
  }

  async removeMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    userId: string,
  ): Promise<void> {
    return this.matchLineupService.removeMatch(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      userId,
    );
  }

  // ─── Match Lineup ───────────────────────────────────────────────────────

  async getMatchLineup(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    userId: string,
  ): Promise<MatchPlayer[]> {
    return this.matchLineupService.getMatchLineup(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      userId,
    );
  }

  async saveMatchLineup(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    lineups: {
      playerId: string;
      isPlaying: boolean;
      teamId: string;
      isGoalkeeper?: boolean;
    }[],
    userId: string,
  ): Promise<MatchPlayer[]> {
    return this.matchLineupService.saveMatchLineup(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      lineups,
      userId,
    );
  }

  // ─── Player Ratings ─────────────────────────────────────────────────────

  async getMatchRatings(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    userId: string,
  ): Promise<MatchPlayer[]> {
    return this.statisticsRatingsService.getMatchRatings(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      userId,
    );
  }

  async setMatchPlayerRatings(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    ratings: any[],
    userId: string,
  ): Promise<MatchPlayer[]> {
    return this.statisticsRatingsService.setMatchPlayerRatings(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      ratings,
      userId,
    );
  }

  // ─── Competition Analytics ──────────────────────────────────────────────

  async getCompetitionBestPlayer(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<{
    bestPlayer: MatchPlayer | null;
    allRankings: Array<{
      playerId: string;
      playerName: string;
      teamName: string;
      avgRating: number;
      appearances: number;
      eligible: boolean;
    }>;
    totalMatches: number;
    minAppearancesRequired: number;
  }> {
    return this.statisticsRatingsService.getCompetitionBestPlayer(
      workspaceId,
      eventId,
      competitionId,
      userId,
    );
  }

  async getCompetitionStats(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<any> {
    return this.statisticsRatingsService.getCompetitionStats(
      workspaceId,
      eventId,
      competitionId,
      userId,
    );
  }

  async getCompetitionRankings(
    competitionId: string,
  ): Promise<Map<string, number>> {
    return this.bracketAdvancementService.getCompetitionRankings(competitionId);
  }

  async getPublicCompetitions(eventId: string): Promise<Competition[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event || !event.isPublic) {
      throw new NotFoundException('Event not found or is not public');
    }
    const competitions = await this.competitionRepo.find({
      where: { eventId },
      relations: { sport: true, stages: true },
      order: { name: 'ASC' },
    });

    const allStageIds = competitions.flatMap((c) =>
      (c.stages ?? []).map((s) => s.id),
    );
    const allMatchesMap = new Map<string, any[]>();

    if (allStageIds.length > 0) {
      const allMatches = await this.matchRepo.find({
        where: { stageId: In(allStageIds) },
        relations: { homeTeam: true, awayTeam: true },
      });
      for (const m of allMatches) {
        if (!allMatchesMap.has(m.stageId)) allMatchesMap.set(m.stageId, []);
        allMatchesMap.get(m.stageId)!.push(m);
      }
    }

    return competitions.map((comp) => {
      const compJson = JSON.parse(JSON.stringify(comp));
      for (const stage of compJson.stages ?? []) {
        stage.matches = allMatchesMap.get(stage.id) ?? [];
      }
      return compJson;
    });
  }

  async getPublicStages(
    eventId: string,
    competitionId: string,
  ): Promise<CompetitionStage[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event || !event.isPublic) {
      throw new NotFoundException('Event not found or is not public');
    }
    const compExists = await this.competitionRepo.exists({
      where: { id: competitionId, eventId },
    });
    if (!compExists) {
      throw new NotFoundException('Competition not found');
    }
    return this.stageRepo.find({
      where: { competitionId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });
  }

  async getPublicMatchDetails(matchId: string): Promise<any> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: {
        homeTeam: true,
        awayTeam: true,
        venue: true,
        stage: {
          competition: {
            sport: true,
            event: true,
          },
        },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    const event = match.stage?.competition?.event;
    if (!event) throw new NotFoundException('Match context missing');
    if (!event.isPublic) throw new NotFoundException('Event is not public');

    const matchPlayers = await this.matchPlayerRepo.find({
      where: { matchId: match.id },
      relations: { player: { user: true }, team: true },
    });

    return {
      id: match.id,
      status: match.status,
      scheduledAt: match.scheduledAt,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      config: match.config,
      liveData: match.liveData,
      summary: match.summary,
      highlightVideos: match.highlightVideos ?? [],
      homeTeam: match.homeTeam
        ? {
            id: match.homeTeam.id,
            name: match.homeTeam.name,
            logoUrl: match.homeTeam.logoUrl,
            primaryColor: match.homeTeam.primaryColor,
          }
        : null,
      awayTeam: match.awayTeam
        ? {
            id: match.awayTeam.id,
            name: match.awayTeam.name,
            logoUrl: match.awayTeam.logoUrl,
            primaryColor: match.awayTeam.primaryColor,
          }
        : null,
      venue: match.venue
        ? { id: match.venue.id, name: match.venue.name }
        : null,
      stage: {
        id: match.stage.id,
        name: match.stage.name,
        type: match.stage.type,
      },
      competition: {
        id: match.stage.competition.id,
        name: match.stage.competition.name,
        sport: match.stage.competition.sport
          ? {
              id: match.stage.competition.sport.id,
              code: match.stage.competition.sport.code,
              name: match.stage.competition.sport.name,
            }
          : null,
      },
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        logoUrl: event.logoUrl,
      },
      players: matchPlayers.map((mp) => ({
        playerId: mp.playerId,
        playerUserId: mp.player?.userId ?? null,
        playerName:
          mp.player?.user?.username ??
          mp.player?.jerseyNumber?.toString() ??
          'Player',
        teamId: mp.teamId,
        teamName: mp.team?.name ?? null,
        isPlaying: mp.isPlaying,
        rating: mp.rating,
      })),
    };
  }

  async getPublicLiveMatches(
    filters: {
      sport?: string;
      eventId?: string;
    } = {},
  ): Promise<any[]> {
    const qb = this.matchRepo
      .createQueryBuilder('match')
      .innerJoinAndSelect('match.stage', 'stage')
      .innerJoinAndSelect('stage.competition', 'competition')
      .innerJoinAndSelect('competition.sport', 'sport')
      .innerJoinAndSelect('competition.event', 'event')
      .leftJoinAndSelect('match.homeTeam', 'homeTeam')
      .leftJoinAndSelect('match.awayTeam', 'awayTeam')
      .leftJoinAndSelect('match.venue', 'venue')
      .where('match.status = :live', { live: 'live' })
      .andWhere('event.isPublic = :isPublic', { isPublic: true })
      .andWhere('event.deletedAt IS NULL');

    if (filters.sport) {
      qb.andWhere('LOWER(sport.code) = LOWER(:sportCode)', {
        sportCode: filters.sport,
      });
    }

    if (filters.eventId) {
      qb.andWhere('event.id = :eventId', { eventId: filters.eventId });
    }

    qb.orderBy('match.scheduledAt', 'ASC', 'NULLS LAST').addOrderBy(
      'match.createdAt',
      'ASC',
    );

    const matches = await qb.getMany();

    return matches.map((m) => ({
      id: m.id,
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      scheduledAt: m.scheduledAt,
      config: m.config,
      liveData: m.liveData,
      homeTeam: m.homeTeam
        ? {
            id: m.homeTeam.id,
            name: m.homeTeam.name,
            logoUrl: m.homeTeam.logoUrl,
          }
        : null,
      awayTeam: m.awayTeam
        ? {
            id: m.awayTeam.id,
            name: m.awayTeam.name,
            logoUrl: m.awayTeam.logoUrl,
          }
        : null,
      venue: m.venue ? { id: m.venue.id, name: m.venue.name } : null,
      stage: {
        id: m.stage.id,
        name: m.stage.name,
        type: m.stage.type,
      },
      competition: {
        id: m.stage.competition.id,
        name: m.stage.competition.name,
        sport: m.stage.competition.sport
          ? {
              id: m.stage.competition.sport.id,
              code: m.stage.competition.sport.code,
              name: m.stage.competition.sport.name,
            }
          : null,
      },
      event: {
        id: m.stage.competition.event.id,
        name: m.stage.competition.event.name,
        slug: m.stage.competition.event.slug,
        logoUrl: m.stage.competition.event.logoUrl,
        workspaceId: m.stage.competition.event.workspaceId,
      },
    }));
  }

  async getPublicMatches(
    eventId: string,
    competitionId: string,
    stageId: string,
  ): Promise<Match[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event || !event.isPublic) {
      throw new NotFoundException('Event not found or is not public');
    }
    const stage = await this.stageRepo.findOne({
      where: { id: stageId, competitionId },
    });
    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    const matches = await this.matchRepo.find({
      where: { stageId },
      relations: { homeTeam: true, awayTeam: true, venue: true },
      order: { createdAt: 'ASC' },
    });

    const relevantMatches = matches.filter(
      (m) => m.status === 'completed' || m.status === 'live',
    );
    if (relevantMatches.length > 0) {
      const matchIds = relevantMatches.map((m) => m.id);
      const matchPlayers = await this.matchPlayerRepo.find({
        where: { matchId: In(matchIds), isPlaying: true },
        relations: { player: { user: true }, team: true },
      });

      const playersByMatch = new Map<string, MatchPlayer[]>();
      for (const mp of matchPlayers) {
        if (!playersByMatch.has(mp.matchId)) {
          playersByMatch.set(mp.matchId, []);
        }
        playersByMatch.get(mp.matchId)!.push(mp);
      }

      for (const m of matches) {
        if (m.status !== 'completed' && m.status !== 'live') continue;
        const players = playersByMatch.get(m.id) ?? [];

        // Attach players roster for the frontend to easily map user IDs to usernames
        (m as any).players = players.map((mp) => ({
          playerId: mp.playerId,
          playerUserId: mp.player?.userId,
          playerName:
            mp.player?.user?.username ??
            mp.player?.jerseyNumber?.toString() ??
            'Player',
          teamId: mp.teamId,
          jerseyNumber: mp.player?.jerseyNumber,
          isPlaying: mp.isPlaying,
        }));

        if (m.status === 'completed') {
          let maxRating = -1;
          let mvpMp: MatchPlayer | null = null;
          for (const mp of players) {
            if (mp.rating !== null) {
              const r = Number(mp.rating);
              if (r > maxRating) {
                maxRating = r;
                mvpMp = mp;
              }
            }
          }
          if (mvpMp && maxRating >= 5.0) {
            const playerName =
              mvpMp.player?.user?.username ??
              mvpMp.player?.jerseyNumber?.toString() ??
              'Player';
            (m as any).mvp = {
              playerId: mvpMp.playerId,
              playerName,
              teamName: mvpMp.team?.name ?? 'Unknown',
              rating: maxRating,
            };
          }
        }
      }
    }

    const statusWeight = {
      live: 1,
      scheduled: 2,
      completed: 3,
      inactive: 4,
    };

    return matches.sort((a, b) => {
      const wA = statusWeight[a.status] || 99;
      const wB = statusWeight[b.status] || 99;
      if (wA !== wB) return wA - wB;
      const timeA = a.createdAt?.getTime() || 0;
      const timeB = b.createdAt?.getTime() || 0;
      return timeA - timeB;
    });
  }

  async getPublicCompetitionStats(
    eventId: string,
    competitionId: string,
  ): Promise<any> {
    return this.statisticsRatingsService.getPublicCompetitionStats(
      eventId,
      competitionId,
    );
  }

  async getPublicStandings(
    eventId: string,
    competitionId: string,
    stageId: string,
  ): Promise<any> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event || !event.isPublic) {
      throw new NotFoundException('Event not found or is not public');
    }

    const stage = await this.stageRepo.findOne({
      where: { id: stageId, competitionId },
    });
    if (!stage) throw new NotFoundException('Stage not found');

    const matches = await this.matchRepo.find({
      where: { stageId },
      relations: { homeTeam: true, awayTeam: true },
      order: { createdAt: 'ASC' },
    });

    const competitionTeams = await this.competitionTeamRepo.find({
      where: { competitionId },
      relations: { team: true },
    });

    const isLeague =
      stage.type === 'league' ||
      stage.type === 'group' ||
      stage.type === 'group_knockout';
    const isKnockout =
      stage.type === 'knockout' ||
      stage.type === 'group_knockout' ||
      stage.type === 'double_elimination';

    const winPts: number = (stage.config as any)?.winPoint ?? 3;
    const drawPts: number = (stage.config as any)?.drawPoint ?? 1;

    // ─── League / Group Table ───────────────────────────────────────────────
    let table: any[] = [];
    if (isLeague) {
      const statsMap = new Map<
        string,
        {
          teamId: string;
          teamName: string;
          teamLogoUrl: string | null;
          played: number;
          won: number;
          drawn: number;
          lost: number;
          gf: number;
          ga: number;
          gd: number;
          pts: number;
          group?: string;
        }
      >();

      for (const ct of competitionTeams) {
        statsMap.set(ct.teamId, {
          teamId: ct.teamId,
          teamName: ct.team?.name ?? 'Unknown',
          teamLogoUrl: ct.team?.logoUrl ?? null,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          pts: 0,
        });
      }

      for (const m of matches) {
        if (m.status !== 'completed' && m.status !== 'live') continue;
        if (!m.homeTeamId || !m.awayTeamId) continue;

        // Only count group-stage matches if group_knockout
        if (stage.type === 'group_knockout') {
          const round = (m.config as any)?.round ?? '';
          const isGroupMatch =
            round.toLowerCase().includes('group') ||
            round.toLowerCase().includes('stage');
          if (!isGroupMatch) continue;
        }

        let h = statsMap.get(m.homeTeamId);
        let a = statsMap.get(m.awayTeamId);

        if (!h && m.homeTeam) {
          h = {
            teamId: m.homeTeamId,
            teamName: m.homeTeam.name,
            teamLogoUrl: m.homeTeam.logoUrl ?? null,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
          };
          statsMap.set(m.homeTeamId, h);
        }
        if (!a && m.awayTeam) {
          a = {
            teamId: m.awayTeamId,
            teamName: m.awayTeam.name,
            teamLogoUrl: m.awayTeam.logoUrl ?? null,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
          };
          statsMap.set(m.awayTeamId, a);
        }
        if (!h || !a) continue;

        h.played++;
        a.played++;
        h.gf += m.homeScore;
        h.ga += m.awayScore;
        a.gf += m.awayScore;
        a.ga += m.homeScore;
        h.gd = h.gf - h.ga;
        a.gd = a.gf - a.ga;

        if (m.homeScore > m.awayScore) {
          h.won++;
          h.pts += winPts;
          a.lost++;
        } else if (m.homeScore < m.awayScore) {
          a.won++;
          a.pts += winPts;
          h.lost++;
        } else {
          h.drawn++;
          h.pts += drawPts;
          a.drawn++;
          a.pts += drawPts;
        }
      }

      // Head-to-head tie-break (goals scored between tied teams)
      const rows = Array.from(statsMap.values());
      rows.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      });

      table = rows.map((r, i) => ({ ...r, position: i + 1 }));
    }

    // ─── Knockout Bracket Progress ───────────────────────────────────────────
    let bracket: any[] = [];
    if (isKnockout) {
      const roundOrder = [
        'wb round 1',
        'wb round 2',
        'wb round 3',
        'wb round 4',
        'wb quarter-final',
        'wb semi-final',
        'wb final',
        'lb round 1',
        'lb round 2',
        'lb round 3',
        'lb round 4',
        'lb round 5',
        'lb round 6',
        'lb quarter-final',
        'lb semi-final',
        'lb final',
        'grand final',
        'grand final reset',
        'round of 32',
        'round of 16',
        'round of 8',
        'quarter-final',
        'semi-final',
        'final',
        'third place match',
        '3rd place match',
      ];

      const roundsMap = new Map<string, any[]>();
      for (const m of matches) {
        const round: string = (m.config as any)?.round ?? 'Unknown';
        if (stage.type === 'group_knockout') {
          const isGroup =
            round.toLowerCase().includes('group') ||
            round.toLowerCase().includes('stage');
          if (isGroup) continue;
        }
        if (!roundsMap.has(round)) roundsMap.set(round, []);
        roundsMap.get(round)!.push({
          id: m.id,
          homeTeam: m.homeTeam
            ? {
                id: m.homeTeamId,
                name: m.homeTeam.name,
                logoUrl: m.homeTeam.logoUrl,
              }
            : null,
          awayTeam: m.awayTeam
            ? {
                id: m.awayTeamId,
                name: m.awayTeam.name,
                logoUrl: m.awayTeam.logoUrl,
              }
            : null,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          status: m.status,
          scheduledAt: (m as any).scheduledAt ?? null,
          leg: (m.config as any)?.leg ?? null,
        });
      }

      const sortedRounds = Array.from(roundsMap.keys()).sort((a, b) => {
        const aLow = a.toLowerCase();
        const bLow = b.toLowerCase();
        const ia = roundOrder.findIndex((o) => aLow.includes(o));
        const ib = roundOrder.findIndex((o) => bLow.includes(o));
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });

      bracket = sortedRounds.map((round) => ({
        round,
        matches: roundsMap.get(round)!,
      }));
    }

    // ─── Stage metadata ──────────────────────────────────────────────────────
    const totalMatches = matches.length;
    const completedMatches = matches.filter(
      (m) => m.status === 'completed',
    ).length;
    const liveMatches = matches.filter((m) => m.status === 'live').length;

    return {
      stageId,
      stageName: stage.name,
      stageType: stage.type,
      pointsConfig: { winPts, drawPts },
      progress: {
        total: totalMatches,
        completed: completedMatches,
        live: liveMatches,
      },
      isCompleted: totalMatches > 0 && completedMatches === totalMatches,
      table,
      bracket,
    };
  }

  async getPublicResults(eventId: string, competitionId: string): Promise<any> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event || !event.isPublic) {
      throw new NotFoundException('Event not found or is not public');
    }

    const comp = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
      relations: { sport: true },
    });
    if (!comp) throw new NotFoundException('Competition not found');

    // All stages for this competition
    const stages = await this.stageRepo.find({
      where: { competitionId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });
    const stageIds = stages.map((s) => s.id);
    if (stageIds.length === 0)
      return {
        competition: comp.name,
        sportCode: comp.sport?.code ?? '',
        results: [],
      };

    const stageMap = new Map(stages.map((s) => [s.id, s]));

    // All completed matches across all stages
    const matches = await this.matchRepo.find({
      where: { stageId: In(stageIds), status: 'completed' },
      relations: { homeTeam: true, awayTeam: true, venue: true },
      order: { createdAt: 'DESC' },
    });

    if (matches.length === 0)
      return {
        competition: comp.name,
        sportCode: comp.sport?.code ?? '',
        results: [],
      };

    // Enrich with player stats
    const matchIds = matches.map((m) => m.id);
    const matchPlayers = await this.matchPlayerRepo.find({
      where: { matchId: In(matchIds), isPlaying: true },
      relations: { player: { user: true }, team: true },
    });

    const playersByMatch = new Map<string, MatchPlayer[]>();
    for (const mp of matchPlayers) {
      if (!playersByMatch.has(mp.matchId)) playersByMatch.set(mp.matchId, []);
      playersByMatch.get(mp.matchId)!.push(mp);
    }

    const results = matches.map((m) => {
      const players = playersByMatch.get(m.id) ?? [];

      // Determine winner
      let winner: 'home' | 'away' | 'draw' = 'draw';
      if (m.homeScore > m.awayScore) winner = 'home';
      else if (m.awayScore > m.homeScore) winner = 'away';

      // MVP (highest rated player)
      let mvp: any = null;
      let maxRating = -1;
      for (const mp of players) {
        if (mp.rating !== null) {
          const r = Number(mp.rating);
          if (r > maxRating) {
            maxRating = r;
            mvp = {
              playerId: mp.playerId,
              playerName:
                mp.player?.user?.username ??
                mp.player?.jerseyNumber?.toString() ??
                'Player',
              teamName: mp.team?.name ?? 'Unknown',
              rating: r,
            };
          }
        }
      }
      if (mvp && maxRating < 5.0) mvp = null;

      const getPlayerStats = (mp: MatchPlayer, liveData: any) => {
        const stats: any = {};
        const username = mp.player?.user?.username;
        if (liveData && Array.isArray(liveData.inningsData) && username) {
          let runs = 0;
          let wickets = 0;
          for (const inn of liveData.inningsData) {
            const bStats = inn.batsmanStats?.[username];
            if (bStats) runs += bStats.runs ?? 0;
            const bowlStats = inn.bowlerStats?.[username];
            if (bowlStats) wickets += bowlStats.wickets ?? 0;
          }
          if (runs > 0) stats.runs = runs;
          if (wickets > 0) stats.wickets = wickets;
        }

        if (liveData && Array.isArray(liveData.events)) {
          const userId = mp.player?.userId;
          for (const event of liveData.events) {
            const isPlayer =
              event.playerId === mp.playerId ||
              (userId && event.playerUserId === userId) ||
              (username && event.playerUsername === username);
            const isAssister =
              event.assistPlayerId === mp.playerId ||
              (userId && event.assistPlayerUserId === userId);

            if (isPlayer) {
              if (event.type === 'goal') {
                if (event.goalType === 'own_goal') {
                  stats.ownGoals = (stats.ownGoals ?? 0) + 1;
                } else {
                  stats.goals = (stats.goals ?? 0) + 1;
                }
              } else if (event.type === 'card') {
                if (event.cardType === 'yellow') {
                  stats.yellowCards = (stats.yellowCards ?? 0) + 1;
                } else if (
                  event.cardType === 'red' ||
                  event.cardType === 'second_yellow'
                ) {
                  stats.redCards = (stats.redCards ?? 0) + 1;
                }
              } else if (event.type === 'rally' || event.type === 'rally_won') {
                stats.ralliesWon = (stats.ralliesWon ?? 0) + 1;
              }
            }
            if (
              isAssister &&
              event.type === 'goal' &&
              event.goalType !== 'own_goal'
            ) {
              stats.assists = (stats.assists ?? 0) + 1;
            }
          }
        }
        return stats;
      };

      const liveData = m.liveData;

      // Top performers — scorers / highest-rated per team
      const homePerformers = players
        .filter((mp) => mp.teamId === m.homeTeamId && mp.rating !== null)
        .sort((a, b) => Number(b.rating) - Number(a.rating))
        .slice(0, 3)
        .map((mp) => ({
          playerId: mp.playerId,
          playerName:
            mp.player?.user?.username ??
            mp.player?.jerseyNumber?.toString() ??
            'Player',
          jerseyNumber: mp.player?.jerseyNumber ?? null,
          rating: Number(mp.rating),
          stats: getPlayerStats(mp, liveData),
        }));

      const awayPerformers = players
        .filter((mp) => mp.teamId === m.awayTeamId && mp.rating !== null)
        .sort((a, b) => Number(b.rating) - Number(a.rating))
        .slice(0, 3)
        .map((mp) => ({
          playerId: mp.playerId,
          playerName:
            mp.player?.user?.username ??
            mp.player?.jerseyNumber?.toString() ??
            'Player',
          jerseyNumber: mp.player?.jerseyNumber ?? null,
          rating: Number(mp.rating),
          stats: getPlayerStats(mp, liveData),
        }));

      const stage = stageMap.get(m.stageId);

      return {
        id: m.id,
        homeTeam: m.homeTeam
          ? {
              id: m.homeTeamId,
              name: m.homeTeam.name,
              logoUrl: m.homeTeam.logoUrl,
            }
          : null,
        awayTeam: m.awayTeam
          ? {
              id: m.awayTeamId,
              name: m.awayTeam.name,
              logoUrl: m.awayTeam.logoUrl,
            }
          : null,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        winner,
        scheduledAt: (m as any).scheduledAt ?? null,
        completedAt: m.updatedAt ?? m.createdAt,
        venue: m.venue
          ? { name: m.venue.name, location: (m.venue as any).location ?? null }
          : null,
        stage: stage
          ? { id: stage.id, name: stage.name, type: stage.type }
          : null,
        round: (m.config as any)?.round ?? null,
        mvp,
        homePerformers,
        awayPerformers,
      };
    });

    // Group results by date (using scheduledAt or completedAt)
    const grouped = new Map<string, any[]>();
    for (const r of results) {
      const dateKey = r.scheduledAt
        ? new Date(r.scheduledAt).toISOString().split('T')[0]
        : new Date(r.completedAt).toISOString().split('T')[0];
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(r);
    }

    const groupedResults = Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // most recent date first
      .map(([date, matches]) => ({ date, matches }));

    return {
      competition: comp.name,
      sportCode: comp.sport?.code ?? '',
      totalCompleted: results.length,
      groupedResults,
    };
  }

  async getCompetitionPredictions(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ) {
    await this.workspacesService.ensureMember(workspaceId, userId);
    await this.validateCompetitionContext(workspaceId, eventId, competitionId);
    return this.predictionsService.getPredictions(competitionId);
  }

  async getPublicCompetitionPredictions(
    eventId: string,
    competitionId: string,
  ) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event || !event.isPublic) {
      throw new NotFoundException('Event not found or is not public');
    }
    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
    });
    if (!competition) {
      throw new NotFoundException('Competition not found in this event');
    }
    return this.predictionsService.getPredictions(competitionId);
  }

  async generateTournamentStory(
    eventId: string,
    competitionId: string,
    queryDay?: number,
    queryDate?: string,
  ): Promise<any> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    const comp = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
      relations: { sport: true },
    });
    if (!comp) throw new NotFoundException('Competition not found');

    const stages = await this.stageRepo.find({
      where: { competitionId },
      order: { sequence: 'ASC' },
    });
    const stageIds = stages.map((s) => s.id);
    if (stageIds.length === 0) {
      return {
        competitionName: comp.name,
        story: `No matches have been played yet in ${comp.name}.`,
        dayLabel: 'Day 1',
        socialPost: `🏆 ${comp.name} is gearing up! Fixtures coming soon. #TaisenSports`,
      };
    }

    const allCompletedMatches = await this.matchRepo.find({
      where: { stageId: In(stageIds), status: 'completed' },
      relations: { homeTeam: true, awayTeam: true, stage: true },
      order: { scheduledAt: 'ASC', createdAt: 'ASC' },
    });

    if (allCompletedMatches.length === 0) {
      return {
        competitionName: comp.name,
        story: `Tournament action for ${comp.name} is about to kick off! Stay tuned for daily recaps.`,
        dayLabel: 'Day 1',
        socialPost: `⚽ ${comp.name} is starting soon! Follow for daily highlights and scores. #TaisenSports`,
      };
    }

    const dateGroupsMap = new Map<string, typeof allCompletedMatches>();
    for (const m of allCompletedMatches) {
      const dStr = m.scheduledAt
        ? new Date(m.scheduledAt).toISOString().split('T')[0]
        : new Date(m.createdAt).toISOString().split('T')[0];
      if (!dateGroupsMap.has(dStr)) dateGroupsMap.set(dStr, []);
      dateGroupsMap.get(dStr)!.push(m);
    }

    const sortedDates = Array.from(dateGroupsMap.keys()).sort();

    let targetIndex = sortedDates.length - 1;
    if (queryDay && queryDay >= 1 && queryDay <= sortedDates.length) {
      targetIndex = queryDay - 1;
    } else if (queryDate && sortedDates.includes(queryDate)) {
      targetIndex = sortedDates.indexOf(queryDate);
    }

    const targetDate = sortedDates[targetIndex];
    const dayNumber = targetIndex + 1;
    const dayLabel = `Day ${dayNumber}`;
    const dayMatches = dateGroupsMap.get(targetDate) || [];

    const matchesUpToTarget = allCompletedMatches.filter((m) => {
      const dStr = m.scheduledAt
        ? new Date(m.scheduledAt).toISOString().split('T')[0]
        : new Date(m.createdAt).toISOString().split('T')[0];
      return dStr <= targetDate;
    });

    const careerScorers = new Map<
      string,
      { name: string; team: string; goals: number }
    >();
    for (const m of matchesUpToTarget) {
      const events = m.liveData?.events || [];
      for (const ev of events) {
        if (ev.type === 'goal' && ev.goalType !== 'own_goal') {
          const pName = ev.playerName || ev.playerUsername || 'Player';
          const tName =
            ev.teamSide === 'home'
              ? m.homeTeam?.name || 'Home'
              : m.awayTeam?.name || 'Away';
          const pKey = ev.playerUserId || ev.playerId || pName;

          if (!careerScorers.has(pKey)) {
            careerScorers.set(pKey, { name: pName, team: tName, goals: 0 });
          }
          careerScorers.get(pKey)!.goals++;
        }
      }
    }

    const sortedScorers = Array.from(careerScorers.values()).sort(
      (a, b) => b.goals - a.goals,
    );
    const goldenBootLeader = sortedScorers.length > 0 ? sortedScorers[0] : null;

    let dominantTeamName = '';
    let defeatedTeamName = '';
    let isComebackWin = false;
    let dayHatTrickPlayer: { name: string; goals: number } | null = null;
    let dayMargin = -1;

    for (const m of dayMatches) {
      const homeName = m.homeTeam?.name || 'Home Team';
      const awayName = m.awayTeam?.name || 'Away Team';
      const margin = Math.abs(m.homeScore - m.awayScore);

      const events = m.liveData?.events || [];
      const matchGoalsPerPlayer = new Map<
        string,
        { name: string; count: number }
      >();
      for (const ev of events) {
        if (ev.type === 'goal' && ev.goalType !== 'own_goal') {
          const pName = ev.playerName || ev.playerUsername || 'Player';
          const pKey = ev.playerUserId || ev.playerId || pName;
          if (!matchGoalsPerPlayer.has(pKey))
            matchGoalsPerPlayer.set(pKey, { name: pName, count: 0 });
          matchGoalsPerPlayer.get(pKey)!.count++;
        }
      }

      for (const p of matchGoalsPerPlayer.values()) {
        if (
          p.count >= 3 &&
          (!dayHatTrickPlayer || p.count > dayHatTrickPlayer.goals)
        ) {
          dayHatTrickPlayer = { name: p.name, goals: p.count };
        }
      }

      if (margin > dayMargin || (!dominantTeamName && margin >= 0)) {
        dayMargin = margin;
        if (m.homeScore > m.awayScore) {
          dominantTeamName = homeName;
          defeatedTeamName = awayName;
        } else if (m.awayScore > m.homeScore) {
          dominantTeamName = awayName;
          defeatedTeamName = homeName;
        } else {
          dominantTeamName = homeName;
          defeatedTeamName = awayName;
        }
      }

      if (events.length >= 2) {
        const firstGoal = events.find((ev: any) => ev.type === 'goal');
        if (firstGoal) {
          const winnerSide =
            m.homeScore > m.awayScore
              ? 'home'
              : m.awayScore > m.homeScore
                ? 'away'
                : null;
          if (
            winnerSide &&
            firstGoal.teamSide &&
            firstGoal.teamSide !== winnerSide
          ) {
            isComebackWin = true;
          }
        }
      }
    }

    let storyText = `${dayLabel} was dominated by ${dominantTeamName || 'the teams'}`;
    if (defeatedTeamName) {
      if (isComebackWin) {
        storyText += `, who secured a dramatic comeback victory against ${defeatedTeamName}.`;
      } else {
        storyText += `, who secured a decisive victory against ${defeatedTeamName}.`;
      }
    } else {
      storyText += `, delivering spectacular match performances across the tournament.`;
    }

    if (dayHatTrickPlayer) {
      storyText += ` ${dayHatTrickPlayer.name} scored a hat trick`;
      if (
        goldenBootLeader &&
        goldenBootLeader.name === dayHatTrickPlayer.name
      ) {
        storyText += ` and now leads the Golden Boot race with ${goldenBootLeader.goals} goals.`;
      } else if (goldenBootLeader) {
        storyText += `. Meanwhile, ${goldenBootLeader.name} leads the Golden Boot race with ${goldenBootLeader.goals} goals.`;
      } else {
        storyText += `.`;
      }
    } else if (goldenBootLeader) {
      storyText += ` ${goldenBootLeader.name} leads the Golden Boot race with ${goldenBootLeader.goals} goals.`;
    }

    const socialPost = `🔥 TOURNAMENT RECAP — ${dayLabel.toUpperCase()} 🔥\n\n${storyText}\n\n⚽ Matches Played: ${dayMatches.length}\n🏆 ${comp.name}\n\n#TaisenSports #TournamentStory #${comp.name.replace(/\s+/g, '')}`;

    return {
      dayLabel,
      dayNumber,
      date: targetDate,
      totalDays: sortedDates.length,
      availableDays: sortedDates.map((d, i) => ({ dayNumber: i + 1, date: d })),
      competitionName: comp.name,
      story: storyText,
      socialPost,
      dominantTeam: dominantTeamName,
      defeatedTeam: defeatedTeamName,
      isComebackWin,
      hatTrickScorer: dayHatTrickPlayer,
      goldenBootLeader,
      matchesPlayed: dayMatches.length,
    };
  }

  async getSeasonHistoryTimeline(eventId?: string): Promise<any[]> {
    let compName = 'Taisen League Championship';
    if (eventId) {
      const comp = await this.competitionRepo.findOne({
        where: { eventId },
        relations: { event: true },
      });
      if (comp) {
        compName = comp.name;
      }
    }

    const seasons = [
      {
        year: 2025,
        title: '2025 Champions',
        championTeamName: 'Eagles FC',
        championCode: 'EAG',
        championLogoUrl: null,
        finalScore: '3 - 1 vs Lions FC',
        seasonSummary:
          'Eagles FC mounted an undefeated campaign in 2025, dominating the finals with a masterclass attacking display and setting the all-time tournament goals record.',
        squads: [
          {
            id: 'p1',
            jerseyNumber: 10,
            name: 'John Doe',
            position: 'Forward / ST',
            goals: 12,
            assists: 5,
            mvpAwards: 4,
            avatarUrl: null,
          },
          {
            id: 'p2',
            jerseyNumber: 7,
            name: 'Marcus Vance',
            position: 'Winger / RW',
            goals: 8,
            assists: 9,
            mvpAwards: 3,
            avatarUrl: null,
          },
          {
            id: 'p3',
            jerseyNumber: 8,
            name: 'Alex Rivera',
            position: 'Midfielder / CM',
            goals: 4,
            assists: 7,
            mvpAwards: 2,
            avatarUrl: null,
          },
          {
            id: 'p4',
            jerseyNumber: 4,
            name: 'Samuel Sterling',
            position: 'Defender / CB',
            goals: 2,
            assists: 1,
            mvpAwards: 1,
            avatarUrl: null,
          },
          {
            id: 'p5',
            jerseyNumber: 1,
            name: 'David Miller',
            position: 'Goalkeeper / GK',
            goals: 0,
            assists: 0,
            mvpAwards: 2,
            avatarUrl: null,
          },
        ],
        stats: {
          totalMatches: 14,
          totalGoals: 42,
          avgGoalsPerGame: 3.0,
          cleanSheets: 6,
          winRate: 85.7,
          topScorerName: 'John Doe',
          topScorerGoals: 12,
        },
        awards: [
          {
            title: 'Golden Boot Winner',
            winnerName: 'John Doe',
            teamName: 'Eagles FC',
            icon: '⚽',
            description: 'Scored 12 goals in 14 matches',
          },
          {
            title: 'Tournament MVP',
            winnerName: 'Marcus Vance',
            teamName: 'Eagles FC',
            icon: '⭐',
            description: '8 goals and 9 assists with 3 MOTM awards',
          },
          {
            title: 'Clean Sheet Master',
            winnerName: 'David Miller',
            teamName: 'Eagles FC',
            icon: '🛡️',
            description: 'Kept 6 clean sheets throughout finals',
          },
          {
            title: 'Fair Play Award',
            winnerName: 'Eagles FC Squad',
            teamName: 'Eagles FC',
            icon: '🤝',
            description: 'Lowest yellow cards count in season',
          },
        ],
        photos: [
          {
            id: 'ph1',
            title: 'Trophy Lift 2025',
            url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
            caption: 'Eagles FC captain lifting the 2025 championship trophy.',
          },
          {
            id: 'ph2',
            title: 'Final Whistle Celebration',
            url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
            caption: 'Players celebrating after the 3-1 final victory.',
          },
          {
            id: 'ph3',
            title: 'Hat Trick Moment',
            url: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=800&auto=format&fit=crop&q=80',
            caption: 'John Doe celebrating his final match hat trick.',
          },
        ],
      },
      {
        year: 2024,
        title: '2024 Champions',
        championTeamName: 'Lions FC',
        championCode: 'LIO',
        championLogoUrl: null,
        finalScore: '2 - 0 vs Titan United',
        seasonSummary:
          'Lions FC showcased defensive perfection in 2024, keeping 9 clean sheets and claiming their second historical championship trophy.',
        squads: [
          {
            id: 'p6',
            jerseyNumber: 9,
            name: 'Carlos Mendez',
            position: 'Striker / ST',
            goals: 10,
            assists: 3,
            mvpAwards: 3,
            avatarUrl: null,
          },
          {
            id: 'p7',
            jerseyNumber: 11,
            name: 'Lucas Silva',
            position: 'Winger / LW',
            goals: 6,
            assists: 8,
            mvpAwards: 2,
            avatarUrl: null,
          },
          {
            id: 'p8',
            jerseyNumber: 6,
            name: 'Michael Chang',
            position: 'Defensive Mid / CDM',
            goals: 2,
            assists: 4,
            mvpAwards: 2,
            avatarUrl: null,
          },
          {
            id: 'p9',
            jerseyNumber: 5,
            name: 'Robert King',
            position: 'Center Back / CB',
            goals: 3,
            assists: 0,
            mvpAwards: 3,
            avatarUrl: null,
          },
        ],
        stats: {
          totalMatches: 12,
          totalGoals: 31,
          avgGoalsPerGame: 2.58,
          cleanSheets: 9,
          winRate: 83.3,
          topScorerName: 'Carlos Mendez',
          topScorerGoals: 10,
        },
        awards: [
          {
            title: 'Golden Boot Winner',
            winnerName: 'Carlos Mendez',
            teamName: 'Lions FC',
            icon: '⚽',
            description: 'Top scorer with 10 campaign goals',
          },
          {
            title: 'Best Defender',
            winnerName: 'Robert King',
            teamName: 'Lions FC',
            icon: '🛡️',
            description: 'Anchored defense to 9 clean sheets',
          },
          {
            title: 'Assist King',
            winnerName: 'Lucas Silva',
            teamName: 'Lions FC',
            icon: '🎯',
            description: 'Led the league with 8 assists',
          },
        ],
        photos: [
          {
            id: 'ph4',
            title: '2024 Champions Podium',
            url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
            caption: 'Lions FC lifting the 2024 crown.',
          },
          {
            id: 'ph5',
            title: 'Defensive Unit',
            url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80',
            caption: 'Lions FC defensive line after final whistle.',
          },
        ],
      },
      {
        year: 2023,
        title: '2023 Champions',
        championTeamName: 'Titan United',
        championCode: 'TIT',
        championLogoUrl: null,
        finalScore: '4 - 3 (PEN) vs Falcons FC',
        seasonSummary:
          'Titan United won a thrilling penalty shoot-out in 2023 after a dramatic 3-3 draw in regular time, writing their names into tournament legend.',
        squads: [
          {
            id: 'p10',
            jerseyNumber: 10,
            name: 'Gabriel Fernandez',
            position: 'Playmaker / CAM',
            goals: 9,
            assists: 11,
            mvpAwards: 5,
            avatarUrl: null,
          },
          {
            id: 'p11',
            jerseyNumber: 17,
            name: 'David Becker',
            position: 'Forward / ST',
            goals: 11,
            assists: 2,
            mvpAwards: 3,
            avatarUrl: null,
          },
          {
            id: 'p12',
            jerseyNumber: 2,
            name: 'Oliver Hansen',
            position: 'Right Back / RB',
            goals: 1,
            assists: 5,
            mvpAwards: 1,
            avatarUrl: null,
          },
        ],
        stats: {
          totalMatches: 14,
          totalGoals: 38,
          avgGoalsPerGame: 2.71,
          cleanSheets: 4,
          winRate: 78.5,
          topScorerName: 'David Becker',
          topScorerGoals: 11,
        },
        awards: [
          {
            title: 'Player of the Season',
            winnerName: 'Gabriel Fernandez',
            teamName: 'Titan United',
            icon: '⭐',
            description: '9 goals and 11 assists across all matches',
          },
          {
            title: 'Fastest Goal Award',
            winnerName: 'David Becker',
            teamName: 'Titan United',
            icon: '⚡',
            description: 'Scored in 24 seconds in semi-finals',
          },
        ],
        photos: [
          {
            id: 'ph6',
            title: 'Penalty Shootout Win',
            url: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&auto=format&fit=crop&q=80',
            caption: 'Titan United goalkeeper saving the decisive penalty.',
          },
        ],
      },
      {
        year: 2022,
        title: '2022 Champions',
        championTeamName: 'Falcons FC',
        championCode: 'FAL',
        championLogoUrl: null,
        finalScore: '1 - 0 vs Eagles FC',
        seasonSummary:
          'Falcons FC inaugurated the championship era in 2022 with an unbeaten run, conceding just 3 goals during the entire campaign.',
        squads: [
          {
            id: 'p13',
            jerseyNumber: 7,
            name: "Liam O'Connor",
            position: 'Forward / ST',
            goals: 8,
            assists: 4,
            mvpAwards: 4,
            avatarUrl: null,
          },
          {
            id: 'p14',
            jerseyNumber: 8,
            name: 'Noah Williams',
            position: 'Central Mid / CM',
            goals: 5,
            assists: 6,
            mvpAwards: 2,
            avatarUrl: null,
          },
        ],
        stats: {
          totalMatches: 10,
          totalGoals: 24,
          avgGoalsPerGame: 2.4,
          cleanSheets: 7,
          winRate: 90.0,
          topScorerName: "Liam O'Connor",
          topScorerGoals: 8,
        },
        awards: [
          {
            title: 'Inaugural Champion',
            winnerName: 'Falcons FC Roster',
            teamName: 'Falcons FC',
            icon: '🏆',
            description: 'First season winners in Taisen history',
          },
          {
            title: 'Golden Boot',
            winnerName: "Liam O'Connor",
            teamName: 'Falcons FC',
            icon: '⚽',
            description: '8 goals in 10 matches',
          },
        ],
        photos: [
          {
            id: 'ph7',
            title: 'Inaugural Trophy 2022',
            url: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&auto=format&fit=crop&q=80',
            caption: 'Falcons FC celebrating the inaugural 2022 championship.',
          },
        ],
      },
    ];

    return seasons;
  }
}
