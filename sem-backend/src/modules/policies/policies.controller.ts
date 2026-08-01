import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };

@ApiTags('policies')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class PoliciesController {
  constructor(private readonly service: PoliciesService) {}

  @Get('policies')
  @ApiOperation({ summary: 'Get workspace auction/transfer/roster policies' })
  @ApiParam(WS)
  getPolicy(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.service.getPolicy(workspaceId, req.user.id);
  }

  @Patch('policies')
  @ApiOperation({ summary: 'Update workspace policies' })
  @ApiParam(WS)
  updatePolicy(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdatePolicyDto,
    @Request() req: any,
  ) {
    return this.service.updatePolicy(workspaceId, dto, req.user.id);
  }

  @Post('policies/validate')
  @ApiOperation({
    summary:
      'Run policy validation across auctions, transfers, rosters & finance',
  })
  @ApiParam(WS)
  @ApiQuery({ name: 'season', required: false })
  validate(
    @Param('workspaceId') workspaceId: string,
    @Query('season') season: string,
    @Request() req: any,
  ) {
    return this.service.validateWorkspace(workspaceId, req.user.id, season);
  }
}
