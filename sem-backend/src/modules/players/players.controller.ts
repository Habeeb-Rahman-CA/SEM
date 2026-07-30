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
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const PLAYER = { name: 'playerId', description: 'Player UUID' };

@ApiTags('players')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  @ApiOperation({
    summary: 'List players in a workspace',
    description:
      'Returns all players registered within the workspace. Players can be assigned to teams and selected in match lineups.',
  })
  @ApiParam(WS)
  @ApiResponse({ status: 200, description: 'Array of player objects' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  getPlayers(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.playersService.getPlayers(workspaceId, req.user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a player',
    description:
      'Registers a new player in the workspace. Players can then be assigned to teams.',
  })
  @ApiParam(WS)
  @ApiResponse({ status: 201, description: 'Player created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  createPlayer(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreatePlayerDto,
    @Request() req: any,
  ) {
    return this.playersService.createPlayer(workspaceId, dto, req.user.id);
  }

  @Patch(':playerId')
  @ApiOperation({
    summary: 'Update a player',
    description:
      'Updates player details such as name, jersey number, or position.',
  })
  @ApiParam(WS)
  @ApiParam(PLAYER)
  @ApiResponse({ status: 200, description: 'Updated player' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  updatePlayer(
    @Param('workspaceId') workspaceId: string,
    @Param('playerId') playerId: string,
    @Body() dto: UpdatePlayerDto,
    @Request() req: any,
  ) {
    return this.playersService.updatePlayer(
      workspaceId,
      playerId,
      dto,
      req.user.id,
    );
  }

  @Delete(':playerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a player',
    description:
      'Permanently removes the player from the workspace. Cannot be undone.',
  })
  @ApiParam(WS)
  @ApiParam(PLAYER)
  @ApiResponse({ status: 204, description: 'Player removed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  removePlayer(
    @Param('workspaceId') workspaceId: string,
    @Param('playerId') playerId: string,
    @Request() req: any,
  ) {
    return this.playersService.removePlayer(workspaceId, playerId, req.user.id);
  }

  @Get(':playerId/stats')
  @ApiOperation({
    summary: 'Get player statistics',
    description:
      'Returns aggregated performance statistics for the player across all competitions in the workspace: matches played, ratings average, goals, assists, etc.',
  })
  @ApiParam(WS)
  @ApiParam(PLAYER)
  @ApiResponse({ status: 200, description: 'Player statistics object' })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  getPlayerStats(
    @Param('workspaceId') workspaceId: string,
    @Param('playerId') playerId: string,
    @Request() req: any,
  ) {
    return this.playersService.getPlayerStats(
      workspaceId,
      playerId,
      req.user.id,
    );
  }
}
