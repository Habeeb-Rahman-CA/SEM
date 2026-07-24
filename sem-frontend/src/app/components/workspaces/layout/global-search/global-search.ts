import { Component, input, model, output, HostListener, ElementRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Team, Player, WorkspaceEvent, Competition, Venue, WorkspaceMember, WorkspaceFile } from '../../../../services/workspace.service';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [FormsModule, AvatarComponent],
  templateUrl: './global-search.html',
})
export class GlobalSearchComponent {
  globalSearchQuery = model<string>('');
  showGlobalSearchResults = model<boolean>(false);
  
  results = input.required<{
    teams: Team[];
    players: Player[];
    events: WorkspaceEvent[];
    competitions: Competition[];
    venues: Venue[];
    members: WorkspaceMember[];
    files?: WorkspaceFile[];
    totalCount: number;
  }>();

  selectTeam = output<Team>();
  selectPlayer = output<Player>();
  selectEvent = output<WorkspaceEvent>();
  selectCompetition = output<Competition>();
  selectVenue = output<Venue>();
  selectMember = output<WorkspaceMember>();
  selectFile = output<WorkspaceFile>();

  private elRef = inject(ElementRef);

  clearGlobalSearch() {
    this.globalSearchQuery.set('');
    this.showGlobalSearchResults.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // CMD+K or CTRL+K to focus search input
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      const inputEl = this.elRef.nativeElement.querySelector('#globalSearchInput') as HTMLElement;
      if (inputEl) {
        inputEl.focus();
        this.showGlobalSearchResults.set(true);
        event.preventDefault();
      }
      return;
    }

    if (this.showGlobalSearchResults() && event.key === 'Escape') {
      this.showGlobalSearchResults.set(false);
      event.preventDefault();
    }
  }
}
