import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { WorkspaceMembersService } from './members/members.service';

const WS = {
  name: 'workspaceId',
  description: 'Workspace UUID',
  example: 'a1b2c3d4-0000-0000-0000-000000000000',
};

@ApiTags('workspace-analytics')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly membersService: WorkspaceMembersService,
  ) {}

  private async checkMembership(workspaceId: string, userId: string) {
    // Ensure privacy, security, and permission controls for analytical data
    await this.membersService.ensurePermission(
      workspaceId,
      userId,
      'analytics.view',
    );
  }

  @Get('event-reports')
  @ApiOperation({
    summary: 'Get dashboard KPIs and event breakdowns for reports',
  })
  @ApiParam(WS)
  @ApiResponse({ status: 200, description: 'Event reports data object' })
  async getEventReports(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    await this.checkMembership(workspaceId, req.user.id);
    return this.analyticsService.getEventReports(workspaceId);
  }

  @Get('participation-trends')
  @ApiOperation({
    summary: 'Get registration growth, age distribution, and seasonal trends',
  })
  @ApiParam(WS)
  @ApiResponse({ status: 200, description: 'Participation trends data object' })
  async getParticipationTrends(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    await this.checkMembership(workspaceId, req.user.id);
    return this.analyticsService.getParticipationTrends(workspaceId);
  }

  @Get('historical-comparisons')
  @ApiOperation({
    summary: 'Get YoY metrics and tournament benchmarks',
  })
  @ApiParam(WS)
  @ApiResponse({
    status: 200,
    description: 'Historical comparisons data object',
  })
  async getHistoricalComparisons(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    await this.checkMembership(workspaceId, req.user.id);
    return this.analyticsService.getHistoricalComparisons(workspaceId);
  }

  @Get('organizer-insights')
  @ApiOperation({
    summary:
      'Get activity logs, operational bottlenecks, and AI recommendations',
  })
  @ApiParam(WS)
  @ApiResponse({ status: 200, description: 'Organizer insights data object' })
  async getOrganizerInsights(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    await this.checkMembership(workspaceId, req.user.id);
    return this.analyticsService.getOrganizerInsights(workspaceId);
  }
}
