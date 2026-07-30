import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { GalleryPhoto } from './entities/gallery-photo.entity';
import { Event } from '../events/entities/event.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { Match } from '../competitions/entities/match.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CloudinaryService } from '../../integrations/storage/cloudinary.service';
import {
  CreateGalleryPhotoDto,
  UpdateGalleryPhotoDto,
} from './dto/create-gallery-photo.dto';
import { ListGalleryDto } from './dto/list-gallery.dto';

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(GalleryPhoto)
    private readonly photoRepo: Repository<GalleryPhoto>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    private readonly workspacesService: WorkspacesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadPhoto(
    workspaceId: string,
    eventId: string,
    dto: CreateGalleryPhotoDto,
    file: Express.Multer.File,
    userId: string,
  ): Promise<GalleryPhoto> {
    if (!file) throw new BadRequestException('No file uploaded');

    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );

    const event = await this.eventRepo.findOne({
      where: { id: eventId, workspaceId },
    });
    if (!event)
      throw new NotFoundException('Event not found in this workspace');

    // Validate optional scoping
    if (dto.competitionId) {
      const comp = await this.competitionRepo.findOne({
        where: { id: dto.competitionId, eventId },
      });
      if (!comp) {
        throw new BadRequestException(
          'Competition does not belong to this event',
        );
      }
    }
    if (dto.matchId) {
      const match = await this.matchRepo.findOne({
        where: { id: dto.matchId },
        relations: { stage: { competition: true } },
      });
      if (!match || match.stage?.competition?.eventId !== eventId) {
        throw new BadRequestException('Match does not belong to this event');
      }
      // If a match is set, force competitionId to match the parent
      if (!dto.competitionId) {
        dto.competitionId = match.stage.competition.id;
      }
    }

    let upload: { secure_url: string; public_id: string };
    try {
      const result = await this.cloudinaryService.uploadFile(
        file,
        'sem/events/gallery',
      );
      upload = { secure_url: result.secure_url, public_id: result.public_id };
    } catch (err: any) {
      throw new BadRequestException(
        `Cloudinary upload failed: ${err?.message ?? err}`,
      );
    }

    const photo = this.photoRepo.create({
      eventId,
      competitionId: dto.competitionId ?? null,
      matchId: dto.matchId ?? null,
      url: upload.secure_url,
      publicId: upload.public_id,
      caption: dto.caption ?? null,
      sortOrder: 0,
    });

    return this.photoRepo.save(photo);
  }

  async listPhotos(
    workspaceId: string,
    eventId: string,
    filters: ListGalleryDto,
    userId: string,
  ): Promise<GalleryPhoto[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.queryPhotos(eventId, filters);
  }

  async listPublicPhotos(
    eventId: string,
    filters: ListGalleryDto,
  ): Promise<GalleryPhoto[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (!event.isPublic) {
      throw new NotFoundException('Event is not public');
    }
    return this.queryPhotos(eventId, filters);
  }

  async updatePhoto(
    workspaceId: string,
    eventId: string,
    photoId: string,
    dto: UpdateGalleryPhotoDto,
    userId: string,
  ): Promise<GalleryPhoto> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );

    const photo = await this.photoRepo.findOne({
      where: { id: photoId, eventId },
    });
    if (!photo) throw new NotFoundException('Photo not found');

    if (dto.competitionId !== undefined) {
      if (dto.competitionId === null) {
        photo.competitionId = null;
      } else {
        const comp = await this.competitionRepo.findOne({
          where: { id: dto.competitionId, eventId },
        });
        if (!comp) {
          throw new BadRequestException(
            'Competition does not belong to this event',
          );
        }
        photo.competitionId = dto.competitionId;
      }
    }

    if (dto.matchId !== undefined) {
      if (dto.matchId === null) {
        photo.matchId = null;
      } else {
        const match = await this.matchRepo.findOne({
          where: { id: dto.matchId },
          relations: { stage: { competition: true } },
        });
        if (!match || match.stage?.competition?.eventId !== eventId) {
          throw new BadRequestException('Match does not belong to this event');
        }
        photo.matchId = dto.matchId;
        photo.competitionId = match.stage.competition.id;
      }
    }

    if (dto.caption !== undefined) {
      photo.caption = dto.caption;
    }

    return this.photoRepo.save(photo);
  }

  async removePhoto(
    workspaceId: string,
    eventId: string,
    photoId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );

    const photo = await this.photoRepo.findOne({
      where: { id: photoId, eventId },
    });
    if (!photo) throw new NotFoundException('Photo not found');

    // Soft-delete via AuditableEntity's deletedAt column
    photo.deletedAt = new Date();
    await this.photoRepo.save(photo);
  }

  private async queryPhotos(
    eventId: string,
    filters: ListGalleryDto,
  ): Promise<GalleryPhoto[]> {
    const where: any = { eventId };
    if (filters.matchId) {
      where.matchId = filters.matchId;
    } else if (filters.competitionId) {
      where.competitionId = filters.competitionId;
      // include event-level photos linked only to this competition (no match)
    }
    return this.photoRepo.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  // Kept for API symmetry — currently unused but useful for a future
  // "event-level only" filter (no comp, no match).
  async listEventLevelPhotos(eventId: string): Promise<GalleryPhoto[]> {
    return this.photoRepo.find({
      where: { eventId, competitionId: IsNull(), matchId: IsNull() },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }
}
