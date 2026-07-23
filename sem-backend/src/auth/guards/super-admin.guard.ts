import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtPayloadUser } from '../strategies/jwt.strategy';

/**
 * Guard that restricts access to platform super-administrators only.
 * Must always run AFTER JwtAuthGuard.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayloadUser | undefined = request.user;
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Super-admin access required');
    }
    return true;
  }
}
