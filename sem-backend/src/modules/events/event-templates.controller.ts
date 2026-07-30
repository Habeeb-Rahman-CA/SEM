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
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { EventTemplatesService } from './event-templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { InstantiateTemplateDto } from './dto/instantiate-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const TMPL = { name: 'templateId', description: 'Template UUID' };

@ApiTags('event-templates')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/event-templates')
@UseGuards(JwtAuthGuard)
export class EventTemplatesController {
  constructor(private readonly templatesService: EventTemplatesService) {}

  // ── List ──────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List event templates in a workspace' })
  @ApiParam(WS)
  @ApiResponse({ status: 200, description: 'Array of templates' })
  getTemplates(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.templatesService.getTemplates(workspaceId, req.user.id);
  }

  // ── Get Single ────────────────────────────────────────────────────────────

  @Get(':templateId')
  @ApiOperation({ summary: 'Get a single event template' })
  @ApiParam(WS)
  @ApiParam(TMPL)
  @ApiResponse({ status: 200, description: 'Template object' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  getTemplate(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Request() req: any,
  ) {
    return this.templatesService.getTemplate(
      workspaceId,
      templateId,
      req.user.id,
    );
  }

  // ── Create from scratch ───────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new event template' })
  @ApiParam(WS)
  @ApiResponse({ status: 201, description: 'Template created' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  createTemplate(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateTemplateDto,
    @Request() req: any,
  ) {
    return this.templatesService.createTemplate(workspaceId, dto, req.user.id);
  }

  // ── Save existing event as template ───────────────────────────────────────

  @Post('from-event/:eventId')
  @ApiOperation({
    summary: 'Save an existing event as a reusable template',
    description:
      'Captures branding, settings, competitions, stages, and point systems from the given event into a new template.',
  })
  @ApiParam(WS)
  @ApiParam({ name: 'eventId', description: 'Source Event UUID' })
  @ApiResponse({ status: 201, description: 'Template created from event' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  createFromEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Body('name') name: string,
    @Request() req: any,
  ) {
    if (!name) {
      throw new Error('Template name is required');
    }
    return this.templatesService.createTemplateFromEvent(
      workspaceId,
      eventId,
      name,
      req.user.id,
    );
  }

  // ── Update ────────────────────────────────────────────────────────────────

  @Patch(':templateId')
  @ApiOperation({ summary: 'Update an event template' })
  @ApiParam(WS)
  @ApiParam(TMPL)
  @ApiResponse({ status: 200, description: 'Updated template' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  updateTemplate(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateTemplateDto,
    @Request() req: any,
  ) {
    return this.templatesService.updateTemplate(
      workspaceId,
      templateId,
      dto,
      req.user.id,
    );
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  @Delete(':templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event template' })
  @ApiParam(WS)
  @ApiParam(TMPL)
  @ApiResponse({ status: 204, description: 'Template deleted' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  deleteTemplate(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Request() req: any,
  ) {
    return this.templatesService.deleteTemplate(
      workspaceId,
      templateId,
      req.user.id,
    );
  }

  // ── Instantiate ───────────────────────────────────────────────────────────

  @Post(':templateId/instantiate')
  @ApiOperation({
    summary: 'Create a new event from a template',
    description:
      'Instantiates a fully configured event (with competitions and stages) from the selected template.',
  })
  @ApiParam(WS)
  @ApiParam(TMPL)
  @ApiResponse({ status: 201, description: 'Event created from template' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  instantiateTemplate(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Body() dto: InstantiateTemplateDto,
    @Request() req: any,
  ) {
    return this.templatesService.instantiateTemplate(
      workspaceId,
      templateId,
      dto,
      req.user.id,
    );
  }
}
