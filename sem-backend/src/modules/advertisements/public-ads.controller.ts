import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdvertisementsService } from './advertisements.service';
import type { AdPlacement } from './entities/advertisement.entity';

/**
 * Public endpoints powering AdBannerComponent on the spectator frontend.
 *
 *  - `GET /public/ads/serve` picks a creative for a placement (+ optional
 *    event scope) and returns the minimum needed to render it.
 *  - `POST /public/ads/:adId/impression` fires when the banner first
 *    becomes visible on-screen.
 *  - `POST /public/ads/:adId/click` fires on click just before the
 *    browser navigates to the target URL (sendBeacon on the frontend).
 */
@ApiTags('public-ads')
@Controller('public/ads')
export class PublicAdsController {
  constructor(private readonly adsService: AdvertisementsService) {}

  @Get('serve')
  @ApiOperation({ summary: 'Pick an ad creative for the given placement' })
  @ApiQuery({
    name: 'placement',
    enum: ['public-portal', 'public-event', 'live-hub', 'live-match'],
  })
  @ApiQuery({ name: 'eventId', required: false })
  serve(
    @Query('placement') placement: AdPlacement,
    @Query('eventId') eventId?: string,
  ) {
    return this.adsService.serveForPlacement(placement, eventId ?? null);
  }

  @Post(':adId/impression')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record an impression for the ad' })
  @ApiParam({ name: 'adId' })
  impression(
    @Param('adId') adId: string,
    @Headers() headers: Record<string, string | undefined>,
    @Req() req: Request,
  ) {
    return this.adsService.recordEvent(
      adId,
      'impression',
      this.extractIp(req),
      headers['user-agent'] ?? null,
      headers['referer'] ?? null,
    );
  }

  @Post(':adId/click')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a click for the ad' })
  @ApiParam({ name: 'adId' })
  click(
    @Param('adId') adId: string,
    @Headers() headers: Record<string, string | undefined>,
    @Req() req: Request,
  ) {
    return this.adsService.recordEvent(
      adId,
      'click',
      this.extractIp(req),
      headers['user-agent'] ?? null,
      headers['referer'] ?? null,
    );
  }

  private extractIp(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]?.trim() ?? null;
    }
    return req.socket?.remoteAddress ?? null;
  }
}
