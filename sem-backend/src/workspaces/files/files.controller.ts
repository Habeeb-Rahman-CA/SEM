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
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RenameFileDto } from '../dto/rename-file.dto';

const WS_ID = {
  name: 'workspaceId',
  description: 'Workspace UUID',
  example: 'a1b2c3d4-0000-0000-0000-000000000000',
};

const FILE_ID = {
  name: 'fileId',
  description: 'File UUID',
  example: 'e5f6g7h8-1111-1111-1111-111111111111',
};

@ApiTags('workspace-files')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  @ApiOperation({
    summary: 'List workspace files',
    description: 'Returns all active files in a given workspace.',
  })
  @ApiParam(WS_ID)
  @ApiResponse({ status: 200, description: 'List of files' })
  listFiles(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.filesService.listFiles(workspaceId, req.user.id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a workspace file',
    description:
      'Uploads a file to the workspace. If it is an image and compress is enabled, performs compression before storing.',
  })
  @ApiParam(WS_ID)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
    },
  })
  @ApiQuery({
    name: 'compress',
    required: false,
    type: Boolean,
    description: 'Whether to compress the file if it is an image',
  })
  @ApiQuery({
    name: 'quality',
    required: false,
    type: Number,
    description: 'Compression quality (0.0 to 1.0)',
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded and scanning initiated',
  })
  uploadFile(
    @Param('workspaceId') workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('compress') compress: string,
    @Query('quality') quality: string,
    @Request() req: any,
  ) {
    const isCompress = compress === 'true';
    const numQuality = quality ? parseFloat(quality) : 0.8;
    return this.filesService.uploadFile(
      workspaceId,
      file,
      req.user.id,
      isCompress,
      numQuality,
    );
  }

  @Post(':fileId/version')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a new version of a workspace file',
    description: 'Replaces the current file version and tracks history.',
  })
  @ApiParam(WS_ID)
  @ApiParam(FILE_ID)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'New file version to upload',
        },
      },
    },
  })
  @ApiQuery({
    name: 'compress',
    required: false,
    type: Boolean,
    description: 'Whether to compress the file if it is an image',
  })
  @ApiQuery({
    name: 'quality',
    required: false,
    type: Number,
    description: 'Compression quality (0.0 to 1.0)',
  })
  @ApiResponse({ status: 201, description: 'New version uploaded' })
  uploadNewVersion(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('compress') compress: string,
    @Query('quality') quality: string,
    @Request() req: any,
  ) {
    const isCompress = compress === 'true';
    const numQuality = quality ? parseFloat(quality) : 0.8;
    return this.filesService.uploadNewVersion(
      workspaceId,
      fileId,
      file,
      req.user.id,
      isCompress,
      numQuality,
    );
  }

  @Get(':fileId/versions')
  @ApiOperation({
    summary: 'Get file version history',
    description: 'Returns list of all historical versions for a file.',
  })
  @ApiParam(WS_ID)
  @ApiParam(FILE_ID)
  @ApiResponse({ status: 200, description: 'List of versions' })
  getVersionHistory(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Request() req: any,
  ) {
    return this.filesService.getVersionHistory(
      workspaceId,
      fileId,
      req.user.id,
    );
  }

  @Patch(':fileId')
  @ApiOperation({
    summary: 'Rename workspace file',
    description: 'Changes the visible file name.',
  })
  @ApiParam(WS_ID)
  @ApiParam(FILE_ID)
  @ApiResponse({ status: 200, description: 'File renamed successfully' })
  renameFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Body() dto: RenameFileDto,
    @Request() req: any,
  ) {
    return this.filesService.renameFile(
      workspaceId,
      fileId,
      dto.name,
      req.user.id,
    );
  }

  @Delete(':fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete workspace file',
    description: 'Marks file as deleted. File history remains archived.',
  })
  @ApiParam(WS_ID)
  @ApiParam(FILE_ID)
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  deleteFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Request() req: any,
  ) {
    return this.filesService.deleteFile(workspaceId, fileId, req.user.id);
  }
}
