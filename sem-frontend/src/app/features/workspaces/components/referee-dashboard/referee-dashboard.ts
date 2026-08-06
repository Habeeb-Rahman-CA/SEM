import { Component, input, output, signal, computed, inject } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Workspace, Team, Match, Sport, Venue } from '../../services/workspace.service';
import { OfflineSyncService } from '../../../../core/services/offline-sync.service';
import { UiService } from '../../../../core/services/ui.service';
import { getSportIconClass, getSportBadgeClass } from '../../../../shared';
import { PullToRefreshDirective } from '../../../../shared/directives/pull-to-refresh.directive';

@Component({
  selector: 'app-referee-dashboard',
  standalone: true,
  imports: [DatePipe, SlicePipe, FormsModule, PullToRefreshDirective],
  templateUrl: './referee-dashboard.html',
})
export class RefereeDashboardComponent {
  workspace = input.required<Workspace | null>();
  matches = input<any[]>([]);
  teams = input<Team[]>([]);
  venues = input<Venue[]>([]);

  enterMatch = output<any>();
  signOut = output<void>();
  /** Emitted when the user pulls-to-refresh; parent should reload matches. */
  refreshRequested = output<() => void>();

  // Injected sync services
  syncService = inject(OfflineSyncService);
  uiService = inject(UiService);

  // Filters state
  searchQuery = signal<string>('');
  statusFilter = signal<'all' | 'live' | 'upcoming' | 'completed'>('all');

  getSportIcon = getSportIconClass;
  getSportBadge = getSportBadgeClass;

  // Filtered matches
  filteredMatches = computed(() => {
    const list = this.matches();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    return list.filter((m) => {
      // 1. Filter by status
      if (status === 'live' && m.status !== 'live') return false;
      if (status === 'upcoming' && m.status !== 'scheduled' && m.status !== 'inactive')
        return false;
      if (status === 'completed' && m.status !== 'completed') return false;

      // 2. Filter by search query (team names)
      if (query) {
        const homeName = m.homeTeam?.name?.toLowerCase() || '';
        const awayName = m.awayTeam?.name?.toLowerCase() || '';
        const sportName = m.stage?.competition?.sport?.name?.toLowerCase() || '';
        return homeName.includes(query) || awayName.includes(query) || sportName.includes(query);
      }

      return true;
    });
  });

  getTeamLogo(teamId: string): string | null {
    return this.teams().find((t) => t.id === teamId)?.logoUrl || null;
  }

  getVenueName(venueId: string | null): string {
    if (!venueId) return 'TBD';
    return this.venues().find((v) => v.id === venueId)?.name || 'Unknown Venue';
  }

  onTriggerSync() {
    if (this.syncService.getPendingCount() === 0) {
      this.uiService.info('No offline updates to synchronize.');
      return;
    }
    this.syncService.syncPendingUpdates().subscribe();
  }

  /**
   * Ask the parent to reload; the parent invokes the passed callback once it
   * has fresh data so the pull indicator can retract.
   */
  onPullRefresh(pull: PullToRefreshDirective) {
    // If nobody's listening, retract immediately so the UI doesn't feel stuck.
    const done = () => pull.complete();
    this.refreshRequested.emit(done);
    // Safety timeout — never keep the spinner up longer than 4s.
    setTimeout(done, 4000);
  }
}
