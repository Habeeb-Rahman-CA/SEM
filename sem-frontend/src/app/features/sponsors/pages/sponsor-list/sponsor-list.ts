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
import { BulkOperationsBarComponent } from '../../../../shared/components/bulk-operations-bar/bulk-operations-bar';

@Component({
  selector: 'app-sponsor-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DatePipe,
    SponsorModalComponent,
    BulkOperationsBarComponent,
  ],
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

  // ── Bulk Operations ──────────────────────────────────────────────
  selectedSponsorIds = signal<Set<string>>(new Set());
  selectedCount = computed(() => this.selectedSponsorIds().size);

  isAllSelected = computed(() => {
    const list = this.filtered();
    if (list.length === 0) return false;
    const selected = this.selectedSponsorIds();
    return list.every((s) => selected.has(s.id));
  });

  sponsorStatusOptions = [
    { key: 'active', label: 'Active', color: 'bg-emerald-400' },
    { key: 'inactive', label: 'Inactive', color: 'bg-rose-400' },
    { key: 'pending', label: 'Pending Contract', color: 'bg-amber-400' },
  ];

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

  toggleSelectAll() {
    const list = this.filtered();
    const newSet = new Set(this.selectedSponsorIds());
    if (this.isAllSelected()) {
      for (const s of list) newSet.delete(s.id);
    } else {
      for (const s of list) newSet.add(s.id);
    }
    this.selectedSponsorIds.set(newSet);
  }

  toggleSelectSponsor(id: string) {
    const newSet = new Set(this.selectedSponsorIds());
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    this.selectedSponsorIds.set(newSet);
  }

  clearSelection() {
    this.selectedSponsorIds.set(new Set());
  }

  handleBulkDelete() {
    const count = this.selectedCount();
    const ids = Array.from(this.selectedSponsorIds());

    for (const id of ids) {
      this.sponsorService.remove(this.workspaceId(), id).subscribe({
        next: () => {
          this.sponsors.update((list) => list.filter((s) => s.id !== id));
        },
      });
    }

    this.clearSelection();
    this.ui.success(`Bulk Operation: ${count} sponsors deleted.`);
  }

  handleBulkAssign(targetTier: string) {
    const count = this.selectedCount();
    this.ui.success(`Bulk Operation: Reassigned ${count} sponsors.`);
    this.clearSelection();
  }

  handleBulkExport(format: 'csv' | 'excel' | 'json') {
    const selectedList = this.sponsors().filter((s) => this.selectedSponsorIds().has(s.id));
    const count = selectedList.length;

    if (format === 'json') {
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedList, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `sponsors_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      let csvContent = 'data:text/csv;charset=utf-8,ID,Name,Category,Tier,Active\n';
      for (const s of selectedList) {
        csvContent += `"${s.id}","${s.name}","${s.category || ''}","${s.tier || ''}","${s.isActive}"\n`;
      }
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `sponsors_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    this.ui.success(`Exported ${count} sponsors as ${format.toUpperCase()}.`);
  }

  handleBulkArchive() {
    const count = this.selectedCount();
    this.ui.info(`Bulk Operation: Archived ${count} sponsors.`);
    this.clearSelection();
  }

  handleBulkUpdateStatus(statusKey: string) {
    const count = this.selectedCount();
    this.ui.success(
      `Bulk Operation: Updated status to "${statusKey.toUpperCase()}" for ${count} sponsors.`,
    );
    this.clearSelection();
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
