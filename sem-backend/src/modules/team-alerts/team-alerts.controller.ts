import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TeamAlertsService } from './team-alerts.service';
import {
  BroadcastAlertDto,
  UpdateAlertPreferenceDto,
} from './dto/team-alerts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AlertCategory } from './entities/team-alert.entity';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const ALERT = { name: 'alertId', description: 'Team alert UUID' };
const TEAM = { name: 'teamId', description: 'Team UUID' };

@ApiTags('team-alerts')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class TeamAlertsController {
  constructor(private readonly service: TeamAlertsService) {}

  // ─── Summary ─────────────────────────────────────────────────────────

  @Get('team-alerts/summary')
  @ApiOperation({ summary: 'Alerts summary — counts by category & severity' })
  @ApiParam(WS)
  getSummary(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.service.getSummary(workspaceId, req.user.id);
  }

  // ─── Alerts ──────────────────────────────────────────────────────────

  @Get('team-alerts')
  @ApiOperation({ summary: 'List team alerts' })
  @ApiParam(WS)
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'unreadOnly', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAlerts(
    @Param('workspaceId') workspaceId: string,
    @Query('teamId') teamId: string,
    @Query('category') category: AlertCategory,
    @Query('unreadOnly') unreadOnly: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    return this.service.getAlerts(workspaceId, req.user.id, {
      teamId,
      category,
      unreadOnly: unreadOnly === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('team-alerts/broadcast')
  @ApiOperation({
    summary:
      'Broadcast an alert to one or more teams (skips teams that muted the category)',
  })
  @ApiParam(WS)
  broadcast(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: BroadcastAlertDto,
    @Request() req: any,
  ) {
    return this.service.broadcast(workspaceId, dto, req.user.id);
  }

  @Post('team-alerts/scan')
  @ApiOperation({
    summary:
      'Sweep workspace for closing transfer windows, expiring contracts, and budget thresholds — generates alerts',
  })
  @ApiParam(WS)
  @ApiQuery({ name: 'season', required: false })
  runScan(
    @Param('workspaceId') workspaceId: string,
    @Query('season') season: string,
    @Request() req: any,
  ) {
    return this.service.runScan(workspaceId, req.user.id, { season });
  }

  @Patch('team-alerts/:alertId/read')
  @ApiOperation({ summary: 'Mark an alert as read/acknowledged' })
  @ApiParam(WS)
  @ApiParam(ALERT)
  markRead(
    @Param('workspaceId') workspaceId: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.service.markRead(workspaceId, alertId, req.user.id);
  }

  @Post('team-alerts/mark-all-read')
  @ApiOperation({ summary: 'Mark all alerts as read (optionally per team)' })
  @ApiParam(WS)
  @ApiQuery({ name: 'teamId', required: false })
  markAllRead(
    @Param('workspaceId') workspaceId: string,
    @Query('teamId') teamId: string,
    @Request() req: any,
  ) {
    return this.service.markAllRead(workspaceId, req.user.id, teamId);
  }

  @Delete('team-alerts/:alertId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a team alert' })
  @ApiParam(WS)
  @ApiParam(ALERT)
  deleteAlert(
    @Param('workspaceId') workspaceId: string,
    @Param('alertId') alertId: string,
    @Request() req: any,
  ) {
    return this.service.deleteAlert(workspaceId, alertId, req.user.id);
  }

  // ─── Preferences ─────────────────────────────────────────────────────

  @Get('team-alert-preferences')
  @ApiOperation({ summary: 'List alert subscription preferences per team' })
  @ApiParam(WS)
  getPreferences(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.service.getPreferences(workspaceId, req.user.id);
  }

  @Patch('teams/:teamId/alert-preferences')
  @ApiOperation({ summary: "Update a team's alert subscription preferences" })
  @ApiParam(WS)
  @ApiParam(TEAM)
  updatePreference(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateAlertPreferenceDto,
    @Request() req: any,
  ) {
    return this.service.updatePreference(workspaceId, teamId, dto, req.user.id);
  }
}
