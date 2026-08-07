import {
  ChannelAccessType,
  ChannelPostingPermission,
} from '../entities/workspace-channel.entity';

export interface DefaultChannelSeed {
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  accessType: ChannelAccessType;
  postingPermission: ChannelPostingPermission;
  isDefault: boolean;
}

export const DEFAULT_CHANNELS_PRESET: DefaultChannelSeed[] = [
  {
    name: 'General',
    slug: 'general',
    description: 'Workspace-wide general discussions and updates',
    category: 'default',
    icon: 'fi fi-rr-comments',
    accessType: ChannelAccessType.PUBLIC,
    postingPermission: ChannelPostingPermission.ALL_MEMBERS,
    isDefault: true,
  },
  {
    name: 'Announcements',
    slug: 'announcements',
    description: 'Official announcements and broadcast notifications',
    category: 'default',
    icon: 'fi fi-rr-megaphone',
    accessType: ChannelAccessType.PUBLIC,
    postingPermission: ChannelPostingPermission.ADMIN_ONLY,
    isDefault: true,
  },
  {
    name: 'Organizers',
    slug: 'organizers',
    description: 'Event and tournament organizers coordination',
    category: 'operations',
    icon: 'fi fi-rr-user-gear',
    accessType: ChannelAccessType.PRIVATE,
    postingPermission: ChannelPostingPermission.ALL_MEMBERS,
    isDefault: true,
  },
  {
    name: 'Referees',
    slug: 'referees',
    description: 'Match officials, referees, and rules discussions',
    category: 'departments',
    icon: 'fi fi-rr-whistle',
    accessType: ChannelAccessType.PUBLIC,
    postingPermission: ChannelPostingPermission.ALL_MEMBERS,
    isDefault: true,
  },
  {
    name: 'Volunteers',
    slug: 'volunteers',
    description: 'Volunteer shift coordination and questions',
    category: 'departments',
    icon: 'fi fi-rr-heart-partner-handshake',
    accessType: ChannelAccessType.PUBLIC,
    postingPermission: ChannelPostingPermission.ALL_MEMBERS,
    isDefault: true,
  },
  {
    name: 'Registration Team',
    slug: 'registration-team',
    description: 'Participant and team registration operations',
    category: 'departments',
    icon: 'fi fi-rr-form',
    accessType: ChannelAccessType.PUBLIC,
    postingPermission: ChannelPostingPermission.ALL_MEMBERS,
    isDefault: true,
  },
  {
    name: 'Technical Team',
    slug: 'technical-team',
    description: 'Technical setup, stream equipment, and infrastructure',
    category: 'departments',
    icon: 'fi fi-rr-settings-sliders',
    accessType: ChannelAccessType.PUBLIC,
    postingPermission: ChannelPostingPermission.ALL_MEMBERS,
    isDefault: true,
  },
  {
    name: 'Finance',
    slug: 'finance',
    description: 'Budgeting, disbursements, and financial management',
    category: 'departments',
    icon: 'fi fi-rr-dollar',
    accessType: ChannelAccessType.PRIVATE,
    postingPermission: ChannelPostingPermission.ALL_MEMBERS,
    isDefault: true,
  },
  {
    name: 'Marketing',
    slug: 'marketing',
    description: 'Sponsorships, media promotion, and public relations',
    category: 'departments',
    icon: 'fi fi-rr-bullhorn',
    accessType: ChannelAccessType.PUBLIC,
    postingPermission: ChannelPostingPermission.ALL_MEMBERS,
    isDefault: true,
  },
  {
    name: 'Medical Team',
    slug: 'medical-team',
    description: 'First aid, medical logistics, and incident response',
    category: 'departments',
    icon: 'fi fi-rr-cross',
    accessType: ChannelAccessType.PRIVATE,
    postingPermission: ChannelPostingPermission.ALL_MEMBERS,
    isDefault: true,
  },
];
