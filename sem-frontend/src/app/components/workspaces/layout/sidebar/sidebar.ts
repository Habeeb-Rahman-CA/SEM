import { Component, input, model } from '@angular/core';
import { Workspace } from '../../../../services/workspace.service';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [AvatarComponent],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  workspace = input<Workspace | null>(null);
  isSidebarOpen = model<boolean>(true);
  activeTab = model<'overview' | 'members' | 'settings' | 'teams' | 'players' | 'events' | 'venues' | 'reports' | 'files'>('overview');
  membersCount = input<number>(0);
  teamsCount = input<number>(0);
  playersCount = input<number>(0);
  eventsCount = input<number>(0);
  venuesCount = input<number>(0);
  hasSettingsPermission = input<boolean>(false);

  closeSidebarOnMobile() {
    if (window.innerWidth < 1024) {
      this.isSidebarOpen.set(false);
    }
  }
}
