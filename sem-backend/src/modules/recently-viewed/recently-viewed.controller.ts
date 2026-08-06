import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RecentlyViewedService } from './recently-viewed.service';
import { RecordViewedDto } from './dto/record-viewed.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('workspaces/:workspaceId/recently-viewed')
@UseGuards(JwtAuthGuard)
export class RecentlyViewedController {
  constructor(private readonly recentlyViewedService: RecentlyViewedService) {}

  @Get()
  async getRecentlyViewed(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 15;
    return this.recentlyViewedService.getRecentlyViewed(
      workspaceId,
      userId,
      parsedLimit,
    );
  }

  @Post()
  async recordView(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RecordViewedDto,
  ) {
    return this.recentlyViewedService.recordView(workspaceId, userId, dto);
  }

  @Delete()
  async clearHistory(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.recentlyViewedService.clearHistory(workspaceId, userId);
    return { success: true };
  }
}
