import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EventService } from '../../../events/services/event.service';
import { WorkspaceEvent } from '../../../workspaces/services/workspace.service';
import { getSportBadgeClass, getSportIconClass } from '../../../../shared';

type StatusFilter = 'all' | 'upcoming' | 'ongoing' | 'completed';

@Component({
  selector: 'app-public-events-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './public-events-portal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicEventsPortalComponent implements OnInit {
  private eventService = inject(EventService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  events = signal<WorkspaceEvent[]>([]);
  total = signal<number>(0);
  isLoading = signal<boolean>(true);
  isLoadingMore = signal<boolean>(false);
  error = signal<string | null>(null);

  activeStatus = signal<StatusFilter>('all');
  searchQuery = signal<string>('');
  sportFilter = signal<string>('all');

  offset = signal<number>(0);
  readonly limit = 24;

  private searchInput$ = new Subject<string>();

  getSportBadgeClass = getSportBadgeClass;
  getSportIconClass = getSportIconClass;

  readonly statusTabs: Array<{ key: StatusFilter; label: string; icon: string }> = [
    { key: 'all', label: 'All', icon: 'fi-rr-apps' },
    { key: 'upcoming', label: 'Upcoming', icon: 'fi-rr-calendar-clock' },
    { key: 'ongoing', label: 'Live now', icon: 'fi-rr-signal-stream' },
    { key: 'completed', label: 'Past', icon: 'fi-rr-trophy' },
  ];

  hasMore = computed(() => this.events().length < this.total());

  visibleEvents = computed(() => {
    const sport = this.sportFilter();
    const list = this.events();
    if (sport === 'all') return list;
    return list.filter((e) => (e.sport ?? '').toLowerCase() === sport.toLowerCase());
  });

  availableSports = computed(() => {
    const seen = new Set<string>();
    for (const e of this.events()) {
      if (e.sport) seen.add(e.sport);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  });

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    const status = (params.get('status') as StatusFilter) ?? 'all';
    const q = params.get('q') ?? '';
    const sport = params.get('sport') ?? 'all';

    this.activeStatus.set(status);
    this.searchQuery.set(q);
    this.sportFilter.set(sport);

    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.offset.set(0);
        this.load();
        this.syncQueryParams();
      });

    this.load();
  }

  onStatusChange(next: StatusFilter) {
    if (next === this.activeStatus()) return;
    this.activeStatus.set(next);
    this.offset.set(0);
    this.load();
    this.syncQueryParams();
  }

  onSearchChange(value: string) {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  clearSearch() {
    if (!this.searchQuery()) return;
    this.searchQuery.set('');
    this.offset.set(0);
    this.load();
    this.syncQueryParams();
  }

  onSportChange(sport: string) {
    this.sportFilter.set(sport);
    this.syncQueryParams();
  }

  loadMore() {
    if (this.isLoading() || this.isLoadingMore() || !this.hasMore()) return;
    this.offset.set(this.offset() + this.limit);
    this.load(true);
  }

  private load(append = false) {
    if (append) {
      this.isLoadingMore.set(true);
    } else {
      this.isLoading.set(true);
    }
    this.error.set(null);

    const status = this.activeStatus();
    this.eventService
      .getPublicEvents({
        query: this.searchQuery() || undefined,
        status: status === 'all' ? undefined : status,
        limit: this.limit,
        offset: this.offset(),
        sortBy: status === 'completed' ? 'startDate' : 'startDate',
        sortOrder: status === 'completed' ? 'DESC' : 'ASC',
      })
      .subscribe({
        next: (page) => {
          this.total.set(page.total);
          if (append) {
            this.events.update((list) => list.concat(page.items));
          } else {
            this.events.set(page.items);
          }
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to load events');
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        },
      });
  }

  private syncQueryParams() {
    const status = this.activeStatus();
    const q = this.searchQuery();
    const sport = this.sportFilter();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: status === 'all' ? null : status,
        q: q || null,
        sport: sport === 'all' ? null : sport,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  statusPillClass(status: string): string {
    switch (status) {
      case 'ongoing':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'upcoming':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      case 'completed':
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
      case 'cancelled':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'ongoing':
        return 'Live';
      case 'upcoming':
        return 'Upcoming';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  formatDateRange(start: string | null, end: string | null): string {
    if (!start && !end) return 'Dates TBA';
    if (start && !end) return this.fmt(start);
    if (!start && end) return `Ends ${this.fmt(end)}`;
    const s = new Date(start!);
    const e = new Date(end!);
    if (s.toDateString() === e.toDateString()) return this.fmt(start!);
    // Same month → show "Aug 3 – 12, 2028"
    if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
      const monthDayS = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const day = e.getDate();
      const year = e.getFullYear();
      return `${monthDayS} – ${day}, ${year}`;
    }
    return `${this.fmt(start!)} – ${this.fmt(end!)}`;
  }

  private fmt(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
