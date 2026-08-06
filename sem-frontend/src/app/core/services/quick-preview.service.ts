import { Injectable, signal } from '@angular/core';

export type PreviewEntityType = 'player' | 'team' | 'event' | 'competition' | 'match';

export interface QuickPreviewData {
  type: PreviewEntityType;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  badge?: string;
  badgeColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  details: { label: string; value: string | number }[];
  tags?: string[];
  description?: string;
  rawEntity?: any;
  onViewFull?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class QuickPreviewService {
  previewData = signal<QuickPreviewData | null>(null);
  isOpen = signal<boolean>(false);

  openPreview(data: QuickPreviewData) {
    this.previewData.set(data);
    this.isOpen.set(true);
  }

  closePreview() {
    this.isOpen.set(false);
    this.previewData.set(null);
  }

  /** Quick helpers to preview specific entity models directly */
  previewPlayer(player: any, onViewFull?: () => void) {
    this.openPreview({
      type: 'player',
      title: player.user?.username || player.username || 'Player Profile',
      subtitle: player.team?.name ? `Team: ${player.team.name}` : 'Free Agent',
      avatarUrl: player.user?.avatarUrl || player.avatarUrl,
      badge: player.jerseyNumber ? `#${player.jerseyNumber}` : undefined,
      badgeColor: 'violet',
      primaryColor: player.team?.primaryColor,
      secondaryColor: player.team?.secondaryColor,
      description: player.bio || 'Registered athlete in this workspace.',
      details: [
        { label: 'Jersey #', value: player.jerseyNumber ? `#${player.jerseyNumber}` : 'N/A' },
        { label: 'Position', value: player.position || 'General' },
        { label: 'Team', value: player.team?.name || 'Unassigned' },
        { label: 'Status', value: player.status || 'Active' },
      ],
      rawEntity: player,
      onViewFull,
    });
  }

  previewTeam(team: any, onViewFull?: () => void) {
    this.openPreview({
      type: 'team',
      title: team.name,
      subtitle: team.code ? `Code: ${team.code}` : 'Sports Squad',
      avatarUrl: team.logoUrl,
      badge: team.code || 'TEAM',
      badgeColor: 'emerald',
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      description: team.description || 'Registered team squad in workspace.',
      details: [
        { label: 'Team Code', value: team.code || 'N/A' },
        { label: 'Coaches', value: team.coaches?.length || 0 },
        { label: 'Trophies', value: team.trophies?.length || 0 },
        { label: 'Primary Color', value: team.primaryColor || '#7c3aed' },
      ],
      rawEntity: team,
      onViewFull,
    });
  }

  previewEvent(event: any, onViewFull?: () => void) {
    this.openPreview({
      type: 'event',
      title: event.name,
      subtitle: event.sport ? `Sport: ${event.sport}` : 'Sports Event',
      avatarUrl: event.logoUrl,
      badge: event.status?.toUpperCase() || 'UPCOMING',
      badgeColor: event.status === 'ongoing' ? 'emerald' : 'violet',
      description: event.description || 'Organized competition event.',
      details: [
        { label: 'Status', value: event.status || 'Upcoming' },
        { label: 'Venue', value: event.venue || 'Main Stadium' },
        { label: 'Organizers', value: event.organizers || 'Workspace Admin' },
        { label: 'Public Page', value: event.isPublic ? 'Publicly Visible' : 'Private' },
      ],
      rawEntity: event,
      onViewFull,
    });
  }
}
