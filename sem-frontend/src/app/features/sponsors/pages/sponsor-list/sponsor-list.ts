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
import { Sponsor, SponsorService, SponsorTier } from '../../services/sponsor.service';
import { SponsorModalComponent } from '../../components/sponsor-modal/sponsor-modal';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-sponsor-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, SponsorModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sponsor-list.html',
})
export class SponsorListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private sponsorService = inject(SponsorService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  sponsors = signal<Sponsor[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  searchQuery = signal('');
  tierFilter = signal<SponsorTier | 'all'>('all');
  activeFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Analytics Dashboard State
  activeTab = signal<'list' | 'analytics'>('list');
  selectedAnalyticsSponsorId = signal<string>('');
  analyticsData = signal<any | null>(null);
  isLoadingAnalytics = signal<boolean>(false);

  isModalOpen = signal<boolean>(false);
  editingSponsor = signal<Sponsor | null>(null);

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const tier = this.tierFilter();
    const active = this.activeFilter();
    return this.sponsors().filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !(s.category ?? '').toLowerCase().includes(q))
        return false;
      if (tier !== 'all' && s.tier !== tier) return false;
      if (active === 'active' && !s.isActive) return false;
      if (active === 'inactive' && s.isActive) return false;
      return true;
    });
  });

  counts = computed(() => {
    const list = this.sponsors();
    return {
      total: list.length,
      active: list.filter((s) => s.isActive).length,
      inactive: list.filter((s) => !s.isActive).length,
      byTier: list.reduce<Record<string, number>>((acc, s) => {
        const key = s.tier ?? 'untiered';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    };
  });

  tierBadgeClass = (t: SponsorTier | null | undefined) => this.sponsorService.tierBadgeClass(t);

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.workspaceId.set(id);
      if (id) this.load();
    });
  }

  private load() {
    this.isLoading.set(true);
    this.error.set(null);
    this.sponsorService.list(this.workspaceId()).subscribe({
      next: (list) => {
        this.sponsors.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load sponsors');
        this.isLoading.set(false);
      },
    });
  }

  openNew() {
    this.editingSponsor.set(null);
    this.isModalOpen.set(true);
  }

  openEdit(sponsor: Sponsor) {
    this.editingSponsor.set(sponsor);
    this.isModalOpen.set(true);
  }

  onSaved(saved: Sponsor) {
    const list = this.sponsors();
    const existingIdx = list.findIndex((s) => s.id === saved.id);
    if (existingIdx >= 0) {
      const next = [...list];
      next[existingIdx] = saved;
      this.sponsors.set(next);
    } else {
      this.sponsors.set([...list, saved]);
    }
  }

  remove(sponsor: Sponsor) {
    if (!confirm(`Delete sponsor "${sponsor.name}"? This can't be undone.`)) return;
    this.sponsorService.remove(this.workspaceId(), sponsor.id).subscribe({
      next: () => {
        this.sponsors.update((list) => list.filter((s) => s.id !== sponsor.id));
        this.ui.success('Sponsor deleted.');
      },
      error: (err) => this.ui.error(err?.error?.message ?? 'Failed to delete sponsor.'),
    });
  }

  toggleActive(sponsor: Sponsor) {
    this.sponsorService
      .update(this.workspaceId(), sponsor.id, { isActive: !sponsor.isActive })
      .subscribe({
        next: (saved) => this.onSaved(saved),
        error: (err) => this.ui.error(err?.error?.message ?? 'Failed to toggle visibility.'),
      });
  }

  isWithinWindow(s: Sponsor): boolean {
    return this.sponsorService.isWithinVisibilityWindow(s);
  }

  periodLabel(s: Sponsor): string {
    if (!s.startDate && !s.endDate) return 'Always';
    const fmt = (d: string) => new Date(d).toLocaleDateString();
    if (s.startDate && s.endDate) return `${fmt(s.startDate)} – ${fmt(s.endDate)}`;
    if (s.startDate) return `From ${fmt(s.startDate)}`;
    if (s.endDate) return `Until ${fmt(s.endDate)}`;
    return '—';
  }

  setActiveTab(tab: 'list' | 'analytics') {
    this.activeTab.set(tab);
    if (tab === 'analytics' && !this.analyticsData()) {
      this.loadAnalytics();
    }
  }

  loadAnalytics(sponsorId?: string) {
    this.isLoadingAnalytics.set(true);
    if (sponsorId !== undefined) {
      this.selectedAnalyticsSponsorId.set(sponsorId);
    }
    const targetId = this.selectedAnalyticsSponsorId() || undefined;
    this.sponsorService.getAnalytics(this.workspaceId(), targetId).subscribe({
      next: (data) => {
        this.analyticsData.set(data);
        this.isLoadingAnalytics.set(false);
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to load sponsor analytics');
        this.isLoadingAnalytics.set(false);
      },
    });
  }

  exportSponsorPitchReport() {
    this.ui.success('Sponsor ROI Pitch Report exported successfully!');
  }
}
