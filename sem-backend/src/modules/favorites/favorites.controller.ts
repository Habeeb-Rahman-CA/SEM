import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { ToggleFavoriteDto } from './dto/create-favorite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('workspaces/:workspaceId/favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getFavorites(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.getFavorites(workspaceId, userId);
  }

  @Post('toggle')
  async toggleFavorite(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ToggleFavoriteDto,
  ) {
    return this.favoritesService.toggleFavorite(workspaceId, userId, dto);
  }

  @Delete(':id')
  async deleteFavorite(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    await this.favoritesService.deleteFavorite(workspaceId, userId, id);
    return { success: true };
  }
}
