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
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRole } from './entities/workspace-member.entity';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';


@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}


  // ─── Workspace CRUD ───────────────────────────────────────────────────────

  @Post()
  create(@Body() dto: CreateWorkspaceDto, @Request() req: any) {
    return this.workspacesService.create(dto, req.user.id);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.workspacesService.findAllForUser(req.user.id);
  }

  @Get('sports')
  getSports() {
    return this.workspacesService.getSports();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
    @Request() req: any,
  ) {
    return this.workspacesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.remove(id, req.user.id);
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  @Get(':id/members')
  getMembers(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.getMembers(id, req.user.id);
  }

  @Post(':id/members')
  inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @Request() req: any,
  ) {
    return this.workspacesService.inviteMember(id, dto, req.user.id);
  }

  @Patch(':id/members/:userId')
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Request() req: any,
  ) {
    return this.workspacesService.updateMemberRole(id, userId, dto, req.user.id);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.removeMember(id, userId, req.user.id);
  }

  // ─── Roles ────────────────────────────────────────────────────────────────

  @Get(':id/roles')
  getRoles(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.getRoles(id, req.user.id);
  }

  @Post(':id/roles')
  createRole(
    @Param('id') id: string,
    @Body() dto: CreateRoleDto,
    @Request() req: any,
  ) {
    return this.workspacesService.createRole(id, dto, req.user.id);
  }

  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.removeRole(id, roleId, req.user.id);
  }

  // ─── Teams ────────────────────────────────────────────────────────────────

  @Get(':id/teams')
  getTeams(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.getTeams(id, req.user.id);
  }

  @Post(':id/teams')
  createTeam(
    @Param('id') id: string,
    @Body() dto: CreateTeamDto,
    @Request() req: any,
  ) {
    return this.workspacesService.createTeam(id, dto, req.user.id);
  }

  @Patch(':id/teams/:teamId')
  updateTeam(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
    @Request() req: any,
  ) {
    return this.workspacesService.updateTeam(id, teamId, dto, req.user.id);
  }

  @Delete(':id/teams/:teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTeam(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.removeTeam(id, teamId, req.user.id);
  }

  // ─── Players ──────────────────────────────────────────────────────────────

  @Get(':id/players')
  getPlayers(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.getPlayers(id, req.user.id);
  }

  @Post(':id/players')
  createPlayer(
    @Param('id') id: string,
    @Body() dto: CreatePlayerDto,
    @Request() req: any,
  ) {
    return this.workspacesService.createPlayer(id, dto, req.user.id);
  }

  @Patch(':id/players/:playerId')
  updatePlayer(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
    @Body() dto: UpdatePlayerDto,
    @Request() req: any,
  ) {
    return this.workspacesService.updatePlayer(id, playerId, dto, req.user.id);
  }

  @Delete(':id/players/:playerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePlayer(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.removePlayer(id, playerId, req.user.id);
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  @Get(':id/events')
  getEvents(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.getEvents(id, req.user.id);
  }

  @Post(':id/events')
  createEvent(
    @Param('id') id: string,
    @Body() dto: CreateEventDto,
    @Request() req: any,
  ) {
    return this.workspacesService.createEvent(id, dto, req.user.id);
  }

  @Patch(':id/events/:eventId')
  updateEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEventDto,
    @Request() req: any,
  ) {
    return this.workspacesService.updateEvent(id, eventId, dto, req.user.id);
  }

  @Delete(':id/events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.removeEvent(id, eventId, req.user.id);
  }

  // ─── Competitions ─────────────────────────────────────────────────────────

  @Get(':id/events/:eventId/competitions')
  getCompetitions(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.getCompetitions(id, eventId, req.user.id);
  }

  @Post(':id/events/:eventId/competitions')
  createCompetition(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Body() dto: CreateCompetitionDto,
    @Request() req: any,
  ) {
    return this.workspacesService.createCompetition(id, eventId, dto, req.user.id);
  }

  @Patch(':id/events/:eventId/competitions/:competitionId')
  updateCompetition(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Body() dto: UpdateCompetitionDto,
    @Request() req: any,
  ) {
    return this.workspacesService.updateCompetition(id, eventId, competitionId, dto, req.user.id);
  }

  @Delete(':id/events/:eventId/competitions/:competitionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCompetition(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.removeCompetition(id, eventId, competitionId, req.user.id);
  }

  // ─── Competition Teams (Participants) ─────────────────────────────────────

  @Get(':id/events/:eventId/competitions/:competitionId/teams')
  getCompetitionTeams(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.getCompetitionTeams(id, eventId, competitionId, req.user.id);
  }

  @Post(':id/events/:eventId/competitions/:competitionId/teams')
  addTeamToCompetition(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Body('teamId') teamId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.addTeamToCompetition(id, eventId, competitionId, teamId, req.user.id);
  }

  @Delete(':id/events/:eventId/competitions/:competitionId/teams/:teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTeamFromCompetition(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('teamId') teamId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.removeTeamFromCompetition(id, eventId, competitionId, teamId, req.user.id);
  }

  // ─── Fixture Generator ────────────────────────────────────────────────────

  @Post(':id/events/:eventId/competitions/:competitionId/generate-fixtures')
  generateFixtures(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.generateFixtures(id, eventId, competitionId, req.user.id);
  }

  // ─── Competition Stages ───────────────────────────────────────────────────

  @Get(':id/events/:eventId/competitions/:competitionId/stages')
  getStages(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.getStages(id, eventId, competitionId, req.user.id);
  }

  @Post(':id/events/:eventId/competitions/:competitionId/stages')
  createStage(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Body() dto: CreateStageDto,
    @Request() req: any,
  ) {
    return this.workspacesService.createStage(id, eventId, competitionId, dto, req.user.id);
  }

  @Patch(':id/events/:eventId/competitions/:competitionId/stages/:stageId')
  updateStage(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageDto,
    @Request() req: any,
  ) {
    return this.workspacesService.updateStage(id, eventId, competitionId, stageId, dto, req.user.id);
  }

  @Delete(':id/events/:eventId/competitions/:competitionId/stages/:stageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStage(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.removeStage(id, eventId, competitionId, stageId, req.user.id);
  }

  // ─── Matches ──────────────────────────────────────────────────────────────

  @Get(':id/events/:eventId/competitions/:competitionId/stages/:stageId/matches')
  getMatches(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.getMatches(id, eventId, competitionId, stageId, req.user.id);
  }

  @Post(':id/events/:eventId/competitions/:competitionId/stages/:stageId/matches')
  createMatch(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Body() dto: CreateMatchDto,
    @Request() req: any,
  ) {
    return this.workspacesService.createMatch(id, eventId, competitionId, stageId, dto, req.user.id);
  }

  @Patch(':id/events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId')
  updateMatch(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Body() dto: UpdateMatchDto,
    @Request() req: any,
  ) {
    return this.workspacesService.updateMatch(id, eventId, competitionId, stageId, matchId, dto, req.user.id);
  }

  @Delete(':id/events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMatch(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.removeMatch(id, eventId, competitionId, stageId, matchId, req.user.id);
  }
}
