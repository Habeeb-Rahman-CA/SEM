import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

// ─── Policy types ───────────────────────────────────────────────────────

export interface PolicyConfig {
  id: string;
  workspaceId: string;
  preventDuplicateAuctionRegistration: boolean;
  blockAuctionBidOverBudget: boolean;
  preventDuplicateTransferRequest: boolean;
  requireOpenWindowForTransfers: boolean;
  minTransferNoticeDays: number;
  enforceSquadCapsOnApprove: boolean;
  uniqueRegistrationPerSeason: boolean;
  uniqueJerseyPerTeamSeason: boolean;
  budgetAlertThresholdPct: number;
  blockNegativeBudgets: boolean;
  requireActiveContractForMatch: boolean;
  requireRegistrationForMatch: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Violation {
  severity: 'critical' | 'warning' | 'info';
  rule: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

export interface ValidationReport {
  workspaceId: string;
  season: string | null;
  counts: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
  violations: Violation[];
  generatedAt: string;
}

// ─── Team-alert types ───────────────────────────────────────────────────

export type AlertCategory =
  | 'auction_event'
  | 'auction_bid'
  | 'auction_purchase'
  | 'transfer_submitted'
  | 'transfer_approved'
  | 'transfer_rejected'
  | 'budget_warning'
  | 'budget_exceeded'
  | 'deadline_approaching'
  | 'contract_expiring'
  | 'general';

export type AlertSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface TeamAlert {
  id: string;
  workspaceId: string;
  teamId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  isRead: boolean;
  acknowledgedById: string | null;
  acknowledgedAt: string | null;
  referenceType: string | null;
  referenceId: string | null;
  metadata: Record<string, any> | null;
  actionUrl: string | null;
  team?: { id: string; name: string };
  acknowledgedBy?: { id: string; username: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamAlertPreference {
  id: string;
  workspaceId: string;
  teamId: string;
  auctionEvents: boolean;
  auctionBids: boolean;
  auctionPurchases: boolean;
  transferUpdates: boolean;
  budgetAlerts: boolean;
  deadlineAlerts: boolean;
  contractExpiryAlerts: boolean;
  team?: { id: string; name: string };
}

export interface AlertsSummary {
  total: number;
  unread: number;
  critical: number;
  byCategory: Array<{ category: string; count: number }>;
  pendingTransfers: number;
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class GovernanceService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ─── Policies ────────────────────────────────────────────────────────

  getPolicy(workspaceId: string): Observable<PolicyConfig> {
    return this.http.get<PolicyConfig>(`${this.apiUrl}/${workspaceId}/policies`, {
      headers: this.headers,
    });
  }

  updatePolicy(workspaceId: string, payload: Partial<PolicyConfig>): Observable<PolicyConfig> {
    return this.http.patch<PolicyConfig>(`${this.apiUrl}/${workspaceId}/policies`, payload, {
      headers: this.headers,
    });
  }

  validate(workspaceId: string, season?: string): Observable<ValidationReport> {
    let params = new HttpParams();
    if (season) params = params.set('season', season);
    return this.http.post<ValidationReport>(
      `${this.apiUrl}/${workspaceId}/policies/validate`,
      {},
      { headers: this.headers, params },
    );
  }

  // ─── Alerts ──────────────────────────────────────────────────────────

  getAlertsSummary(workspaceId: string): Observable<AlertsSummary> {
    return this.http.get<AlertsSummary>(`${this.apiUrl}/${workspaceId}/team-alerts/summary`, {
      headers: this.headers,
    });
  }

  getAlerts(
    workspaceId: string,
    filter: {
      teamId?: string;
      category?: AlertCategory;
      unreadOnly?: boolean;
      limit?: number;
    } = {},
  ): Observable<TeamAlert[]> {
    let params = new HttpParams();
    if (filter.teamId) params = params.set('teamId', filter.teamId);
    if (filter.category) params = params.set('category', filter.category);
    if (filter.unreadOnly) params = params.set('unreadOnly', 'true');
    if (filter.limit) params = params.set('limit', String(filter.limit));
    return this.http.get<TeamAlert[]>(`${this.apiUrl}/${workspaceId}/team-alerts`, {
      headers: this.headers,
      params,
    });
  }

  broadcastAlert(
    workspaceId: string,
    payload: {
      teamIds: string[];
      title: string;
      message: string;
      category?: AlertCategory;
      severity?: AlertSeverity;
      actionUrl?: string;
    },
  ): Observable<{ sent: number; skipped: number }> {
    return this.http.post<{ sent: number; skipped: number }>(
      `${this.apiUrl}/${workspaceId}/team-alerts/broadcast`,
      payload,
      { headers: this.headers },
    );
  }

  runScan(workspaceId: string, season?: string): Observable<{ created: number }> {
    let params = new HttpParams();
    if (season) params = params.set('season', season);
    return this.http.post<{ created: number }>(
      `${this.apiUrl}/${workspaceId}/team-alerts/scan`,
      {},
      { headers: this.headers, params },
    );
  }

  markRead(workspaceId: string, alertId: string): Observable<TeamAlert> {
    return this.http.patch<TeamAlert>(
      `${this.apiUrl}/${workspaceId}/team-alerts/${alertId}/read`,
      {},
      { headers: this.headers },
    );
  }

  markAllRead(workspaceId: string, teamId?: string): Observable<{ updated: number }> {
    let params = new HttpParams();
    if (teamId) params = params.set('teamId', teamId);
    return this.http.post<{ updated: number }>(
      `${this.apiUrl}/${workspaceId}/team-alerts/mark-all-read`,
      {},
      { headers: this.headers, params },
    );
  }

  deleteAlert(workspaceId: string, alertId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/team-alerts/${alertId}`, {
      headers: this.headers,
    });
  }

  getPreferences(workspaceId: string): Observable<TeamAlertPreference[]> {
    return this.http.get<TeamAlertPreference[]>(
      `${this.apiUrl}/${workspaceId}/team-alert-preferences`,
      { headers: this.headers },
    );
  }

  updatePreference(
    workspaceId: string,
    teamId: string,
    payload: Partial<TeamAlertPreference>,
  ): Observable<TeamAlertPreference> {
    return this.http.patch<TeamAlertPreference>(
      `${this.apiUrl}/${workspaceId}/teams/${teamId}/alert-preferences`,
      payload,
      { headers: this.headers },
    );
  }
}
