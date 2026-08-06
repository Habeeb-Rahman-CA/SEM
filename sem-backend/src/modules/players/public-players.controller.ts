import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PlayersService } from './players.service';

/**
 * Public player profiles are intentionally always accessible (see v3.0
 * "Player Profiles" design decision). Do NOT add a workspace-membership or
 * event-membership gate here without an explicit design change — profile
 * URLs need to work for any player so they can be shared standalone.
 */
@ApiTags('public-players')
@Controller('public/players')
export class PublicPlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('hall-of-fame')
  @ApiOperation({
    summary: 'Get all-time Hall of Fame permanent records',
    description:
      'Returns all-time permanent records across all seasons: Most Goals, Most Assists, Most Titles, Most Finals, Most MVPs, Fastest Goal, and Longest Winning Streak.',
  })
  @ApiResponse({ status: 200, description: 'Hall of fame records object' })
  async getHallOfFame() {
    return this.playersService.getHallOfFame();
  }

  @Get(':playerId')
  @ApiOperation({
    summary: 'Get public player profile',
    description:
      'Returns the public profile of a player: bio, position, team, achievements, career statistics, and per-competition performance breakdown.',
  })
  @ApiParam({ name: 'playerId', description: 'Player UUID' })
  @ApiResponse({ status: 200, description: 'Player profile' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  async getPublicPlayer(@Param('playerId') playerId: string) {
    return this.playersService.getPublicPlayerProfile(playerId);
  }

  @Get(':playerId/insights')
  @ApiOperation({
    summary: 'Get public player insights',
    description:
      'Returns the public AI-powered or rule-based analytical insights of a player: strengths, weaknesses, consistency, recent form, and recommendations.',
  })
  @ApiParam({ name: 'playerId', description: 'Player UUID' })
  @ApiResponse({ status: 200, description: 'Player insights object' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  async getPublicPlayerInsights(@Param('playerId') playerId: string) {
    return this.playersService.getPublicPlayerInsights(playerId);
  }

  @Get('/players/:playerId/performance-insights')
  @ApiOperation({
    summary: 'Get public player performance insights',
    description:
      'Returns the public AI-powered or rule-based analytical insights of a player: strengths, weaknesses, consistency, recent form, and recommendations.',
  })
  @ApiParam({ name: 'playerId', description: 'Player UUID' })
  @ApiResponse({ status: 200, description: 'Player insights object' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  async getPublicPlayerPerformanceInsights(
    @Param('playerId') playerId: string,
  ) {
    return this.playersService.getPublicPlayerInsights(playerId);
  }
}
