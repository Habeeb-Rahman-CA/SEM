import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SponsorsService } from './sponsors.service';

/**
 * Public-facing endpoint for the spectator event page's sponsor strip
 * and the live scoreboard's rotating "Sponsored by" panel. Filters out
 * inactive sponsors and those outside their visibility window.
 */
@ApiTags('public-sponsors')
@Controller('public/events/:eventId/sponsors')
export class PublicSponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Get()
  @ApiOperation({ summary: 'List active sponsors for a public event' })
  @ApiParam({ name: 'eventId' })
  list(@Param('eventId') eventId: string) {
    return this.sponsorsService.listPublicEventSponsors(eventId);
  }

  @Get('track/:sponsorId')
  @ApiOperation({
    summary: 'Track sponsor banner impression, click, or QR scan',
  })
  track(
    @Param('eventId') eventId: string,
    @Param('sponsorId') sponsorId: string,
  ) {
    return this.sponsorsService.trackSponsorInteraction(
      sponsorId,
      'click',
      eventId,
    );
  }
}
