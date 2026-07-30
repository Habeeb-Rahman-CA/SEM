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
import { CompetitionTemplatesService } from '../competitions/services/competition-templates.service';
import { FixtureTemplatesService } from '../competitions/services/fixture-templates.service';
import { CreateCompetitionTemplateDto } from '../competitions/dto/create-competition-template.dto';
import { UpdateCompetitionTemplateDto } from '../competitions/dto/update-template-types.dto';
import { CreateFixtureTemplateDto } from '../competitions/dto/create-fixture-template.dto';
import { UpdateFixtureTemplateDto } from '../competitions/dto/update-template-types.dto';

const WS_PARAM = { name: 'workspaceId', description: 'Workspace UUID' };

// ═══════════════════════════════════════════════════════════════════
//  Competition Templates
// ═══════════════════════════════════════════════════════════════════

@ApiTags('competition-templates')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/competition-templates')
@UseGuards(JwtAuthGuard)
export class CompetitionTemplatesController {
  constructor(private readonly svc: CompetitionTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List competition templates' })
  @ApiParam(WS_PARAM)
  list(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.svc.getTemplates(workspaceId, req.user.id);
  }

  @Get(':templateId')
  @ApiOperation({ summary: 'Get single competition template' })
  @ApiParam(WS_PARAM)
  get(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Request() req: any,
  ) {
    return this.svc.getTemplate(workspaceId, templateId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create competition template from scratch' })
  @ApiParam(WS_PARAM)
  @ApiResponse({ status: 201 })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateCompetitionTemplateDto,
    @Request() req: any,
  ) {
    return this.svc.createTemplate(workspaceId, dto, req.user.id);
  }

  @Post('from-competition/:eventId/:competitionId')
  @ApiOperation({ summary: 'Save an existing competition as a template' })
  @ApiParam(WS_PARAM)
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'competitionId', description: 'Competition UUID' })
  @ApiResponse({ status: 201 })
  createFromCompetition(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Body('name') name: string,
    @Request() req: any,
  ) {
    return this.svc.createFromCompetition(
      workspaceId,
      eventId,
      competitionId,
      name,
      req.user.id,
    );
  }

  @Patch(':templateId')
  @ApiOperation({ summary: 'Update competition template' })
  @ApiParam(WS_PARAM)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateCompetitionTemplateDto,
    @Request() req: any,
  ) {
    return this.svc.updateTemplate(workspaceId, templateId, dto, req.user.id);
  }

  @Delete(':templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete competition template' })
  @ApiParam(WS_PARAM)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Request() req: any,
  ) {
    return this.svc.deleteTemplate(workspaceId, templateId, req.user.id);
  }

  @Post(':templateId/apply/:eventId/:competitionId')
  @ApiOperation({
    summary: 'Apply competition template to an existing competition',
    description:
      'Soft-deletes current stages and recreates them from the template blueprints.',
  })
  @ApiParam(WS_PARAM)
  @ApiParam({ name: 'templateId', description: 'Template UUID' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'competitionId', description: 'Competition UUID' })
  apply(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Param('eventId') eventId: string,
    @Param('competitionId') competitionId: string,
    @Request() req: any,
  ) {
    return this.svc.applyToCompetition(
      workspaceId,
      templateId,
      eventId,
      competitionId,
      req.user.id,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Fixture Templates
// ═══════════════════════════════════════════════════════════════════

@ApiTags('fixture-templates')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/fixture-templates')
@UseGuards(JwtAuthGuard)
export class FixtureTemplatesController {
  constructor(private readonly svc: FixtureTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List fixture scheduling templates' })
  @ApiParam(WS_PARAM)
  list(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.svc.getTemplates(workspaceId, req.user.id);
  }

  @Get(':templateId')
  @ApiOperation({ summary: 'Get single fixture template' })
  @ApiParam(WS_PARAM)
  get(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Request() req: any,
  ) {
    return this.svc.getTemplate(workspaceId, templateId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create fixture scheduling template' })
  @ApiParam(WS_PARAM)
  @ApiResponse({ status: 201 })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateFixtureTemplateDto,
    @Request() req: any,
  ) {
    return this.svc.createTemplate(workspaceId, dto, req.user.id);
  }

  @Patch(':templateId')
  @ApiOperation({ summary: 'Update fixture template' })
  @ApiParam(WS_PARAM)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateFixtureTemplateDto,
    @Request() req: any,
  ) {
    return this.svc.updateTemplate(workspaceId, templateId, dto, req.user.id);
  }

  @Delete(':templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete fixture template' })
  @ApiParam(WS_PARAM)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Request() req: any,
  ) {
    return this.svc.deleteTemplate(workspaceId, templateId, req.user.id);
  }

  @Get(':templateId/resolve')
  @ApiOperation({
    summary: 'Resolve fixture template into a scheduling config object',
    description:
      'Returns the computed scheduling preferences — ready for the fixture generator to consume.',
  })
  @ApiParam(WS_PARAM)
  resolve(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Request() req: any,
  ) {
    return this.svc.resolveConfig(workspaceId, templateId, req.user.id);
  }
}
