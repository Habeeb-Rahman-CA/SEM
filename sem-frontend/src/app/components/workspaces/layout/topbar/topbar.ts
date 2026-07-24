import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Workspace, Team, Player, WorkspaceEvent, Competition, Venue, WorkspaceMember, AppNotification, WorkspaceFile } from '../../../../services/workspace.service';
import { GlobalSearchComponent } from '../global-search/global-search';
import { NotificationPanelComponent } from '../notification-panel/notification-panel';
import { UserDropdownComponent } from '../user-dropdown/user-dropdown';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    FormsModule,
    GlobalSearchComponent,
    NotificationPanelComponent,
    UserDropdownComponent,
  ],
  templateUrl: './topbar.html',
})
export class TopbarComponent {
  workspace = input<Workspace | null>(null);
  allWorkspaces = input<Workspace[]>([]);
  
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

  onSwitchWorkspace(wsId: string) {
    this.switchWorkspace.emit(wsId);
  }
}
