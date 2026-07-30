import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './entities/venue.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async getVenues(workspaceId: string, userId: string): Promise<Venue[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.venueRepo.find({
      where: { workspaceId },
      order: { name: 'ASC' },
    });
  }

  async createVenue(
    workspaceId: string,
    dto: CreateVenueDto,
    userId: string,
  ): Promise<Venue> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const venue = this.venueRepo.create({
      name: dto.name,
      location: dto.location ?? null,
      capacity: dto.capacity ?? null,
      imageUrl: dto.imageUrl ?? null,
      workspaceId,
    });
    return this.venueRepo.save(venue);
  }

  async updateVenue(
    workspaceId: string,
    venueId: string,
    dto: UpdateVenueDto,
    userId: string,
  ): Promise<Venue> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const venue = await this.venueRepo.findOne({
      where: { id: venueId, workspaceId },
    });
    if (!venue) {
      throw new NotFoundException('Venue not found in this workspace');
    }

    Object.assign(venue, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
    });

    return this.venueRepo.save(venue);
  }

  async removeVenue(
    workspaceId: string,
    venueId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const venue = await this.venueRepo.findOne({
      where: { id: venueId, workspaceId },
    });
    if (!venue) {
      throw new NotFoundException('Venue not found in this workspace');
    }
    venue.deletedAt = new Date();
    await this.venueRepo.save(venue);
  }
}
