import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const TEAM = { name: 'teamId', description: 'Team UUID' };

@ApiTags('teams')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({
    summary: 'List teams in a workspace',
    description: 'Returns all teams registered within the specified workspace.',
  })
  @ApiParam(WS)
  @ApiResponse({ status: 200, description: 'Array of team objects' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  getTeams(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.teamsService.getTeams(workspaceId, req.user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a team',
    description:
      'Registers a new team within the workspace. Teams can be enrolled into competition events.',
  })
  @ApiParam(WS)
  @ApiResponse({ status: 201, description: 'Team created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  createTeam(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateTeamDto,
    @Request() req: any,
  ) {
    return this.teamsService.createTeam(workspaceId, dto, req.user.id);
  }

  @Patch(':teamId')
  @ApiOperation({
    summary: 'Update a team',
    description: 'Updates team details including name, logo, or description.',
  })
  @ApiParam(WS)
  @ApiParam(TEAM)
  @ApiResponse({ status: 200, description: 'Updated team' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  updateTeam(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
    @Request() req: any,
  ) {
    return this.teamsService.updateTeam(workspaceId, teamId, dto, req.user.id);
  }

  @Delete(':teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a team',
    description:
      'Permanently removes the team from the workspace. The team must not be enrolled in any active competitions.',
  })
  @ApiParam(WS)
  @ApiParam(TEAM)
  @ApiResponse({ status: 204, description: 'Team deleted' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({
    status: 409,
    description: 'Team is enrolled in an active competition',
  })
  removeTeam(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Request() req: any,
  ) {
    return this.teamsService.removeTeam(workspaceId, teamId, req.user.id);
  }

  @Get(':teamId/stats')
  @ApiOperation({
    summary: 'Get team statistics',
    description:
      'Returns aggregated performance statistics for the team: wins, losses, draws, goals scored/conceded, and overall competition record.',
  })
  @ApiParam(WS)
  @ApiParam(TEAM)
  @ApiResponse({ status: 200, description: 'Team statistics object' })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  getTeamStats(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Request() req: any,
  ) {
    return this.teamsService.getTeamStats(workspaceId, teamId, req.user.id);
  }
}
