import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FinanceService,
  Payment,
  PaymentCategory,
  PaymentDirection,
  PaymentStatus,
  TeamFinancialAccount,
  TeamReport,
  WorkspaceFinanceSummary,
} from '../services/finance.service';
import { TeamService } from '../../teams/services/team.service';
import { Team } from '../../workspaces/services/workspace.service';

type FinanceTab = 'summary' | 'accounts' | 'payments' | 'team-report';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './finance.html',
})
export class FinanceComponent implements OnInit {
  workspaceId = input.required<string>();

  private service = inject(FinanceService);
  private teamService = inject(TeamService);

  summary = signal<WorkspaceFinanceSummary | null>(null);
  accounts = signal<TeamFinancialAccount[]>([]);
  payments = signal<Payment[]>([]);
  teams = signal<Team[]>([]);
  teamReport = signal<TeamReport | null>(null);
  currentSeason = signal<string>(this.defaultSeasonLabel());
  isLoading = signal(true);
  error = signal<string | null>(null);

  currentTab = signal<FinanceTab>('summary');

  // Payment filters
  paymentTeamFilter = signal<string>('');
  paymentStatusFilter = signal<PaymentStatus | ''>('');
  paymentCategoryFilter = signal<PaymentCategory | ''>('');

  // Account modal
  isAccountModalOpen = signal(false);
  accountForm = signal({
    teamId: '',
    season: this.defaultSeasonLabel(),
    initialBudget: 0,
    currency: 'INR',
    notes: '',
  });

  // Payment modal
  isPaymentModalOpen = signal(false);
  editingPaymentId = signal<string | null>(null);
  paymentForm = signal({
    teamId: '',
    season: this.defaultSeasonLabel(),
    category: 'other' as PaymentCategory,
    direction: 'outgoing' as PaymentDirection,
    amount: 0,
    currency: 'INR',
    status: 'pending' as PaymentStatus,
    dueDate: '',
    paidAt: '',
    counterpartyTeamId: '',
    description: '',
    notes: '',
  });

  // Team report
  reportTeamId = signal<string>('');
  reportSeason = signal<string>(this.defaultSeasonLabel());

  categories: PaymentCategory[] = [
    'auction_purchase',
    'transfer_fee',
    'salary',
    'signing_bonus',
    'penalty',
    'refund',
    'other',
  ];

  filteredPayments = computed(() => {
    const list = this.payments();
    const team = this.paymentTeamFilter();
    const status = this.paymentStatusFilter();
    const cat = this.paymentCategoryFilter();
    return list.filter(
      (p) =>
        (!team || p.teamId === team) &&
        (!status || p.status === status) &&
        (!cat || p.category === cat),
    );
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

  defaultSeasonLabel(): string {
    const y = new Date().getFullYear();
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  }

  loadAll() {
    const wsId = this.workspaceId();
    if (!wsId) return;
    this.isLoading.set(true);
    this.error.set(null);

    this.service.getWorkspaceSummary(wsId, this.currentSeason()).subscribe({
      next: (s) => this.summary.set(s),
    });

    this.service.getAccounts(wsId, { season: this.currentSeason() }).subscribe({
      next: (list) => this.accounts.set(list),
    });

    this.service.getPayments(wsId, { season: this.currentSeason() }).subscribe({
      next: (list) => {
        this.payments.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load payments');
        this.isLoading.set(false);
      },
    });

    this.teamService.getTeams(wsId).subscribe({
      next: (list) => {
        this.teams.set(list);
        if (!this.reportTeamId() && list.length > 0) {
          this.reportTeamId.set(list[0].id);
        }
      },
    });
  }

  onSeasonChange(season: string) {
    this.currentSeason.set(season);
    this.reportSeason.set(season);
    this.loadAll();
  }

  syncFromSources() {
    if (
      !confirm(
        `Materialize completed transfer fees & active contract salaries into the payment ledger for ${this.currentSeason()}?`,
      )
    )
      return;
    this.service.syncFromSources(this.workspaceId(), this.currentSeason()).subscribe({
      next: (r) => {
        alert(
          `Synced ${r.createdTransferFees} transfer fee entries and ${r.createdSalaries} salary entries.`,
        );
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Sync failed'),
    });
  }

  // ─── Account modal ───────────────────────────────────────────────────

  openAccountModal(acc?: TeamFinancialAccount) {
    if (acc) {
      this.accountForm.set({
        teamId: acc.teamId,
        season: acc.season,
        initialBudget: Number(acc.initialBudget),
        currency: acc.currency,
        notes: acc.notes || '',
      });
    } else {
      this.accountForm.set({
        teamId: '',
        season: this.currentSeason(),
        initialBudget: 1000000,
        currency: 'INR',
        notes: '',
      });
    }
    this.isAccountModalOpen.set(true);
  }

  closeAccountModal() {
    this.isAccountModalOpen.set(false);
  }

  saveAccount() {
    const f = this.accountForm();
    if (!f.teamId || !f.season) return;
    this.service
      .upsertAccount(this.workspaceId(), {
        teamId: f.teamId,
        season: f.season,
        initialBudget: f.initialBudget,
        currency: f.currency,
        notes: f.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.closeAccountModal();
          this.loadAll();
        },
        error: (err) => alert(err?.error?.message || 'Failed'),
      });
  }

  deleteAccount(acc: TeamFinancialAccount) {
    if (!confirm(`Delete financial account for ${acc.team?.name}?`)) return;
    this.service.deleteAccount(this.workspaceId(), acc.id).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed'),
    });
  }

