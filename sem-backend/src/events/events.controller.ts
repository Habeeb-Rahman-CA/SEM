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
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const EV = { name: 'eventId', description: 'Event UUID' };

@ApiTags('events')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({
    summary: 'List events in a workspace',
    description:
      'Returns all events (tournaments, leagues, cups) organised within the specified workspace.',
  })
  @ApiParam(WS)
  @ApiResponse({ status: 200, description: 'Array of event objects' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  getEvents(
    @Param('workspaceId') workspaceId: string,
    @Request() req: any,
    @Query('archived') archived?: string,
  ) {
    const isArchived = archived === undefined ? undefined : archived === 'true';
    return this.eventsService.getEvents(workspaceId, req.user.id, isArchived);
  }

  @Post()
  @ApiOperation({
    summary: 'Create an event',
    description:
      'Creates a new sporting event within the workspace. Events contain competitions, teams, and players.',
  })
  @ApiParam(WS)
  @ApiResponse({ status: 201, description: 'Event created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  createEvent(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateEventDto,
    @Request() req: any,
  ) {
    return this.eventsService.createEvent(workspaceId, dto, req.user.id);
  }

  @Patch(':eventId')
  @ApiOperation({
    summary: 'Update an event',
    description:
      'Updates event details such as name, description, dates, or logo.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiResponse({ status: 200, description: 'Updated event' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  updateEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEventDto,
    @Request() req: any,
  ) {
    return this.eventsService.updateEvent(
      workspaceId,
      eventId,
      dto,
      req.user.id,
    );
  }

  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an event',
    description:
      'Permanently removes the event and all its competitions, stages, and matches.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiResponse({ status: 204, description: 'Event deleted' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  removeEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.eventsService.removeEvent(workspaceId, eventId, req.user.id);
  }

  @Patch(':eventId/archive')
  @ApiOperation({
    summary: 'Archive an event',
    description: 'Archives the specified event to keep historical data organized.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiResponse({ status: 200, description: 'Event archived successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  archiveEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.eventsService.archiveEvent(workspaceId, eventId, req.user.id);
  }

  @Patch(':eventId/restore')
  @ApiOperation({
    summary: 'Restore an archived event',
    description: 'Restores the specified event from the archive to active status.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiResponse({ status: 200, description: 'Event restored successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  restoreEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.eventsService.restoreEvent(workspaceId, eventId, req.user.id);
  }

  @Get(':eventId/standings')
  @ApiOperation({
    summary: 'Get event standings',
    description:
      'Returns the current standings (rankings) for all competitions within the event, aggregated into a single leaderboard.',
  })
  @ApiParam(WS)
  @ApiParam(EV)
  @ApiResponse({ status: 200, description: 'Standings array ordered by rank' })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  getEventStandings(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.eventsService.getEventStandings(
      workspaceId,
      eventId,
      req.user.id,
    );
  }
}
