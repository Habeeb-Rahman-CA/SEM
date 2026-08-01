import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { BootstrapService } from './bootstrap.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('bootstrap')
@Controller()
export class BootstrapController {
  constructor(private readonly service: BootstrapService) {}

  /**
   * Reference-data bundle — safe to cache aggressively client-side.
   * Sends a strong Cache-Control so browsers/CDNs can serve from cache.
   * No auth required: only static lookups are exposed.
   */
  @Get('reference-data')
  @Header('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600')
  @ApiOperation({
    summary: 'Static reference data (sports, currencies, enums) — cacheable',
  })
  getReferenceData() {
    return this.service.getReferenceData();
  }

  @Get('workspaces/:workspaceId/bootstrap')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Workspace bootstrap — merges workspace, members, roles, teams, players, events, sports, and current-user permissions into one payload',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  getWorkspaceBootstrap(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    return this.service.getWorkspaceBootstrap(workspaceId, req.user.id);
  }
}
