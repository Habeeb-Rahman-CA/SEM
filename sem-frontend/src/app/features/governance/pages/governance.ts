import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertCategory,
  AlertsSummary,
  GovernanceService,
  PolicyConfig,
  TeamAlert,
  TeamAlertPreference,
  ValidationReport,
} from '../services/governance.service';
import { TeamService } from '../../teams/services/team.service';
import { Team } from '../../workspaces/services/workspace.service';

type GovTab = 'alerts' | 'policies' | 'validate' | 'preferences' | 'broadcast';

@Component({
  selector: 'app-governance',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './governance.html',
})
export class GovernanceComponent implements OnInit {
  workspaceId = input.required<string>();

  private service = inject(GovernanceService);
  private teamService = inject(TeamService);

  currentTab = signal<GovTab>('alerts');
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Alerts
  alertsSummary = signal<AlertsSummary | null>(null);
  alerts = signal<TeamAlert[]>([]);
  alertUnreadFilter = signal(false);
  alertCategoryFilter = signal<AlertCategory | ''>('');
  alertTeamFilter = signal<string>('');

  // Policies
  policy = signal<PolicyConfig | null>(null);
  policyDraft = signal<Partial<PolicyConfig>>({});

  // Validation
  validationReport = signal<ValidationReport | null>(null);
  validationSeason = signal<string>('');
  validationRunning = signal(false);

  // Preferences
  preferences = signal<TeamAlertPreference[]>([]);
  teams = signal<Team[]>([]);

  // Broadcast form
  broadcastForm = signal({
    teamIds: [] as string[],
    category: 'general' as AlertCategory,
    severity: 'info' as 'info' | 'success' | 'warning' | 'critical',
    title: '',
    message: '',
    actionUrl: '',
  });

  filteredAlerts = computed(() => {
    const list = this.alerts();
    const team = this.alertTeamFilter();
    const cat = this.alertCategoryFilter();
    const unread = this.alertUnreadFilter();
    return list.filter(
      (a) => (!team || a.teamId === team) && (!cat || a.category === cat) && (!unread || !a.isRead),
    );
  });

  allCategories: AlertCategory[] = [
    'auction_event',
    'auction_bid',
    'auction_purchase',
    'transfer_submitted',
    'transfer_approved',
    'transfer_rejected',
    'budget_warning',
    'budget_exceeded',
    'deadline_approaching',
    'contract_expiring',
    'general',
  ];

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

    this.service.getAlertsSummary(wsId).subscribe({
      next: (s) => this.alertsSummary.set(s),
    });

    this.service.getAlerts(wsId, { limit: 100 }).subscribe({
      next: (list) => {
        this.alerts.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load alerts');
        this.isLoading.set(false);
      },
    });

    this.service.getPolicy(wsId).subscribe({
      next: (p) => {
        this.policy.set(p);
        this.policyDraft.set({ ...p });
      },
    });

    this.service.getPreferences(wsId).subscribe({
      next: (list) => this.preferences.set(list),
    });

