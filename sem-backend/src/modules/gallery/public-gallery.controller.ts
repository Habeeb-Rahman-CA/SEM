import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GalleryService } from './gallery.service';
import { ListGalleryDto } from './dto/list-gallery.dto';

@ApiTags('public-gallery')
@Controller('public/events/:eventId/gallery')
export class PublicGalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get('photos')
  @ApiOperation({
    summary: 'List gallery photos for a public event',
    description:
      'Returns gallery photos for an event that has `isPublic=true`. Supports optional filtering by competition or match.',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiQuery({ name: 'competitionId', required: false })
  @ApiQuery({ name: 'matchId', required: false })
  @ApiResponse({ status: 200, description: 'Array of photos' })
  async listPublic(
    @Param('eventId') eventId: string,
    @Query() filters: ListGalleryDto,
  ) {
    return this.galleryService.listPublicPhotos(eventId, filters);
  }
}
