import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFavorite } from './entities/favorite.entity';
import { ToggleFavoriteDto } from './dto/create-favorite.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(UserFavorite)
    private readonly favoriteRepo: Repository<UserFavorite>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async getFavorites(
    workspaceId: string,
    userId: string,
  ): Promise<UserFavorite[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.favoriteRepo.find({
      where: { workspaceId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async toggleFavorite(
    workspaceId: string,
    userId: string,
    dto: ToggleFavoriteDto,
  ): Promise<{ isFavorite: boolean; favorite: UserFavorite | null }> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const existing = await this.favoriteRepo.findOne({
      where: {
        workspaceId,
        userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });

    if (existing) {
      await this.favoriteRepo.remove(existing);
      return { isFavorite: false, favorite: null };
    }

    const newFav = this.favoriteRepo.create({
      workspaceId,
      userId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      title: dto.title,
      subtitle: dto.subtitle || null,
      url: dto.url,
      icon: dto.icon || 'fi fi-rr-star',
    });

    const saved = await this.favoriteRepo.save(newFav);
    return { isFavorite: true, favorite: saved };
  }

  async deleteFavorite(
    workspaceId: string,
    userId: string,
    id: string,
  ): Promise<void> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const fav = await this.favoriteRepo.findOne({
      where: { id, workspaceId, userId },
    });
    if (!fav) {
      throw new NotFoundException('Favorite item not found');
    }
    await this.favoriteRepo.remove(fav);
  }
}