  // ─── Payment modal ───────────────────────────────────────────────────

  openPaymentModal(p?: Payment) {
    if (p) {
      this.editingPaymentId.set(p.id);
      this.paymentForm.set({
        teamId: p.teamId,
        season: p.season || this.currentSeason(),
        category: p.category,
        direction: p.direction,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        dueDate: p.dueDate?.slice(0, 10) || '',
        paidAt: p.paidAt?.slice(0, 10) || '',
        counterpartyTeamId: p.counterpartyTeamId || '',
        description: p.description,
        notes: p.notes || '',
      });
    } else {
      this.editingPaymentId.set(null);
      this.paymentForm.set({
        teamId: '',
        season: this.currentSeason(),
        category: 'other',
        direction: 'outgoing',
        amount: 0,
        currency: 'INR',
        status: 'pending',
        dueDate: '',
        paidAt: '',
        counterpartyTeamId: '',
        description: '',
        notes: '',
      });
    }
    this.isPaymentModalOpen.set(true);
  }

  closePaymentModal() {
    this.isPaymentModalOpen.set(false);
  }

  savePayment() {
    const f = this.paymentForm();
    const wsId = this.workspaceId();
    const id = this.editingPaymentId();
    if (id) {
      this.service
        .updatePayment(wsId, id, {
          status: f.status,
          amount: f.amount as any,
          dueDate: f.dueDate || null,
          paidAt: f.paidAt || null,
          description: f.description,
          notes: f.notes || null,
        } as any)
        .subscribe({
          next: () => {
            this.closePaymentModal();
            this.loadAll();
          },
          error: (err) => alert(err?.error?.message || 'Failed to update'),
        });
    } else {
      if (!f.teamId || !f.description || !f.amount) {
        alert('Team, description, and amount are required.');
        return;
      }
      this.service
        .createPayment(wsId, {
          teamId: f.teamId,
          season: f.season || undefined,
          category: f.category,
          direction: f.direction,
          amount: f.amount,
          currency: f.currency,
          status: f.status,
          dueDate: f.dueDate || undefined,
          paidAt: f.paidAt || undefined,
          counterpartyTeamId: f.counterpartyTeamId || undefined,
          description: f.description,
          notes: f.notes || undefined,
        } as any)
        .subscribe({
          next: () => {
            this.closePaymentModal();
            this.loadAll();
          },
          error: (err) => alert(err?.error?.message || 'Failed to save'),
        });
    }
  }

  markPaid(p: Payment) {
    this.service
      .updatePayment(this.workspaceId(), p.id, {
        status: 'paid',
        paidAt: new Date().toISOString(),
      } as any)
      .subscribe({
        next: () => this.loadAll(),
      });
  }

  deletePayment(p: Payment) {
    if (!confirm(`Delete payment "${p.description}"?`)) return;
    this.service.deletePayment(this.workspaceId(), p.id).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Failed'),
    });
  }

  // ─── Team report ─────────────────────────────────────────────────────

  loadTeamReport() {
    const teamId = this.reportTeamId();
    const season = this.reportSeason();
    if (!teamId || !season) return;
    this.service.getTeamReport(this.workspaceId(), teamId, season).subscribe({
      next: (r) => this.teamReport.set(r),
      error: (err) => alert(err?.error?.message || 'Failed to load report'),
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'pending':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'overdue':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'cancelled':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  }

  directionBadgeClass(dir: PaymentDirection): string {
    return dir === 'outgoing'
      ? 'bg-red-500/15 text-red-400 border-red-500/30'
      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  }

  categoryBadgeClass(cat: PaymentCategory): string {
    switch (cat) {
      case 'auction_purchase':
        return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
      case 'transfer_fee':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'salary':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'signing_bonus':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'penalty':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'refund':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
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

  labelFor(text: string): string {
    return text.replace(/_/g, ' ');
  }

  spendPercent(spent: number, budget: number): number {
    if (!Number.isFinite(budget) || budget <= 0) return 0;
    return Math.min(100, (spent / budget) * 100);
  }
}
