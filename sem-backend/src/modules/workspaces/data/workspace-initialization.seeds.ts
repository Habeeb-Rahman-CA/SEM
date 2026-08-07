export interface SportSeed {
  name: string;
  code: string;
  description: string;
}

export interface PermissionSeed {
  slug: string;
  name: string;
  description: string;
}

export interface RoleSeed {
  slug: string;
  name: string;
  description: string;
  isSystem: boolean;
}

export const DEFAULT_SPORTS_SEED: SportSeed[] = [
  {
    name: 'Football',
    code: 'football',
    description: 'Association football/soccer',
  },
  {
    name: 'Cricket',
    code: 'cricket',
    description: 'Bat-and-ball game played between two teams',
  },
  {
    name: 'Badminton',
    code: 'badminton',
    description: 'Racket sport played with shuttlecocks',
  },
  {
    name: 'Volleyball',
    code: 'volleyball',
    description: 'Team sport played over a net',
  },
  {
    name: 'Basketball',
    code: 'basketball',
    description: 'Court game where teams shoot a ball into a hoop',
  },
  {
    name: 'Athletics',
    code: 'athletics',
    description: 'Track and field events',
  },
  {
    name: 'Table Tennis',
    code: 'table_tennis',
    description: 'Racket sport played on a flat table split by a net',
  },
  {
    name: 'Chess',
    code: 'chess',
    description: 'Board game of strategic skill for two players',
  },
  {
    name: 'Kabaddi',
    code: 'kabaddi',
    description: 'Contact sport played between two teams of seven players',
  },
  {
    name: 'Throwball',
    code: 'throwball',
    description: 'Non-contact ball sport played over a net',
  },
];

export const DEFAULT_PERMISSIONS_SEED: PermissionSeed[] = [
  {
    slug: 'workspace.read',
    name: 'Read Workspace',
    description: 'View workspace details, events, and members',
  },
  {
    slug: 'workspace.update',
    name: 'Update Workspace',
    description: 'Modify workspace name, description, and configurations',
  },
  {
    slug: 'workspace.delete',
    name: 'Delete Workspace',
    description: 'Permanently remove the workspace and all its data',
  },
  {
    slug: 'member.invite',
    name: 'Invite Members',
    description: 'Send invitations to new users to join the workspace',
  },
  {
    slug: 'member.update',
    name: 'Update Members',
    description: 'Update workspace member roles',
  },
  {
    slug: 'member.remove',
    name: 'Remove Members',
    description: 'Remove members from the workspace',
  },
  {
    slug: 'role.manage',
    name: 'Manage Roles',
    description:
      'Create, modify, and delete custom workspace roles and map permissions',
  },
  {
    slug: 'team.manage',
    name: 'Manage Teams',
    description: 'Create, edit, and delete teams inside the workspace',
  },
  {
    slug: 'player.manage',
    name: 'Manage Players',
    description: 'Add, update, or remove players in teams',
  },
  {
    slug: 'event.manage',
    name: 'Manage Events',
    description: 'Create, update, and close events',
  },
  {
    slug: 'competition.manage',
    name: 'Manage Competitions',
    description: 'Create and configure competitions for events',
  },
  {
    slug: 'match.score',
    name: 'Score Matches',
    description: 'Record, edit, and finalise scores for match fixtures',
  },
];

export const DEFAULT_ROLES_SEED: RoleSeed[] = [
  {
    slug: 'owner',
    name: 'Owner',
    description: 'Full control — delete workspace, manage all',
    isSystem: true,
  },
  {
    slug: 'administrator',
    name: 'Administrator',
    description: 'Manage members, events, settings',
    isSystem: true,
  },
  {
    slug: 'event_manager',
    name: 'Event Manager',
    description: 'Create/edit events and competitions',
    isSystem: true,
  },
  {
    slug: 'competition_manager',
    name: 'Competition Manager',
    description: 'Manage brackets, fixtures, results',
    isSystem: true,
  },
  {
    slug: 'referee',
    name: 'Referee',
    description: 'Enter match scores, manage assigned fixtures',
    isSystem: true,
  },
  {
    slug: 'statistician',
    name: 'Statistician',
    description: 'Enter/edit player & match statistics',
    isSystem: true,
  },
  {
    slug: 'media_team',
    name: 'Media Team',
    description: 'Upload photos, announcements',
    isSystem: true,
  },
  {
    slug: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to all workspace data',
    isSystem: true,
  },
];

export const ROLE_PERMISSION_MAPPING_SEED: Record<string, string[]> = {
  owner: [
    'workspace.read',
    'workspace.update',
    'workspace.delete',
    'member.invite',
    'member.update',
    'member.remove',
    'role.manage',
    'team.manage',
    'player.manage',
    'event.manage',
    'competition.manage',
    'match.score',
  ],
  administrator: [
    'workspace.read',
    'workspace.update',
    'member.invite',
    'member.update',
    'member.remove',
    'role.manage',
    'team.manage',
    'player.manage',
    'event.manage',
    'competition.manage',
    'match.score',
  ],
  event_manager: [
    'workspace.read',
    'team.manage',
    'player.manage',
    'event.manage',
    'competition.manage',
  ],
  competition_manager: ['workspace.read', 'competition.manage', 'match.score'],
  referee: ['workspace.read', 'match.score'],
  statistician: ['workspace.read', 'match.score'],
  media_team: ['workspace.read'],
  viewer: ['workspace.read'],
};
