import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';

/**
 * Guard that enforces workspace-role-based access control.
 *
 * It reads the `workspaceId` from `req.params.workspaceId` and checks whether
 * the authenticated user has a workspace membership with one of the allowed
 * role slugs declared via the `@Roles(...)` decorator.
 *
 * Super-admins bypass all role checks.
 *
 * Must always run AFTER `JwtAuthGuard`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() declared → route is accessible to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Super-admins bypass workspace role checks
    if (user.isSuperAdmin) {
      return true;
    }

    const workspaceId =
      request.params?.workspaceId ?? request.body?.workspaceId;

    if (!workspaceId) {
      throw new ForbiddenException(
        'Workspace ID is required to evaluate role-based access',
      );
    }

    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId: user.id },
      relations: { role: true },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const hasRole = requiredRoles.includes(member.role.slug);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role(s): ${requiredRoles.join(', ')}`,
      );
    }

    // Attach membership to request for downstream use
    request.member = member;
    return true;
  }
}
