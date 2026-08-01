import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ContractStatus,
  ContractType,
  EligibilityResult,
  PlayerContract,
  RosterConfig,
  RosterRelease,
  RosterSummary,
  RostersService,
  TeamRoster,
} from '../services/rosters.service';
import { PlayerService } from '../../players/services/player.service';
import { TeamService } from '../../teams/services/team.service';
import { Player, Team } from '../../workspaces/services/workspace.service';

type RosterTab = 'squads' | 'contracts' | 'releases' | 'eligibility' | 'carry-forward';

@Component({
  selector: 'app-rosters',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './rosters.html',
})
export class RostersComponent implements OnInit {
  workspaceId = input.required<string>();

  private service = inject(RostersService);
  private playerService = inject(PlayerService);
  private teamService = inject(TeamService);

  summary = signal<RosterSummary | null>(null);
  teams = signal<Team[]>([]);
  players = signal<Player[]>([]);
  contracts = signal<PlayerContract[]>([]);
  releases = signal<RosterRelease[]>([]);
  currentSeason = signal<string>(this.defaultSeasonLabel());
  isLoading = signal(true);
  error = signal<string | null>(null);

  currentTab = signal<RosterTab>('squads');
  selectedTeamId = signal<string>('');
  selectedRoster = signal<TeamRoster | null>(null);

  // Config modal
  isConfigModalOpen = signal(false);
  configForm = signal({
    season: '',
    maxSquadSize: 25,
    maxForeignPlayers: null as number | null,
    minStarters: null as number | null,
    maxSubstitutes: null as number | null,
    notes: '',
  });

  // Contract modal
  isContractModalOpen = signal(false);
  editingContractId = signal<string | null>(null);
  contractForm = signal({
    playerId: '',
    teamId: '',
    season: '',
    contractType: 'full_time' as ContractType,
    startDate: '',
    endDate: '',
    salary: 0,
    currency: 'INR',
    jerseyNumber: '',
    registrationNumber: '',
    isForeign: false,
    status: 'active' as ContractStatus,
    suspensionReason: '',
    suspensionEndsAt: '',
    notes: '',
  });

  // Release modal
  isReleaseModalOpen = signal(false);
  releaseForm = signal({
    teamId: '',
    playerId: '',
    reason: '',
    replaceWithPlayerId: '',
    contractStartDate: '',
    contractEndDate: '',
    salary: 0,
    jerseyNumber: '',
  });

  // Eligibility check
  eligibilityForm = signal({
    playerId: '',
    season: this.defaultSeasonLabel(),
    matchDate: '',
    teamId: '',
  });
  eligibilityResult = signal<EligibilityResult | null>(null);

  // Carry-forward
  carryForwardForm = signal({
    fromSeason: '',
    toSeason: '',
    newStartDate: '',
    newEndDate: '',
    teamId: '',
  });
  carryForwardResult = signal<{
    created: number;
    skipped: number;
    failed: number;
  } | null>(null);

  filteredTeams = computed(() => this.teams());

  teamPlayers = computed(() => {
    const teamId = this.selectedTeamId();
    if (!teamId) return this.players();
    return this.players().filter((p) => p.teamId === teamId);
  });

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
        const teamId = this.selectedTeamId();
        const season = this.currentSeason();
        if (teamId && season) this.loadTeamRoster();
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

    this.service.getSummary(wsId, this.currentSeason()).subscribe({
      next: (s) => this.summary.set(s),
    });

    this.teamService.getTeams(wsId).subscribe({
      next: (list) => {
        this.teams.set(list);
        if (!this.selectedTeamId() && list.length > 0) {
          this.selectedTeamId.set(list[0].id);
        }
      },
    });

    this.playerService.getPlayers(wsId).subscribe({
      next: (list) => this.players.set(list),
    });

    this.service.getContracts(wsId, { season: this.currentSeason() }).subscribe({
      next: (list) => {
        this.contracts.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load contracts');
        this.isLoading.set(false);
      },
    });

