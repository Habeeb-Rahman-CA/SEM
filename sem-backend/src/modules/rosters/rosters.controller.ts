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
import { RostersService } from './rosters.service';
import { UpsertRosterConfigDto } from './dto/roster-config.dto';
import {
  CreateContractDto,
  UpdateContractDto,
} from './dto/create-contract.dto';
import {
  CarryForwardDto,
  CheckEligibilityDto,
  ReleasePlayerDto,
  ReplacePlayerDto,
} from './dto/release.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { ContractStatus } from './entities/player-contract.entity';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const TEAM = { name: 'teamId', description: 'Team UUID' };
const CONTRACT = { name: 'contractId', description: 'Contract UUID' };
const CONFIG = { name: 'configId', description: 'Roster config UUID' };

@ApiTags('rosters')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class RostersController {
  constructor(private readonly service: RostersService) {}

  // ─── Summary ─────────────────────────────────────────────────────────

  @Get('rosters/summary')
  @ApiOperation({ summary: 'Roster dashboard summary' })
  @ApiParam(WS)
  @ApiQuery({ name: 'season', required: false })
  getSummary(
    @Param('workspaceId') workspaceId: string,
    @Query('season') season: string,
    @Request() req: any,
  ) {
    return this.service.getSummary(workspaceId, req.user.id, season);
  }

  // ─── Configs ─────────────────────────────────────────────────────────

  @Get('roster-configs')
  @ApiOperation({ summary: 'List roster configs' })
  @ApiParam(WS)
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'season', required: false })
  getConfigs(
    @Param('workspaceId') workspaceId: string,
    @Query('teamId') teamId: string,
    @Query('season') season: string,
    @Request() req: any,
  ) {
    return this.service.getConfigs(workspaceId, req.user.id, {
      teamId,
      season,
    });
  }

  @Post('teams/:teamId/roster-config')
  @ApiOperation({
    summary: 'Create or update roster config for a team + season',
  })
  @ApiParam(WS)
  @ApiParam(TEAM)
  upsertConfig(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpsertRosterConfigDto,
    @Request() req: any,
  ) {
    return this.service.upsertConfig(workspaceId, teamId, dto, req.user.id);
  }

  @Delete('roster-configs/:configId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a roster config' })
  @ApiParam(WS)
  @ApiParam(CONFIG)
  deleteConfig(
    @Param('workspaceId') workspaceId: string,
    @Param('configId') configId: string,
    @Request() req: any,
  ) {
    return this.service.deleteConfig(workspaceId, configId, req.user.id);
  }

  // ─── Team roster view ────────────────────────────────────────────────

  @Get('teams/:teamId/roster')
  @ApiOperation({
    summary: 'Get a team roster for a season with config + contracts',
  })
  @ApiParam(WS)
  @ApiParam(TEAM)
  @ApiQuery({ name: 'season', required: true })
  getTeamRoster(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Query('season') season: string,
    @Request() req: any,
  ) {
    return this.service.getTeamRoster(workspaceId, teamId, season, req.user.id);
  }

  // ─── Contracts ───────────────────────────────────────────────────────

  @Get('player-contracts')
  @ApiOperation({ summary: 'List player contracts' })
  @ApiParam(WS)
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'playerId', required: false })
  @ApiQuery({ name: 'season', required: false })
  @ApiQuery({ name: 'status', required: false })
  getContracts(
    @Param('workspaceId') workspaceId: string,
    @Query('teamId') teamId: string,
    @Query('playerId') playerId: string,
    @Query('season') season: string,
    @Query('status') status: ContractStatus,
    @Request() req: any,
  ) {
    return this.service.getContracts(workspaceId, req.user.id, {
      teamId,
      playerId,
      season,
      status,
    });
  }

  @Post('player-contracts')
  @ApiOperation({ summary: 'Create a player contract' })
  @ApiParam(WS)
  createContract(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateContractDto,
    @Request() req: any,
  ) {
    return this.service.createContract(workspaceId, dto, req.user.id);
  }

  @Patch('player-contracts/:contractId')
  @ApiOperation({
    summary: 'Update a player contract (details, status, suspension)',
  })
  @ApiParam(WS)
  @ApiParam(CONTRACT)
  updateContract(
    @Param('workspaceId') workspaceId: string,
    @Param('contractId') contractId: string,
    @Body() dto: UpdateContractDto,
    @Request() req: any,
  ) {
    return this.service.updateContract(
      workspaceId,
      contractId,
      dto,
      req.user.id,
    );
  }

  @Delete('player-contracts/:contractId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a player contract' })
  @ApiParam(WS)
  @ApiParam(CONTRACT)
  deleteContract(
    @Param('workspaceId') workspaceId: string,
    @Param('contractId') contractId: string,
    @Request() req: any,
  ) {
    return this.service.deleteContract(workspaceId, contractId, req.user.id);
  }

  // ─── Release / Replace ───────────────────────────────────────────────

  @Post('teams/:teamId/release')
  @ApiOperation({
    summary: 'Release a player from a team (terminates in-season contracts)',
  })
  @ApiParam(WS)
  @ApiParam(TEAM)
  releasePlayer(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Body() dto: ReleasePlayerDto,
    @Request() req: any,
  ) {
    return this.service.releasePlayer(workspaceId, teamId, dto, req.user.id);
  }

  @Post('roster-replace')
  @ApiOperation({
    summary:
      'Replace a player — releases outgoing + creates a new contract for incoming',
  })
  @ApiParam(WS)
  replacePlayer(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ReplacePlayerDto,
    @Request() req: any,
  ) {
    return this.service.replacePlayer(workspaceId, dto, req.user.id);
  }

  @Get('roster-releases')
  @ApiOperation({ summary: 'List roster release records' })
  @ApiParam(WS)
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'playerId', required: false })
  getReleases(
    @Param('workspaceId') workspaceId: string,
    @Query('teamId') teamId: string,
    @Query('playerId') playerId: string,
    @Request() req: any,
  ) {
    return this.service.getReleases(workspaceId, req.user.id, {
      teamId,
      playerId,
    });
  }

  // ─── Eligibility ─────────────────────────────────────────────────────

  @Post('roster-eligibility-check')
  @ApiOperation({
    summary:
      'Check whether a player is eligible for a match (contract, suspension, registration)',
  })
  @ApiParam(WS)
  checkEligibility(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CheckEligibilityDto,
    @Request() req: any,
  ) {
    return this.service.checkEligibility(workspaceId, dto, req.user.id);
  }

  // ─── Carry forward ───────────────────────────────────────────────────

  @Post('roster-carry-forward')
  @ApiOperation({
    summary: 'Carry active contracts forward from one season to the next',
  })
  @ApiParam(WS)
  carryForward(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CarryForwardDto,
    @Request() req: any,
  ) {
    return this.service.carryForward(workspaceId, dto, req.user.id);
  }
}
