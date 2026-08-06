import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CustomDashboardService,
  DashboardWidget,
} from './custom-dashboard.service';

@ApiTags('custom-dashboard')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/custom-dashboard')
@UseGuards(JwtAuthGuard)
export class CustomDashboardController {
  constructor(
    private readonly customDashboardService: CustomDashboardService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get workspace custom drag-and-drop dashboard widget layout',
  })
  async getDashboardLayout(
    @Param('workspaceId') workspaceId: string,
    @Request() req?: any,
  ) {
    return this.customDashboardService.getDashboardLayout(
      workspaceId,
      req?.user?.id,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Save custom drag-and-drop dashboard widget layout',
  })
  async saveDashboardLayout(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: { widgets: DashboardWidget[] },
    @Request() req?: any,
  ) {
    return this.customDashboardService.saveDashboardLayout(
      workspaceId,
      dto.widgets,
      req?.user?.id,
    );
  }

  @Post('reset')
  @ApiOperation({
    summary: 'Reset custom dashboard layout to default widget arrangement',
  })
  async resetDashboardLayout(
    @Param('workspaceId') workspaceId: string,
    @Request() req?: any,
  ) {
    return this.customDashboardService.resetDashboardLayout(
      workspaceId,
      req?.user?.id,
    );
  }
}