    this.service.getReleases(wsId).subscribe({
      next: (list) => this.releases.set(list),
    });
  }

  loadTeamRoster() {
    const teamId = this.selectedTeamId();
    const season = this.currentSeason();
    if (!teamId || !season) return;
    this.service.getTeamRoster(this.workspaceId(), teamId, season).subscribe({
      next: (r) => this.selectedRoster.set(r),
      error: () => this.selectedRoster.set(null),
    });
  }

  onSeasonChange(season: string) {
    this.currentSeason.set(season);
    this.loadAll();
  }

  // ─── Config modal ────────────────────────────────────────────────────

  openConfigModal(config?: RosterConfig) {
    if (config) {
      this.configForm.set({
        season: config.season,
        maxSquadSize: config.maxSquadSize,
        maxForeignPlayers: config.maxForeignPlayers,
        minStarters: config.minStarters,
        maxSubstitutes: config.maxSubstitutes,
        notes: config.notes || '',
      });
    } else {
      this.configForm.set({
        season: this.currentSeason(),
        maxSquadSize: 25,
        maxForeignPlayers: null,
        minStarters: null,
        maxSubstitutes: null,
        notes: '',
      });
    }
    this.isConfigModalOpen.set(true);
  }

  closeConfigModal() {
    this.isConfigModalOpen.set(false);
  }

  saveConfig() {
    const teamId = this.selectedTeamId();
    if (!teamId) return;
    const f = this.configForm();
    this.service
      .upsertConfig(this.workspaceId(), teamId, {
        season: f.season,
        maxSquadSize: f.maxSquadSize,
        maxForeignPlayers: f.maxForeignPlayers ?? undefined,
        minStarters: f.minStarters ?? undefined,
        maxSubstitutes: f.maxSubstitutes ?? undefined,
        notes: f.notes || null,
      } as any)
      .subscribe({
        next: () => {
          this.closeConfigModal();
          this.loadTeamRoster();
        },
        error: (err) => alert(err?.error?.message || 'Failed to save config'),
      });
  }

  // ─── Contract modal ──────────────────────────────────────────────────

  openContractModal(contract?: PlayerContract) {
    if (contract) {
      this.editingContractId.set(contract.id);
      this.contractForm.set({
        playerId: contract.playerId,
        teamId: contract.teamId,
        season: contract.season,
        contractType: contract.contractType,
        startDate: contract.startDate.slice(0, 10),
        endDate: contract.endDate.slice(0, 10),
        salary: Number(contract.salary),
        currency: contract.currency,
        jerseyNumber: contract.jerseyNumber || '',
        registrationNumber: contract.registrationNumber || '',
        isForeign: contract.isForeign,
        status: contract.status,
        suspensionReason: contract.suspensionReason || '',
        suspensionEndsAt: contract.suspensionEndsAt?.slice(0, 10) || '',
        notes: contract.notes || '',
      });
    } else {
      this.editingContractId.set(null);
      const now = new Date();
      const start = now.toISOString().slice(0, 10);
      const end = new Date(now.getTime() + 365 * 86400000).toISOString().slice(0, 10);
      this.contractForm.set({
        playerId: '',
        teamId: this.selectedTeamId() || '',
        season: this.currentSeason(),
        contractType: 'full_time',
        startDate: start,
        endDate: end,
        salary: 0,
        currency: 'INR',
        jerseyNumber: '',
        registrationNumber: '',
        isForeign: false,
        status: 'active',
        suspensionReason: '',
        suspensionEndsAt: '',
        notes: '',
      });
    }
    this.isContractModalOpen.set(true);
  }

  closeContractModal() {
    this.isContractModalOpen.set(false);
  }

  saveContract() {
    const f = this.contractForm();
    const wsId = this.workspaceId();
    const id = this.editingContractId();
    const payload: any = {
      contractType: f.contractType,
      startDate: f.startDate,
      endDate: f.endDate,
      salary: f.salary,
      currency: f.currency,
      jerseyNumber: f.jerseyNumber || null,
      registrationNumber: f.registrationNumber || null,
      isForeign: f.isForeign,
      notes: f.notes || null,
    };
    if (id) {
      payload.status = f.status;
      payload.suspensionReason = f.suspensionReason || null;
      payload.suspensionEndsAt = f.suspensionEndsAt || null;
    } else {
      payload.playerId = f.playerId;
      payload.teamId = f.teamId;
      payload.season = f.season;
    }
    const req = id
      ? this.service.updateContract(wsId, id, payload)
      : this.service.createContract(wsId, payload);
    req.subscribe({
      next: () => {
        this.closeContractModal();
        this.loadAll();
        this.loadTeamRoster();
      },
      error: (err) => alert(err?.error?.message || 'Failed to save contract'),
    });
  }

  deleteContract(c: PlayerContract) {
    if (!confirm(`Delete contract for ${c.player?.user?.username}?`)) return;
    this.service.deleteContract(this.workspaceId(), c.id).subscribe({
      next: () => {
        this.loadAll();
        this.loadTeamRoster();
      },
      error: (err) => alert(err?.error?.message || 'Failed to delete'),
    });
  }

  // ─── Release modal ───────────────────────────────────────────────────

  openReleaseModal(contract?: PlayerContract) {
    if (contract) {
      this.releaseForm.set({
        teamId: contract.teamId,
        playerId: contract.playerId,
        reason: '',
        replaceWithPlayerId: '',
        contractStartDate: new Date().toISOString().slice(0, 10),
        contractEndDate: contract.endDate.slice(0, 10),
        salary: 0,
        jerseyNumber: contract.jerseyNumber || '',
      });
    } else {
      this.releaseForm.set({
        teamId: this.selectedTeamId() || '',
        playerId: '',
        reason: '',
        replaceWithPlayerId: '',
        contractStartDate: new Date().toISOString().slice(0, 10),
        contractEndDate: '',
        salary: 0,
        jerseyNumber: '',
      });
    }
    this.isReleaseModalOpen.set(true);
  }

  closeReleaseModal() {
    this.isReleaseModalOpen.set(false);
  }

  confirmRelease() {
    const f = this.releaseForm();
    const wsId = this.workspaceId();
    if (!f.teamId || !f.playerId) return;

    if (f.replaceWithPlayerId) {
      // Replace flow
      this.service
        .replacePlayer(wsId, {
          teamId: f.teamId,
          season: this.currentSeason(),
          outgoingPlayerId: f.playerId,
          incomingPlayerId: f.replaceWithPlayerId,
          reason: f.reason,
          contractStartDate: f.contractStartDate,
          contractEndDate: f.contractEndDate,
          salary: f.salary,
          jerseyNumber: f.jerseyNumber || undefined,
        })
        .subscribe({
          next: () => {
            this.closeReleaseModal();
            this.loadAll();
            this.loadTeamRoster();
          },
          error: (err) => alert(err?.error?.message || 'Replace failed'),
        });
    } else {
      this.service
        .releasePlayer(wsId, f.teamId, {
          playerId: f.playerId,
          reason: f.reason,
          season: this.currentSeason(),
        })
        .subscribe({
          next: () => {
            this.closeReleaseModal();
            this.loadAll();
            this.loadTeamRoster();
          },
          error: (err) => alert(err?.error?.message || 'Release failed'),
        });
    }
  }

  // ─── Eligibility ─────────────────────────────────────────────────────

  runEligibilityCheck() {
    const f = this.eligibilityForm();
    if (!f.playerId || !f.season) return;
    this.service
      .checkEligibility(this.workspaceId(), {
        playerId: f.playerId,
        season: f.season,
        matchDate: f.matchDate || undefined,
        teamId: f.teamId || undefined,
      })
      .subscribe({
        next: (r) => this.eligibilityResult.set(r),
        error: (err) => alert(err?.error?.message || 'Check failed'),
      });
  }

  // ─── Carry forward ───────────────────────────────────────────────────

  runCarryForward() {
    const f = this.carryForwardForm();
    if (!f.fromSeason || !f.toSeason || !f.newStartDate || !f.newEndDate) return;
    this.service
      .carryForward(this.workspaceId(), {
        fromSeason: f.fromSeason,
        toSeason: f.toSeason,
        newStartDate: f.newStartDate,
        newEndDate: f.newEndDate,
        teamId: f.teamId || undefined,
      })
      .subscribe({
        next: (r) => {
          this.carryForwardResult.set(r);
          this.loadAll();
        },
        error: (err) => alert(err?.error?.message || 'Carry-forward failed'),
      });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'expired':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      case 'terminated':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'suspended':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  }

  contractTypeBadgeClass(type: ContractType): string {
    switch (type) {
      case 'full_time':
        return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
      case 'loan':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'youth':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'short_term':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'amateur':
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

  slotUsagePercent(used: number, max: number): number {
    if (!Number.isFinite(max) || max <= 0) return 0;
    return Math.min(100, (used / max) * 100);
  }
}
