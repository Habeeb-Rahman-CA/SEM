import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Team } from '../../workspaces/entities/team.entity';
import { Player } from '../../workspaces/entities/player.entity';
import { Competition } from '../../workspaces/entities/competition.entity';
import { CompetitionStage } from '../../workspaces/entities/competition-stage.entity';
import { Match } from '../../workspaces/entities/match.entity';
import { MatchPlayer } from '../../workspaces/entities/match-player.entity';
import { Event } from '../../workspaces/entities/event.entity';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { NotificationType } from '../../workspaces/entities/notification.entity';
import { CreateMatchDto } from '../dto/create-match.dto';
import { UpdateMatchDto } from '../dto/update-match.dto';
import { StatisticsRatingsService } from './statistics-ratings.service';
import { BracketAdvancementService } from './bracket-advancement.service';
import { SportEngineRegistry } from '../sports/sport-engine.registry';
import { EventsGateway } from '../../workspaces/events.gateway';

@Injectable()
export class MatchLineupService {
  constructor(
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(CompetitionStage)
    private readonly stageRepo: Repository<CompetitionStage>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayerRepo: Repository<MatchPlayer>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly workspacesService: WorkspacesService,
    private readonly statisticsRatingsService: StatisticsRatingsService,
    private readonly bracketAdvancementService: BracketAdvancementService,
    private readonly sportEngineRegistry: SportEngineRegistry,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    dto: CreateMatchDto,
    userId: string,
  ): Promise<Match> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );

    const comp = await this.competitionRepo.findOne({
      where: { id: competitionId },
      relations: { sport: true },
    });
    if (!comp) {
      throw new NotFoundException(`Competition "${competitionId}" not found`);
    }

    const sportCode = comp.sport?.code ?? 'football';
    const engine = this.sportEngineRegistry.getEngine(sportCode);
    const config = engine.getDefaultConfig(dto.config);
    const liveData = engine.getInitialLiveData(
      dto.homeTeamId,
      dto.awayTeamId,
      config,
    );

    const match = this.matchRepo.create({
      stageId,
      homeTeamId: dto.homeTeamId,
      awayTeamId: dto.awayTeamId,
      venueId: dto.venueId ?? null,
      homeScore: 0,
      awayScore: 0,
      status: 'scheduled',
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      config,
      liveData,
    });

    const saved = await this.matchRepo.save(match);
    const populated = (await this.matchRepo.findOne({
      where: { id: saved.id },
      relations: { homeTeam: true, awayTeam: true, venue: true },
    }))!;

    if (populated.homeTeamId && populated.awayTeamId) {
      const homePlayers = await this.workspacesService.getTeamPlayerUserIds(
        populated.homeTeamId,
      );
      const awayPlayers = await this.workspacesService.getTeamPlayerUserIds(
        populated.awayTeamId,
      );
      const allPlayers = [...homePlayers, ...awayPlayers];
      await this.workspacesService.sendNotificationToMany(
        allPlayers,
        NotificationType.MATCH_SCHEDULED,
        `New match scheduled: ${populated.homeTeam?.name ?? 'Home'} vs ${populated.awayTeam?.name ?? 'Away'} in ${comp.name}.`,
        workspaceId,
        {
          matchId: populated.id,
          competitionId,
          competitionName: comp.name,
          homeTeamName: populated.homeTeam?.name,
          awayTeamName: populated.awayTeam?.name,
        },
      );
    }

    return populated;
  }

  async removeMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );
    const match = await this.matchRepo.findOne({
      where: { id: matchId, stageId },
    });
    if (!match) {
      throw new NotFoundException(`Match "${matchId}" not found in stage`);
    }
    match.deletedAt = new Date();
    await this.matchRepo.save(match);
  }

  async getMatchLineup(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    userId: string,
  ): Promise<MatchPlayer[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const match = await this.matchRepo.findOne({
      where: { id: matchId, stageId },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return this.matchPlayerRepo.find({
      where: { matchId },
      relations: {
        player: {
          user: true,
        },
        team: true,
      },
    });
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
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'match.score',
    );
    await this.validateStageContext(
      workspaceId,
      eventId,
      competitionId,
      stageId,
    );

    const match = await this.matchRepo.findOne({
      where: { id: matchId, stageId },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Verify that all teams and players in the lineup belong to this workspace
    const teamIds = [...new Set(lineups.map((l) => l.teamId))];
    const playerIds = [...new Set(lineups.map((l) => l.playerId))];

    if (teamIds.length > 0) {
      const teamsCount = await this.eventRepo.manager.count(Team, {
        where: { id: In(teamIds), workspaceId },
      });
      if (teamsCount !== teamIds.length) {
        throw new ForbiddenException(
          'One or more teams do not belong to this workspace',
        );
      }
    }

    if (playerIds.length > 0) {
      const playersCount = await this.eventRepo.manager.count(Player, {
        where: { id: In(playerIds), workspaceId },
      });
      if (playersCount !== playerIds.length) {
        throw new ForbiddenException(
          'One or more players do not belong to this workspace',
        );
      }
    }

    const existing = await this.matchPlayerRepo.find({
      where: { matchId },
    });
    const existingMap = new Map<string, MatchPlayer>();
    for (const entry of existing) {
      existingMap.set(entry.playerId, entry);
    }

    const toSave: MatchPlayer[] = [];
    const processedPlayerIds = new Set<string>();

    for (const item of lineups) {
      processedPlayerIds.add(item.playerId);
      let entry = existingMap.get(item.playerId);
      const isGK = item.isGoalkeeper ?? false;
      if (entry) {
        entry.isPlaying = item.isPlaying;
        entry.teamId = item.teamId;
        entry.isGoalkeeper = isGK;
      } else {
        entry = this.matchPlayerRepo.create({
          matchId,
          playerId: item.playerId,
          teamId: item.teamId,
          isPlaying: item.isPlaying,
          isGoalkeeper: isGK,
        });
      }
      toSave.push(entry);
    }

    await this.matchPlayerRepo.save(toSave);

    const toDelete: MatchPlayer[] = [];
    for (const entry of existing) {
      if (!processedPlayerIds.has(entry.playerId)) {
        toDelete.push(entry);
      }
    }
    if (toDelete.length > 0) {
      toDelete.forEach((mp) => (mp.deletedAt = new Date()));
      await this.matchPlayerRepo.save(toDelete);
    }

    const result = await this.matchPlayerRepo.find({
      where: { matchId },
      relations: {
        player: {
          user: true,
        },
        team: true,
      },
    });

    const matchDetails = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: { homeTeam: true, awayTeam: true },
    });
    const selectedPlayers = result.filter((mp) => mp.isPlaying);
    for (const sp of selectedPlayers) {
      if (sp.player?.userId) {
        await this.workspacesService.sendNotification(
          sp.player.userId,
          NotificationType.MATCH_LINEUP_SET,
          `You've been selected in the lineup for ${matchDetails?.homeTeam?.name ?? 'Home'} vs ${matchDetails?.awayTeam?.name ?? 'Away'}.`,
          workspaceId,
          {
            matchId,
            homeTeamName: matchDetails?.homeTeam?.name,
            awayTeamName: matchDetails?.awayTeam?.name,
          },
        );
      }
    }

    return result;
  }

  async validateStageContext(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
  ): Promise<CompetitionStage> {
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

  async getMatches(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    userId: string,
  ): Promise<Match[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const stage = await this.validateStageContext(
      workspaceId,
      eventId,
      competitionId,
      stageId,
    );

    try {
      if (stage.type === 'knockout') {
        const stages = await this.stageRepo.find({
          where: { competitionId },
          order: { sequence: 'ASC', createdAt: 'ASC' },
        });
        const idx = stages.findIndex((s) => s.id === stageId);
        if (idx > 0) {
          const prevStage = stages[idx - 1];
          await this.bracketAdvancementService.advanceTeamsBetweenStages(
            prevStage,
          );
        }
      } else if (stage.type === 'group_knockout') {
        await this.bracketAdvancementService.advanceGroupStageWinners(stage);
      }
    } catch (err) {
      console.error('Self-healing stage advancement failed:', err);
    }

    const matches = await this.matchRepo.find({
      where: { stageId },
      relations: { homeTeam: true, awayTeam: true, venue: true },
      order: { createdAt: 'ASC' },
    });

    const completedMatches = matches.filter((m) => m.status === 'completed');
    if (completedMatches.length > 0) {
      const matchIds = completedMatches.map((m) => m.id);
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
        if (m.status !== 'completed') continue;
        const players = playersByMatch.get(m.id) ?? [];
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

    const statusWeight = {
      live: 1,
      scheduled: 2,
      completed: 3,
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

  async updateMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    dto: UpdateMatchDto,
    userId: string,
  ): Promise<Match> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'match.score',
    );
    const stage = await this.validateStageContext(
      workspaceId,
      eventId,
      competitionId,
      stageId,
    );

    const match = await this.matchRepo.findOne({
      where: { id: matchId, stageId },
      relations: { homeTeam: true, awayTeam: true },
    });
    if (!match) {
      throw new NotFoundException(`Match "${matchId}" not found in this stage`);
    }

    const oldStatus = match.status;
    const oldScheduledAt = match.scheduledAt;
    const oldVenueId = match.venueId;

    if (dto.homeScore !== undefined) match.homeScore = dto.homeScore;
    if (dto.awayScore !== undefined) match.awayScore = dto.awayScore;
    if (dto.status !== undefined) match.status = dto.status;
    if (dto.venueId !== undefined) match.venueId = dto.venueId;
    if (dto.scheduledAt !== undefined) {
      match.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    }
    if (dto.config !== undefined) {
      match.config = { ...match.config, ...dto.config };
    }
    if (dto.liveData !== undefined) {
      match.liveData = dto.liveData;
    }

    const saved = await this.matchRepo.save(match);

    const populated = (await this.matchRepo.findOne({
      where: { id: saved.id },
      relations: { homeTeam: true, awayTeam: true, venue: true },
    }))!;

    const homePlayers = populated.homeTeamId
      ? await this.workspacesService.getTeamPlayerUserIds(populated.homeTeamId)
      : [];
    const awayPlayers = populated.awayTeamId
      ? await this.workspacesService.getTeamPlayerUserIds(populated.awayTeamId)
      : [];
    const allPlayers = [...homePlayers, ...awayPlayers];

    if (dto.status !== undefined && dto.status !== oldStatus) {
      if (dto.status === 'live') {
        await this.workspacesService.sendNotificationToMany(
          allPlayers,
          NotificationType.MATCH_STARTED,
          `Match has started: ${populated.homeTeam?.name ?? 'Home'} vs ${populated.awayTeam?.name ?? 'Away'}.`,
          workspaceId,
          {
            matchId: populated.id,
            homeTeamName: populated.homeTeam?.name,
            awayTeamName: populated.awayTeam?.name,
            eventId: eventId,
          },
        );

        await this.addEventAnnouncement(
          eventId,
          `Match Live: ${populated.homeTeam?.name ?? 'Home'} vs ${populated.awayTeam?.name ?? 'Away'}`,
          `The match between ${populated.homeTeam?.name ?? 'Home'} and ${populated.awayTeam?.name ?? 'Away'} has officially started. Follow live now!`,
        );
      } else if (dto.status === 'completed') {
        await this.workspacesService.sendNotificationToMany(
          allPlayers,
          NotificationType.MATCH_COMPLETED,
          `Match completed: ${populated.homeTeam?.name ?? 'Home'} (${populated.homeScore}) vs ${populated.awayTeam?.name ?? 'Away'} (${populated.awayScore}).`,
          workspaceId,
          {
            matchId: populated.id,
            homeScore: populated.homeScore,
            awayScore: populated.awayScore,
            homeTeamName: populated.homeTeam?.name,
            awayTeamName: populated.awayTeam?.name,
            eventId: eventId,
          },
        );

        await this.addEventAnnouncement(
          eventId,
          `Match Result: ${populated.homeTeam?.name ?? 'Home'} ${populated.homeScore} - ${populated.awayScore} ${populated.awayTeam?.name ?? 'Away'}`,
          `The match has finished. Final score: ${populated.homeTeam?.name ?? 'Home'} ${populated.homeScore}, ${populated.awayTeam?.name ?? 'Away'} ${populated.awayScore}.`,
        );

        await this.statisticsRatingsService.autoRateMatchPlayers(saved);

        if (stage.type === 'knockout') {
          await this.bracketAdvancementService.advanceKnockoutWinner(
            saved,
            stage,
          );
        } else if (stage.type === 'group_knockout') {
          await this.bracketAdvancementService.advanceGroupStageWinners(stage);
        }

        await this.bracketAdvancementService.checkAndAutoCompleteCompetition(
          competitionId,
        );
      }
    }

    if (dto.scheduledAt !== undefined && oldScheduledAt && new Date(dto.scheduledAt).getTime() !== new Date(oldScheduledAt).getTime()) {
      await this.workspacesService.sendNotificationToMany(
        allPlayers,
        NotificationType.MATCH_DELAYED,
        `Match rescheduled/delayed: ${populated.homeTeam?.name ?? 'Home'} vs ${populated.awayTeam?.name ?? 'Away'} is now scheduled for ${populated.scheduledAt ? populated.scheduledAt.toLocaleString() : 'TBD'}.`,
        workspaceId,
        {
          matchId: populated.id,
          homeTeamName: populated.homeTeam?.name,
          awayTeamName: populated.awayTeam?.name,
          scheduledAt: populated.scheduledAt ? populated.scheduledAt.toISOString() : null,
          oldScheduledAt: oldScheduledAt.toISOString(),
          eventId: eventId,
        },
      );

      await this.addEventAnnouncement(
        eventId,
        `Match Delayed/Rescheduled: ${populated.homeTeam?.name ?? 'Home'} vs ${populated.awayTeam?.name ?? 'Away'}`,
        `The match schedule has been updated. New time: ${populated.scheduledAt ? populated.scheduledAt.toLocaleString() : 'TBD'}.`,
      );
    }

    if (dto.venueId !== undefined && oldVenueId && dto.venueId !== oldVenueId) {
      await this.workspacesService.sendNotificationToMany(
        allPlayers,
        NotificationType.MATCH_VENUE_CHANGED,
        `Match venue changed: ${populated.homeTeam?.name ?? 'Home'} vs ${populated.awayTeam?.name ?? 'Away'} will now be played at ${populated.venue?.name ?? 'Venue TBD'}.`,
        workspaceId,
        {
          matchId: populated.id,
          homeTeamName: populated.homeTeam?.name,
          awayTeamName: populated.awayTeam?.name,
          venueName: populated.venue?.name,
          oldVenueId,
          eventId: eventId,
        },
      );

      await this.addEventAnnouncement(
        eventId,
        `Venue Change: ${populated.homeTeam?.name ?? 'Home'} vs ${populated.awayTeam?.name ?? 'Away'}`,
        `The venue for this match has been updated. The match will now be played at ${populated.venue?.name ?? 'Venue TBD'}.`,
      );
    }

    this.eventsGateway.sendMatchUpdate(populated.id, workspaceId, populated);

    return populated;
  }

  private async addEventAnnouncement(
    eventId: string,
    title: string,
    content: string,
  ): Promise<void> {
    try {
      const event = await this.eventRepo.findOne({ where: { id: eventId } });
      if (event) {
        const announcements = event.announcements || [];
        announcements.unshift({
          id: Math.random().toString(36).substring(2, 9),
          title,
          content,
          createdAt: new Date(),
        });
        event.announcements = announcements;
        await this.eventRepo.save(event);
      }
    } catch (err) {
      // Don't fail the match update if announcement fails
    }
  }
}
