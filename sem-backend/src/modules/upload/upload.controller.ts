import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CloudinaryService } from '../../integrations/storage/cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const VALID_TYPES = ['workspace', 'team', 'user', 'event', 'venue'] as const;

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a file to Cloudinary',
    description:
      'Uploads an image file to Cloudinary and returns the resulting public URL. ' +
      'The `type` query parameter determines which Cloudinary folder the file is stored in:\n\n' +
      '| type | Cloudinary folder |\n' +
      '|---|---|\n' +
      '| `workspace` | `sem/workspaces/logos` |\n' +
      '| `team` | `sem/teams/logos` |\n' +
      '| `user` | `sem/users/profiles` |\n' +
      '| `event` | `sem/events/logos` |\n' +
      '| `venue` | `sem/venues` |\n\n' +
      'Returns the `url` and `publicId` of the uploaded asset.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Multipart file upload',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP, etc.)',
        },
      },
    },
  })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: VALID_TYPES,
    description: 'Destination context — controls the Cloudinary folder',
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example:
            'https://res.cloudinary.com/demo/image/upload/v1/sem/workspaces/logos/abc123.jpg',
        },
        publicId: { type: 'string', example: 'sem/workspaces/logos/abc123' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No file provided, invalid type, or Cloudinary upload failure',
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    if (!type || !VALID_TYPES.includes(type as any)) {
      throw new BadRequestException(
        `Invalid upload type. Must be one of: ${VALID_TYPES.join(', ')}`,
      );
    }

    const folderMap: Record<string, string> = {
      workspace: 'sem/workspaces/logos',
      team: 'sem/teams/logos',
      user: 'sem/users/profiles',
      event: 'sem/events/logos',
      venue: 'sem/venues',
    };

    try {
      const result = await this.cloudinaryService.uploadFile(
        file,
        folderMap[type],
      );
      return { url: result.secure_url, publicId: result.public_id };
    } catch (error: any) {
      throw new BadRequestException(
        `Cloudinary upload failed: ${error.message || error}`,
      );
    }
  }
}
