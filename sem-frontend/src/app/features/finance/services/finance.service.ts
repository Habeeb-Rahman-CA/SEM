import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type PaymentCategory =
  'auction_purchase' | 'transfer_fee' | 'salary' | 'signing_bonus' | 'penalty' | 'refund' | 'other';

export type PaymentDirection = 'outgoing' | 'incoming';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type PaymentReferenceType = 'transfer_request' | 'contract' | 'auction' | 'manual';

export interface TeamFinancialAccount {
  id: string;
  workspaceId: string;
  teamId: string;
  season: string;
  initialBudget: string;
  currency: string;
  notes: string | null;
  team?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  workspaceId: string;
  teamId: string;
  season: string | null;
  category: PaymentCategory;
  direction: PaymentDirection;
  amount: string;
  currency: string;
  status: PaymentStatus;
  dueDate: string | null;
  paidAt: string | null;
  referenceType: PaymentReferenceType;
  referenceId: string | null;
  counterpartyTeamId: string | null;
  description: string;
  notes: string | null;
  team?: { id: string; name: string };
  counterpartyTeam?: { id: string; name: string } | null;
  recordedBy?: { id: string; username: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamReportSummary {
  initialBudget: number;
  auctionSpend: number;
  auctionPlayersBought: number;
  transferFeesPaid: number;
  transferFeesReceived: number;
  salaryCommitment: number;
  outgoingPaid: number;
  outgoingPending: number;
  incomingPaid: number;
  totalOutgoing: number;
  totalIncoming: number;
  remainingBudget: number;
  projectedRemaining: number;
}

export interface TeamReport {
  team: { id: string; name: string; code: string | null };
  season: string;
  currency: string;
  account: {
    id: string;
    initialBudget: string;
    notes: string | null;
  } | null;
  summary: TeamReportSummary;
  auctionWins: Array<{
    id: string;
    auctionId: string;
    playerName: string;
    soldPrice: string | null;
    soldAt: string | null;
  }>;
  transfers: {
    incoming: Array<{
      id: string;
      playerName: string;
      fromTeam: string | undefined;
      fee: string | null;
      transferType: string;
      completedAt: string | null;
    }>;
    outgoing: Array<{
      id: string;
      playerName: string;
      toTeam: string | undefined;
      fee: string | null;
      transferType: string;
      completedAt: string | null;
    }>;
  };
  contracts: Array<{
    id: string;
    playerName: string;
    contractType: string;
    salary: string;
    endDate: string;
  }>;
  payments: Payment[];
  byCategory: Array<{
    category: string;
    outgoing: number;
    incoming: number;
    count: number;
  }>;
  generatedAt: string;
}

export interface WorkspaceFinanceSummary {
  season: string | null;
  accountsCount: number;
  totalInitialBudget: number;
  totalAuctionSpend: number;
  totalTransferFees: number;
  outgoingPaid: number;
  outgoingPending: number;
  incomingPaid: number;
  overdueCount: number;
  netCash: number;
  perTeam: Array<{
    teamId: string;
    teamName: string;
    paidOutgoing: number;
    pendingOutgoing: number;
    incoming: number;
  }>;
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getWorkspaceSummary(workspaceId: string, season?: string): Observable<WorkspaceFinanceSummary> {
    let params = new HttpParams();
    if (season) params = params.set('season', season);
    return this.http.get<WorkspaceFinanceSummary>(`${this.apiUrl}/${workspaceId}/finance/summary`, {
      headers: this.headers,
      params,
    });
  }

  getAccounts(
    workspaceId: string,
    filter: { teamId?: string; season?: string } = {},
  ): Observable<TeamFinancialAccount[]> {
    let params = new HttpParams();
    if (filter.teamId) params = params.set('teamId', filter.teamId);
    if (filter.season) params = params.set('season', filter.season);
    return this.http.get<TeamFinancialAccount[]>(`${this.apiUrl}/${workspaceId}/finance/accounts`, {
      headers: this.headers,
      params,
    });
  }

  upsertAccount(
    workspaceId: string,
    payload: {
      teamId: string;
      season: string;
      initialBudget?: number;
      currency?: string;
      notes?: string;
    },
  ): Observable<TeamFinancialAccount> {
    return this.http.post<TeamFinancialAccount>(
      `${this.apiUrl}/${workspaceId}/finance/accounts`,
      payload,
      { headers: this.headers },
    );
  }

  deleteAccount(workspaceId: string, accountId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/finance/accounts/${accountId}`, {
      headers: this.headers,
    });
  }

  getPayments(
    workspaceId: string,
    filter: {
      teamId?: string;
      season?: string;
      category?: PaymentCategory;
      status?: PaymentStatus;
    } = {},
  ): Observable<Payment[]> {
    let params = new HttpParams();
    if (filter.teamId) params = params.set('teamId', filter.teamId);
    if (filter.season) params = params.set('season', filter.season);
    if (filter.category) params = params.set('category', filter.category);
    if (filter.status) params = params.set('status', filter.status);
    return this.http.get<Payment[]>(`${this.apiUrl}/${workspaceId}/finance/payments`, {
      headers: this.headers,
      params,
    });
  }

  createPayment(
    workspaceId: string,
    payload: Partial<Payment> & {
      teamId: string;
      description: string;
      amount: number;
    },
  ): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/${workspaceId}/finance/payments`, payload, {
      headers: this.headers,
    });
  }

  updatePayment(
    workspaceId: string,
    paymentId: string,
    payload: Partial<Payment>,
  ): Observable<Payment> {
    return this.http.patch<Payment>(
      `${this.apiUrl}/${workspaceId}/finance/payments/${paymentId}`,
      payload,
      { headers: this.headers },
    );
  }

  deletePayment(workspaceId: string, paymentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/finance/payments/${paymentId}`, {
      headers: this.headers,
    });
  }

  getTeamReport(workspaceId: string, teamId: string, season: string): Observable<TeamReport> {
    return this.http.get<TeamReport>(
      `${this.apiUrl}/${workspaceId}/finance/team-report/${teamId}?season=${encodeURIComponent(season)}`,
      { headers: this.headers },
    );
  }

  syncFromSources(
    workspaceId: string,
    season: string,
  ): Observable<{ createdTransferFees: number; createdSalaries: number }> {
    return this.http.post<{
      createdTransferFees: number;
      createdSalaries: number;
    }>(
      `${this.apiUrl}/${workspaceId}/finance/sync?season=${encodeURIComponent(season)}`,
      {},
      { headers: this.headers },
    );
  }
}
