import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BrandingService } from './branding.service';

/**
 * Public branding resolver — powers the SPA's initial branding load
 * (login page, custom-domain deployments) and any spectator UI that
 * needs to render workspace-specific colors / logo.
 *
 * Resolution order:
 *   1. `?slug=<workspace-slug>` — explicit workspace context
 *   2. `Host` header — matches a verified custom domain
 *
 * Returns `null` when no verified branding is available so the caller
 * falls back to the default Taisen look.
 */
@ApiTags('public-branding')
@Controller('public/branding')
export class PublicBrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get()
  @ApiOperation({
    summary: 'Resolve workspace branding by slug or Host header',
  })
  @ApiQuery({ name: 'slug', required: false })
  async resolve(
    @Query('slug') slug: string | undefined,
    @Headers('host') host: string | undefined,
  ) {
    if (slug) {
      const bySlug = await this.brandingService.resolveBySlug(slug);
      if (bySlug) return bySlug;
    }
    if (host) {
      const byHost = await this.brandingService.resolveByHost(host);
      if (byHost) return byHost;
    }
    return null;
  }
}
