import { Component, input, model, inject, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Workspace } from '../../features/workspaces/services/workspace.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar';
import { FavoritesService } from '../../core/services/favorites.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [AvatarComponent, RouterLink],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  favoritesService = inject(FavoritesService);

  workspace = input<Workspace | null>(null);
  isSidebarOpen = model<boolean>(true);
  activeTab = model<
    | 'overview'
    | 'members'
    | 'settings'
    | 'teams'
    | 'players'
    | 'events'
    | 'venues'
    | 'reports'
    | 'files'
    | 'volunteers'
    | 'equipment'
    | 'medical'
    | 'accreditation'
    | 'streaming'
    | 'automation'
    | 'auctions'
    | 'transfers'
    | 'rosters'
    | 'finance'
    | 'governance'
  >('overview');
  membersCount = input<number>(0);
  teamsCount = input<number>(0);
  playersCount = input<number>(0);
  eventsCount = input<number>(0);
  venuesCount = input<number>(0);
  hasSettingsPermission = input<boolean>(false);

  constructor() {
    effect(() => {
      const ws = this.workspace();
      if (ws?.id) {
        this.favoritesService.loadFavorites(ws.id).subscribe();
      }
    });
  }

  closeSidebarOnMobile() {
    if (window.innerWidth < 1024) {
      this.isSidebarOpen.set(false);
    }
  }

  removeFavorite(event: MouseEvent, id: string) {
    event.stopPropagation();
    event.preventDefault();
    const wsId = this.workspace()?.id;
    if (wsId) {
      this.favoritesService.removeFavorite(wsId, id).subscribe();
    }
  }
}
