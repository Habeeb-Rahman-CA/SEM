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
import { StreamingService } from './streaming.service';
import {
  CreateSessionDto,
  UpdateViewerCountDto,
} from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import {
  CreateHighlightDto,
  UpdateHighlightDto,
} from './dto/create-highlight.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const WS = { name: 'workspaceId', description: 'Workspace UUID' };
const SESSION = { name: 'id', description: 'Stream session UUID' };
const HIGHLIGHT = { name: 'highlightId', description: 'Highlight UUID' };

/**
 * Public streaming endpoints (no auth) — used by broadcaster overlays and
 * the spectator viewing portal. Kept in a dedicated controller so the auth
 * guard on the private controller doesn't accidentally cover them.
 */
@ApiTags('streaming-public')
@Controller('public/streaming')
export class PublicStreamingController {
  constructor(private readonly service: StreamingService) {}

  @Get('live')
  @ApiOperation({ summary: 'List live and scheduled public streams' })
  getLive() {
    return this.service.getPublicLiveSessions();
  }

  @Get('sessions/:id')
  @ApiOperation({
    summary: 'Get a public stream session (embed + highlights)',
  })
  @ApiParam(SESSION)
  getSession(@Param('id') id: string) {
    return this.service.getPublicSession(id);
  }

  @Get('overlay/:id')
  @ApiOperation({
    summary: 'Live overlay JSON for broadcaster tools (OBS browser source)',
  })
  @ApiParam(SESSION)
  getOverlay(@Param('id') id: string) {
    return this.service.getOverlayData(id);
  }
}

@ApiTags('streaming')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class StreamingController {
  constructor(private readonly service: StreamingService) {}

  // ─── Summary ─────────────────────────────────────────────────────────────

  @Get('streaming/summary')
  @ApiOperation({ summary: 'Streaming dashboard summary' })
  @ApiParam(WS)
  getSummary(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.service.getSummary(workspaceId, req.user.id);
  }

  // ─── Sessions ────────────────────────────────────────────────────────────

  @Get('streaming/sessions')
  @ApiOperation({ summary: 'List stream sessions' })
  @ApiParam(WS)
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'eventId', required: false })
  getSessions(
    @Param('workspaceId') workspaceId: string,
    @Query('status') status: string,
    @Query('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.service.getSessions(workspaceId, req.user.id, {
      status,
      eventId,
    });
  }

  @Get('streaming/sessions/:id')
  @ApiOperation({ summary: 'Get a stream session with highlights & viewers' })
  @ApiParam(WS)
  @ApiParam(SESSION)
  getSessionById(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.getSessionById(workspaceId, id, req.user.id);
  }

  @Post('streaming/sessions')
  @ApiOperation({ summary: 'Create a new stream session' })
  @ApiParam(WS)
  createSession(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateSessionDto,
    @Request() req: any,
  ) {
    return this.service.createSession(workspaceId, dto, req.user.id);
  }

  @Patch('streaming/sessions/:id')
  @ApiOperation({ summary: 'Update a stream session' })
  @ApiParam(WS)
  @ApiParam(SESSION)
  updateSession(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
    @Request() req: any,
  ) {
    return this.service.updateSession(workspaceId, id, dto, req.user.id);
  }

  @Post('streaming/sessions/:id/go-live')
  @ApiOperation({ summary: 'Mark session as live (starts overlay updates)' })
  @ApiParam(WS)
  @ApiParam(SESSION)
  goLive(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.goLive(workspaceId, id, req.user.id);
  }

  @Post('streaming/sessions/:id/end')
  @ApiOperation({ summary: 'End a live stream session' })
  @ApiParam(WS)
  @ApiParam(SESSION)
  endStream(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.endStream(workspaceId, id, req.user.id);
  }

  @Post('streaming/sessions/:id/viewer-count')
  @ApiOperation({
    summary: 'Report current viewer count (also snapshots for analytics)',
  })
  @ApiParam(WS)
  @ApiParam(SESSION)
  updateViewerCount(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateViewerCountDto,
    @Request() req: any,
  ) {
    return this.service.updateViewerCount(
      workspaceId,
      id,
      dto.viewerCount,
      req.user.id,
    );
  }

  @Delete('streaming/sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a stream session' })
  @ApiParam(WS)
  @ApiParam(SESSION)
  deleteSession(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.deleteSession(workspaceId, id, req.user.id);
  }

  // ─── Highlights ──────────────────────────────────────────────────────────

  @Post('streaming/highlights')
  @ApiOperation({ summary: 'Add a highlight/clip to a session' })
  @ApiParam(WS)
  createHighlight(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateHighlightDto,
    @Request() req: any,
  ) {
    return this.service.createHighlight(workspaceId, dto, req.user.id);
  }

  @Patch('streaming/highlights/:highlightId')
  @ApiOperation({ summary: 'Update a highlight' })
  @ApiParam(WS)
  @ApiParam(HIGHLIGHT)
  updateHighlight(
    @Param('workspaceId') workspaceId: string,
    @Param('highlightId') highlightId: string,
    @Body() dto: UpdateHighlightDto,
    @Request() req: any,
  ) {
    return this.service.updateHighlight(
      workspaceId,
      highlightId,
      dto,
      req.user.id,
    );
  }

  @Delete('streaming/highlights/:highlightId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a highlight' })
  @ApiParam(WS)
  @ApiParam(HIGHLIGHT)
  deleteHighlight(
    @Param('workspaceId') workspaceId: string,
    @Param('highlightId') highlightId: string,
    @Request() req: any,
  ) {
    return this.service.deleteHighlight(workspaceId, highlightId, req.user.id);
  }
}
