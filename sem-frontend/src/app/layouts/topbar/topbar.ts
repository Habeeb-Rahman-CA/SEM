import { Component, input, model, output, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Workspace,
  Team,
  Player,
  WorkspaceEvent,
  Competition,
  Venue,
  WorkspaceMember,
  AppNotification,
  WorkspaceFile,
} from '../../features/workspaces/services/workspace.service';
import { GlobalSearchComponent } from '../global-search/global-search';
import { NotificationPanelComponent } from '../notification-panel/notification-panel';
import { UserDropdownComponent } from '../user-dropdown/user-dropdown';
import { FavoriteButtonComponent } from '../../shared/components/favorite-button/favorite-button';
import { GlobalNotesComponent } from '../../shared/components/global-notes/global-notes';
import { FavoriteEntityType } from '../../core/services/favorites.service';
import { NoteEntityType } from '../../core/services/global-notes.service';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    FormsModule,
    GlobalSearchComponent,
    NotificationPanelComponent,
    UserDropdownComponent,
    FavoriteButtonComponent,
    GlobalNotesComponent,
    BreadcrumbComponent,
  ],
  templateUrl: './topbar.html',
})
export class TopbarComponent {
  private router = inject(Router);

  workspace = input<Workspace | null>(null);
  allWorkspaces = input<Workspace[]>([]);
  activeTab = input<string>('overview');

  isNotesOpen = signal<boolean>(false);

  globalSearchQuery = model<string>('');
  showGlobalSearchResults = model<boolean>(false);
  searchResults = input.required<{
    teams: Team[];
    players: Player[];
    events: WorkspaceEvent[];
    competitions: Competition[];
    venues: Venue[];
    members: WorkspaceMember[];
    files?: WorkspaceFile[];
    totalCount: number;
  }>();

  isNotificationOpen = model<boolean>(false);
  pendingInvitations = input.required<WorkspaceMember[]>();
  notifications = input.required<AppNotification[]>();
  unreadNotificationsCount = input.required<number>();
  isProcessingInvitation = input<boolean>(false);

  isUserDropdownOpen = model<boolean>(false);
  currentUser = input.required<any>();
  userRoleSlug = input<string>('viewer');
  isUploadingAvatar = input<boolean>(false);

  switchWorkspace = output<string>();
  selectTeam = output<Team>();
  selectPlayer = output<Player>();
  selectEvent = output<WorkspaceEvent>();
  selectCompetition = output<Competition>();
  selectVenue = output<Venue>();
  selectMember = output<WorkspaceMember>();
  selectFile = output<WorkspaceFile>();
  acceptInvitation = output<{ workspaceId: string; name: string }>();
  rejectInvitation = output<{ workspaceId: string; name: string }>();
  markNotificationsRead = output<void>();
  signOut = output<void>();
  avatarUpload = output<Event>();

  favEntityType = computed<FavoriteEntityType>(() => {
    const tab = this.activeTab();
    if (tab === 'overview') return 'dashboard';
    if (tab === 'teams') return 'team';
    if (tab === 'events') return 'event';
    if (tab === 'reports') return 'report';
    return 'custom';
  });

  noteEntityType = computed<NoteEntityType>(() => {
    const tab = this.activeTab();
    if (tab === 'players') return 'player';
    if (tab === 'teams') return 'team';
    if (tab === 'equipment') return 'asset';
    if (tab === 'events') return 'event';
    if (tab === 'venues') return 'venue';
    if (tab === 'reports') return 'report';
    if (tab === 'governance') return 'form';
    return 'custom';
  });

  favTitle = computed(() => {
    const wsName = this.workspace()?.name || 'Workspace';
    const tab = this.activeTab();
    const capitalizedTab = tab.charAt(0).toUpperCase() + tab.slice(1);
    return `${wsName} - ${capitalizedTab}`;
  });

  favUrl = computed(() => {
    return this.router.url;
  });

  onSwitchWorkspace(wsId: string) {
    this.switchWorkspace.emit(wsId);
  }
}
