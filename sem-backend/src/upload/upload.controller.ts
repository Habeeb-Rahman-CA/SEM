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
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const validTypes = ['workspace', 'team', 'user', 'event'];
    if (!type || !validTypes.includes(type)) {
      throw new BadRequestException(
        `Invalid upload type. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    let folder = 'sem/others';
    if (type === 'workspace') {
      folder = 'sem/workspaces/logos';
    } else if (type === 'team') {
      folder = 'sem/teams/logos';
    } else if (type === 'user') {
      folder = 'sem/users/profiles';
    } else if (type === 'event') {
      folder = 'sem/events/logos';
    }

    try {
      const result = await this.cloudinaryService.uploadFile(file, folder);
      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error: any) {
      throw new BadRequestException(`Cloudinary upload failed: ${error.message || error}`);
    }
  }
}
