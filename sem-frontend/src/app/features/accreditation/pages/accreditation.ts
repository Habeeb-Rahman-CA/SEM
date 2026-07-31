import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AccessLevel,
  AccessZone,
  AccreditationService,
  AccreditationSummary,
  AttendanceLog,
  Credential,
  HolderType,
  ScanResponse,
} from '../services/accreditation.service';

type AccTab = 'overview' | 'credentials' | 'zones' | 'scan' | 'attendance';

@Component({
  selector: 'app-accreditation',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './accreditation.html',
})
export class AccreditationComponent implements OnInit {
  workspaceId = input.required<string>();

  private service = inject(AccreditationService);

  // Data
  summary = signal<AccreditationSummary | null>(null);
  credentials = signal<Credential[]>([]);
  zones = signal<AccessZone[]>([]);
  attendance = signal<AttendanceLog[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // View state
  currentTab = signal<AccTab>('overview');
  holderFilter = signal<HolderType | ''>('');
  searchQuery = signal('');
  selectedCredentialId = signal<string | null>(null);

  // Modals
  isCredentialModalOpen = signal(false);
  isZoneModalOpen = signal(false);

  // Credential form
  editingCredentialId = signal<string | null>(null);
  credentialForm = signal({
    holderType: 'guest' as HolderType,
    holderName: '',
    holderRole: '',
    organization: '',
    photoUrl: '',
    accessLevel: 'general' as AccessLevel,
    validFrom: '',
    validUntil: '',
    zoneIds: [] as string[],
    status: 'active' as 'active' | 'revoked' | 'expired' | 'lost',
    notes: '',
  });

  // Zone form
  editingZoneId = signal<string | null>(null);
  zoneForm = signal({
    name: '',
    description: '',
    allowedHolderTypes: [] as HolderType[],
    allowedAccessLevels: [] as AccessLevel[],
    capacity: null as number | null,
    color: '#8b5cf6',
    isActive: true,
  });

  // Scan pad
  scanCode = signal('');
  scanZoneId = signal<string>('');
  scanDirection = signal<'in' | 'out'>('in');
  lastScan = signal<ScanResponse | null>(null);
  isScanning = signal(false);

  allHolderTypes: HolderType[] = ['player', 'official', 'volunteer', 'media', 'guest', 'staff'];
  allAccessLevels: AccessLevel[] = ['general', 'restricted', 'vip', 'all_areas'];

  filteredCredentials = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const type = this.holderFilter();
    let list = this.credentials();
    if (type) list = list.filter((c) => c.holderType === type);
    if (!q) return list;
    return list.filter(
      (c) =>
        c.holderName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.organization || '').toLowerCase().includes(q) ||
        (c.holderRole || '').toLowerCase().includes(q),
    );
  });

  selectedCredential = computed<Credential | null>(() => {
    const id = this.selectedCredentialId();
    if (!id) return null;
    return this.credentials().find((c) => c.id === id) || null;
  });

  constructor() {
    effect(
      () => {
        const wsId = this.workspaceId();
        if (wsId) this.loadAll();
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    const wsId = this.workspaceId();
    if (!wsId) return;
    this.isLoading.set(true);
    this.error.set(null);

    this.service.getSummary(wsId).subscribe({
      next: (s) => this.summary.set(s),
      error: (err) => console.error('Failed to load summary', err),
    });

    this.service.getZones(wsId).subscribe({
      next: (z) => this.zones.set(z),
      error: (err) => console.error('Failed to load zones', err),
    });

    this.service.getCredentials(wsId).subscribe({
      next: (list) => {
        this.credentials.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load credentials');
        this.isLoading.set(false);
      },
    });

    this.service.getAttendance(wsId, { limit: 100 }).subscribe({
      next: (logs) => this.attendance.set(logs),
    });
  }

  // ─── Credential Modal ────────────────────────────────────────────────

  openCredentialModal(credential?: Credential) {
    if (credential) {
      this.editingCredentialId.set(credential.id);
      this.credentialForm.set({
        holderType: credential.holderType,
        holderName: credential.holderName,
        holderRole: credential.holderRole || '',
        organization: credential.organization || '',
        photoUrl: credential.photoUrl || '',
        accessLevel: credential.accessLevel,
        validFrom: credential.validFrom?.slice(0, 10) || '',
        validUntil: credential.validUntil?.slice(0, 10) || '',
        zoneIds: (credential.accessGrants || []).map((g) => g.zoneId),
        status: credential.status,
        notes: credential.notes || '',
      });
    } else {
      this.editingCredentialId.set(null);
      const now = new Date().toISOString().slice(0, 10);
      const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      this.credentialForm.set({
        holderType: 'guest',
        holderName: '',
        holderRole: '',
        organization: '',
        photoUrl: '',
        accessLevel: 'general',
        validFrom: now,
        validUntil: week,
        zoneIds: [],
        status: 'active',
        notes: '',
      });
    }
    this.isCredentialModalOpen.set(true);
  }

  closeCredentialModal() {
    this.isCredentialModalOpen.set(false);
  }

  toggleZoneInForm(zoneId: string) {
    const current = this.credentialForm().zoneIds;
    const next = current.includes(zoneId)
      ? current.filter((id) => id !== zoneId)
      : [...current, zoneId];
    this.credentialForm.set({ ...this.credentialForm(), zoneIds: next });
  }

  saveCredential() {
    const form = this.credentialForm();
    const wsId = this.workspaceId();
    const id = this.editingCredentialId();

    const payload: any = {
      holderName: form.holderName,
      holderRole: form.holderRole || null,
      organization: form.organization || null,
      photoUrl: form.photoUrl || null,
      accessLevel: form.accessLevel,
      validFrom: form.validFrom,
      validUntil: form.validUntil,
      zoneIds: form.zoneIds,
      notes: form.notes || null,
    };
    if (id) {
      payload.status = form.status;
    } else {
      payload.holderType = form.holderType;
    }

    const req = id
      ? this.service.updateCredential(wsId, id, payload)
      : this.service.createCredential(wsId, payload);

    req.subscribe({
      next: (c) => {
        this.closeCredentialModal();
        this.loadAll();
        this.selectedCredentialId.set(c.id);
      },
      error: (err) => alert(err?.error?.message || 'Failed to save credential'),
    });
  }

  revokeCredential(credential: Credential) {
    if (!confirm(`Revoke credential for ${credential.holderName}?`)) return;
    this.service.revokeCredential(this.workspaceId(), credential.id).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed to revoke'),
    });
  }

  deleteCredential(credential: Credential) {
    if (!confirm(`Delete credential for ${credential.holderName}?`)) return;
    this.service.deleteCredential(this.workspaceId(), credential.id).subscribe({
      next: () => {
        if (this.selectedCredentialId() === credential.id) {
          this.selectedCredentialId.set(null);
        }
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed to delete'),
    });
  }

  qrImageUrl(code: string): string {
    return this.service.qrImageUrl(code);
  }

  qrPayload(code: string): string {
    return this.service.qrPayload(code);
  }

  copyCode(code: string) {
    navigator.clipboard?.writeText(code).catch(() => {});
  }

  // ─── Zone Modal ──────────────────────────────────────────────────────

  openZoneModal(zone?: AccessZone) {
    if (zone) {
      this.editingZoneId.set(zone.id);
      this.zoneForm.set({
        name: zone.name,
        description: zone.description || '',
        allowedHolderTypes: zone.allowedHolderTypes || [],
        allowedAccessLevels: zone.allowedAccessLevels || [],
        capacity: zone.capacity,
        color: zone.color || '#8b5cf6',
        isActive: zone.isActive,
      });
    } else {
      this.editingZoneId.set(null);
      this.zoneForm.set({
        name: '',
        description: '',
        allowedHolderTypes: [],
        allowedAccessLevels: [],
        capacity: null,
        color: '#8b5cf6',
        isActive: true,
      });
    }
    this.isZoneModalOpen.set(true);
  }

  closeZoneModal() {
    this.isZoneModalOpen.set(false);
  }

  toggleZoneHolderType(type: HolderType) {
    const current = this.zoneForm().allowedHolderTypes;
    const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
    this.zoneForm.set({ ...this.zoneForm(), allowedHolderTypes: next });
  }

  toggleZoneAccessLevel(level: AccessLevel) {
    const current = this.zoneForm().allowedAccessLevels;
    const next = current.includes(level) ? current.filter((l) => l !== level) : [...current, level];
    this.zoneForm.set({ ...this.zoneForm(), allowedAccessLevels: next });
  }

  saveZone() {
    const form = this.zoneForm();
    const wsId = this.workspaceId();
    const id = this.editingZoneId();
    const payload: any = {
      name: form.name,
      description: form.description || null,
      allowedHolderTypes: form.allowedHolderTypes.length > 0 ? form.allowedHolderTypes : null,
      allowedAccessLevels: form.allowedAccessLevels.length > 0 ? form.allowedAccessLevels : null,
      capacity: form.capacity,
      color: form.color || null,
      isActive: form.isActive,
    };

    const req = id
      ? this.service.updateZone(wsId, id, payload)
      : this.service.createZone(wsId, payload);

    req.subscribe({
      next: () => {
        this.closeZoneModal();
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed to save zone'),
    });
  }

  deleteZone(zone: AccessZone) {
    if (!confirm(`Delete zone "${zone.name}"?`)) return;
    this.service.deleteZone(this.workspaceId(), zone.id).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed to delete zone'),
    });
  }

  // ─── Scan ────────────────────────────────────────────────────────────

  runScan() {
    const code = this.scanCode().trim();
    if (!code) return;
    this.isScanning.set(true);
    this.service
      .scan(this.workspaceId(), {
        code,
        zoneId: this.scanZoneId() || undefined,
        direction: this.scanDirection(),
      })
      .subscribe({
        next: (res) => {
          this.lastScan.set(res);
          this.scanCode.set('');
          this.isScanning.set(false);
          // Refresh attendance & summary
          this.service
            .getAttendance(this.workspaceId(), { limit: 100 })
            .subscribe({ next: (logs) => this.attendance.set(logs) });
          this.service
            .getSummary(this.workspaceId())
            .subscribe({ next: (s) => this.summary.set(s) });
        },
        error: (err) => {
          this.isScanning.set(false);
          alert(err?.error?.message || 'Scan failed');
        },
      });
  }

  expireStale() {
    this.service.expireStale(this.workspaceId()).subscribe({
      next: (res) => {
        alert(`Marked ${res.expired} credential(s) as expired.`);
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed'),
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  holderBadgeClass(type: HolderType): string {
    switch (type) {
      case 'player':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'official':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'volunteer':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'media':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'guest':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      case 'staff':
        return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
    }
  }

  accessBadgeClass(level: AccessLevel): string {
    switch (level) {
      case 'general':
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
      case 'restricted':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'vip':
        return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      case 'all_areas':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
    }
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'revoked':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'expired':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      case 'lost':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  }

  scanResultClass(result: string): string {
    if (result === 'granted') {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
    return 'bg-red-500/15 text-red-400 border-red-500/30';
  }

  formatScanResult(result: string): string {
    return result.replace('denied_', 'Denied — ').replace(/_/g, ' ');
  }

  selectCredential(id: string) {
    this.selectedCredentialId.set(id);
  }
}
