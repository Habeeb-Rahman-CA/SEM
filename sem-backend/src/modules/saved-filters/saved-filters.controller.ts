import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilterCategory, SavedFiltersService } from './saved-filters.service';

@ApiTags('saved-filters')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/saved-filters')
@UseGuards(JwtAuthGuard)
export class SavedFiltersController {
  constructor(private readonly savedFiltersService: SavedFiltersService) {}

  @Get()
  @ApiOperation({
    summary: 'List preset and custom saved filters for workspace',
  })
  async listFilters(
    @Param('workspaceId') workspaceId: string,
    @Request() req?: any,
  ) {
    return this.savedFiltersService.listFilters(workspaceId, req?.user?.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new custom saved filter for 1-click execution',
  })
  async createFilter(
    @Param('workspaceId') workspaceId: string,
    @Body()
    dto: {
      name: string;
      targetCategory: FilterCategory;
      icon?: string;
      color?: string;
      isDefault?: boolean;
      criteria: Record<string, any>;
    },
    @Request() req?: any,
  ) {
    return this.savedFiltersService.createFilter(
      workspaceId,
      dto,
      req?.user?.id,
    );
  }

  @Delete(':filterId')
  @ApiOperation({ summary: 'Delete a custom saved filter' })
  async deleteFilter(
    @Param('workspaceId') workspaceId: string,
    @Param('filterId') filterId: string,
    @Request() req?: any,
  ) {
    return this.savedFiltersService.deleteFilter(
      workspaceId,
      filterId,
      req?.user?.id,
    );
  }
}
