import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type ContractType = 'full_time' | 'loan' | 'youth' | 'short_term' | 'amateur';
export type ContractStatus = 'active' | 'expired' | 'terminated' | 'suspended';

export interface PositionRule {
  position: string;
  min?: number;
  max?: number;
}

export interface RosterConfig {
  id: string;
  workspaceId: string;
  teamId: string;
  season: string;
  maxSquadSize: number;
  maxForeignPlayers: number | null;
  minStarters: number | null;
  maxSubstitutes: number | null;
  positionRules: PositionRule[] | null;
  notes: string | null;
  team?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface PlayerContract {
  id: string;
  workspaceId: string;
  playerId: string;
  teamId: string;
  season: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  salary: string;
  currency: string;
  jerseyNumber: string | null;
  registrationNumber: string | null;
  isForeign: boolean;
  status: ContractStatus;
  suspensionReason: string | null;
  suspensionEndsAt: string | null;
  notes: string | null;
  player?: {
    id: string;
    user: { id: string; username: string };
    position: string | null;
  };
  team?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface RosterRelease {
  id: string;
  workspaceId: string;
  teamId: string;
  playerId: string;
  kind: 'release' | 'replace' | 'contract_ended';
  releasedAt: string;
  reason: string | null;
  replacementPlayerId: string | null;
  season: string | null;
  team?: { id: string; name: string };
  player?: { id: string; user: { username: string } };
  replacementPlayer?: { id: string; user: { username: string } } | null;
  performedBy?: { id: string; username: string } | null;
  createdAt: string;
}

export interface TeamRoster {
  team: { id: string; name: string; code: string | null };
  season: string;
  config: RosterConfig | null;
  contracts: PlayerContract[];
  activeCount: number;
  foreignCount: number;
  remainingSlots: number | null;
  remainingForeignSlots: number | null;
}

export interface EligibilityReason {
  rule: string;
  message: string;
  severity: 'blocker' | 'warning';
}

export interface EligibilityResult {
  playerId: string;
  playerName: string;
  teamId: string;
  season: string;
  eligible: boolean;
  reasons: EligibilityReason[];
  contract: {
    id: string;
    contractType: ContractType;
    startDate: string;
    endDate: string;
    status: ContractStatus;
    registrationNumber: string | null;
    jerseyNumber: string | null;
  } | null;
  checkedAt: string;
}

export interface RosterSummary {
  season: string | null;
  totalContracts: number;
  activeContracts: number;
  terminatedContracts: number;
  suspendedContracts: number;
  expiredContracts: number;
  totalReleases: number;
  seasons: string[];
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class RostersService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getSummary(workspaceId: string, season?: string): Observable<RosterSummary> {
    let params = new HttpParams();
    if (season) params = params.set('season', season);
    return this.http.get<RosterSummary>(`${this.apiUrl}/${workspaceId}/rosters/summary`, {
      headers: this.headers,
      params,
    });
  }

  getConfigs(
    workspaceId: string,
    filter: { teamId?: string; season?: string } = {},
  ): Observable<RosterConfig[]> {
    let params = new HttpParams();
    if (filter.teamId) params = params.set('teamId', filter.teamId);
    if (filter.season) params = params.set('season', filter.season);
    return this.http.get<RosterConfig[]>(`${this.apiUrl}/${workspaceId}/roster-configs`, {
      headers: this.headers,
      params,
    });
  }

  upsertConfig(
    workspaceId: string,
    teamId: string,
    payload: Partial<RosterConfig> & { season: string },
  ): Observable<RosterConfig> {
    return this.http.post<RosterConfig>(
      `${this.apiUrl}/${workspaceId}/teams/${teamId}/roster-config`,
      payload,
      { headers: this.headers },
    );
  }

  deleteConfig(workspaceId: string, configId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/roster-configs/${configId}`, {
      headers: this.headers,
    });
  }

  getTeamRoster(workspaceId: string, teamId: string, season: string): Observable<TeamRoster> {
    return this.http.get<TeamRoster>(
      `${this.apiUrl}/${workspaceId}/teams/${teamId}/roster?season=${encodeURIComponent(season)}`,
      { headers: this.headers },
    );
  }

  getContracts(
    workspaceId: string,
    filter: {
      teamId?: string;
      playerId?: string;
      season?: string;
      status?: ContractStatus;
    } = {},
  ): Observable<PlayerContract[]> {
    let params = new HttpParams();
    if (filter.teamId) params = params.set('teamId', filter.teamId);
    if (filter.playerId) params = params.set('playerId', filter.playerId);
    if (filter.season) params = params.set('season', filter.season);
    if (filter.status) params = params.set('status', filter.status);
    return this.http.get<PlayerContract[]>(`${this.apiUrl}/${workspaceId}/player-contracts`, {
      headers: this.headers,
      params,
    });
  }

  createContract(
    workspaceId: string,
    payload: Partial<PlayerContract> & {
      playerId: string;
      teamId: string;
      season: string;
      startDate: string;
      endDate: string;
    },
  ): Observable<PlayerContract> {
    return this.http.post<PlayerContract>(
      `${this.apiUrl}/${workspaceId}/player-contracts`,
      payload,
      { headers: this.headers },
    );
  }

  updateContract(
    workspaceId: string,
    contractId: string,
    payload: Partial<PlayerContract>,
  ): Observable<PlayerContract> {
    return this.http.patch<PlayerContract>(
      `${this.apiUrl}/${workspaceId}/player-contracts/${contractId}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteContract(workspaceId: string, contractId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/player-contracts/${contractId}`, {
      headers: this.headers,
    });
  }

  releasePlayer(
    workspaceId: string,
    teamId: string,
    payload: { playerId: string; reason?: string; season?: string },
  ): Observable<RosterRelease> {
    return this.http.post<RosterRelease>(
      `${this.apiUrl}/${workspaceId}/teams/${teamId}/release`,
      payload,
      { headers: this.headers },
    );
  }

  replacePlayer(
    workspaceId: string,
    payload: {
      teamId: string;
      season: string;
      outgoingPlayerId: string;
      incomingPlayerId: string;
      reason?: string;
      contractStartDate: string;
      contractEndDate: string;
      salary?: number;
      jerseyNumber?: string;
    },
  ): Observable<{ release: RosterRelease; newContract: PlayerContract }> {
    return this.http.post<{
      release: RosterRelease;
      newContract: PlayerContract;
    }>(`${this.apiUrl}/${workspaceId}/roster-replace`, payload, {
      headers: this.headers,
    });
  }

  getReleases(
    workspaceId: string,
    filter: { teamId?: string; playerId?: string } = {},
  ): Observable<RosterRelease[]> {
    let params = new HttpParams();
    if (filter.teamId) params = params.set('teamId', filter.teamId);
    if (filter.playerId) params = params.set('playerId', filter.playerId);
    return this.http.get<RosterRelease[]>(`${this.apiUrl}/${workspaceId}/roster-releases`, {
      headers: this.headers,
      params,
    });
  }

  checkEligibility(
    workspaceId: string,
    payload: {
      playerId: string;
      season: string;
      matchDate?: string;
      teamId?: string;
    },
  ): Observable<EligibilityResult> {
    return this.http.post<EligibilityResult>(
      `${this.apiUrl}/${workspaceId}/roster-eligibility-check`,
      payload,
      { headers: this.headers },
    );
  }

  carryForward(
    workspaceId: string,
    payload: {
      fromSeason: string;
      toSeason: string;
      newStartDate: string;
      newEndDate: string;
      teamId?: string;
    },
  ): Observable<{ created: number; skipped: number; failed: number }> {
    return this.http.post<{
      created: number;
      skipped: number;
      failed: number;
    }>(`${this.apiUrl}/${workspaceId}/roster-carry-forward`, payload, {
      headers: this.headers,
    });
  }
}
