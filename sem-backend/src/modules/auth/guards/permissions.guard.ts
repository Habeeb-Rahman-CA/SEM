import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';

/**
 * Guard that enforces fine-grained permission-based access control.
 *
 * It reads `workspaceId` from route params and verifies that the authenticated
 * user's workspace role includes ALL of the permission slugs declared via
 * `@Permissions(...)`.
 *
 * Super-admins bypass all permission checks.
 *
 * Must always run AFTER `JwtAuthGuard`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPerms = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPerms || requiredPerms.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Super-admins bypass all permission checks
    if (user.isSuperAdmin) {
      return true;
    }

    const workspaceId =
      request.params?.workspaceId ?? request.body?.workspaceId;

    if (!workspaceId) {
      throw new ForbiddenException(
        'Workspace ID is required to evaluate permission-based access',
      );
    }

    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId: user.id },
      relations: { role: { permissions: true } },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const memberPermSlugs = new Set(
      member.role.permissions?.map((p) => p.slug) ?? [],
    );

    const missing = requiredPerms.filter((p) => !memberPermSlugs.has(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing permission(s): ${missing.join(', ')}`,
      );
    }

    request.member = member;
    return true;
  }
}
