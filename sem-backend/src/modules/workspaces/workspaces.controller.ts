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
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { BulkImportMembersDto } from './dto/bulk-import-members.dto';

const WS_ID = {
  name: 'id',
  description: 'Workspace UUID',
  example: 'a1b2c3d4-0000-0000-0000-000000000000',
};
const UNAUTH = {
  status: 401,
  description: 'Unauthenticated — valid JWT required',
};
const FORBIDDEN = {
  status: 403,
  description: 'Insufficient workspace permissions',
};
const NOT_FOUND = { status: 404, description: 'Workspace not found' };

@ApiTags('workspaces')
@ApiBearerAuth()
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  // ─── Workspace CRUD ───────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Create a workspace',
    description:
      'Creates a new workspace and makes the requesting user its owner.',
  })
  @ApiResponse({ status: 201, description: 'Workspace created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse(UNAUTH)
  create(@Body() dto: CreateWorkspaceDto, @Request() req: any) {
    return this.workspacesService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List my workspaces',
    description:
      'Returns all workspaces the authenticated user belongs to, including their role in each.',
  })
  @ApiResponse({ status: 200, description: 'Array of workspaces' })
  @ApiResponse(UNAUTH)
  findAll(@Request() req: any) {
    return this.workspacesService.findAllForUser(req.user.id);
  }

  @Get('sports')
  @ApiOperation({
    summary: 'List supported sports',
    description:
      'Returns the catalogue of sport types available for workspace configuration.',
  })
  @ApiResponse({ status: 200, description: 'Array of sport definitions' })
  getSports() {
    return this.workspacesService.getSports();
  }

  @Get('invitations/pending')
  @ApiOperation({
    summary: 'List pending invitations',
    description:
      'Returns all workspace invitations awaiting response from the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Array of pending invitations' })
  @ApiResponse(UNAUTH)
  getPendingInvitations(@Request() req: any) {
    return this.workspacesService.getPendingInvitations(req.user.id);
  }

  @Post('invitations/:workspaceId/accept')
  @ApiOperation({ summary: 'Accept a workspace invitation' })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace UUID from the invitation',
  })
  @ApiResponse({ status: 201, description: 'Accepted — user is now a member' })
  @ApiResponse({ status: 403, description: 'No pending invitation found' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  acceptInvitation(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.acceptInvitation(workspaceId, req.user.id);
  }

  @Post('invitations/:workspaceId/reject')
  @ApiOperation({ summary: 'Reject a workspace invitation' })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace UUID from the invitation',
  })
  @ApiResponse({ status: 201, description: 'Invitation rejected' })
  @ApiResponse({ status: 403, description: 'No pending invitation found' })
  rejectInvitation(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.rejectInvitation(workspaceId, req.user.id);
  }

  @Get('notifications')
  @ApiOperation({
    summary: 'List notifications',
    description: 'Returns unread notifications for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Array of notifications' })
  getNotifications(@Request() req: any) {
    return this.workspacesService.getNotifications(req.user.id);
  }

  @Post('notifications/read')
  @ApiOperation({ summary: 'Mark all notifications read' })
  @ApiResponse({ status: 201, description: 'All notifications marked as read' })
  markNotificationsRead(@Request() req: any) {
    return this.workspacesService.markNotificationsRead(req.user.id);
  }

  @Get('dashboard/overview')
  @ApiOperation({
    summary: 'Dashboard overview',
    description:
      'Aggregated stats across all user workspaces: member counts, active events, recent matches.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard data object' })
  getDashboardOverview(@Request() req: any) {
    return this.workspacesService.getDashboardOverview(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace detail' })
  @ApiParam(WS_ID)
  @ApiResponse({
    status: 200,
    description: 'Workspace with members, events and settings',
  })
  @ApiResponse(FORBIDDEN)
  @ApiResponse(NOT_FOUND)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a workspace',
    description:
      'Update name, logo, description, or settings. Requires owner or admin role.',
  })
  @ApiParam(WS_ID)
  @ApiResponse({ status: 200, description: 'Updated workspace' })
  @ApiResponse(FORBIDDEN)
  @ApiResponse(NOT_FOUND)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
    @Request() req: any,
  ) {
    return this.workspacesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a workspace',
    description:
      'Permanently deletes the workspace and all its data. Owner only.',
  })
  @ApiParam(WS_ID)
  @ApiResponse({ status: 204, description: 'Workspace deleted' })
  @ApiResponse({
    status: 403,
    description: 'Only the workspace owner can delete it',
  })
  @ApiResponse(NOT_FOUND)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.remove(id, req.user.id);
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  @Get(':id/members')
  @ApiOperation({ summary: 'List members' })
  @ApiParam(WS_ID)
  @ApiResponse({
    status: 200,
    description: 'Array of workspace members with roles',
  })
  @ApiResponse(FORBIDDEN)
  getMembers(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.getMembers(id, req.user.id);
  }

  @Post(':id/members')
  @ApiOperation({
    summary: 'Invite a member',
    description:
      'Sends an invitation to an existing user by username. The user must accept before gaining access.',
  })
  @ApiParam(WS_ID)
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  @ApiResponse({
    status: 400,
    description: 'User not found or already a member',
  })
  @ApiResponse(FORBIDDEN)
  inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @Request() req: any,
  ) {
    return this.workspacesService.inviteMember(id, dto, req.user.id);
  }

  @Post(':id/members/bulk')
  @ApiOperation({
    summary: 'Bulk import members',
    description:
      'Invites multiple users at once. Returns a per-user success/failure summary.',
  })
  @ApiParam(WS_ID)
  @ApiResponse({ status: 201, description: 'Bulk import result' })
  @ApiResponse(FORBIDDEN)
  bulkImportMembers(
    @Param('id') id: string,
    @Body() dto: BulkImportMembersDto,
    @Request() req: any,
  ) {
    return this.workspacesService.bulkImportMembers(id, dto, req.user.id);
  }

  @Post(':id/join')
  @ApiOperation({
    summary: 'Join a public workspace',
    description:
      'Self-join without an invitation. Only works for public workspaces.',
  })
  @ApiParam(WS_ID)
  @ApiResponse({ status: 201, description: 'Joined successfully' })
  @ApiResponse({
    status: 403,
    description: 'Workspace is private or user is already a member',
  })
  joinWorkspace(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.joinWorkspace(id, req.user.id);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update member role' })
  @ApiParam(WS_ID)
  @ApiParam({ name: 'userId', description: 'UUID of the member to update' })
  @ApiResponse({ status: 200, description: 'Member role updated' })
  @ApiResponse({ status: 403, description: "Cannot change the owner's role" })
  @ApiResponse({
    status: 404,
    description: 'Member not found in this workspace',
  })
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Request() req: any,
  ) {
    return this.workspacesService.updateMemberRole(
      id,
      userId,
      dto,
      req.user.id,
    );
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a member',
    description:
      'Removes a user from the workspace. Members can remove themselves; admins/owners can remove anyone.',
  })
  @ApiParam(WS_ID)
  @ApiParam({ name: 'userId', description: 'UUID of the member to remove' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  @ApiResponse({
    status: 403,
    description: 'Cannot remove the workspace owner',
  })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.workspacesService.removeMember(id, userId, req.user.id);
  }

  // ─── Roles ────────────────────────────────────────────────────────────────

  @Get(':id/roles')
  @ApiOperation({
    summary: 'List workspace roles',
    description:
      'Returns all roles defined for this workspace with their permissions.',
  })
  @ApiParam(WS_ID)
  @ApiResponse({ status: 200, description: 'Array of role objects' })
  getRoles(@Param('id') id: string, @Request() req: any) {
    return this.workspacesService.getRoles(id, req.user.id);
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Create a workspace role' })
  @ApiParam(WS_ID)
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({
    status: 403,
    description: 'Only owners and admins can create roles',
  })
  createRole(
    @Param('id') id: string,
    @Body() dto: CreateRoleDto,
    @Request() req: any,
  ) {
    return this.workspacesService.createRole(id, dto, req.user.id);
  }

  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a workspace role',
    description:
      'Removes a custom role. Members assigned this role must be reassigned first.',
  })
  @ApiParam(WS_ID)
  @ApiParam({ name: 'roleId', description: 'UUID of the role to delete' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  @ApiResponse({ status: 403, description: 'Only owners can delete roles' })
  @ApiResponse({ status: 409, description: 'Role still assigned to members' })
  removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Request() req: any,
  ) {}
}
