import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TeamsService } from './teams.service';

/**
 * Public team profiles are intentionally always accessible (see v3.0
 * "Team Profiles" design decision). Do NOT add a workspace-membership or
 * event-membership gate here without an explicit design change — profile
 * URLs need to work for any team so they can be shared standalone.
 */
@ApiTags('public-teams')
@Controller('public/teams')
export class PublicTeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get(':teamId')
  @ApiOperation({
    summary: 'Get public team profile',
    description:
      'Returns the public profile of a team: logo, colors, coaches, roster, achievements/trophies, recent matches, statistics, and per-competition breakdown.',
  })
  @ApiParam({ name: 'teamId', description: 'Team UUID' })
  @ApiResponse({ status: 200, description: 'Team profile' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async getPublicTeam(@Param('teamId') teamId: string) {
    return this.teamsService.getPublicTeamProfile(teamId);
  }

  @Get(':teamId/analytics')
  @ApiOperation({
    summary: 'Get public team performance analytics',
    description:
      'Returns comprehensive, sport-specific efficiency metrics, event-by-event trend analysis, and AI-powered performance insights for spectator views.',
  })
  @ApiParam({ name: 'teamId', description: 'Team UUID' })
  @ApiResponse({
    status: 200,
    description: 'Team analytics and insights object',
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async getPublicTeamAnalytics(@Param('teamId') teamId: string) {
    return this.teamsService.getPublicTeamAnalytics(teamId);
  }

  @Get(':teamId/chemistry')
  @ApiOperation({
    summary: 'Get public team chemistry score',
    description:
      'Calculates squad chemistry scores across Attack, Midfield, and Defense based on co-play frequency, win ratios, and sector stability.',
  })
  @ApiParam({ name: 'teamId', description: 'Team UUID' })
  @ApiResponse({ status: 200, description: 'Team chemistry object' })
  async getPublicTeamChemistry(@Param('teamId') teamId: string) {
    return this.teamsService.getTeamChemistry(teamId);
  }
}
