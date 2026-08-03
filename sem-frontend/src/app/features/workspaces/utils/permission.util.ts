import type { Role, WorkspaceMember, Workspace } from '../services/workspace.service';

export type RoleSlug = 'owner' | 'administrator' | 'referee' | 'viewer' | string;

export function findMemberRoleSlug(
  members: WorkspaceMember[],
  userId: string | null | undefined,
): RoleSlug {
  if (!userId) return 'viewer';
  return members.find((m) => m.userId === userId)?.role?.slug ?? 'viewer';
}

export function isWorkspaceOwner(
  workspace: Workspace | null | undefined,
  userId: string | null | undefined,
): boolean {
  return !!workspace && !!userId && workspace.ownerId === userId;
}

export function memberHasPermission(
  members: WorkspaceMember[],
  userId: string | null | undefined,
  permission: string,
): boolean {
  if (!userId) return false;
  const member = members.find((m) => m.userId === userId);
  if (!member || !member.role) return false;
  if (member.role.slug === 'owner') return true;
  return member.role.permissions?.some((p) => p.slug === permission) ?? false;
}

export function assignableRolesFor(roles: Role[]): Role[] {
  return roles.filter((r) => r.slug !== 'owner');
}

export function canManageMembersForSlug(slug: RoleSlug): boolean {
  return slug === 'owner' || slug === 'administrator';
}
