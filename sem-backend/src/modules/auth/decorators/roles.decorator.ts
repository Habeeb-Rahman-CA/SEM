import { SetMetadata } from '@nestjs/common';

/** Metadata key used by RolesGuard */
export const ROLES_KEY = 'roles';

/**
 * Attach allowed workspace-role slugs to a route handler.
 *
 * @example
 * @Roles('owner', 'administrator')
 * @Delete(':id')
 * remove(...) {}
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
