import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SponsorsService } from './sponsors.service';
import {
  AttachSponsorDto,
  CreateSponsorDto,
  UpdateSponsorDto,
} from './dto/sponsor.dto';

@ApiTags('sponsors')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class SponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  // ─── Workspace catalog ───────────────────────────────────────────────

  @Get('sponsors')
  @ApiOperation({ summary: 'List all sponsors for the workspace' })
  @ApiParam({ name: 'workspaceId' })
  list(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.sponsorsService.listWorkspaceSponsors(workspaceId, req.user.id);
  }

  @Post('sponsors')
  @ApiOperation({ summary: 'Create a sponsor in the workspace catalog' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateSponsorDto,
    @Request() req: any,
  ) {
    return this.sponsorsService.createSponsor(workspaceId, dto, req.user.id);
  }

  @Patch('sponsors/:sponsorId')
  @ApiOperation({ summary: 'Update a workspace sponsor' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('sponsorId') sponsorId: string,
    @Body() dto: UpdateSponsorDto,
    @Request() req: any,
  ) {
    return this.sponsorsService.updateSponsor(
      workspaceId,
      sponsorId,
      dto,
      req.user.id,
    );
  }

  @Delete('sponsors/:sponsorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a workspace sponsor (soft-delete)' })
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('sponsorId') sponsorId: string,
    @Request() req: any,
  ) {
    return this.sponsorsService.removeSponsor(
      workspaceId,
      sponsorId,
      req.user.id,
    );
  }

  // ─── Per-event attachment ────────────────────────────────────────────

  @Get('events/:eventId/sponsors')
  @ApiOperation({
    summary: 'List sponsors attached to an event',
  })
  listForEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Request() req: any,
  ) {
    return this.sponsorsService.listEventSponsors(
      workspaceId,
      eventId,
      req.user.id,
    );
  }

  @Post('events/:eventId/sponsors')
  @ApiOperation({
    summary: 'Attach a workspace sponsor to an event',
  })
  attach(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Body() dto: AttachSponsorDto,
    @Request() req: any,
  ) {
    return this.sponsorsService.attachSponsor(
      workspaceId,
      eventId,
      dto,
      req.user.id,
    );
  }

  @Patch('events/:eventId/sponsors/:sponsorId')
  @ApiOperation({
    summary: 'Update the per-event tier / display order for a sponsor',
  })
  updateAttachment(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('sponsorId') sponsorId: string,
    @Body() dto: { tier?: string | null; displayOrder?: number },
    @Request() req: any,
  ) {
    return this.sponsorsService.updateEventSponsor(
      workspaceId,
      eventId,
      sponsorId,
      dto,
      req.user.id,
    );
  }

  @Delete('events/:eventId/sponsors/:sponsorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Detach a sponsor from an event' })
  detach(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('sponsorId') sponsorId: string,
    @Request() req: any,
  ) {
    return this.sponsorsService.detachSponsor(
      workspaceId,
      eventId,
      sponsorId,
      req.user.id,
    );
  }
}
