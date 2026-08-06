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
} from '@nestjs/common';
import { GlobalNotesService } from './global-notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { NoteEntityType } from './entities/global-note.entity';

@Controller('workspaces/:workspaceId/notes')
@UseGuards(JwtAuthGuard)
export class GlobalNotesController {
  constructor(private readonly notesService: GlobalNotesService) {}

  @Get()
  async getNotes(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Query('entityType') entityType?: NoteEntityType,
    @Query('entityId') entityId?: string,
  ) {
    return this.notesService.getNotes(
      workspaceId,
      userId,
      entityType,
      entityId,
    );
  }

  @Post()
  async createNote(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.createNote(workspaceId, userId, dto);
  }

  @Patch(':noteId')
  async updateNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.updateNote(workspaceId, userId, noteId, dto);
  }

  @Delete(':noteId')
  async deleteNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.notesService.deleteNote(workspaceId, userId, noteId);
    return { success: true };
  }
}
