import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';

const UNAUTH = { status: 401, description: 'Unauthenticated' };
const SA_ONLY = { status: 403, description: 'Super-admin access required' };

@ApiTags('Admin — System Settings')
@ApiBearerAuth()
@Controller('system-settings')
@UseGuards(JwtAuthGuard)
export class SystemSettingsController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  // ─── Global Roles ─────────────────────────────────────────────────────────

  @Get('roles')
  @ApiOperation({
    summary: 'List global roles',
    description:
      'Returns all platform-level roles available for assignment within workspaces (e.g., Owner, Administrator, Moderator, Member).',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of global role objects with permissions',
  })
  @ApiResponse(UNAUTH)
  getGlobalRoles() {
    return this.workspacesService.getGlobalRoles();
  }

  @Post('roles')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Create a global role (Super-admin)',
    description:
      'Defines a new platform-wide role that can be assigned to workspace members.',
  })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or slug conflict',
  })
  @ApiResponse(SA_ONLY)
  createGlobalRole(@Body() dto: CreateRoleDto, @Req() req: any) {
    const role = this.workspacesService.createGlobalRole(dto);
    this.workspacesService.logAudit(
      'CREATE_GLOBAL_ROLE',
      'MASTER_DATA',
      'Role',
      undefined,
      req.user?.userId,
      req.user?.username,
      `Created role ${dto.name}`,
    );
    return role;
  }

  @Patch('roles/:roleId')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update a global role (Super-admin)' })
  @ApiParam({ name: 'roleId', description: 'UUID of the role to update' })
  @ApiResponse({ status: 200, description: 'Updated role' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse(SA_ONLY)
  updateGlobalRole(
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: any,
  ) {
    const role = this.workspacesService.updateGlobalRole(roleId, dto);
    this.workspacesService.logAudit(
      'UPDATE_GLOBAL_ROLE',
      'MASTER_DATA',
      'Role',
      roleId,
      req.user?.userId,
      req.user?.username,
      `Updated role ${roleId}`,
    );
    return role;
  }

  @Delete('roles/:roleId')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a global role (Super-admin)',
    description:
      'Removes a platform role. Any workspace members assigned this role must be reassigned first.',
  })
  @ApiParam({ name: 'roleId', description: 'UUID of the role to delete' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  @ApiResponse({
    status: 409,
    description: 'Role is still assigned to workspace members',
  })
  @ApiResponse(SA_ONLY)
  removeGlobalRole(@Param('roleId') roleId: string, @Req() req: any) {
    this.workspacesService.logAudit(
      'DELETE_GLOBAL_ROLE',
      'MASTER_DATA',
      'Role',
      roleId,
      req.user?.userId,
      req.user?.username,
      `Deleted role ${roleId}`,
    );
    return this.workspacesService.removeGlobalRole(roleId);
  }

  // ─── Permissions ──────────────────────────────────────────────────────────

  @Get('permissions')
  @ApiOperation({
    summary: 'List global permissions',
    description:
      'Returns all permission definitions that can be assigned to roles (e.g., manage_matches, invite_members).',
  })
  @ApiResponse({ status: 200, description: 'Array of permission objects' })
  @ApiResponse(UNAUTH)
  getGlobalPermissions() {
    return this.workspacesService.getGlobalPermissions();
  }

  @Post('permissions')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Create a permission (Super-admin)',
    description:
      'Defines a new platform permission that can be granted to roles.',
  })
  @ApiResponse({ status: 201, description: 'Permission created' })
  @ApiResponse({
    status: 400,
    description: 'Slug conflict or validation error',
  })
  @ApiResponse(SA_ONLY)
  createPermission(@Body() dto: CreatePermissionDto, @Req() req: any) {
    const perm = this.workspacesService.createPermission(dto);
    this.workspacesService.logAudit(
      'CREATE_PERMISSION',
      'MASTER_DATA',
      'Permission',
      undefined,
      req.user?.userId,
      req.user?.username,
      `Created permission ${dto.name} (${dto.slug})`,
    );
    return perm;
  }

  @Patch('permissions/:permissionId')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update a permission (Super-admin)' })
  @ApiParam({
    name: 'permissionId',
    description: 'UUID of the permission to update',
  })
  @ApiResponse({ status: 200, description: 'Updated permission' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse(SA_ONLY)
  updatePermission(
    @Param('permissionId') permissionId: string,
    @Body() dto: UpdatePermissionDto,
    @Req() req: any,
  ) {
    const perm = this.workspacesService.updatePermission(permissionId, dto);
    this.workspacesService.logAudit(
      'UPDATE_PERMISSION',
      'MASTER_DATA',
      'Permission',
      permissionId,
      req.user?.userId,
      req.user?.username,
      `Updated permission ${permissionId}`,
    );
    return perm;
  }

  @Delete('permissions/:permissionId')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a permission (Super-admin)' })
  @ApiParam({
    name: 'permissionId',
    description: 'UUID of the permission to delete',
  })
  @ApiResponse({ status: 204, description: 'Permission deleted' })
  @ApiResponse({
    status: 409,
    description: 'Permission is still assigned to roles',
  })
  @ApiResponse(SA_ONLY)
  deletePermission(
    @Param('permissionId') permissionId: string,
    @Req() req: any,
  ) {
    this.workspacesService.logAudit(
      'DELETE_PERMISSION',
      'MASTER_DATA',
      'Permission',
      permissionId,
      req.user?.userId,
      req.user?.username,
      `Deleted permission ${permissionId}`,
    );
    return this.workspacesService.deletePermission(permissionId);
  }

  @Post('roles/:roleId/permissions')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Assign permissions to a role (Super-admin)',
    description:
      'Replaces the full set of permissions for the specified role. Pass an empty array to clear all permissions.',
  })
  @ApiParam({ name: 'roleId', description: 'UUID of the role to update' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        permissionIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          example: ['perm-uuid-1', 'perm-uuid-2'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Permissions updated for role' })
  @ApiResponse(SA_ONLY)
  updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body('permissionIds') permissionIds: string[],
    @Req() req: any,
  ) {
    this.workspacesService.logAudit(
      'UPDATE_ROLE_PERMISSIONS',
      'MASTER_DATA',
      'Role',
      roleId,
      req.user?.userId,
      req.user?.username,
      `Assigned ${permissionIds?.length || 0} permissions to role ${roleId}`,
    );
    return this.workspacesService.updateRolePermissions(roleId, permissionIds);
  }

  // ─── Sports ───────────────────────────────────────────────────────────────

  @Get('sports')
  @ApiOperation({
    summary: 'List global sports',
    description:
      'Returns the catalogue of sport types available on the platform (e.g., Football, Basketball, Badminton).',
  })
  @ApiResponse({ status: 200, description: 'Array of sport definitions' })
  getSports() {
    return this.workspacesService.getSports();
  }

  @Post('sports')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Create a sport (Super-admin)',
    description:
      'Adds a new sport type to the platform catalogue. Workspaces can then select this sport.',
  })
  @ApiResponse({ status: 201, description: 'Sport created' })
  @ApiResponse({
    status: 400,
    description: 'Code conflict or validation error',
  })
  @ApiResponse(SA_ONLY)
  createSport(@Body() dto: CreateSportDto, @Req() req: any) {
    const sport = this.workspacesService.createSport(dto);
    this.workspacesService.logAudit(
      'CREATE_SPORT',
      'MASTER_DATA',
      'Sport',
      undefined,
      req.user?.userId,
      req.user?.username,
      `Created sport ${dto.name} (${dto.code})`,
    );
    return sport;
  }

  @Patch('sports/:sportId')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update a sport (Super-admin)' })
  @ApiParam({ name: 'sportId', description: 'UUID of the sport to update' })
  @ApiResponse({ status: 200, description: 'Updated sport' })
  @ApiResponse({ status: 404, description: 'Sport not found' })
  @ApiResponse(SA_ONLY)
  updateSport(
    @Param('sportId') sportId: string,
    @Body() dto: UpdateSportDto,
    @Req() req: any,
  ) {
    const sport = this.workspacesService.updateSport(sportId, dto);
    this.workspacesService.logAudit(
      'UPDATE_SPORT',
      'MASTER_DATA',
      'Sport',
      sportId,
      req.user?.userId,
      req.user?.username,
      `Updated sport ${sportId}`,
    );
    return sport;
  }

  @Delete('sports/:sportId')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a sport (Super-admin)',
    description:
      'Removes a sport from the catalogue. Workspaces currently using this sport will retain their configuration.',
  })
  @ApiParam({ name: 'sportId', description: 'UUID of the sport to delete' })
  @ApiResponse({ status: 204, description: 'Sport deleted' })
  @ApiResponse(SA_ONLY)
  deleteSport(@Param('sportId') sportId: string, @Req() req: any) {
    this.workspacesService.logAudit(
      'DELETE_SPORT',
      'MASTER_DATA',
      'Sport',
      sportId,
      req.user?.userId,
      req.user?.username,
      `Deleted sport ${sportId}`,
    );
    return this.workspacesService.deleteSport(sportId);
  }

  // ─── Audit Logs & Monitoring ──────────────────────────────────────────────

  @Get('audit-logs')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'List audit logs (Super-admin)',
    description:
      'Returns a paginated list of administrative action logs recorded across the platform. Optionally filter by category (MASTER_DATA, SECURITY, etc.).',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by audit category (e.g. MASTER_DATA, SECURITY)',
    example: 'MASTER_DATA',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum records to return (default: 100)',
    example: 100,
  })
  @ApiResponse({ status: 200, description: 'Array of audit log entries' })
  @ApiResponse(SA_ONLY)
  getAuditLogs(
    @Query('category') category?: string,
    @Query('limit') limit?: number,
  ) {
    return this.workspacesService.getAuditLogs(
      category,
      limit ? Number(limit) : 100,
    );
  }

  @Delete('audit-logs')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Clear audit logs (Super-admin)',
    description:
      'Permanently deletes all audit log entries. This action is itself recorded in the audit trail before clearing.',
  })
  @ApiResponse({ status: 204, description: 'Audit logs cleared' })
  @ApiResponse(SA_ONLY)
  clearAuditLogs(@Req() req: any) {
    this.workspacesService.logAudit(
      'CLEAR_AUDIT_LOGS',
      'SECURITY',
      'AuditLog',
      undefined,
      req.user?.userId,
      req.user?.username,
      'Cleared system audit logs history',
    );
    return this.workspacesService.clearAuditLogs();
  }

  @Get('monitoring')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'System monitoring metrics (Super-admin)',
    description:
      'Returns platform-level system metrics such as database record counts, storage usage, and active user sessions.',
  })
  @ApiResponse({ status: 200, description: 'System monitoring data object' })
  @ApiResponse(SA_ONLY)
  getSystemMetrics() {
    return this.workspacesService.getSystemMetrics();
  }

  @Get('config')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Get system configuration (Super-admin)',
    description: 'Returns all platform-level key-value configuration settings.',
  })
  @ApiResponse({ status: 200, description: 'Array of system config entries' })
  @ApiResponse(SA_ONLY)
  getSystemConfigs() {
    return this.workspacesService.getSystemConfigs();
  }

  @Patch('config')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Update a system config value (Super-admin)',
    description:
      'Sets or updates a platform-level configuration key-value pair. Changes take effect immediately.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['key', 'value'],
      properties: {
        key: { type: 'string', example: 'MAX_WORKSPACE_MEMBERS' },
        value: { type: 'string', example: '100' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Config updated' })
  @ApiResponse({ status: 404, description: 'Config key not found' })
  @ApiResponse(SA_ONLY)
  updateSystemConfig(
    @Body('key') key: string,
    @Body('value') value: string,
    @Req() req: any,
  ) {
    return this.workspacesService.updateSystemConfig(
      key,
      value,
      req.user?.userId,
      req.user?.username,
    );
  }
}
