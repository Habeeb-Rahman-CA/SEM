import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalNote, NoteEntityType } from './entities/global-note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class GlobalNotesService {
  constructor(
    @InjectRepository(GlobalNote)
    private readonly repo: Repository<GlobalNote>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async getNotes(
    workspaceId: string,
    userId: string,
    entityType?: NoteEntityType,
    entityId?: string,
  ): Promise<GlobalNote[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const where: any = { workspaceId };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    return this.repo.find({
      where,
      order: { isPinned: 'DESC', createdAt: 'DESC' },
    });
  }

  async createNote(
    workspaceId: string,
    userId: string,
    dto: CreateNoteDto,
  ): Promise<GlobalNote> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const note = this.repo.create({
      workspaceId,
      userId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      content: dto.content,
      isPinned: dto.isPinned ?? false,
      color: dto.color ?? 'amber',
    });

    return this.repo.save(note);
  }

  async updateNote(
    workspaceId: string,
    userId: string,
    noteId: string,
    dto: UpdateNoteDto,
  ): Promise<GlobalNote> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const note = await this.repo.findOne({
      where: { id: noteId, workspaceId },
    });
    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }

    if (dto.content !== undefined) note.content = dto.content;
    if (dto.isPinned !== undefined) note.isPinned = dto.isPinned;
    if (dto.color !== undefined) note.color = dto.color;

    return this.repo.save(note);
  }

  async deleteNote(
    workspaceId: string,
    userId: string,
    noteId: string,
  ): Promise<void> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const result = await this.repo.delete({ id: noteId, workspaceId });
    if (result.affected === 0) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }
  }
}
