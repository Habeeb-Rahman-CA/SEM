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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  VersionEntityType,
  VersionHistoryService,
} from './version-history.service';

@ApiTags('version-history')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/version-history')
@UseGuards(JwtAuthGuard)
export class VersionHistoryController {
  constructor(private readonly versionHistoryService: VersionHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'List version history timeline for an entity' })
  async listVersions(
    @Param('workspaceId') workspaceId: string,
    @Query('entityId') entityId?: string,
    @Request() req?: any,
  ) {
    return this.versionHistoryService.listVersions(
      workspaceId,
      entityId || 'rulebook-2026',
      req?.user?.id,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create or checkpoint a new version snapshot' })
  async createVersion(
    @Param('workspaceId') workspaceId: string,
    @Body()
    dto: {
      entityType: VersionEntityType;
      entityId: string;
      changeSummary: string;
      authorName?: string;
      snapshotData: Record<string, any>;
    },
    @Request() req?: any,
  ) {
    return this.versionHistoryService.createVersion(
      workspaceId,
      dto,
      req?.user?.id,
    );
  }

  @Post('restore')
  @ApiOperation({
    summary: 'Restore state back to a historical version snapshot',
  })
  async restoreVersion(
    @Param('workspaceId') workspaceId: string,
    @Body()
    dto: {
      entityId: string;
      targetVersionNumber: number;
    },
    @Request() req?: any,
  ) {
    return this.versionHistoryService.restoreVersion(
      workspaceId,
      dto,
      req?.user?.id,
    );
  }
}
