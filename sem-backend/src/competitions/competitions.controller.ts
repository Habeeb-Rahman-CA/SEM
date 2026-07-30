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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompetitionsService } from './competitions.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { UpdateMatchLineupDto } from './dto/update-match-lineup.dto';
import { RateMatchPlayersDto } from './dto/rate-match-players.dto';

// Shared param definitions
const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const EV = { name: 'eventId', description: 'Event UUID' };
const COMP = { name: 'competitionId', description: 'Competition UUID' };
const STG = { name: 'stageId', description: 'Stage UUID' };
const MATCH = { name: 'matchId', description: 'Match UUID' };

const R200 = (desc: string) => ({ status: 200, description: desc });
const R201 = (desc: string) => ({ status: 201, description: desc });
const R204 = { status: 204, description: 'Deleted successfully' };
const R401 = { status: 401, description: 'Unauthenticated' };
const R403 = { status: 403, description: 'Insufficient permissions' };
const R404 = { status: 404, description: 'Resource not found' };

@ApiTags('competitions')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  // ─── Competitions ────────────────────────────────────────────────────────

  @Get('events/:eventId/competitions')
  @ApiOperation({ summary: 'List competitions in an event' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiResponse(R200('Array of competition objects'))
  @ApiResponse(R401)
  @ApiResponse(R403)
  @ApiResponse(R404)
  getCompetitions(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.getCompetitions(
      workspaceId,
      eventId,
      req.user.id,
    );
  }

  @Post('events/:eventId/competitions')
  @ApiOperation({
    summary: 'Create a competition',
    description:
      'Creates a new competition (tournament) within an event. Supports multiple formats: round-robin, single-elimination, double-elimination, and swiss.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiResponse(R201('Competition created'))
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse(R401)
  @ApiResponse(R403)
  createCompetition(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Body() dto: CreateCompetitionDto,
    @Request() req: any,
  ) {
    return this.competitionsService.createCompetition(
      workspaceId,
      eventId,
      dto,
      req.user.id,
    );
  }

  @Patch('events/:eventId/competitions/:competitionId')
  @ApiOperation({ summary: 'Update a competition' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiResponse(R200('Updated competition'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  updateCompetition(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Body() dto: UpdateCompetitionDto,
    @Request() req: any,
  ) {
    return this.competitionsService.updateCompetition(
      workspaceId,
      eventId,
      competitionId,
      dto,
      req.user.id,
    );
  }

  @Delete('events/:eventId/competitions/:competitionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a competition' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiResponse(R204)
  @ApiResponse(R403)
  @ApiResponse(R404)
  removeCompetition(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.removeCompetition(
      workspaceId,
      eventId,
      competitionId,
      req.user.id,
    );
  }

  // ─── Competition Teams ───────────────────────────────────────────────────

  @Get('events/:eventId/competitions/:competitionId/teams')
  @ApiOperation({ summary: 'List teams in a competition' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiResponse(R200('Array of enrolled teams'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  getCompetitionTeams(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.getCompetitionTeams(
      workspaceId,
      eventId,
      competitionId,
      req.user.id,
    );
  }

  @Post('events/:eventId/competitions/:competitionId/teams')
  @ApiOperation({
    summary: 'Add a team to a competition',
    description:
      'Enrolls an existing workspace team into the competition. The competition must not have fixtures generated yet.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiResponse(R201('Team added to competition'))
  @ApiResponse({
    status: 409,
    description: 'Team already enrolled or fixtures already generated',
  })
  @ApiResponse(R403)
  @ApiResponse(R404)
  addTeamToCompetition(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Body('teamId') teamId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.addTeamToCompetition(
      workspaceId,
      eventId,
      competitionId,
      teamId,
      req.user.id,
    );
  }

  @Delete('events/:eventId/competitions/:competitionId/teams/:teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a team from a competition' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam({ name: 'teamId', description: 'Team UUID to unenroll' })
  @ApiResponse(R204)
  @ApiResponse(R403)
  @ApiResponse(R404)
  removeTeamFromCompetition(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('teamId') teamId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.removeTeamFromCompetition(
      workspaceId,
      eventId,
      competitionId,
      teamId,
      req.user.id,
    );
  }

  // ─── Fixture Generator ──────────────────────────────────────────────────

  @Post('events/:eventId/competitions/:competitionId/generate-fixtures')
  @ApiOperation({
    summary: 'Generate competition fixtures',
    description:
      'Automatically generates match fixtures and stages based on the competition format (round-robin, elimination, etc.) and enrolled teams. Can only be called once per competition.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiResponse(R201('Fixtures and stages generated'))
  @ApiResponse({
    status: 409,
    description: 'Fixtures already generated for this competition',
  })
  @ApiResponse({
    status: 422,
    description: 'Not enough teams enrolled to generate fixtures',
  })
  @ApiResponse(R403)
  @ApiResponse(R404)
  generateFixtures(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.generateFixtures(
      workspaceId,
      eventId,
      competitionId,
      req.user.id,
    );
  }

  // ─── Stages ─────────────────────────────────────────────────────────────

  @Get('events/:eventId/competitions/:competitionId/stages')
  @ApiOperation({
    summary: 'List competition stages',
    description:
      'Returns all stages of a competition (e.g., group stage, semi-finals, final) with their matches.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiResponse(R200('Array of stages'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  getStages(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.getStages(
      workspaceId,
      eventId,
      competitionId,
      req.user.id,
    );
  }

  @Post('events/:eventId/competitions/:competitionId/stages')
  @ApiOperation({
    summary: 'Create a stage',
    description:
      'Manually adds a stage to the competition (e.g., a custom playoff round).',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiResponse(R201('Stage created'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  createStage(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Body() dto: CreateStageDto,
    @Request() req: any,
  ) {
    return this.competitionsService.createStage(
      workspaceId,
      eventId,
      competitionId,
      dto,
      req.user.id,
    );
  }

  @Patch('events/:eventId/competitions/:competitionId/stages/:stageId')
  @ApiOperation({ summary: 'Update a stage' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiResponse(R200('Updated stage'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  updateStage(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageDto,
    @Request() req: any,
  ) {
    return this.competitionsService.updateStage(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      dto,
      req.user.id,
    );
  }

  @Get('events/:eventId/competitions/:competitionId/stages/:stageId/qualification-preview')
  @ApiOperation({ summary: 'Get stage qualification preview' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiResponse(R200('Stage qualification preview'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  getQualificationPreview(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.getQualificationPreview(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      req.user.id,
    );
  }

  @Post('events/:eventId/competitions/:competitionId/stages/:stageId/publish-qualification')
  @ApiOperation({ summary: 'Publish stage qualification' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiResponse(R200('Stage qualification published'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  publishQualification(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.publishQualification(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      req.user.id,
    );
  }

  @Delete('events/:eventId/competitions/:competitionId/stages/:stageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a stage' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiResponse(R204)
  @ApiResponse(R403)
  @ApiResponse(R404)
  removeStage(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.removeStage(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      req.user.id,
    );
  }

  @Delete('events/:eventId/competitions/:competitionId/reset-fixtures')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reset all stages and fixtures',
    description:
      'Deletes all generated stages and matches for the competition, allowing fixtures to be regenerated.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiResponse(R204)
  @ApiResponse({
    status: 409,
    description: 'Cannot reset — competition has completed matches',
  })
  @ApiResponse(R403)
  @ApiResponse(R404)
  resetStagesAndFixtures(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.resetStagesAndFixtures(
      workspaceId,
      eventId,
      competitionId,
      req.user.id,
    );
  }

  // ─── Matches ────────────────────────────────────────────────────────────

  @Get('events/:eventId/competitions/:competitionId/stages/:stageId/matches')
  @ApiOperation({ summary: 'List matches in a stage' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiResponse(R200('Array of match objects with scores and status'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  getMatches(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.getMatches(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      req.user.id,
    );
  }

  @Post('events/:eventId/competitions/:competitionId/stages/:stageId/matches')
  @ApiOperation({ summary: 'Create a match' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiResponse(R201('Match created'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  createMatch(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Body() dto: CreateMatchDto,
    @Request() req: any,
  ) {
    return this.competitionsService.createMatch(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      dto,
      req.user.id,
    );
  }

  @Patch(
    'events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId',
  )
  @ApiOperation({
    summary: 'Update a match',
    description:
      'Updates match details including scores, status (pending/live/completed), scheduled time, and venue.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiParam(MATCH)
  @ApiResponse(R200('Updated match'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  updateMatch(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Body() dto: UpdateMatchDto,
    @Request() req: any,
  ) {
    return this.competitionsService.updateMatch(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      dto,
      req.user.id,
    );
  }

  @Post(
    'events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId/lock',
  )
  @ApiOperation({ summary: 'Acquire or renew edit lock on a match' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiParam(MATCH)
  @ApiResponse(R200('Lock status'))
  @ApiResponse(R403)
  acquireMatchLock(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.acquireMatchLock(
      workspaceId,
      matchId,
      req.user.id,
      req.user.name || req.user.username || 'Official',
    );
  }

  @Post(
    'events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId/unlock',
  )
  @ApiOperation({ summary: 'Manually release edit lock on a match' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiParam(MATCH)
  @ApiResponse(R200('Lock released status'))
  @ApiResponse(R403)
  releaseMatchLock(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.releaseMatchLock(
      workspaceId,
      matchId,
      req.user.id,
    );
  }

  @Delete(
    'events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId',
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a match' })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiParam(MATCH)
  @ApiResponse(R204)
  @ApiResponse(R403)
  @ApiResponse(R404)
  removeMatch(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.removeMatch(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      req.user.id,
    );
  }

  // ─── Match Lineup ───────────────────────────────────────────────────────

  @Get(
    'events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId/lineup',
  )
  @ApiOperation({
    summary: 'Get match lineup',
    description:
      'Returns the selected player lineup for both teams in the match.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiParam(MATCH)
  @ApiResponse(R200('Lineup object per team'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  getMatchLineup(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.getMatchLineup(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      req.user.id,
    );
  }

  @Post(
    'events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId/lineup',
  )
  @ApiOperation({
    summary: 'Save match lineup',
    description:
      'Saves the player selections for both teams. Required before a match can be started.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiParam(MATCH)
  @ApiResponse(R201('Lineup saved'))
  @ApiResponse({
    status: 422,
    description: 'Lineup does not meet sport-specific requirements',
  })
  @ApiResponse(R403)
  @ApiResponse(R404)
  saveMatchLineup(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Body() dto: UpdateMatchLineupDto,
    @Request() req: any,
  ) {
    return this.competitionsService.saveMatchLineup(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      dto.lineups,
      req.user.id,
    );
  }

  // ─── Player Ratings ─────────────────────────────────────────────────────

  @Get(
    'events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId/ratings',
  )
  @ApiOperation({
    summary: 'Get match player ratings',
    description:
      'Returns post-match player performance ratings submitted by the match admin.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiParam(MATCH)
  @ApiResponse(R200('Array of player rating objects'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  getMatchRatings(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.getMatchRatings(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      req.user.id,
    );
  }

  @Post(
    'events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId/ratings',
  )
  @ApiOperation({
    summary: 'Submit match player ratings',
    description:
      'Saves performance ratings (1–10 scale) for players who participated in the match. Ratings feed into overall competition statistics.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiParam(STG)
  @ApiParam(MATCH)
  @ApiResponse(R201('Ratings saved'))
  @ApiResponse({
    status: 400,
    description: 'Invalid rating values or unknown players',
  })
  @ApiResponse(R403)
  @ApiResponse(R404)
  setMatchPlayerRatings(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Body() dto: RateMatchPlayersDto,
    @Request() req: any,
  ) {
    return this.competitionsService.setMatchPlayerRatings(
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      dto.ratings,
      req.user.id,
    );
  }

  // ─── Analytics ──────────────────────────────────────────────────────────

  @Get('events/:eventId/competitions/:competitionId/best-player')
  @ApiOperation({
    summary: 'Get competition best player',
    description:
      'Returns the highest-rated player across all matches in the competition, based on accumulated performance ratings.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiResponse(R200('Best player object with aggregated rating'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  getCompetitionBestPlayer(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.getCompetitionBestPlayer(
      workspaceId,
      eventId,
      competitionId,
      req.user.id,
    );
  }

  @Get('events/:eventId/competitions/:competitionId/stats')
  @ApiOperation({
    summary: 'Get competition statistics',
    description:
      'Returns aggregated statistics for the competition: top scorers, goal counts, team standings, and player averages.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiParam(COMP)
  @ApiResponse(R200('Competition statistics object'))
  @ApiResponse(R403)
  @ApiResponse(R404)
  getCompetitionStats(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.competitionsService.getCompetitionStats(
      workspaceId,
      eventId,
      competitionId,
      req.user.id,
    );
  }
}
