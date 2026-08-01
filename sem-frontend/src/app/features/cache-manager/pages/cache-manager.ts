import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CacheConfig,
  CacheDomainEntry,
  CacheKeyDetail,
  CacheKeyList,
  CacheManagerService,
  CacheStats,
} from '../services/cache-manager.service';

type CacheTab = 'overview' | 'keys' | 'domains' | 'config';

@Component({
  selector: 'app-cache-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink],
  templateUrl: './cache-manager.html',
})
export class CacheManagerComponent implements OnInit, OnDestroy {
  private service = inject(CacheManagerService);

  stats = signal<CacheStats | null>(null);
  config = signal<CacheConfig | null>(null);
  domains = signal<CacheDomainEntry[]>([]);
  keyList = signal<CacheKeyList | null>(null);
  keyDetail = signal<CacheKeyDetail | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  currentTab = signal<CacheTab>('overview');

  // Keys tab
  keyPattern = signal<string>('*');
  keyLimit = signal<number>(200);
  isInspectOpen = signal(false);

  // Invalidation
  invalidatePattern = signal<string>('');
  invalidateDomain = signal<string>('dashboard');
  domainWorkspaceId = signal<string>('');
  domainCompetitionId = signal<string>('');
  domainSeason = signal<string>('');

  // Config editing
  configDraft = signal<Partial<CacheConfig>>({});
  configPatchNotes = signal<string>('');
  editingDomain = signal<{ domain: string; enabled: boolean; ttlSec: number } | null>(null);

  domainOptions = [
    'dashboard',
    'rankings',
    'public',
    'permissions',
    'lookup',
    'auction',
    'finance',
    'workspace',
  ];

  private pollTimer: any = null;

  hitRatePct = computed(() => {
    const s = this.stats();
    return s ? s.hitRate : 0;
  });

  totalOps = computed(() => {
    const s = this.stats();
    if (!s) return 0;
    return s.hits + s.misses;
  });

  ngOnInit(): void {
    this.loadAll();
    this.pollTimer = setInterval(() => this.refreshStats(true), 10_000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  loadAll(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.refreshStats(false);
    this.service.getConfig().subscribe({
      next: (c) => {
        this.config.set(c);
        this.configDraft.set({
          globallyEnabled: c.globallyEnabled,
          namespace: c.namespace,
          notes: c.notes || '',
        });
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load config');
      },
    });
    this.service.listDomains().subscribe({
      next: (d) => this.domains.set(d),
    });
    this.searchKeys();
  }

  refreshStats(silent = false): void {
    this.service.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        if (!silent) this.isLoading.set(false);
      },
      error: (err) => {
        if (!silent) {
          this.error.set(err?.error?.message || 'Failed to load cache stats');
        }
        this.isLoading.set(false);
      },
    });
  }

  // ─── Keys ────────────────────────────────────────────────────────────

  searchKeys(): void {
    this.service.listKeys(this.keyPattern() || '*', this.keyLimit()).subscribe({
      next: (r) => this.keyList.set(r),
      error: (err) => alert(err?.error?.message || 'Failed to list keys'),
    });
  }

  inspect(key: string): void {
    this.service.inspect(key).subscribe({
      next: (d) => {
        this.keyDetail.set(d);
        this.isInspectOpen.set(true);
      },
      error: (err) => alert(err?.error?.message || 'Inspect failed'),
    });
  }

  closeInspect(): void {
    this.isInspectOpen.set(false);
  }

  deleteKey(key: string): void {
    if (!confirm(`Delete cache key "${key}"?`)) return;
    this.service.deleteKey(key).subscribe({
      next: () => this.searchKeys(),
      error: (err) => alert(err?.error?.message || 'Delete failed'),
    });
  }

  copyKey(key: string): void {
    navigator.clipboard?.writeText(key).catch(() => {});
  }

  // ─── Invalidation ────────────────────────────────────────────────────

  runInvalidatePattern(): void {
    const pattern = this.invalidatePattern().trim();
    if (!pattern) return;
    if (!confirm(`Invalidate every key matching "${pattern}"?`)) return;
    this.service.invalidatePattern(pattern).subscribe({
      next: (r) => {
        alert(`Invalidated ${r.invalidated} key(s).`);
        this.searchKeys();
        this.refreshStats();
      },
      error: (err) => alert(err?.error?.message || 'Failed'),
    });
  }

  runInvalidateDomain(): void {
    const domain = this.invalidateDomain();
    this.service
      .invalidateDomain(domain, {
        workspaceId: this.domainWorkspaceId() || undefined,
        competitionId: this.domainCompetitionId() || undefined,
        season: this.domainSeason() || undefined,
      })
      .subscribe({
        next: (r) => {
          if (r?.error) {
            alert(r.error);
            return;
          }
          alert(`Domain "${domain}" invalidated.`);
          this.searchKeys();
          this.refreshStats();
        },
        error: (err) => alert(err?.error?.message || 'Failed'),
      });
  }

  runFlush(): void {
    if (!confirm('DANGER: Flush the entire cache? Every key under the namespace will be dropped.'))
      return;
    this.service.flush().subscribe({
      next: (r) => {
        alert(r.message || 'Cache flushed.');
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed'),
    });
  }

  // ─── Config ──────────────────────────────────────────────────────────

  saveConfig(): void {
    const draft = this.configDraft();
    this.service
      .updateConfig({
        globallyEnabled: draft.globallyEnabled,
        namespace: draft.namespace,
        notes: draft.notes,
      })
      .subscribe({
        next: (c) => {
          this.config.set(c);
          alert('Config saved. Namespace changes take effect on next restart.');
        },
        error: (err) => alert(err?.error?.message || 'Failed to save'),
      });
  }

  openDomainEditor(entry: CacheDomainEntry): void {
    this.editingDomain.set({
      domain: entry.domain,
      enabled: entry.settings.enabled,
      ttlSec: entry.settings.ttlSec,
    });
  }

  closeDomainEditor(): void {
    this.editingDomain.set(null);
  }

  saveDomain(): void {
    const e = this.editingDomain();
    if (!e) return;
    this.service.updateDomain(e.domain, { enabled: e.enabled, ttlSec: e.ttlSec }).subscribe({
      next: () => {
        this.editingDomain.set(null);
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed'),
    });
  }

  resetDomain(entry: CacheDomainEntry): void {
    if (!confirm(`Reset "${entry.domain}" to its default settings?`)) return;
    this.service.resetDomain(entry.domain).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed'),
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  formatTtl(sec: number): string {
    if (sec < 0) return 'expired';
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
    return `${Math.floor(sec / 86400)}d`;
  }

  backendBadgeClass(backend: string): string {
    return backend === 'redis'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }

  hitRateColor(pct: number): string {
    if (pct >= 80) return 'text-emerald-400';
    if (pct >= 50) return 'text-amber-400';
    return 'text-red-400';
  }
}