    this.teamService.getTeams(wsId).subscribe({
      next: (list) => this.teams.set(list),
    });
  }

  // ─── Policies ────────────────────────────────────────────────────────

  toggleBool(key: keyof PolicyConfig) {
    const cur = this.policyDraft();
    this.policyDraft.set({ ...cur, [key]: !cur[key] });
  }

  updateNumber(key: keyof PolicyConfig, value: number) {
    this.policyDraft.set({ ...this.policyDraft(), [key]: value });
  }

  savePolicy() {
    const draft = this.policyDraft();
    const orig = this.policy();
    if (!orig) return;
    // Only send changed keys
    const patch: Partial<PolicyConfig> = {};
    for (const key of Object.keys(draft) as Array<keyof PolicyConfig>) {
      if (draft[key] !== orig[key]) {
        (patch as any)[key] = draft[key];
      }
    }
    if (Object.keys(patch).length === 0) return;
    this.service.updatePolicy(this.workspaceId(), patch).subscribe({
      next: (p) => {
        this.policy.set(p);
        this.policyDraft.set({ ...p });
      },
      error: (err) => alert(err?.error?.message || 'Failed to save policy'),
    });
  }

  // ─── Validation ──────────────────────────────────────────────────────

  runValidation() {
    this.validationRunning.set(true);
    this.service.validate(this.workspaceId(), this.validationSeason() || undefined).subscribe({
      next: (r) => {
        this.validationReport.set(r);
        this.validationRunning.set(false);
      },
      error: (err) => {
        alert(err?.error?.message || 'Validation failed');
        this.validationRunning.set(false);
      },
    });
  }

  // ─── Alerts ──────────────────────────────────────────────────────────

  markRead(alert: TeamAlert) {
    this.service.markRead(this.workspaceId(), alert.id).subscribe({
      next: () => this.loadAll(),
    });
  }

  markAllRead() {
    if (!confirm('Mark all alerts as read?')) return;
    this.service.markAllRead(this.workspaceId(), this.alertTeamFilter() || undefined).subscribe({
      next: () => this.loadAll(),
    });
  }

  deleteAlert(alert: TeamAlert) {
    if (!confirm(`Delete alert "${alert.title}"?`)) return;
    this.service.deleteAlert(this.workspaceId(), alert.id).subscribe({
      next: () => this.loadAll(),
    });
  }

  runScan() {
    if (!confirm('Scan workspace for closing windows, expiring contracts, and budget thresholds?'))
      return;
    this.service.runScan(this.workspaceId()).subscribe({
      next: (r) => {
        alert(`Scan complete — ${r.created} new alert(s) created.`);
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Scan failed'),
    });
  }

  // ─── Preferences ─────────────────────────────────────────────────────

  togglePreference(
    pref: TeamAlertPreference | undefined,
    teamId: string,
    key: keyof TeamAlertPreference,
  ) {
    const current = pref?.[key] as boolean;
    this.service
      .updatePreference(this.workspaceId(), teamId, {
        [key]: !current,
      } as any)
      .subscribe({
        next: () => this.loadAll(),
      });
  }

  preferenceFor(teamId: string): TeamAlertPreference | undefined {
    return this.preferences().find((p) => p.teamId === teamId);
  }

  // ─── Broadcast ───────────────────────────────────────────────────────

  toggleBroadcastTeam(teamId: string) {
    const cur = this.broadcastForm().teamIds;
    const next = cur.includes(teamId) ? cur.filter((id) => id !== teamId) : [...cur, teamId];
    this.broadcastForm.set({ ...this.broadcastForm(), teamIds: next });
  }

  broadcast() {
    const f = this.broadcastForm();
    if (f.teamIds.length === 0 || !f.title || !f.message) return;
    this.service
      .broadcastAlert(this.workspaceId(), {
        teamIds: f.teamIds,
        title: f.title,
        message: f.message,
        category: f.category,
        severity: f.severity,
        actionUrl: f.actionUrl || undefined,
      })
      .subscribe({
        next: (r) => {
          alert(`Sent ${r.sent} alert(s); ${r.skipped} skipped (muted).`);
          this.broadcastForm.set({
            teamIds: [],
            category: 'general',
            severity: 'info',
            title: '',
            message: '',
            actionUrl: '',
          });
          this.loadAll();
        },
        error: (err) => alert(err?.error?.message || 'Broadcast failed'),
      });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  severityBadgeClass(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'warning':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'success':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'info':
      default:
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    }
  }

  categoryBadgeClass(cat: AlertCategory): string {
    if (cat.startsWith('auction')) {
      return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
    }
    if (cat.startsWith('transfer')) {
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    }
    if (cat.startsWith('budget')) {
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
    if (cat.includes('deadline') || cat.includes('expiring')) {
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    }
    return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  }

  labelFor(text: string): string {
    return text.replace(/_/g, ' ');
  }

  policyBoolKeys: Array<{
    key: keyof PolicyConfig;
    label: string;
    hint: string;
  }> = [
    {
      key: 'preventDuplicateAuctionRegistration',
      label: 'Prevent duplicate auction registrations',
      hint: 'Blocks the same player from being registered twice in one auction.',
    },
    {
      key: 'blockAuctionBidOverBudget',
      label: 'Block auction bids over budget',
      hint: "Rejects bids exceeding a team's remaining auction budget.",
    },
    {
      key: 'preventDuplicateTransferRequest',
      label: 'Prevent duplicate transfer requests',
      hint: 'Only one pending transfer request per player.',
    },
    {
      key: 'requireOpenWindowForTransfers',
      label: 'Require open window for transfers',
      hint: 'Transfer submissions require an active transfer window.',
    },
    {
      key: 'enforceSquadCapsOnApprove',
      label: 'Enforce squad caps on approval',
      hint: 'Reject transfer approvals that would exceed roster caps.',
    },
    {
      key: 'uniqueRegistrationPerSeason',
      label: 'Unique registration # per season',
      hint: 'No two contracts share the same registration number within a season.',
    },
    {
      key: 'uniqueJerseyPerTeamSeason',
      label: 'Unique jersey # per team & season',
      hint: 'No two active players on a team share a jersey number in one season.',
    },
    {
      key: 'blockNegativeBudgets',
      label: 'Flag negative budgets',
      hint: 'Report teams that have spent more than their budget.',
    },
    {
      key: 'requireActiveContractForMatch',
      label: 'Require active contract for match',
      hint: 'Match consoles reject players without an active season contract.',
    },
    {
      key: 'requireRegistrationForMatch',
      label: 'Require registration # for match',
      hint: 'Players without a registration number are marked ineligible.',
    },
  ];
}
