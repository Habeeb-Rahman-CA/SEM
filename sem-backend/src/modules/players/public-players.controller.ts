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
}
