import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Competition } from '../workspaces/entities/competition.entity';
import { CompetitionStage } from '../workspaces/entities/competition-stage.entity';
import { Match } from '../workspaces/entities/match.entity';
import { MatchPlayer } from '../workspaces/entities/match-player.entity';
import { CompetitionTeam } from '../workspaces/entities/competition-team.entity';
import { Sport } from '../workspaces/entities/sport.entity';
import { Event } from '../workspaces/entities/event.entity';
import { Team } from '../workspaces/entities/team.entity';
import { Player } from '../workspaces/entities/player.entity';
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
  ): Promise<{ stagesGenerated: number; matchesCreated: number }> {
    return this.fixturesGeneratorService.generateFixtures(
      workspaceId,
      eventId,
      competitionId,
      userId,
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
      throw new NotFoundException(`Stage "${stageId}" not found in competition`);
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
      throw new NotFoundException(`Stage "${stageId}" not found in competition`);
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
      stage.type === 'knockout' || stage.type === 'group_knockout' || stage.type === 'double_elimination';

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
}
