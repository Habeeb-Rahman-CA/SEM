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
import { AutomationService } from './automation.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { RunRuleDto } from './dto/run-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const RULE = { name: 'id', description: 'Automation rule UUID' };
const RUN = { name: 'runId', description: 'Automation run UUID' };

@ApiTags('automation')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class AutomationController {
  constructor(private readonly service: AutomationService) {}

  @Get('automation/summary')
  @ApiOperation({ summary: 'Automation dashboard summary' })
  @ApiParam(WS)
  getSummary(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.service.getSummary(workspaceId, req.user.id);
  }

  @Get('automation/rules')
  @ApiOperation({ summary: 'List automation rules' })
  @ApiParam(WS)
  getRules(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.service.getRules(workspaceId, req.user.id);
  }

  @Get('automation/rules/:id')
  @ApiOperation({ summary: 'Get an automation rule with run history' })
  @ApiParam(WS)
  @ApiParam(RULE)
  getRuleById(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.getRuleById(workspaceId, id, req.user.id);
  }

  @Post('automation/rules')
  @ApiOperation({ summary: 'Create an automation rule' })
  @ApiParam(WS)
  createRule(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateRuleDto,
    @Request() req: any,
  ) {
    return this.service.createRule(workspaceId, dto, req.user.id);
  }

  @Patch('automation/rules/:id')
  @ApiOperation({ summary: 'Update an automation rule' })
  @ApiParam(WS)
  @ApiParam(RULE)
  updateRule(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRuleDto,
    @Request() req: any,
  ) {
    return this.service.updateRule(workspaceId, id, dto, req.user.id);
  }

  @Delete('automation/rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an automation rule' })
  @ApiParam(WS)
  @ApiParam(RULE)
  deleteRule(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.deleteRule(workspaceId, id, req.user.id);
  }

  @Post('automation/rules/:id/run')
  @ApiOperation({ summary: 'Run an automation rule immediately' })
  @ApiParam(WS)
  @ApiParam(RULE)
  runRule(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: RunRuleDto,
    @Request() req: any,
  ) {
    return this.service.runRule(
      workspaceId,
      id,
      req.user.id,
      dto.context || {},
    );
  }

  @Get('automation/runs')
  @ApiOperation({ summary: 'List automation run history' })
  @ApiParam(WS)
  @ApiQuery({ name: 'ruleId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getRuns(
    @Param('workspaceId') workspaceId: string,
    @Query('ruleId') ruleId: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    return this.service.getRuns(workspaceId, req.user.id, {
      ruleId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('automation/runs/:runId')
  @ApiOperation({ summary: 'Get an automation run detail' })
  @ApiParam(WS)
  @ApiParam(RUN)
  getRun(
    @Param('workspaceId') workspaceId: string,
    @Param('runId') runId: string,
    @Request() req: any,
  ) {
    return this.service.getRun(workspaceId, runId, req.user.id);
  }
}
