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
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GalleryService } from './gallery.service';
import {
  CreateGalleryPhotoDto,
  UpdateGalleryPhotoDto,
} from './dto/create-gallery-photo.dto';
import { ListGalleryDto } from './dto/list-gallery.dto';

@ApiTags('gallery')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/events/:eventId/gallery')
@UseGuards(JwtAuthGuard)
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get('photos')
  @ApiOperation({ summary: 'List gallery photos for an event' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiQuery({ name: 'competitionId', required: false })
  @ApiQuery({ name: 'matchId', required: false })
  @ApiResponse({ status: 200, description: 'Array of photos' })
  async list(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Query() filters: ListGalleryDto,
    @Request() req: any,
  ) {
    return this.galleryService.listPhotos(
      workspaceId,
      eventId,
      filters,
      req.user.id,
    );
  }

  @Post('photos')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a gallery photo for an event',
    description:
      'Uploads an image and creates a gallery_photos row scoped to the event. Optionally tag with `competitionId` and/or `matchId` to organize the photo. Tagging a match auto-fills its competition.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        competitionId: { type: 'string', format: 'uuid' },
        matchId: { type: 'string', format: 'uuid' },
        caption: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Photo uploaded and persisted' })
  async upload(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Body() dto: CreateGalleryPhotoDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.galleryService.uploadPhoto(
      workspaceId,
      eventId,
      dto,
      file,
      req.user.id,
    );
  }

  @Patch('photos/:photoId')
  @ApiOperation({ summary: 'Update a photo (caption, tagging)' })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @Body() dto: UpdateGalleryPhotoDto,
    @Request() req: any,
  ) {
    return this.galleryService.updatePhoto(
      workspaceId,
      eventId,
      photoId,
      dto,
      req.user.id,
    );
  }

  @Delete('photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a photo (soft-delete)' })
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @Request() req: any,
  ) {
    return this.galleryService.removePhoto(
      workspaceId,
      eventId,
      photoId,
      req.user.id,
    );
  }
}
