import { SetMetadata } from '@nestjs/common';

/** Metadata key used by PermissionsGuard */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Attach required permission slugs to a route handler.
 * The user must hold ALL listed permissions within the target workspace.
 *
 * @example
 * @Permissions('match.score', 'lineup.manage')
 * @Patch(':matchId/score')
 * updateScore(...) {}
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
