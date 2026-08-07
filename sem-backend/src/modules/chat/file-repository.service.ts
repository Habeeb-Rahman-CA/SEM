import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceFileRepositoryFolder } from './entities/workspace-file-repository-folder.entity';
import { WorkspaceFileRepositoryItem } from './entities/workspace-file-repository-item.entity';
import { MatchDiscussionNoteEntity } from './entities/match-discussion-note.entity';

@Injectable()
export class FileRepositoryService {
  constructor(
    @InjectRepository(WorkspaceFileRepositoryFolder)
    private folderRepo: Repository<WorkspaceFileRepositoryFolder>,
    @InjectRepository(WorkspaceFileRepositoryItem)
    private itemRepo: Repository<WorkspaceFileRepositoryItem>,
    @InjectRepository(MatchDiscussionNoteEntity)
    private matchNoteRepo: Repository<MatchDiscussionNoteEntity>,
  ) {}

  async getFolders(workspaceId: string) {
    const folders = await this.folderRepo.find({
      where: { workspaceId },
      relations: { items: true },
      order: { name: 'ASC' },
    });

    if (folders.length === 0) {
      // Seed default master folders for new workspaces
      const defaults = [
        {
          workspaceId,
          name: 'Match Reports 2026',
          icon: 'fi-rr-folder',
          color: 'text-violet-400 bg-violet-500/20',
        },
        {
          workspaceId,
          name: 'Tournament Media & Photos',
          icon: 'fi-rr-folder-image',
          color: 'text-emerald-400 bg-emerald-500/20',
        },
        {
          workspaceId,
          name: 'Tactical Playbooks & Specs',
          icon: 'fi-rr-folder-download',
          color: 'text-cyan-400 bg-cyan-500/20',
        },
        {
          workspaceId,
          name: 'Official Permits & Certificates',
          icon: 'fi-rr-folder-lock',
          color: 'text-amber-400 bg-amber-500/20',
        },
      ];
      return await this.folderRepo.save(this.folderRepo.create(defaults));
    }

    return folders;
  }

  async createFolder(
    workspaceId: string,
    name: string,
    icon?: string,
    color?: string,
    createdBy?: string,
  ) {
    const folder = this.folderRepo.create({
      workspaceId,
      name,
      icon: icon || 'fi-rr-folder',
      color: color || 'text-violet-400 bg-violet-500/20',
      createdBy,
    });
    return await this.folderRepo.save(folder);
  }

  async getFiles(workspaceId: string, category?: string, folderId?: string) {
    const where: any = { workspaceId };
    if (category && category !== 'all') {
      where.category = category;
    }
    if (folderId) {
      where.folderId = folderId;
    }

    return await this.itemRepo.find({
      where,
      relations: { folder: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createFile(data: Partial<WorkspaceFileRepositoryItem>) {
    const item = this.itemRepo.create(data);
    return await this.itemRepo.save(item);
  }

  async togglePin(id: string) {
    const file = await this.itemRepo.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    file.isPinned = !file.isPinned;
    return await this.itemRepo.save(file);
  }

  async getMatchNotes(workspaceId: string, matchId: string) {
    return await this.matchNoteRepo.find({
      where: { workspaceId, matchId },
      order: { createdAt: 'ASC' },
    });
  }

  async createMatchNote(data: Partial<MatchDiscussionNoteEntity>) {
    const note = this.matchNoteRepo.create(data);
    return await this.matchNoteRepo.save(note);
  }
}
