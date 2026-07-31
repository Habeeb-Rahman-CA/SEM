import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TransferRequest,
  TransferStatus,
  TransferSummary,
  TransferType,
  TransferWindow,
  TransfersService,
} from '../services/transfers.service';
import { PlayerService } from '../../players/services/player.service';
import { TeamService } from '../../teams/services/team.service';
import { Player, Team } from '../../workspaces/services/workspace.service';

type TransferTab = 'requests' | 'windows' | 'history';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './transfers.html',
})
export class TransfersComponent implements OnInit {
  workspaceId = input.required<string>();

  private service = inject(TransfersService);
  private playerService = inject(PlayerService);
  private teamService = inject(TeamService);

  summary = signal<TransferSummary | null>(null);
  requests = signal<TransferRequest[]>([]);
  windows = signal<TransferWindow[]>([]);
  players = signal<Player[]>([]);
  teams = signal<Team[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  currentTab = signal<TransferTab>('requests');
  statusFilter = signal<TransferStatus | ''>('');
  selectedRequestId = signal<string | null>(null);

  // Submit modal
  isSubmitModalOpen = signal(false);
  submitForm = signal({
    playerId: '',
    toTeamId: '',
    transferType: 'permanent' as TransferType,
    fee: 0,
    currency: 'INR',
    loanStartDate: '',
    loanEndDate: '',
    windowId: '',
    reason: '',
  });

  // Review modal
  isReviewModalOpen = signal(false);
  reviewAction = signal<'approve' | 'reject'>('approve');
  reviewingRequestId = signal<string | null>(null);
  reviewNotes = signal('');

  // Window modal
  isWindowModalOpen = signal(false);
  editingWindowId = signal<string | null>(null);
  windowForm = signal({
    name: '',
    description: '',
    startAt: '',
    endAt: '',
    isActive: true,
    allowedPermanent: true,
    allowedLoan: true,
    maxTransfersPerTeam: null as number | null,
  });

  // Player history modal
  isHistoryModalOpen = signal(false);
  historyPlayerId = signal<string | null>(null);
  historyPlayerName = signal<string>('');
  history = signal<any | null>(null);

  filteredRequests = computed(() => {
    const s = this.statusFilter();
    return s ? this.requests().filter((r) => r.status === s) : this.requests();
  });

  selectedRequest = computed<TransferRequest | null>(() => {
    const id = this.selectedRequestId();
    if (!id) return null;
    return this.requests().find((r) => r.id === id) || null;
  });

  submitFormPlayer = computed<Player | null>(() => {
    const id = this.submitForm().playerId;
    return this.players().find((p) => p.id === id) || null;
  });

  eligibleDestinationTeams = computed(() => {
    const p = this.submitFormPlayer();
    if (!p) return this.teams();
    return this.teams().filter((t) => t.id !== p.teamId);
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
    });

    this.service.getRequests(wsId).subscribe({
      next: (list) => {
        this.requests.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load requests');
        this.isLoading.set(false);
      },
    });

    this.service.getWindows(wsId).subscribe({
      next: (list) => this.windows.set(list),
    });

    this.playerService.getPlayers(wsId).subscribe({
      next: (list) => this.players.set(list),
    });

    this.teamService.getTeams(wsId).subscribe({
      next: (list) => this.teams.set(list),
    });
  }

  // ─── Submit modal ────────────────────────────────────────────────────

  openSubmitModal() {
    this.submitForm.set({
      playerId: '',
      toTeamId: '',
      transferType: 'permanent',
      fee: 0,
      currency: 'INR',
      loanStartDate: '',
      loanEndDate: '',
      windowId: '',
      reason: '',
    });
    this.isSubmitModalOpen.set(true);
  }

  closeSubmitModal() {
    this.isSubmitModalOpen.set(false);
  }

