import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventTemplate } from './entities/event-template.entity';
import { Event } from './entities/event.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { CompetitionStage } from '../competitions/entities/competition-stage.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { InstantiateTemplateDto } from './dto/instantiate-template.dto';
import { NotificationType } from '../workspaces/entities/notification.entity';

@Injectable()
export class EventTemplatesService {
  constructor(
    @InjectRepository(EventTemplate)
    private readonly templateRepo: Repository<EventTemplate>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async getTemplates(
    workspaceId: string,
    userId: string,
  ): Promise<EventTemplate[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.templateRepo.find({
      where: { workspaceId },
      order: { useCount: 'DESC', name: 'ASC' },
    });
  }

  async getTemplate(
    workspaceId: string,
    templateId: string,
    userId: string,
  ): Promise<EventTemplate> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const template = await this.templateRepo.findOne({
      where: { id: templateId, workspaceId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async createTemplate(
    workspaceId: string,
    dto: CreateTemplateDto,
    userId: string,
  ): Promise<EventTemplate> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );

    const template = this.templateRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      logoUrl: dto.logoUrl ?? null,
      sport: dto.sport ?? null,
      venue: dto.venue ?? null,
      organizers: dto.organizers ?? null,
      defaultRegistrationStatus: dto.defaultRegistrationStatus ?? 'open',
      defaultIsPublic: dto.defaultIsPublic ?? false,
      competitionBlueprints: dto.competitionBlueprints ?? null,
      workspaceId,
    });

    return this.templateRepo.save(template);
  }

  async createTemplateFromEvent(
    workspaceId: string,
    eventId: string,
    name: string,
    userId: string,
  ): Promise<EventTemplate> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );

    // Load the event with competitions and stages
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const competitions = await this.eventRepo.manager.find(Competition, {
      where: { eventId },
    });
    const blueprints = await Promise.all(
      competitions.map(async (comp) => {
        const stages = await this.eventRepo.manager.find(CompetitionStage, {
          where: { competitionId: comp.id },
          order: { sequence: 'ASC' },
        });
        return {
          name: comp.name,
          sportId: comp.sportId,
          pointsConfig: comp.pointsConfig ?? null,
          stages: stages.map((s) => ({
            name: s.name,
            type: s.type,
            sequence: s.sequence,
            config: s.config ?? {},
          })),
        };
      }),
    );

    const template = this.templateRepo.create({
      name,
      description: event.description ?? null,
      logoUrl: event.logoUrl ?? null,
      sport: event.sport ?? null,
      venue: event.venue ?? null,
      organizers: event.organizers ?? null,
      defaultRegistrationStatus: event.registrationStatus,
      defaultIsPublic: event.isPublic,
      competitionBlueprints: blueprints.length > 0 ? blueprints : null,
      workspaceId,
    });

    return this.templateRepo.save(template);
  }

  async updateTemplate(
    workspaceId: string,
    templateId: string,
    dto: UpdateTemplateDto,
    userId: string,
  ): Promise<EventTemplate> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );

    const template = await this.templateRepo.findOne({
      where: { id: templateId, workspaceId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    Object.assign(template, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.sport !== undefined && { sport: dto.sport }),
      ...(dto.venue !== undefined && { venue: dto.venue }),
      ...(dto.organizers !== undefined && { organizers: dto.organizers }),
      ...(dto.defaultRegistrationStatus !== undefined && {
        defaultRegistrationStatus: dto.defaultRegistrationStatus,
      }),
      ...(dto.defaultIsPublic !== undefined && {
        defaultIsPublic: dto.defaultIsPublic,
      }),
      ...(dto.competitionBlueprints !== undefined && {
        competitionBlueprints: dto.competitionBlueprints,
      }),
    });

    return this.templateRepo.save(template);
  }

  async deleteTemplate(
    workspaceId: string,
    templateId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );

    const template = await this.templateRepo.findOne({
      where: { id: templateId, workspaceId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.templateRepo.remove(template);
  }

  // ── Instantiate ───────────────────────────────────────────────────────────

  async instantiateTemplate(
    workspaceId: string,
    templateId: string,
    dto: InstantiateTemplateDto,
    userId: string,
  ): Promise<Event> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );

    const template = await this.templateRepo.findOne({
      where: { id: templateId, workspaceId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Generate unique slug
    const slug = await this.generateUniqueSlug(dto.name);

    // Create the new Event
    const newEvent = this.eventRepo.create({
      name: dto.name,
      slug,
      description: template.description ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      status: 'upcoming',
      logoUrl: template.logoUrl ?? null,
      sport: template.sport ?? null,
      venue: template.venue ?? null,
      organizers: template.organizers ?? null,
      registrationStatus: template.defaultRegistrationStatus,
      isPublic: template.defaultIsPublic,
      workspaceId,
      teams: [],
      isArchived: false,
      gallery: null,
      announcements: null,
    });

    const savedEvent = await this.eventRepo.save(newEvent);

    // Recreate competitions and stages from blueprints
    if (
      template.competitionBlueprints &&
      template.competitionBlueprints.length > 0
    ) {
      for (const blueprint of template.competitionBlueprints) {
        const newComp = this.eventRepo.manager.create(Competition, {
          name: blueprint.name,
          eventId: savedEvent.id,
          sportId: blueprint.sportId,
          status: 'upcoming',
          pointsConfig: blueprint.pointsConfig ?? null,
        });
        const savedComp = await this.eventRepo.manager.save(
          Competition,
          newComp,
        );

        if (blueprint.stages && blueprint.stages.length > 0) {
          for (const stageBlueprint of blueprint.stages) {
            const newStage = this.eventRepo.manager.create(CompetitionStage, {
              name: stageBlueprint.name,
              type: stageBlueprint.type as any,
              sequence: stageBlueprint.sequence ?? 1,
              competitionId: savedComp.id,
              config: stageBlueprint.config ?? null,
            });
            await this.eventRepo.manager.save(CompetitionStage, newStage);
          }
        }
      }
    }

    // Increment use count
    await this.templateRepo.increment({ id: templateId }, 'useCount', 1);

    // Notify workspace members
    const memberIds = await this.workspacesService.getWorkspaceMemberUserIds(
      workspaceId,
      userId,
    );
    await this.workspacesService.sendNotificationToMany(
      memberIds,
      NotificationType.EVENT_CREATED,
      `New event "${savedEvent.name}" was created from template "${template.name}".`,
      workspaceId,
      { eventId: savedEvent.id, eventName: savedEvent.name },
    );

    return savedEvent;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

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
}
