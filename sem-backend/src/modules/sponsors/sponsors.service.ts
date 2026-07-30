import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Sponsor } from './entities/sponsor.entity';
import { EventSponsor } from './entities/event-sponsor.entity';
import { Event } from '../events/entities/event.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  AttachSponsorDto,
  CreateSponsorDto,
  UpdateSponsorDto,
} from './dto/sponsor.dto';

/**
 * Sponsor management. All mutations are gated by the `event.manage`
 * permission (same permission that lets a member edit events — sponsor
 * management is an organizer-side concern).
 *
 * Public reads (via listPublicEventSponsors) apply the visibility
 * window: sponsor.isActive must be true AND now must fall inside
 * [startDate, endDate] with NULL bounds treated as "always".
 */
@Injectable()
export class SponsorsService {
  constructor(
    @InjectRepository(Sponsor)
    private readonly sponsorRepo: Repository<Sponsor>,
    @InjectRepository(EventSponsor)
    private readonly eventSponsorRepo: Repository<EventSponsor>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Workspace-scoped CRUD ────────────────────────────────────────────

  async listWorkspaceSponsors(
    workspaceId: string,
    userId: string,
  ): Promise<Sponsor[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.sponsorRepo.find({
      where: { workspaceId },
      order: { isActive: 'DESC', tier: 'ASC', name: 'ASC' },
    });
  }

  async createSponsor(
    workspaceId: string,
    dto: CreateSponsorDto,
    userId: string,
  ): Promise<Sponsor> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    const sponsor = this.sponsorRepo.create({
      workspaceId,
      name: dto.name,
      description: dto.description ?? null,
      logoUrl: dto.logoUrl ?? null,
      websiteUrl: dto.websiteUrl ?? null,
      category: dto.category ?? null,
      tier: dto.tier ?? null,
      contactName: dto.contactName ?? null,
      contactEmail: dto.contactEmail ?? null,
      isActive: dto.isActive ?? true,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      notes: dto.notes ?? null,
    });
    return this.sponsorRepo.save(sponsor);
  }

  async updateSponsor(
    workspaceId: string,
    sponsorId: string,
    dto: UpdateSponsorDto,
    userId: string,
  ): Promise<Sponsor> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    const sponsor = await this.sponsorRepo.findOne({
      where: { id: sponsorId, workspaceId },
    });
    if (!sponsor) throw new NotFoundException('Sponsor not found');

    Object.assign(sponsor, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.websiteUrl !== undefined && { websiteUrl: dto.websiteUrl }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.tier !== undefined && { tier: dto.tier }),
      ...(dto.contactName !== undefined && { contactName: dto.contactName }),
      ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.startDate !== undefined && {
        startDate: dto.startDate ? new Date(dto.startDate) : null,
      }),
      ...(dto.endDate !== undefined && {
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });
    return this.sponsorRepo.save(sponsor);
  }

  async removeSponsor(
    workspaceId: string,
    sponsorId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    const sponsor = await this.sponsorRepo.findOne({
      where: { id: sponsorId, workspaceId },
    });
    if (!sponsor) throw new NotFoundException('Sponsor not found');
    sponsor.deletedAt = new Date();
    await this.sponsorRepo.save(sponsor);
  }

  // ─── Event attachment ─────────────────────────────────────────────────

  async listEventSponsors(
    workspaceId: string,
    eventId: string,
    userId: string,
  ): Promise<EventSponsor[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    await this.ensureEventBelongsToWorkspace(eventId, workspaceId);
    return this.eventSponsorRepo.find({
      where: { eventId },
      relations: { sponsor: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async attachSponsor(
    workspaceId: string,
    eventId: string,
    dto: AttachSponsorDto,
    userId: string,
  ): Promise<EventSponsor> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    await this.ensureEventBelongsToWorkspace(eventId, workspaceId);
    const sponsor = await this.sponsorRepo.findOne({
      where: { id: dto.sponsorId, workspaceId },
    });
    if (!sponsor) {
      throw new BadRequestException(
        'Sponsor does not exist or belongs to another workspace',
      );
    }

    const existing = await this.eventSponsorRepo.findOne({
      where: { eventId, sponsorId: dto.sponsorId },
    });
    if (existing) {
      throw new BadRequestException(
        'Sponsor is already attached to this event',
      );
    }

    const link = this.eventSponsorRepo.create({
      eventId,
      sponsorId: dto.sponsorId,
      tier: dto.tier ?? null,
      displayOrder: dto.displayOrder ?? 0,
    });
    const saved = await this.eventSponsorRepo.save(link);
    saved.sponsor = sponsor;
    return saved;
  }

  async detachSponsor(
    workspaceId: string,
    eventId: string,
    sponsorId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    await this.ensureEventBelongsToWorkspace(eventId, workspaceId);
    const link = await this.eventSponsorRepo.findOne({
      where: { eventId, sponsorId },
    });
    if (!link) return;
    link.deletedAt = new Date();
    await this.eventSponsorRepo.save(link);
    // Hard-delete would also work, but soft-delete keeps the attachment
    // history for audit purposes.
  }

  async updateEventSponsor(
    workspaceId: string,
    eventId: string,
    sponsorId: string,
    dto: { tier?: string | null; displayOrder?: number },
    userId: string,
  ): Promise<EventSponsor> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    const link = await this.eventSponsorRepo.findOne({
      where: { eventId, sponsorId },
      relations: { sponsor: true },
    });
    if (!link) throw new NotFoundException('Attachment not found');
    if (dto.tier !== undefined) link.tier = dto.tier as any;
    if (dto.displayOrder !== undefined) link.displayOrder = dto.displayOrder;
    return this.eventSponsorRepo.save(link);
  }

  // ─── Public ───────────────────────────────────────────────────────────

  async listPublicEventSponsors(eventId: string): Promise<
    Array<{
      id: string;
      sponsorId: string;
      name: string;
      description: string | null;
      logoUrl: string | null;
      websiteUrl: string | null;
      category: string | null;
      tier: string | null;
      displayOrder: number;
    }>
  > {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (!event.isPublic) throw new NotFoundException('Event is not public');

    // Load attachments joined to sponsors, filter for the visibility window
    // in application code (Postgres NULL-safe date ranges are noisy to
    // express in TypeORM and this list is small enough per event).
    const attachments = await this.eventSponsorRepo.find({
      where: { eventId },
      relations: { sponsor: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });

    const now = Date.now();
    return attachments
      .filter((a) => {
        const s = a.sponsor;
        if (!s || !s.isActive) return false;
        if (s.startDate && s.startDate.getTime() > now) return false;
        if (s.endDate && s.endDate.getTime() < now) return false;
        return true;
      })
      .map((a) => ({
        id: a.id,
        sponsorId: a.sponsorId,
        name: a.sponsor.name,
        description: a.sponsor.description,
        logoUrl: a.sponsor.logoUrl,
        websiteUrl: a.sponsor.websiteUrl,
        category: a.sponsor.category,
        // Per-event tier override wins over the sponsor's default.
        tier: a.tier ?? a.sponsor.tier ?? null,
        displayOrder: a.displayOrder,
      }));
  }

  private async ensureEventBelongsToWorkspace(
    eventId: string,
    workspaceId: string,
  ): Promise<Event> {
    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
    });
    if (!event) {
      throw new NotFoundException('Event not found in this workspace');
    }
    return event;
  }
}
