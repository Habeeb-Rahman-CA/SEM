import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { Sport } from '../entities/sport.entity';
import { Competition } from '../../competitions/entities/competition.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
import { CreateSportDto } from '../dto/create-sport.dto';
import { UpdateSportDto } from '../dto/update-sport.dto';

@Injectable()
export class RolesPermissionsService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Sport)
    private readonly sportRepo: Repository<Sport>,
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
  ) {}

  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
  }

  async findRoleBySlug(
    slug: string,
    workspaceId: string | null,
  ): Promise<Role> {
    let role = null;
    if (workspaceId) {
      role = await this.roleRepo.findOne({ where: { slug, workspaceId } });
    }
    if (!role) {
      role = await this.roleRepo.findOne({ where: { slug, isSystem: true } });
    }
    if (!role) {
      throw new NotFoundException(`Role "${slug}" not found`);
    }
    return role;
  }

  async getRoles(workspaceId: string): Promise<Role[]> {
    return this.roleRepo.find({
      where: [{ isSystem: true }, { workspaceId }],
      relations: { permissions: true },
      order: { isSystem: 'DESC', name: 'ASC' },
    });
  }

  async createRole(workspaceId: string, dto: CreateRoleDto): Promise<Role> {
    const slug = this.generateSlug(dto.name);

    // check slug conflict
    const existing = await this.roleRepo.findOne({
      where: [
        { slug, workspaceId },
        { slug, isSystem: true },
      ],
    });
    if (existing) {
      throw new ConflictException(
        `Role with name "${dto.name}" already exists`,
      );
    }

    const role = this.roleRepo.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      isSystem: false,
      workspaceId,
    });
    return this.roleRepo.save(role);
  }

  async removeRole(workspaceId: string, roleId: string): Promise<void> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId, workspaceId },
    });
    if (!role) {
      throw new NotFoundException('Role not found or is a system role');
    }

    // Check if any member has this role assigned
    const assigned = await this.memberRepo.findOne({ where: { roleId } });
    if (assigned) {
      throw new ForbiddenException(
        'Cannot delete role as it is assigned to members',
      );
    }

    role.deletedAt = new Date();
    await this.roleRepo.save(role);
  }

  // ─── Global System Roles Management ────────────────────────────────────────

  async getGlobalRoles(): Promise<Role[]> {
    return this.roleRepo.find({
      where: { workspaceId: IsNull() },
      relations: { permissions: true },
      order: { isSystem: 'DESC', name: 'ASC' },
    });
  }

  async createGlobalRole(dto: CreateRoleDto): Promise<Role> {
    const slug = this.generateSlug(dto.name);
    const existing = await this.roleRepo.findOne({
      where: { slug, workspaceId: IsNull() },
    });
    if (existing) {
      throw new ConflictException(
        `Global role with name "${dto.name}" already exists`,
      );
    }

    const role = this.roleRepo.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      isSystem: true,
      workspaceId: null,
    });
    return this.roleRepo.save(role);
  }

  async updateGlobalRole(roleId: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId, workspaceId: IsNull() },
    });
    if (!role) {
      throw new NotFoundException('Global role not found');
    }

    if (dto.name && dto.name !== role.name) {
      const slug = this.generateSlug(dto.name);
      const existing = await this.roleRepo.findOne({
        where: { slug, workspaceId: IsNull() },
      });
      if (existing && existing.id !== roleId) {
        throw new ConflictException(
          `Global role with name "${dto.name}" already exists`,
        );
      }
      role.name = dto.name;
      role.slug = slug;
    }

    if (dto.description !== undefined) {
      role.description = dto.description ?? null;
    }

    return this.roleRepo.save(role);
  }

  async removeGlobalRole(roleId: string): Promise<void> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId, workspaceId: IsNull() },
    });
    if (!role) {
      throw new NotFoundException('Global role not found');
    }

    // Check if any member has this role assigned
    const assigned = await this.memberRepo.findOne({ where: { roleId } });
    if (assigned) {
      throw new ForbiddenException(
        'Cannot delete role as it is assigned to members',
      );
    }

    role.deletedAt = new Date();
    await this.roleRepo.save(role);
  }

  // ─── Global System Permissions Management ──────────────────────────────────

  async getGlobalPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find({
      order: { name: 'ASC' },
    });
  }

  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    const slug = dto.slug.trim().toLowerCase().replace(/\s+/g, '.');
    const existing = await this.permissionRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(
        `Permission with key/slug "${slug}" already exists`,
      );
    }

    const permission = this.permissionRepo.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
    });

    return this.permissionRepo.save(permission);
  }

  async updatePermission(
    permissionId: string,
    dto: UpdatePermissionDto,
  ): Promise<Permission> {
    const permission = await this.permissionRepo.findOne({
      where: { id: permissionId },
    });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    if (dto.slug && dto.slug !== permission.slug) {
      const slug = dto.slug.trim().toLowerCase().replace(/\s+/g, '.');
      const existing = await this.permissionRepo.findOne({ where: { slug } });
      if (existing && existing.id !== permissionId) {
        throw new ConflictException(
          `Permission with key/slug "${slug}" already exists`,
        );
      }
      permission.slug = slug;
    }

    if (dto.name !== undefined) permission.name = dto.name;
    if (dto.description !== undefined)
      permission.description = dto.description ?? null;

    return this.permissionRepo.save(permission);
  }

  async deletePermission(permissionId: string): Promise<void> {
    const permission = await this.permissionRepo.findOne({
      where: { id: permissionId },
    });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    permission.deletedAt = new Date();
    await this.permissionRepo.save(permission);
  }

  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (!permissionIds || permissionIds.length === 0) {
      role.permissions = [];
    } else {
      const permissions = await this.permissionRepo.find({
        where: permissionIds.map((id) => ({ id })),
      });
      role.permissions = permissions;
    }

    return this.roleRepo.save(role);
  }

  // ─── Sports Master Data ───────────────────────────────────────────────────

  async getSports(): Promise<Sport[]> {
    return await this.sportRepo.find({ order: { name: 'ASC' } });
  }

  async createSport(dto: CreateSportDto): Promise<Sport> {
    const code = dto.code.trim().toLowerCase().replace(/\s+/g, '_');
    const existingName = await this.sportRepo.findOne({
      where: { name: dto.name },
    });
    if (existingName) {
      throw new ConflictException(
        `Sport with name "${dto.name}" already exists`,
      );
    }

    const existingCode = await this.sportRepo.findOne({ where: { code } });
    if (existingCode) {
      throw new ConflictException(`Sport with code "${code}" already exists`);
    }

    const sport = this.sportRepo.create({
      name: dto.name,
      code,
      description: dto.description ?? null,
    });

    return this.sportRepo.save(sport);
  }

  async updateSport(sportId: string, dto: UpdateSportDto): Promise<Sport> {
    const sport = await this.sportRepo.findOne({ where: { id: sportId } });
    if (!sport) {
      throw new NotFoundException('Sport not found');
    }

    if (dto.name && dto.name !== sport.name) {
      const existingName = await this.sportRepo.findOne({
        where: { name: dto.name },
      });
      if (existingName && existingName.id !== sportId) {
        throw new ConflictException(
          `Sport with name "${dto.name}" already exists`,
        );
      }
      sport.name = dto.name;
    }

    if (dto.code && dto.code !== sport.code) {
      const code = dto.code.trim().toLowerCase().replace(/\s+/g, '_');
      const existingCode = await this.sportRepo.findOne({ where: { code } });
      if (existingCode && existingCode.id !== sportId) {
        throw new ConflictException(`Sport with code "${code}" already exists`);
      }
      sport.code = code;
    }

    if (dto.description !== undefined) {
      sport.description = dto.description ?? null;
    }

    return this.sportRepo.save(sport);
  }

  async deleteSport(sportId: string): Promise<void> {
    const sport = await this.sportRepo.findOne({ where: { id: sportId } });
    if (!sport) {
      throw new NotFoundException('Sport not found');
    }

    // Check if sport is used in any competition
    const competition = await this.competitionRepo.findOne({
      where: { sportId },
    });
    if (competition) {
      throw new ForbiddenException(
        'Cannot delete sport as it is associated with existing competitions',
      );
    }

    sport.deletedAt = new Date();
    await this.sportRepo.save(sport);
  }
}
