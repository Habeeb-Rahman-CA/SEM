import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TeamsService } from './teams.service';

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
}
