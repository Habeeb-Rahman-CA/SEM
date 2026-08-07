import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LinkPreviewsService } from './link-previews.service';

@Controller('link-previews')
@UseGuards(JwtAuthGuard)
export class LinkPreviewsController {
  constructor(private readonly service: LinkPreviewsService) {}

  @Get()
  async getPreview(@Query('url') url: string) {
    return await this.service.getPreview(url);
  }
}
