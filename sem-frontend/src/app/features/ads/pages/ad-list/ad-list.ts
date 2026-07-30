import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdPlacement, AdStats, Advertisement, AdService } from '../../services/ad.service';
import { AdModalComponent } from '../../components/ad-modal/ad-modal';
import { EventService } from '../../../events/services/event.service';
import { SponsorService, Sponsor } from '../../../sponsors/services/sponsor.service';
import { WorkspaceEvent } from '../../../workspaces/services/workspace.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-ad-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, AdModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ad-list.html',
})
export class AdListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private adService = inject(AdService);
  private eventService = inject(EventService);
  private sponsorService = inject(SponsorService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  ads = signal<Advertisement[]>([]);
  stats = signal<AdStats | null>(null);
  events = signal<WorkspaceEvent[]>([]);
  sponsors = signal<Sponsor[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  placementFilter = signal<AdPlacement | 'all'>('all');
  statusFilter = signal<'all' | 'active' | 'paused' | 'scheduled' | 'expired'>('all');
  searchQuery = signal<string>('');

  isModalOpen = signal<boolean>(false);
  editingAd = signal<Advertisement | null>(null);

  filtered = computed(() => {
    const list = this.ads();
    const q = this.searchQuery().toLowerCase().trim();
    const placement = this.placementFilter();
    const status = this.statusFilter();
    return list.filter((ad) => {
      if (placement !== 'all' && ad.placement !== placement) return false;
      if (q && !ad.name.toLowerCase().includes(q) && !(ad.title ?? '').toLowerCase().includes(q))
        return false;
      const s = this.statusOf(ad);
      if (status !== 'all' && s !== status) return false;
      return true;
    });
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.workspaceId.set(id);
      if (id) this.loadAll();
    });
  }

  private loadAll() {
    this.isLoading.set(true);
    this.error.set(null);
    Promise.all([
      new Promise<Advertisement[]>((resolve, reject) =>
        this.adService.list(this.workspaceId()).subscribe({
          next: resolve,
          error: reject,
        }),
      ),
      new Promise<AdStats>((resolve, reject) =>
        this.adService.stats(this.workspaceId()).subscribe({
          next: resolve,
          error: reject,
        }),
      ),
      new Promise<WorkspaceEvent[]>((resolve) =>
        this.eventService.getEvents(this.workspaceId()).subscribe({
          next: resolve,
          error: () => resolve([]),
        }),
      ),
      new Promise<Sponsor[]>((resolve) =>
        this.sponsorService.list(this.workspaceId()).subscribe({
          next: resolve,
          error: () => resolve([]),
        }),
      ),
    ])
      .then(([ads, stats, events, sponsors]) => {
        this.ads.set(ads);
        this.stats.set(stats);
        this.events.set(events);
        this.sponsors.set(sponsors);
        this.isLoading.set(false);
      })
      .catch((err) => {
        this.error.set(err?.error?.message ?? 'Failed to load advertisements');
        this.isLoading.set(false);
      });
  }

  openNew() {
    this.editingAd.set(null);
    this.isModalOpen.set(true);
  }

  openEdit(ad: Advertisement) {
    this.editingAd.set(ad);
    this.isModalOpen.set(true);
  }

  onSaved(saved: Advertisement) {
    const list = this.ads();
    const idx = list.findIndex((a) => a.id === saved.id);
    if (idx >= 0) {
      const next = [...list];
      next[idx] = saved;
      this.ads.set(next);
    } else {
      this.ads.set([saved, ...list]);
    }
    // Refresh stats since the counts might have shifted.
    this.adService.stats(this.workspaceId()).subscribe({
      next: (s) => this.stats.set(s),
      error: () => undefined,
    });
  }

  remove(ad: Advertisement) {
    if (!confirm(`Delete "${ad.name}"? This can't be undone.`)) return;
    this.adService.remove(this.workspaceId(), ad.id).subscribe({
      next: () => {
        this.ads.update((list) => list.filter((a) => a.id !== ad.id));
        this.ui.success('Advertisement deleted.');
      },
      error: (err) => this.ui.error(err?.error?.message ?? 'Failed to delete.'),
    });
  }

  toggleActive(ad: Advertisement) {
    this.adService.update(this.workspaceId(), ad.id, { isActive: !ad.isActive }).subscribe({
      next: (saved) => this.onSaved(saved),
      error: (err) => this.ui.error(err?.error?.message ?? 'Failed to toggle.'),
    });
  }

  ctrFor(ad: Advertisement): number {
    return this.adService.ctrFor(ad);
  }

  placementLabel(p: AdPlacement): string {
    return this.adService.placementLabel(p);
  }

  statusOf(ad: Advertisement): 'active' | 'paused' | 'scheduled' | 'expired' {
    const now = Date.now();
    if (!ad.isActive) return 'paused';
    if (ad.startDate && new Date(ad.startDate).getTime() > now) return 'scheduled';
    if (ad.endDate && new Date(ad.endDate).getTime() < now) return 'expired';
    return 'active';
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'paused':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      case 'scheduled':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      case 'expired':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  }
}
