import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Auction,
  AuctionCategory,
  AuctionPlayer,
  AuctionStatus,
  AuctionSummary,
  AuctionsService,
  LiveStatus,
  WorkspaceAuctionSummary,
} from '../services/auctions.service';
import { PlayerService } from '../../players/services/player.service';
import { TeamService } from '../../teams/services/team.service';
import { Player, Team } from '../../workspaces/services/workspace.service';

type AuctionTab = 'auctions' | 'setup' | 'roster' | 'bidding' | 'summary';

@Component({
  selector: 'app-auctions',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './auctions.html',
})
export class AuctionsComponent implements OnInit, OnDestroy {
  workspaceId = input.required<string>();

  private service = inject(AuctionsService);
  private playerService = inject(PlayerService);
  private teamService = inject(TeamService);

  workspaceSummary = signal<WorkspaceAuctionSummary | null>(null);
  auctions = signal<Auction[]>([]);
  selectedAuction = signal<Auction | null>(null);
  live = signal<LiveStatus | null>(null);
  summary = signal<AuctionSummary | null>(null);
  players = signal<Player[]>([]);
  teams = signal<Team[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  currentTab = signal<AuctionTab>('auctions');
  private pollTimer: any = null;

  // Auction modal
  isAuctionModalOpen = signal(false);
  editingAuctionId = signal<string | null>(null);
  auctionForm = signal({
    name: '',
    description: '',
    currency: 'INR',
    budgetPerTeam: 1000000,
    bidIncrement: 10000,
    bidWindowSec: 30,
    scheduledStart: '',
  });

  // Category modal
  isCategoryModalOpen = signal(false);
  editingCategoryId = signal<string | null>(null);
  categoryForm = signal({
    name: '',
    description: '',
    basePrice: 0,
    orderIndex: 0,
    color: '#8b5cf6',
  });

  // Register-players modal
  isRegisterModalOpen = signal(false);
  selectedPlayerIds = signal<string[]>([]);
  registerCategoryId = signal<string>('');

  // Team-budget modal
  isBudgetModalOpen = signal(false);
  budgetTeamId = signal<string>('');
  budgetAmount = signal<number>(0);

  // Bidding console
  bidTeamId = signal<string>('');
  bidAmount = signal<number>(0);

  filteredAvailablePlayers = computed(() => {
    const a = this.selectedAuction();
    if (!a?.players) return [];
    return a.players.filter((p) => p.status === 'available');
  });

  soldPlayers = computed(() => {
    const a = this.selectedAuction();
    if (!a?.players) return [];
    return a.players.filter((p) => p.status === 'sold');
  });

  unsoldPlayers = computed(() => {
    const a = this.selectedAuction();
    if (!a?.players) return [];
    return a.players.filter((p) => p.status === 'unsold');
  });

  eligiblePlayersForRegister = computed(() => {
    const a = this.selectedAuction();
    const enrolled = new Set((a?.players || []).map((p) => p.playerId));
    return this.players().filter((p) => !enrolled.has(p.id));
  });

  eligibleTeamsForBudget = computed(() => {
    const a = this.selectedAuction();
    const enrolled = new Set((a?.teamBudgets || []).map((b) => b.teamId));
    return this.teams().filter((t) => !enrolled.has(t.id));
  });

  countdown = computed(() => {
    const live = this.live();
    if (!live?.auction.currentRoundEndsAt) return null;
    const now = Date.now();
    const end = new Date(live.auction.currentRoundEndsAt).getTime();
    const remaining = Math.max(0, Math.floor((end - now) / 1000));
    return remaining;
  });

  private tick = signal(0); // ticker for countdown re-render

  constructor() {
    effect(
      () => {
        const wsId = this.workspaceId();
        if (wsId) this.loadAll();
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const a = this.selectedAuction();
        if (a) {
          this.refreshLive(a.id);
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit() {
    this.loadAll();
    // Re-render countdown every second and poll live status every 3s when
    // an auction is selected & live.
    this.pollTimer = setInterval(() => {
      this.tick.update((n) => n + 1);
      const a = this.selectedAuction();
      if (a && a.status === 'live') {
        this.refreshLive(a.id, /* silent */ true);
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  loadAll() {
    const wsId = this.workspaceId();
    if (!wsId) return;
    this.isLoading.set(true);
    this.error.set(null);

    this.service.getWorkspaceSummary(wsId).subscribe({
      next: (s) => this.workspaceSummary.set(s),
    });

    this.service.getAuctions(wsId).subscribe({
      next: (list) => {
        this.auctions.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load auctions');
        this.isLoading.set(false);
      },
    });

    this.playerService.getPlayers(wsId).subscribe({
      next: (list) => this.players.set(list),
    });

    this.teamService.getTeams(wsId).subscribe({
      next: (list) => this.teams.set(list),
    });
  }

  selectAuction(auction: Auction) {
    this.service.getAuctionById(this.workspaceId(), auction.id).subscribe({
      next: (fresh) => {
        this.selectedAuction.set(fresh);
        this.currentTab.set('setup');
        this.refreshLive(fresh.id);
      },
    });
  }

  refreshSelected() {
    const a = this.selectedAuction();
    if (!a) return;
    this.service.getAuctionById(this.workspaceId(), a.id).subscribe({
      next: (fresh) => this.selectedAuction.set(fresh),
    });
  }

  refreshLive(auctionId: string, silent = false) {
    this.service.getLiveStatus(this.workspaceId(), auctionId).subscribe({
      next: (l) => this.live.set(l),
      error: (err) => {
        if (!silent) console.error('Live status failed', err);
      },
    });
  }

  loadSummary() {
    const a = this.selectedAuction();
    if (!a) return;
    this.service.getSummary(this.workspaceId(), a.id).subscribe({
      next: (s) => this.summary.set(s),
    });
  }

  // ─── Auction Modal ───────────────────────────────────────────────────

  openAuctionModal(auction?: Auction) {
    if (auction) {
      this.editingAuctionId.set(auction.id);
      this.auctionForm.set({
        name: auction.name,
        description: auction.description || '',
        currency: auction.currency,
        budgetPerTeam: Number(auction.budgetPerTeam),
        bidIncrement: auction.bidIncrement,
        bidWindowSec: auction.bidWindowSec,
        scheduledStart: auction.scheduledStart ? auction.scheduledStart.slice(0, 16) : '',
      });
    } else {
      this.editingAuctionId.set(null);
      this.auctionForm.set({
        name: '',
        description: '',
        currency: 'INR',
        budgetPerTeam: 1000000,
        bidIncrement: 10000,
        bidWindowSec: 30,
        scheduledStart: '',
      });
    }
    this.isAuctionModalOpen.set(true);
  }

  closeAuctionModal() {
    this.isAuctionModalOpen.set(false);
  }

  saveAuction() {
    const form = this.auctionForm();
    const wsId = this.workspaceId();
    const id = this.editingAuctionId();
    const payload: any = {
      name: form.name,
      description: form.description || null,
      currency: form.currency,
      budgetPerTeam: form.budgetPerTeam,
      bidIncrement: form.bidIncrement,
      bidWindowSec: form.bidWindowSec,
      scheduledStart: form.scheduledStart ? new Date(form.scheduledStart).toISOString() : null,
    };
    const req = id
      ? this.service.updateAuction(wsId, id, payload)
      : this.service.createAuction(wsId, payload);
    req.subscribe({
      next: (a) => {
        this.closeAuctionModal();
        this.loadAll();
        this.selectAuction(a);
      },
      error: (err) => alert(err?.error?.message || 'Failed to save auction'),
    });
  }

  changeAuctionStatus(a: Auction, status: AuctionStatus) {
    this.service.updateAuction(this.workspaceId(), a.id, { status }).subscribe({
      next: (fresh) => {
        this.selectedAuction.set(fresh);
        this.loadAll();
        this.refreshLive(fresh.id);
      },
      error: (err) => alert(err?.error?.message || 'Failed to change status'),
    });
  }

  deleteAuction(a: Auction) {
    if (!confirm(`Delete auction "${a.name}"?`)) return;
    this.service.deleteAuction(this.workspaceId(), a.id).subscribe({
      next: () => {
        if (this.selectedAuction()?.id === a.id) {
          this.selectedAuction.set(null);
        }
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed to delete'),
    });
  }

  // ─── Category Modal ──────────────────────────────────────────────────

  openCategoryModal(cat?: AuctionCategory) {
    if (cat) {
      this.editingCategoryId.set(cat.id);
      this.categoryForm.set({
        name: cat.name,
        description: cat.description || '',
        basePrice: Number(cat.basePrice),
        orderIndex: cat.orderIndex,
        color: cat.color || '#8b5cf6',
      });
    } else {
      this.editingCategoryId.set(null);
      this.categoryForm.set({
        name: '',
        description: '',
        basePrice: 0,
        orderIndex: (this.selectedAuction()?.categories?.length || 0) + 1,
        color: '#8b5cf6',
      });
    }
    this.isCategoryModalOpen.set(true);
  }

  closeCategoryModal() {
    this.isCategoryModalOpen.set(false);
  }

  saveCategory() {
    const a = this.selectedAuction();
    if (!a) return;
    const form = this.categoryForm();
    const wsId = this.workspaceId();
    const id = this.editingCategoryId();
    const payload: any = {
      name: form.name,
      description: form.description || null,
      basePrice: form.basePrice,
      orderIndex: form.orderIndex,
      color: form.color || null,
    };
    const req = id
      ? this.service.updateCategory(wsId, id, payload)
      : this.service.createCategory(wsId, a.id, payload);
    req.subscribe({
      next: () => {
        this.closeCategoryModal();
        this.refreshSelected();
      },
      error: (err) => alert(err?.error?.message || 'Failed to save category'),
    });
  }

  deleteCategory(cat: AuctionCategory) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    this.service.deleteCategory(this.workspaceId(), cat.id).subscribe({
      next: () => this.refreshSelected(),
      error: (err) => alert(err?.error?.message || 'Failed to delete'),
    });
  }

  // ─── Register Players Modal ──────────────────────────────────────────

  openRegisterModal() {
    this.selectedPlayerIds.set([]);
    this.registerCategoryId.set('');
    this.isRegisterModalOpen.set(true);
  }

  closeRegisterModal() {
    this.isRegisterModalOpen.set(false);
  }

  togglePlayerSelection(playerId: string) {
    const cur = this.selectedPlayerIds();
    if (cur.includes(playerId)) {
      this.selectedPlayerIds.set(cur.filter((id) => id !== playerId));
    } else {
      this.selectedPlayerIds.set([...cur, playerId]);
    }
  }

  registerSelectedPlayers() {
    const a = this.selectedAuction();
    if (!a) return;
    const ids = this.selectedPlayerIds();
    if (ids.length === 0) return;
    const catId = this.registerCategoryId() || undefined;
    const payload = ids.map((playerId) => ({
      playerId,
      categoryId: catId,
    }));
    this.service.registerPlayers(this.workspaceId(), a.id, payload).subscribe({
      next: () => {
        this.closeRegisterModal();
        this.refreshSelected();
      },
      error: (err) => alert(err?.error?.message || 'Failed to register'),
    });
  }

  removeAuctionPlayer(ap: AuctionPlayer) {
    if (!confirm(`Withdraw ${ap.player?.user?.username || 'player'}?`)) return;
    this.service.removeAuctionPlayer(this.workspaceId(), ap.id).subscribe({
      next: () => this.refreshSelected(),
      error: (err) => alert(err?.error?.message || 'Failed to withdraw'),
    });
  }

  // ─── Budgets ─────────────────────────────────────────────────────────

  openBudgetModal() {
    this.budgetTeamId.set('');
    const a = this.selectedAuction();
    this.budgetAmount.set(a ? Number(a.budgetPerTeam) : 0);
    this.isBudgetModalOpen.set(true);
  }

  closeBudgetModal() {
    this.isBudgetModalOpen.set(false);
  }

  saveBudget() {
    const a = this.selectedAuction();
    if (!a || !this.budgetTeamId()) return;
    this.service
      .upsertTeamBudget(this.workspaceId(), a.id, {
        teamId: this.budgetTeamId(),
        initialBudget: this.budgetAmount(),
      })
      .subscribe({
        next: () => {
          this.closeBudgetModal();
          this.refreshSelected();
          this.refreshLive(a.id);
        },
        error: (err) => alert(err?.error?.message || 'Failed'),
      });
  }

  removeBudget(budgetId: string) {
    if (!confirm('Remove team from auction?')) return;
    this.service.removeTeamBudget(this.workspaceId(), budgetId).subscribe({
      next: () => {
        this.refreshSelected();
        const a = this.selectedAuction();
        if (a) this.refreshLive(a.id);
      },
      error: (err) => alert(err?.error?.message || 'Failed'),
    });
  }

  // ─── Bidding ─────────────────────────────────────────────────────────

  startBidding(ap: AuctionPlayer) {
    const a = this.selectedAuction();
    if (!a) return;
    this.service.startBidding(this.workspaceId(), a.id, ap.id).subscribe({
      next: (fresh) => {
        this.selectedAuction.set(fresh);
        this.currentTab.set('bidding');
        this.refreshLive(fresh.id);
      },
      error: (err) => alert(err?.error?.message || 'Failed to start bidding'),
    });
  }

  placeBid() {
    const a = this.selectedAuction();
    if (!a || !this.bidTeamId() || this.bidAmount() <= 0) return;
    this.service.placeBid(this.workspaceId(), a.id, this.bidTeamId(), this.bidAmount()).subscribe({
      next: () => {
        this.refreshLive(a.id);
      },
      error: (err) => alert(err?.error?.message || 'Bid rejected'),
    });
  }

  quickBid(teamId: string, amount: number) {
    const a = this.selectedAuction();
    if (!a) return;
    this.service.placeBid(this.workspaceId(), a.id, teamId, amount).subscribe({
      next: () => this.refreshLive(a.id),
      error: (err) => alert(err?.error?.message || 'Bid rejected'),
    });
  }

  suggestedBid(): number {
    const live = this.live();
    if (!live?.currentPlayer) return 0;
    const winning = live.bids.find((b) => b.status === 'winning');
    const base = winning
      ? Number(winning.amount)
      : Number(live.currentPlayer.customBasePrice ?? live.currentPlayer.category?.basePrice ?? 0);
    return base + live.auction.bidIncrement;
  }

  closeBidding() {
    const a = this.selectedAuction();
    if (!a) return;
    if (!confirm('Close current bidding round and assign to highest bidder?')) return;
    this.service.closeBidding(this.workspaceId(), a.id).subscribe({
      next: () => {
        this.bidTeamId.set('');
        this.bidAmount.set(0);
        this.refreshSelected();
        this.refreshLive(a.id);
      },
      error: (err) => alert(err?.error?.message || 'Failed to close'),
    });
  }

  cancelRound() {
    const a = this.selectedAuction();
    if (!a) return;
    if (!confirm('Cancel current round (bids withdrawn, player back to pool)?')) return;
    this.service.cancelRound(this.workspaceId(), a.id).subscribe({
      next: () => {
        this.refreshSelected();
        this.refreshLive(a.id);
      },
      error: (err) => alert(err?.error?.message || 'Failed'),
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'live':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'draft':
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
      case 'scheduled':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'paused':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'completed':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'cancelled':
        return 'bg-slate-500/15 text-slate-500 border-slate-500/30';
      case 'sold':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'unsold':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      case 'in_bidding':
        return 'bg-violet-500/20 text-violet-400 border-violet-500/40';
      case 'available':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  }

  formatAmount(amount: string | number | null | undefined): string {
    if (amount == null) return '—';
    const n = Number(amount);
    if (!Number.isFinite(n)) return String(amount);
    return n.toLocaleString();
  }

  currencySymbol(): string {
    const c = this.selectedAuction()?.currency || 'INR';
    switch (c) {
      case 'INR':
        return '₹';
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      default:
        return c + ' ';
    }
  }

  playerBasePrice(ap: AuctionPlayer): string {
    if (ap.customBasePrice != null) return ap.customBasePrice;
    if (ap.category?.basePrice != null) return ap.category.basePrice;
    return '0';
  }

  spentPercent(spent: string | number, budget: string | number): number {
    const s = Number(spent);
    const b = Number(budget);
    if (!Number.isFinite(b) || b <= 0) return 0;
    return Math.min(100, (s / b) * 100);
  }

  teamSpendPercent(spent: number, top: number): number {
    if (!Number.isFinite(top) || top <= 0) return 0;
    return Math.min(100, (spent / top) * 100);
  }
}
