import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { CreateRoleDto } from './dto/create-role.dto';

@Controller('system-settings')
@UseGuards(JwtAuthGuard)
export class SystemSettingsController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get('roles')
  getGlobalRoles() {
    return this.workspacesService.getGlobalRoles();
  }

  @Post('roles')
  @UseGuards(SuperAdminGuard)
  createGlobalRole(@Body() dto: CreateRoleDto) {
    return this.workspacesService.createGlobalRole(dto);
  }

  @Delete('roles/:roleId')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeGlobalRole(@Param('roleId') roleId: string) {
    return this.workspacesService.removeGlobalRole(roleId);
  }

  @Get('permissions')
  getGlobalPermissions() {
    return this.workspacesService.getGlobalPermissions();
  }

  @Post('roles/:roleId/permissions')
  @UseGuards(SuperAdminGuard)
  updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.workspacesService.updateRolePermissions(roleId, permissionIds);
  }
}
