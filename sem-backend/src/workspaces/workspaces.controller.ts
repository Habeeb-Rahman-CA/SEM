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
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { BulkImportMembersDto } from './dto/bulk-import-members.dto';
import { UpdateMatchLineupDto } from './dto/update-match-lineup.dto';
import { RateMatchPlayersDto } from './dto/rate-match-players.dto';

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

  @Get('invitations/pending')
  getPendingInvitations(@Request() req: any) {
    return this.workspacesService.getPendingInvitations(req.user.id);
  }

  @Post('invitations/:workspaceId/accept')
  acceptInvitation(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.workspacesService.acceptInvitation(workspaceId, req.user.id);
  }

  @Post('invitations/:workspaceId/reject')
  rejectInvitation(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.workspacesService.rejectInvitation(workspaceId, req.user.id);
  }

  @Get('notifications')
  getNotifications(@Request() req: any) {
    return this.workspacesService.getNotifications(req.user.id);
  }

  @Post('notifications/read')
  markNotificationsRead(@Request() req: any) {
    return this.workspacesService.markNotificationsRead(req.user.id);
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

  @Post(':id/members/bulk')
  bulkImportMembers(
    @Param('id') id: string,
    @Body() dto: BulkImportMembersDto,
    @Request() req: any,
  ) {
    return this.workspacesService.bulkImportMembers(id, dto, req.user.id);
  }

  @Post(':id/join')
  joinWorkspace(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.workspacesService.joinWorkspace(id, req.user.id);
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

  // ─── Venues ────────────────────────────────────────────────────────────────

  @Get(':id/venues')
  getVenues(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.getVenues(id, req.user.id);
  }

  @Post(':id/venues')
  createVenue(
    @Param('id') id: string,
    @Body() dto: CreateVenueDto,
    @Request() req: any,
  ) {
    return this.workspacesService.createVenue(id, dto, req.user.id);
  }

  @Patch(':id/venues/:venueId')
  updateVenue(
    @Param('id') id: string,
    @Param('venueId') venueId: string,
    @Body() dto: UpdateVenueDto,
    @Request() req: any,
  ) {
    return this.workspacesService.updateVenue(id, venueId, dto, req.user.id);
  }

  @Delete(':id/venues/:venueId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeVenue(
    @Param('id') id: string,
    @Param('venueId') venueId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.removeVenue(id, venueId, req.user.id);
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

  @Get(':id/events/:eventId/standings')
  getEventStandings(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.getEventStandings(id, eventId, req.user.id);
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

  @Delete(':id/events/:eventId/competitions/:competitionId/reset-fixtures')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetStagesAndFixtures(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.resetStagesAndFixtures(id, eventId, competitionId, req.user.id);
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

  @Get(':id/events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId/lineup')
  getMatchLineup(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.getMatchLineup(id, eventId, competitionId, stageId, matchId, req.user.id);
  }

  @Post(':id/events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId/lineup')
  saveMatchLineup(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Body() dto: UpdateMatchLineupDto,
    @Request() req: any,
  ) {
    return this.workspacesService.saveMatchLineup(id, eventId, competitionId, stageId, matchId, dto.lineups, req.user.id);
  }

  // ─── Player Ratings ──────────────────────────────────────────────────────

  /** GET all per-player ratings for a match (ordered by rating DESC) */
  @Get(':id/events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId/ratings')
  getMatchRatings(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.getMatchRatings(id, eventId, competitionId, stageId, matchId, req.user.id);
  }

  /** POST manually set / override player ratings for a match */
  @Post(':id/events/:eventId/competitions/:competitionId/stages/:stageId/matches/:matchId/ratings')
  setMatchPlayerRatings(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Param('stageId') stageId: string,
    @Param('matchId') matchId: string,
    @Body() dto: RateMatchPlayersDto,
    @Request() req: any,
  ) {
    return this.workspacesService.setMatchPlayerRatings(
      id, eventId, competitionId, stageId, matchId, dto.ratings, req.user.id,
    );
  }

  /**
   * GET best player for a competition.
   * Returns the player with the highest average rating who has played in
   * at least 50% of the competition's completed matches.
   */
  @Get(':id/events/:eventId/competitions/:competitionId/best-player')
  getCompetitionBestPlayer(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.getCompetitionBestPlayer(id, eventId, competitionId, req.user.id);
  }

  @Get(':id/events/:eventId/competitions/:competitionId/stats')
  getCompetitionStats(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.getCompetitionStats(id, eventId, competitionId, req.user.id);
  }
}
