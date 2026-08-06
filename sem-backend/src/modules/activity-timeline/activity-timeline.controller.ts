import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ActivityAction,
  ActivityCategory,
  ActivityTimelineService,
} from './activity-timeline.service';

@ApiTags('activity-timeline')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/activity-timeline')
@UseGuards(JwtAuthGuard)
export class ActivityTimelineController {
  constructor(
    private readonly activityTimelineService: ActivityTimelineService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Get real-time global activity timeline logs for audit and collaboration',
  })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getActivityLogs(
    @Param('workspaceId') workspaceId: string,
    @Query('category') category?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    return this.activityTimelineService.listActivityLogs(
      workspaceId,
      {
        category: category as ActivityCategory,
        action: action as ActivityAction,
        search,
      },
      req?.user?.id,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Record a new action in the global activity audit timeline',
  })
  async recordActivity(
    @Param('workspaceId') workspaceId: string,
    @Body()
    dto: {
      actorName: string;
      actorRole?: string;
      action: ActivityAction;
      entityType: ActivityCategory;
      entityName: string;
      entityId?: string;
      details?: string;
      severity?: 'info' | 'warning' | 'critical';
    },
    @Request() req?: any,
  ) {
    return this.activityTimelineService.recordActivity(
      workspaceId,
      dto,
      req?.user?.id,
    );
  }
}
