import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Event } from './entities/event.entity';
import { Team } from '../teams/entities/team.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { CompetitionStage } from '../competitions/entities/competition-stage.entity';
import { CompetitionTeam } from '../competitions/entities/competition-team.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { DuplicateEventDto } from './dto/duplicate-event.dto';
import { SearchEventDto } from './dto/search-event.dto';
import { SearchPublicEventsDto } from './dto/search-public-events.dto';
import { NotificationType } from '../workspaces/entities/notification.entity';
import { CompetitionsService } from '../competitions/competitions.service';
import { AttendanceForecastingService } from './services/attendance-forecasting.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    private readonly workspacesService: WorkspacesService,
    private readonly competitionsService: CompetitionsService,
    private readonly attendanceForecastingService: AttendanceForecastingService,
  ) {}

  async getEvents(
    workspaceId: string,
    userId: string,
    archived?: boolean,
  ): Promise<Event[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const whereClause: any = { workspaceId };
    if (archived !== undefined) {
      whereClause.isArchived = archived;
    } else {
      whereClause.isArchived = false;
    }
    return this.eventRepo.find({
      where: whereClause,
      relations: { teams: true },
      order: { name: 'ASC' },
    });
  }

  async createEvent(
    workspaceId: string,
    dto: CreateEventDto,
    userId: string,
  ): Promise<Event> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    let teams: Team[] = [];
    if (dto.teamIds && dto.teamIds.length > 0) {
      teams = await this.teamRepo.findBy({ id: In(dto.teamIds), workspaceId });
      if (teams.length !== dto.teamIds.length) {
        throw new BadRequestException(
          'Some teams were not found or do not belong to this workspace',
        );
      }
    }
    const event = this.eventRepo.create({
      name: dto.name,
      slug: await this.generateUniqueSlug(dto.name),
      description: dto.description ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      status: dto.status ?? 'upcoming',
      logoUrl: dto.logoUrl ?? null,
      workspaceId,
      teams,
      isPublic: dto.isPublic ?? false,
      gallery: dto.gallery ?? null,
      announcements: dto.announcements ?? null,
      sponsors: dto.sponsors ?? null,
      registrationStatus: dto.registrationStatus ?? 'open',
      venue: dto.venue ?? null,
      sport: dto.sport ?? null,
      organizers: dto.organizers ?? null,
      isArchived: dto.status === 'completed',
    });
    const saved = await this.eventRepo.save(event);

    // 4.1 — Notify workspace members of new event
    const memberIds = await this.workspacesService.getWorkspaceMemberUserIds(
      workspaceId,
      userId,
    );
    await this.workspacesService.sendNotificationToMany(
      memberIds,
      NotificationType.EVENT_CREATED,
      `New event "${saved.name}" has been created.`,
      workspaceId,
      { eventId: saved.id, eventName: saved.name },
    );

    return saved;
  }

  async updateEvent(
    workspaceId: string,
    eventId: string,
    dto: UpdateEventDto,
    userId: string,
  ): Promise<Event> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
      relations: { teams: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found in this workspace');
    }

    const oldStatus = event.status;

    if (dto.teamIds !== undefined) {
      if (dto.teamIds.length > 0) {
        event.teams = await this.teamRepo.findBy({
          id: In(dto.teamIds),
          workspaceId,
        });
        if (event.teams.length !== dto.teamIds.length) {
          throw new BadRequestException(
            'Some teams were not found or do not belong to this workspace',
          );
        }
      } else {
        event.teams = [];
      }
    }

    if (dto.name !== undefined && dto.name !== event.name) {
      event.name = dto.name;
      event.slug = await this.generateUniqueSlug(dto.name);
    }

    Object.assign(event, {
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.startDate !== undefined && {
        startDate: dto.startDate ? new Date(dto.startDate) : null,
      }),
      ...(dto.endDate !== undefined && {
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      }),
      ...(dto.status !== undefined && {
        status: dto.status,
        ...(dto.status === 'completed' && { isArchived: true }),
      }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      ...(dto.gallery !== undefined && { gallery: dto.gallery }),
      ...(dto.announcements !== undefined && {
        announcements: dto.announcements,
      }),
      ...(dto.sponsors !== undefined && { sponsors: dto.sponsors }),
      ...(dto.registrationStatus !== undefined && {
        registrationStatus: dto.registrationStatus,
      }),
      ...(dto.venue !== undefined && { venue: dto.venue }),
      ...(dto.sport !== undefined && { sport: dto.sport }),
      ...(dto.organizers !== undefined && { organizers: dto.organizers }),
    });

    const saved = await this.eventRepo.save(event);

    // 4.2 / 4.3 / 4.4 / 4.5 / 4.6 — Notify about status changes
    if (dto.status !== undefined && dto.status !== oldStatus) {
      const memberIds = await this.workspacesService.getWorkspaceMemberUserIds(
        workspaceId,
        userId,
      );
      if (dto.status === 'ongoing') {
        await this.workspacesService.sendNotificationToMany(
          memberIds,
          NotificationType.EVENT_STARTED,
          `Event "${saved.name}" has started!`,
          workspaceId,
          { eventId: saved.id, eventName: saved.name },
        );
      } else if (dto.status === 'cancelled') {
        await this.workspacesService.sendNotificationToMany(
          memberIds,
          NotificationType.EVENT_CANCELLED,
          `Event "${saved.name}" has been cancelled.`,
          workspaceId,
          { eventId: saved.id, eventName: saved.name },
        );
      } else if (dto.status === 'completed') {
        await this.workspacesService.sendNotificationToMany(
          memberIds,
          NotificationType.EVENT_COMPLETED,
          `Event "${saved.name}" has been completed!`,
          workspaceId,
          { eventId: saved.id, eventName: saved.name },
        );

        // 4.5 & 4.6 — Determine Event Champions
        try {
          const standings = await this.getEventStandings(
            workspaceId,
            eventId,
            userId,
          );
          if (standings && standings.length > 0) {
            const champion = standings[0];
            // Announcement to all
            await this.workspacesService.sendNotificationToMany(
              memberIds,
              NotificationType.EVENT_CHAMPION_ANNOUNCEMENT,
              `🏆 ${champion.teamName} has won the ${saved.name} event with ${champion.points} points!`,
              workspaceId,
              {
                eventId: saved.id,
                eventName: saved.name,
                championTeamId: champion.teamId,
                championTeamName: champion.teamName,
                points: champion.points,
              },
            );
            // Notify winning team players
            const winningPlayers =
              await this.workspacesService.getTeamPlayerUserIds(
                champion.teamId,
              );
            await this.workspacesService.sendNotificationToMany(
              winningPlayers,
              NotificationType.EVENT_CHAMPION,
              `🏆 Congratulations! Your team ${champion.teamName} is the overall champion of ${saved.name}!`,
              workspaceId,
              {
                eventId: saved.id,
                eventName: saved.name,
                points: champion.points,
              },
            );
          }
        } catch (e) {
          // Ignore error silently to prevent blocking the event completion save
        }
      }
    }

    return saved;
  }

  async removeEvent(
    workspaceId: string,
    eventId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
    });
    if (!event) {
      throw new NotFoundException('Event not found in this workspace');
    }
    event.deletedAt = new Date();
    await this.eventRepo.save(event);
  }

  async archiveEvent(
    workspaceId: string,
    eventId: string,
    userId: string,
  ): Promise<Event> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
    });
    if (!event) {
      throw new NotFoundException('Event not found in this workspace');
    }
    event.isArchived = true;
    return this.eventRepo.save(event);
  }

  async restoreEvent(
    workspaceId: string,
    eventId: string,
    userId: string,
  ): Promise<Event> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
    });
    if (!event) {
      throw new NotFoundException('Event not found in this workspace');
    }
    event.isArchived = false;
    return this.eventRepo.save(event);
  }

  async getEventStandings(
    workspaceId: string,
    eventId: string,
    userId: string,
  ): Promise<any> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
      relations: { teams: true, competitions: { stages: true } },
    });
    if (!event) {
      throw new NotFoundException(
        `Event "${eventId}" not found in this workspace`,
      );
    }

    const teams = event.teams || [];
    const competitions = event.competitions || [];
    const completedCompetitions = competitions.filter(
      (c) => c.status === 'completed',
    );

    const teamPointsMap = new Map<
      string,
      { points: number; breakdown: any[] }
    >();

    for (const team of teams) {
      teamPointsMap.set(team.id, { points: 0, breakdown: [] });
    }

    for (const comp of completedCompetitions) {
      const rankings = await this.competitionsService.getCompetitionRankings(
        comp.id,
      );
      const pointsConfig = comp.pointsConfig || [];

      for (const team of teams) {
        const pos = rankings.get(team.id) || null;
        let pointsEarned = 0;
        if (pos !== null) {
          const configEntry = pointsConfig.find(
            (entry) => entry.position === pos,
          );
          if (configEntry) {
            pointsEarned = configEntry.points;
          }
        }

        const teamData = teamPointsMap.get(team.id);
        if (teamData) {
          teamData.points += pointsEarned;
          teamData.breakdown.push({
            competitionId: comp.id,
            competitionName: comp.name,
            position: pos,
            points: pointsEarned,
          });
        }
      }
    }

    return teams
      .map((team) => {
        const data = teamPointsMap.get(team.id) || { points: 0, breakdown: [] };
        return {
          teamId: team.id,
          teamName: team.name,
          teamLogoUrl: team.logoUrl || null,
          points: data.points,
          breakdown: data.breakdown,
        };
      })
      .sort((a, b) => b.points - a.points);
  }

  async searchPublicEvents(
    dto: SearchPublicEventsDto,
  ): Promise<{ items: Event[]; total: number; limit: number; offset: number }> {
    const limit = dto.limit ?? 24;
    const offset = dto.offset ?? 0;

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.competitions', 'competition')
      .leftJoinAndSelect('event.teams', 'team')
      .where('event.isPublic = :isPublic', { isPublic: true })
      .andWhere('event.deletedAt IS NULL');

    if (dto.status) {
      qb.andWhere('event.status = :status', { status: dto.status });
    }

    if (dto.query) {
      qb.andWhere(
        '(LOWER(event.name) LIKE LOWER(:query) OR LOWER(event.description) LIKE LOWER(:query) OR LOWER(event.venue) LIKE LOWER(:query) OR LOWER(event.organizers) LIKE LOWER(:query))',
        { query: `%${dto.query}%` },
      );
    }

    if (dto.sport) {
      qb.andWhere('LOWER(event.sport) = LOWER(:sport)', { sport: dto.sport });
    }

    if (dto.venue) {
      qb.andWhere('LOWER(event.venue) LIKE LOWER(:venue)', {
        venue: `%${dto.venue}%`,
      });
    }

    const allowedSortFields = ['startDate', 'name', 'status'];
    const sortBy = allowedSortFields.includes(dto.sortBy ?? '')
      ? (dto.sortBy as string)
      : 'startDate';
    const sortOrder: 'ASC' | 'DESC' = dto.sortOrder === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy(`event.${sortBy}`, sortOrder, 'NULLS LAST');

    qb.take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit, offset };
  }

  async getPublicEvent(eventIdOrSlug: string): Promise<Event> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        eventIdOrSlug,
      );
    const event = await this.eventRepo.findOne({
      where: isUuid ? { id: eventIdOrSlug } : { slug: eventIdOrSlug },
      relations: {
        teams: true,
        competitions: {
          sport: true,
          stages: true,
        },
      },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (!event.isPublic) {
      throw new NotFoundException('Event is not public');
    }
    return event;
  }

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = this.slugify(name) || 'event';
    let slug = baseSlug;
    let counter = 1;
    while (await this.eventRepo.exists({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  }

  async duplicateEvent(
    workspaceId: string,
    eventId: string,
    dto: DuplicateEventDto,
    userId: string,
  ): Promise<Event> {
    // 1. Ensure permission
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );

    // 2. Retrieve original event
    const sourceEvent = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
      relations: { teams: true },
    });
    if (!sourceEvent) {
      throw new NotFoundException('Source event not found in this workspace');
    }

    // 3. Create new Event entity
    const newEvent = this.eventRepo.create({
      name: dto.name,
      slug: await this.generateUniqueSlug(dto.name),
      description:
        dto.duplicateSettings !== false ? sourceEvent.description : null,
      startDate: dto.startDate
        ? new Date(dto.startDate)
        : dto.duplicateSettings !== false
          ? sourceEvent.startDate
          : null,
      endDate: dto.endDate
        ? new Date(dto.endDate)
        : dto.duplicateSettings !== false
          ? sourceEvent.endDate
          : null,
      status: 'upcoming', // Always start as upcoming by default
      logoUrl: dto.duplicateSettings !== false ? sourceEvent.logoUrl : null,
      isPublic: dto.duplicateSettings !== false ? sourceEvent.isPublic : false,
      registrationStatus:
        dto.duplicateSettings !== false
          ? sourceEvent.registrationStatus
          : 'open',
      venue:
        dto.duplicateVenues !== false || dto.duplicateSettings !== false
          ? sourceEvent.venue
          : null,
      sport: dto.duplicateSettings !== false ? sourceEvent.sport : null,
      organizers:
        dto.duplicateSettings !== false ? sourceEvent.organizers : null,
      workspaceId,
      teams: dto.duplicateTeams !== false ? sourceEvent.teams : [],
      isArchived: false,
      gallery: null,
      announcements: null,
      sponsors: dto.duplicateSettings !== false ? sourceEvent.sponsors : null,
    });

    const savedEvent = await this.eventRepo.save(newEvent);

    // 4. Optionally duplicate competitions
    if (dto.duplicateCompetitions !== false) {
      const originalCompetitions = await this.eventRepo.manager.find(
        Competition,
        {
          where: { eventId },
        },
      );

      for (const origComp of originalCompetitions) {
        const newComp = this.eventRepo.manager.create(Competition, {
          name: origComp.name,
          eventId: savedEvent.id,
          sportId: origComp.sportId,
          status: 'upcoming',
          pointsConfig:
            dto.duplicatePointSystems !== false ? origComp.pointsConfig : null,
        });

        const savedComp = await this.eventRepo.manager.save(
          Competition,
          newComp,
        );

        // Optionally duplicate teams enrollment
        if (dto.duplicateTeams !== false) {
          const origCompTeams = await this.eventRepo.manager.find(
            CompetitionTeam,
            {
              where: { competitionId: origComp.id },
            },
          );

          for (const origCt of origCompTeams) {
            const newCt = this.eventRepo.manager.create(CompetitionTeam, {
              competitionId: savedComp.id,
              teamId: origCt.teamId,
            });
            await this.eventRepo.manager.save(CompetitionTeam, newCt);
          }
        }

        // Optionally duplicate stages
        if (dto.duplicateStages !== false) {
          const originalStages = await this.eventRepo.manager.find(
            CompetitionStage,
            {
              where: { competitionId: origComp.id },
            },
          );

          for (const origStage of originalStages) {
            const newStage = this.eventRepo.manager.create(CompetitionStage, {
              name: origStage.name,
              type: origStage.type,
              sequence: origStage.sequence,
              competitionId: savedComp.id,
              config: origStage.config,
            });
            await this.eventRepo.manager.save(CompetitionStage, newStage);
          }
        }
      }
    }

    // 5. Notify workspace members of new event
    const memberIds = await this.workspacesService.getWorkspaceMemberUserIds(
      workspaceId,
      userId,
    );
    await this.workspacesService.sendNotificationToMany(
      memberIds,
      NotificationType.EVENT_CREATED,
      `New event "${savedEvent.name}" has been created via duplication.`,
      workspaceId,
      { eventId: savedEvent.id, eventName: savedEvent.name },
    );

    return savedEvent;
  }

  async searchEvents(
    workspaceId: string,
    userId: string,
    dto: SearchEventDto,
  ): Promise<Event[]> {
    const userWorkspaces = await this.workspacesService.findAllForUser(userId);
    const allowedWorkspaceIds = userWorkspaces.map((w) => w.id);

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.competitions', 'competition')
      .leftJoinAndSelect('event.teams', 'team')
      .leftJoinAndSelect('event.workspace', 'workspace');

    const wsFilter = dto.workspaceIdFilter;
    if (wsFilter === 'all') {
      if (allowedWorkspaceIds.length === 0) {
        return [];
      }
      qb.andWhere('event.workspaceId IN (:...allowedWorkspaceIds)', {
        allowedWorkspaceIds,
      });
    } else if (wsFilter) {
      if (!allowedWorkspaceIds.includes(wsFilter)) {
        throw new ForbiddenException(
          'Not a member of the requested filter workspace',
        );
      }
      qb.andWhere('event.workspaceId = :wsFilter', { wsFilter });
    } else {
      if (!allowedWorkspaceIds.includes(workspaceId)) {
        throw new ForbiddenException('Not a member of the current workspace');
      }
      qb.andWhere('event.workspaceId = :workspaceId', { workspaceId });
    }

    if (dto.query) {
      qb.andWhere(
        '(LOWER(event.name) LIKE LOWER(:query) OR LOWER(event.description) LIKE LOWER(:query))',
        { query: `%${dto.query}%` },
      );
    }

    if (dto.sport) {
      qb.andWhere('LOWER(event.sport) = LOWER(:sport)', { sport: dto.sport });
    }

    if (dto.organizer) {
      qb.andWhere('LOWER(event.organizers) LIKE LOWER(:organizer)', {
        organizer: `%${dto.organizer}%`,
      });
    }

    if (dto.status) {
      qb.andWhere('event.status = :status', { status: dto.status });
    }

    if (dto.venue) {
      qb.andWhere('LOWER(event.venue) LIKE LOWER(:venue)', {
        venue: `%${dto.venue}%`,
      });
    }

    if (dto.startDate) {
      qb.andWhere('event.startDate >= :startDate', {
        startDate: new Date(dto.startDate),
      });
    }

    if (dto.endDate) {
      qb.andWhere('event.endDate <= :endDate', {
        endDate: new Date(dto.endDate),
      });
    }

    if (dto.competitionName) {
      qb.andWhere('LOWER(competition.name) LIKE LOWER(:competitionName)', {
        competitionName: `%${dto.competitionName}%`,
      });
    }

    const sortBy = dto.sortBy || 'name';
    const sortOrder = dto.sortOrder || 'ASC';
    const allowedSortFields = [
      'name',
      'startDate',
      'endDate',
      'status',
      'sport',
      'venue',
    ];
    const orderField = allowedSortFields.includes(sortBy)
      ? `event.${sortBy}`
      : 'event.name';
    const orderDirection = ['ASC', 'DESC'].includes(sortOrder.toUpperCase())
      ? (sortOrder.toUpperCase() as 'ASC' | 'DESC')
      : 'ASC';
    qb.orderBy(orderField, orderDirection);

    return qb.getMany();
  }

  async getAttendanceForecast(
    workspaceId: string,
    eventId: string,
    userId: string,
  ) {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.attendanceForecastingService.getAttendanceForecast(
      workspaceId,
      eventId,
    );
  }
}
