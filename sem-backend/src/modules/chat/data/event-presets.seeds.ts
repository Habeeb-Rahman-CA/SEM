export interface EventPresetSeed {
  presetKey: string;
  title: string;
  subChannels: {
    name: string;
    icon: string;
    description: string;
    selected: boolean;
  }[];
}

export const DEFAULT_EVENT_PRESETS_SEED: EventPresetSeed[] = [
  {
    presetKey: 'tournament',
    title: 'Cricket Tournament',
    subChannels: [
      {
        name: 'Organizers',
        icon: 'fi fi-rr-user-gear',
        description: 'Core event organization & planning',
        selected: true,
      },
      {
        name: 'Referees',
        icon: 'fi fi-rr-whistle',
        description: 'Match officiating & referee rules',
        selected: true,
      },
      {
        name: 'Volunteers',
        icon: 'fi fi-rr-heart',
        description: 'Volunteer coordination & schedule',
        selected: true,
      },
      {
        name: 'Teams',
        icon: 'fi fi-rr-users-alt',
        description: 'Team captains & player announcements',
        selected: true,
      },
      {
        name: 'Sponsors',
        icon: 'fi fi-rr-gem',
        description: 'Sponsor relations & VIP hospitality',
        selected: true,
      },
    ],
  },
  {
    presetKey: 'league',
    title: 'Football League',
    subChannels: [
      {
        name: 'League Management',
        icon: 'fi fi-rr-trophy',
        description: 'Overall league governance & standings',
        selected: true,
      },
      {
        name: 'Referees & Officiating',
        icon: 'fi fi-rr-whistle',
        description: 'Referee match assignments',
        selected: true,
      },
      {
        name: 'Team Captains',
        icon: 'fi fi-rr-shield',
        description: 'Direct channel for team leaders',
        selected: true,
      },
      {
        name: 'Media & Broadcasting',
        icon: 'fi fi-rr-camera',
        description: 'Live streaming & media coverage',
        selected: true,
      },
    ],
  },
  {
    presetKey: 'corporate',
    title: 'Sponsors & VIP Relations',
    subChannels: [
      {
        name: 'Executive Sponsors',
        icon: 'fi fi-rr-briefcase',
        description: 'High level sponsor discussions',
        selected: true,
      },
      {
        name: 'Partner Relations',
        icon: 'fi fi-rr-handshake',
        description: 'Partner logos & branding compliance',
        selected: true,
      },
      {
        name: 'VIP Lounge',
        icon: 'fi fi-rr-star',
        description: 'VIP hospitality & guest lists',
        selected: true,
      },
    ],
  },
];
