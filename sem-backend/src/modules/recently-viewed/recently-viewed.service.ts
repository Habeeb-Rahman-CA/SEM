import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRecentlyViewed } from './entities/recently-viewed.entity';
import { RecordViewedDto } from './dto/record-viewed.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class RecentlyViewedService {
  constructor(
    @InjectRepository(UserRecentlyViewed)
    private readonly repo: Repository<UserRecentlyViewed>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async getRecentlyViewed(
    workspaceId: string,
    userId: string,
    limit = 15,
  ): Promise<UserRecentlyViewed[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.repo.find({
      where: { workspaceId, userId },
      order: { viewedAt: 'DESC' },
      take: limit,
    });
  }

  async recordView(
    workspaceId: string,
    userId: string,
    dto: RecordViewedDto,
  ): Promise<UserRecentlyViewed> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const existing = await this.repo.findOne({
      where: {
        workspaceId,
        userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });

    if (existing) {
      existing.title = dto.title;
      existing.subtitle = dto.subtitle || null;
      existing.url = dto.url;
      existing.icon = dto.icon || existing.icon;
      existing.viewedAt = new Date();
      return this.repo.save(existing);
    }

    const newRecord = this.repo.create({
      workspaceId,
      userId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      title: dto.title,
      subtitle: dto.subtitle || null,
      url: dto.url,
      icon: dto.icon || 'fi fi-rr-time-past',
      viewedAt: new Date(),
    });

    const saved = await this.repo.save(newRecord);

    // Maintain max 20 entries per workspace/user to keep DB lean
    const totalCount = await this.repo.count({
      where: { workspaceId, userId },
    });
    if (totalCount > 20) {
      const oldest = await this.repo.find({
        where: { workspaceId, userId },
        order: { viewedAt: 'ASC' },
        take: totalCount - 20,
      });
      if (oldest.length > 0) {
        await this.repo.remove(oldest);
      }
    }

    return saved;
  }

  async clearHistory(workspaceId: string, userId: string): Promise<void> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    await this.repo.delete({ workspaceId, userId });
  }
}
