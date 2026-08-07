import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileRepositoryService } from './file-repository.service';

@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class FileRepositoryController {
  constructor(private readonly service: FileRepositoryService) {}

  @Get('file-repository/folders')
  async getFolders(@Param('workspaceId') workspaceId: string) {
    return await this.service.getFolders(workspaceId);
  }

  @Post('file-repository/folders')
  async createFolder(
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: { name: string; icon?: string; color?: string; createdBy?: string },
  ) {
    return await this.service.createFolder(
      workspaceId,
      body.name,
      body.icon,
      body.color,
      body.createdBy,
    );
  }

  @Get('file-repository/files')
  async getFiles(
    @Param('workspaceId') workspaceId: string,
    @Query('category') category?: string,
    @Query('folderId') folderId?: string,
  ) {
    return await this.service.getFiles(workspaceId, category, folderId);
  }

  @Post('file-repository/files')
  async createFile(
    @Param('workspaceId') workspaceId: string,
    @Body() body: any,
  ) {
    return await this.service.createFile({ ...body, workspaceId });
  }

  @Patch('file-repository/files/:id/pin')
  async togglePin(@Param('id') id: string) {
    return await this.service.togglePin(id);
  }

  @Get('matches/:matchId/notes')
  async getMatchNotes(
    @Param('workspaceId') workspaceId: string,
    @Param('matchId') matchId: string,
  ) {
    return await this.service.getMatchNotes(workspaceId, matchId);
  }

  @Post('matches/:matchId/notes')
  async createMatchNote(
    @Param('workspaceId') workspaceId: string,
    @Param('matchId') matchId: string,
    @Body() body: any,
  ) {
    return await this.service.createMatchNote({
      ...body,
      workspaceId,
      matchId,
    });
  }
}