  submitRequest() {
    const f = this.submitForm();
    if (!f.playerId || !f.toTeamId) return;
    const payload: any = {
      playerId: f.playerId,
      toTeamId: f.toTeamId,
      transferType: f.transferType,
      currency: f.currency,
      reason: f.reason || undefined,
    };
    if (f.transferType === 'permanent') {
      payload.fee = f.fee || 0;
    } else {
      payload.loanStartDate = f.loanStartDate;
      payload.loanEndDate = f.loanEndDate;
      if (f.fee > 0) payload.fee = f.fee;
    }
    if (f.windowId) payload.windowId = f.windowId;

    this.service.submitRequest(this.workspaceId(), payload).subscribe({
      next: () => {
        this.closeSubmitModal();
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed to submit'),
    });
  }

  // ─── Review modal ────────────────────────────────────────────────────

  openReviewModal(request: TransferRequest, action: 'approve' | 'reject') {
    this.reviewingRequestId.set(request.id);
    this.reviewAction.set(action);
    this.reviewNotes.set('');
    this.isReviewModalOpen.set(true);
  }

  closeReviewModal() {
    this.isReviewModalOpen.set(false);
  }

  submitReview() {
    const id = this.reviewingRequestId();
    if (!id) return;
    const action = this.reviewAction();
    const req =
      action === 'approve'
        ? this.service.approveRequest(this.workspaceId(), id, this.reviewNotes())
        : this.service.rejectRequest(this.workspaceId(), id, this.reviewNotes());
    req.subscribe({
      next: () => {
        this.closeReviewModal();
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || `Failed to ${action} request`),
    });
  }

  cancelRequest(request: TransferRequest) {
    if (!confirm('Cancel this transfer request?')) return;
    this.service.cancelRequest(this.workspaceId(), request.id).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed to cancel'),
    });
  }

  // ─── Window modal ────────────────────────────────────────────────────

  openWindowModal(w?: TransferWindow) {
    if (w) {
      this.editingWindowId.set(w.id);
      this.windowForm.set({
        name: w.name,
        description: w.description || '',
        startAt: w.startAt.slice(0, 16),
        endAt: w.endAt.slice(0, 16),
        isActive: w.isActive,
        allowedPermanent: !w.allowedTypes || w.allowedTypes.includes('permanent'),
        allowedLoan: !w.allowedTypes || w.allowedTypes.includes('loan'),
        maxTransfersPerTeam: w.maxTransfersPerTeam,
      });
    } else {
      this.editingWindowId.set(null);
      const now = new Date();
      const start = now.toISOString().slice(0, 16);
      const endDate = new Date(now.getTime() + 30 * 86400000);
      this.windowForm.set({
        name: '',
        description: '',
        startAt: start,
        endAt: endDate.toISOString().slice(0, 16),
        isActive: true,
        allowedPermanent: true,
        allowedLoan: true,
        maxTransfersPerTeam: null,
      });
    }
    this.isWindowModalOpen.set(true);
  }

  closeWindowModal() {
    this.isWindowModalOpen.set(false);
  }

  saveWindow() {
    const f = this.windowForm();
    if (!f.name || !f.startAt || !f.endAt) return;
    const allowedTypes: TransferType[] = [];
    if (f.allowedPermanent) allowedTypes.push('permanent');
    if (f.allowedLoan) allowedTypes.push('loan');

    const payload: any = {
      name: f.name,
      description: f.description || null,
      startAt: new Date(f.startAt).toISOString(),
      endAt: new Date(f.endAt).toISOString(),
      isActive: f.isActive,
      allowedTypes: allowedTypes.length ? allowedTypes : null,
      maxTransfersPerTeam: f.maxTransfersPerTeam,
    };

    const id = this.editingWindowId();
    const req = id
      ? this.service.updateWindow(this.workspaceId(), id, payload)
      : this.service.createWindow(this.workspaceId(), payload);
    req.subscribe({
      next: () => {
        this.closeWindowModal();
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed to save window'),
    });
  }

  deleteWindow(w: TransferWindow) {
    if (!confirm(`Delete window "${w.name}"?`)) return;
    this.service.deleteWindow(this.workspaceId(), w.id).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed'),
    });
  }

  // ─── History modal ───────────────────────────────────────────────────

  openHistoryModal(playerId: string, playerName: string) {
    this.historyPlayerId.set(playerId);
    this.historyPlayerName.set(playerName);
    this.history.set(null);
    this.isHistoryModalOpen.set(true);
    this.service.getPlayerHistory(this.workspaceId(), playerId).subscribe({
      next: (h) => this.history.set(h),
    });
  }

  closeHistoryModal() {
    this.isHistoryModalOpen.set(false);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'approved':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'rejected':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'cancelled':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      case 'completed':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  }

  typeBadgeClass(type: TransferType): string {
    return type === 'loan'
      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
      : 'bg-violet-500/15 text-violet-400 border-violet-500/30';
  }

  currencySymbol(currency: string): string {
    switch (currency) {
      case 'INR':
        return '₹';
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      default:
        return currency + ' ';
    }
  }

  formatAmount(amount: string | number | null | undefined): string {
    if (amount == null) return '—';
    const n = Number(amount);
    if (!Number.isFinite(n)) return String(amount);
    return n.toLocaleString();
  }

  isWindowOpen(w: TransferWindow): boolean {
    const now = Date.now();
    return w.isActive && now >= new Date(w.startAt).getTime() && now <= new Date(w.endAt).getTime();
  }

  windowStatusLabel(w: TransferWindow): string {
    if (!w.isActive) return 'Inactive';
    const now = Date.now();
    if (now < new Date(w.startAt).getTime()) return 'Scheduled';
    if (now > new Date(w.endAt).getTime()) return 'Closed';
    return 'Open';
  }

  selectRequest(id: string) {
    this.selectedRequestId.set(id);
  }
}
