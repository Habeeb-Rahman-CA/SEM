import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EventService } from '../../../events/services/event.service';
import { SocketService } from '../../../../core/services/socket.service';
import { formatMatchStatusDetail, getSportBadgeClass, getSportIconClass } from '../../../../shared';
import { AdBannerComponent } from '../../../ads/components/ad-banner/ad-banner';
import { LandingHeaderComponent } from '../../../../layouts/landing-header/landing-header';

interface LiveMatch {
  id: string;
  status: string;
  homeScore: number;
  awayScore: number;
  scheduledAt: string | null;
  config?: any;
  liveData?: any;
  homeTeam: { id: string; name: string; logoUrl?: string | null } | null;
  awayTeam: { id: string; name: string; logoUrl?: string | null } | null;
  venue: { id: string; name: string } | null;
  stage: { id: string; name: string; type: string };
  competition: {
    id: string;
    name: string;
    sport: { id: string; code: string; name: string } | null;
  };
  event: {
    id: string;
    name: string;
    slug?: string | null;
    logoUrl?: string | null;
    workspaceId: string;
  };
}

const FOLLOWED_STORAGE_KEY = 'sem.liveHub.followed';

@Component({
  selector: 'app-live-score-hub',
  standalone: true,
  imports: [CommonModule, RouterLink, AdBannerComponent, LandingHeaderComponent],
  templateUrl: './live-score-hub.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveScoreHubComponent implements OnInit, OnDestroy {
  private eventService = inject(EventService);
  private socketService = inject(SocketService);
  private destroyRef = inject(DestroyRef);

  matches = signal<LiveMatch[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  lastUpdated = signal<Date | null>(null);
  sportFilter = signal<string>('all');
  followed = signal<Set<string>>(new Set());
  clockTick = signal<number>(0);

  private clockInterval: any = null;
  private pollSub: Subscription | null = null;
  private subscribedMatchIds = new Set<string>();

  getSportBadgeClass = getSportBadgeClass;
  getSportIconClass = getSportIconClass;
  formatMatchStatusDetail = formatMatchStatusDetail;

  availableSports = computed(() => {
    const seen = new Map<string, string>();
    for (const m of this.matches()) {
      const code = m.competition.sport?.code;
      if (code && !seen.has(code)) {
        seen.set(code, m.competition.sport?.name ?? code);
      }
    }
    return Array.from(seen.entries()).map(([code, name]) => ({ code, name }));
  });

  filteredMatches = computed(() => {
    const list = this.matches();
    const sport = this.sportFilter();
    if (sport === 'all') return list;
    return list.filter((m) => m.competition.sport?.code === sport);
  });

  followedMatches = computed(() => {
    const ids = this.followed();
    if (ids.size === 0) return [];
    return this.matches().filter((m) => ids.has(m.id));
  });

  ngOnInit() {
    this.hydrateFollowedFromStorage();
    this.load();

    // Socket-driven updates
    this.socketService.matchUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => this.applySocketUpdate(updated));

    // 60s poll safety net so new matches going live or completing appear
    this.pollSub = interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load(true));

    // 1s tick to advance running football timers client-side
    this.clockInterval = setInterval(() => this.clockTick.update((n) => n + 1), 1000);
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.pollSub) this.pollSub.unsubscribe();
    for (const id of this.subscribedMatchIds) {
      this.socketService.unsubscribeMatch(id);
    }
    this.subscribedMatchIds.clear();
  }

  onSportChange(code: string) {
    this.sportFilter.set(code);
  }

  toggleFollow(matchId: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.followed.update((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      this.persistFollowed(next);
      return next;
    });
  }

  clearFollowed() {
    this.followed.update((prev) => {
      const next = new Set<string>();
      this.persistFollowed(next);
      return next;
    });
  }

  isFollowed(matchId: string): boolean {
    return this.followed().has(matchId);
  }

  private load(silent = false) {
    if (!silent) {
      this.isLoading.set(true);
    }
    this.error.set(null);

    this.eventService.getPublicLiveMatches().subscribe({
      next: (data) => {
        const list = (data ?? []) as LiveMatch[];
        this.matches.set(list);
        this.isLoading.set(false);
        this.lastUpdated.set(new Date());
        this.reconcileMatchSubscriptions(list);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load live matches');
        this.isLoading.set(false);
      },
    });
  }

  private reconcileMatchSubscriptions(list: LiveMatch[]) {
    const nowIds = new Set(list.map((m) => m.id));
    // Subscribe to newly-appeared matches
    for (const id of nowIds) {
      if (!this.subscribedMatchIds.has(id)) {
        this.socketService.subscribeMatch(id);
        this.subscribedMatchIds.add(id);
      }
    }
    // Unsubscribe from ones that dropped off
    for (const id of Array.from(this.subscribedMatchIds)) {
      if (!nowIds.has(id)) {
        this.socketService.unsubscribeMatch(id);
        this.subscribedMatchIds.delete(id);
      }
    }
  }

  private applySocketUpdate(update: any) {
    if (!update?.id) return;

    // A match that ended shouldn't linger in the live list
    if (update.status && update.status !== 'live') {
      this.matches.update((list) => list.filter((m) => m.id !== update.id));
      if (this.subscribedMatchIds.has(update.id)) {
        this.socketService.unsubscribeMatch(update.id);
        this.subscribedMatchIds.delete(update.id);
      }
      this.lastUpdated.set(new Date());
      return;
    }

    // Merge fresh score/timer/status into the matching card
    this.matches.update((list) => list.map((m) => (m.id === update.id ? { ...m, ...update } : m)));
    this.lastUpdated.set(new Date());
  }

  /**
   * For football matches with a running timer, return live seconds elapsed
   * so the card clock ticks without a round-trip. `clockTick` forces
   * recomputation once per second.
   */
  liveFootballSeconds(match: LiveMatch): number {
    void this.clockTick(); // reactivity dep
    const live = match.liveData ?? {};
    const base = live.elapsedSeconds ?? 0;
    if (live.timerRunning && live.timerLastStarted) {
      const startMs = new Date(live.timerLastStarted).getTime();
      const delta = Math.floor((Date.now() - startMs) / 1000);
      return base + Math.max(0, delta);
    }
    return base;
  }

  formatClock(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  cricketStatusLine(match: LiveMatch): string {
    const live = match.liveData ?? {};
    const overs = live.currentOvers ?? '0.0';
    const wkts = live.wickets ?? 0;
    return `${overs} ov · ${wkts} wkt`;
  }

  badmintonSetsLine(match: LiveMatch): string {
    const live = match.liveData ?? {};
    const sets = live.setScores ?? live.games ?? [];
    if (Array.isArray(sets) && sets.length > 0) {
      return sets
        .map((s: any) => `${s.home ?? s.homeScore ?? 0}-${s.away ?? s.awayScore ?? 0}`)
        .join(' · ');
    }
    return live.matchStatus ?? '';
  }

  eventInitials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  private hydrateFollowedFromStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(FOLLOWED_STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        this.followed.set(new Set(arr));
      }
    } catch {
      // ignore corrupted storage
    }
  }

  private persistFollowed(set: Set<string>) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(FOLLOWED_STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch {
      // storage full or blocked — nothing we can do
    }
  }
}
