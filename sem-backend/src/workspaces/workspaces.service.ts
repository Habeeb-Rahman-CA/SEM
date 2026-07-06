import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember, WorkspaceRole } from './entities/workspace-member.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (await this.workspaceRepo.findOne({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateWorkspaceDto, ownerId: string): Promise<Workspace> {
    const baseSlug = dto.slug ?? this.generateSlug(dto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    // Check slug conflict if user manually provided one
    if (dto.slug && slug !== dto.slug) {
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    const workspace = this.workspaceRepo.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      logoUrl: dto.logoUrl ?? null,
      ownerId,
    });

    const savedWorkspace = await this.workspaceRepo.save(workspace);

    // Auto-add owner as a OWNER-role member
    const ownerMember = this.memberRepo.create({
      workspaceId: savedWorkspace.id,
      userId: ownerId,
      role: WorkspaceRole.OWNER,
    });
    await this.memberRepo.save(ownerMember);

    return savedWorkspace;
  }

  // ─── Find all workspaces for a user ───────────────────────────────────────

  async findAllForUser(userId: string): Promise<Workspace[]> {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: { workspace: true },
    });
    return memberships.map((m) => m.workspace);
  }

  // ─── Find one ─────────────────────────────────────────────────────────────

  async findOne(id: string, userId: string): Promise<Workspace> {
    await this.ensureMember(id, userId);
    const workspace = await this.workspaceRepo.findOne({
      where: { id },
      relations: { members: { user: true } },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async findBySlug(slug: string, userId: string): Promise<Workspace> {
    const workspace = await this.workspaceRepo.findOne({
      where: { slug },
      relations: { members: { user: true } },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    await this.ensureMember(workspace.id, userId);
    return workspace;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateWorkspaceDto, userId: string): Promise<Workspace> {
    await this.ensureAdminOrOwner(id, userId);

    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    if (dto.slug && dto.slug !== workspace.slug) {
      const existing = await this.workspaceRepo.findOne({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    Object.assign(workspace, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
    });

    return this.workspaceRepo.save(workspace);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(id: string, userId: string): Promise<void> {
    await this.ensureOwner(id, userId);
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    await this.workspaceRepo.remove(workspace);
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  async getMembers(workspaceId: string, userId: string): Promise<WorkspaceMember[]> {
    await this.ensureMember(workspaceId, userId);
    return this.memberRepo.find({
      where: { workspaceId },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
    });
  }

  async addMember(
    workspaceId: string,
    targetUserId: string,
    role: WorkspaceRole,
    requesterId: string,
  ): Promise<WorkspaceMember> {
    await this.ensureAdminOrOwner(workspaceId, requesterId);

    const existing = await this.memberRepo.findOne({
      where: { workspaceId, userId: targetUserId },
    });
    if (existing) throw new ConflictException('User is already a member of this workspace');

    const member = this.memberRepo.create({ workspaceId, userId: targetUserId, role });
    return this.memberRepo.save(member);
  }

  async removeMember(
    workspaceId: string,
    targetUserId: string,
    requesterId: string,
  ): Promise<void> {
    await this.ensureAdminOrOwner(workspaceId, requesterId);

    const ownerMembership = await this.memberRepo.findOne({
      where: { workspaceId, userId: targetUserId, role: WorkspaceRole.OWNER },
    });
    if (ownerMembership) throw new ForbiddenException('Cannot remove the workspace owner');

    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId: targetUserId },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.memberRepo.remove(member);
  }

  // ─── Access Guards ────────────────────────────────────────────────────────

  async ensureMember(workspaceId: string, userId: string): Promise<WorkspaceMember> {
    const member = await this.memberRepo.findOne({ where: { workspaceId, userId } });
    if (!member) throw new ForbiddenException('You are not a member of this workspace');
    return member;
  }

  private async ensureAdminOrOwner(workspaceId: string, userId: string): Promise<void> {
    const member = await this.ensureMember(workspaceId, userId);
    if (![WorkspaceRole.OWNER, WorkspaceRole.ADMIN].includes(member.role)) {
      throw new ForbiddenException('Only admins and owners can perform this action');
    }
  }

  private async ensureOwner(workspaceId: string, userId: string): Promise<void> {
    const member = await this.ensureMember(workspaceId, userId);
    if (member.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Only the workspace owner can perform this action');
    }
  }
}
