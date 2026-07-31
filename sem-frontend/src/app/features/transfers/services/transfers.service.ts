import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type TransferType = 'permanent' | 'loan';
export type TransferStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

export interface TransferWindow {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  startAt: string;
  endAt: string;
  isActive: boolean;
  allowedTypes: TransferType[] | null;
  maxTransfersPerTeam: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransferRequest {
  id: string;
  workspaceId: string;
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  transferType: TransferType;
  fee: string | null;
  currency: string;
  loanStartDate: string | null;
  loanEndDate: string | null;
  windowId: string | null;
  status: TransferStatus;
  reason: string | null;
  submittedById: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  completedAt: string | null;
  player?: {
    id: string;
    userId: string;
    jerseyNumber: string | null;
    position: string | null;
    user: { id: string; username: string };
    team: { id: string; name: string };
  };
  fromTeam?: { id: string; name: string };
  toTeam?: { id: string; name: string };
  submittedBy?: { id: string; username: string };
  reviewedBy?: { id: string; username: string };
  window?: TransferWindow | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerTransferHistoryEntry {
  id: string;
  userId: string;
  fromTeamId: string | null;
  toTeamId: string;
  transferredAt: string;
  fromTeam?: { id: string; name: string } | null;
  toTeam?: { id: string; name: string };
}

export interface PlayerTransferHistory {
  transfers: PlayerTransferHistoryEntry[];
  requests: TransferRequest[];
}

export interface TransferSummary {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  completed: number;
  permanent: number;
  loan: number;
  totalFees: number;
  activeWindow: {
    id: string;
    name: string;
    startAt: string;
    endAt: string;
  } | null;
  upcomingLoanExpiries: number;
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class TransfersService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getSummary(workspaceId: string): Observable<TransferSummary> {
    return this.http.get<TransferSummary>(`${this.apiUrl}/${workspaceId}/transfers/summary`, {
      headers: this.headers,
    });
  }

  getWindows(workspaceId: string): Observable<TransferWindow[]> {
    return this.http.get<TransferWindow[]>(`${this.apiUrl}/${workspaceId}/transfer-windows`, {
      headers: this.headers,
    });
  }

  createWindow(
    workspaceId: string,
    payload: Partial<TransferWindow> & {
      name: string;
      startAt: string;
      endAt: string;
    },
  ): Observable<TransferWindow> {
    return this.http.post<TransferWindow>(
      `${this.apiUrl}/${workspaceId}/transfer-windows`,
      payload,
      { headers: this.headers },
    );
  }

  updateWindow(
    workspaceId: string,
    windowId: string,
    payload: Partial<TransferWindow>,
  ): Observable<TransferWindow> {
    return this.http.patch<TransferWindow>(
      `${this.apiUrl}/${workspaceId}/transfer-windows/${windowId}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteWindow(workspaceId: string, windowId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/transfer-windows/${windowId}`, {
      headers: this.headers,
    });
  }

  getRequests(
    workspaceId: string,
    filter: {
      status?: TransferStatus;
      teamId?: string;
      playerId?: string;
      windowId?: string;
    } = {},
  ): Observable<TransferRequest[]> {
    let params = new HttpParams();
    if (filter.status) params = params.set('status', filter.status);
    if (filter.teamId) params = params.set('teamId', filter.teamId);
    if (filter.playerId) params = params.set('playerId', filter.playerId);
    if (filter.windowId) params = params.set('windowId', filter.windowId);
    return this.http.get<TransferRequest[]>(`${this.apiUrl}/${workspaceId}/transfer-requests`, {
      headers: this.headers,
      params,
    });
  }

  getRequestById(workspaceId: string, id: string): Observable<TransferRequest> {
    return this.http.get<TransferRequest>(`${this.apiUrl}/${workspaceId}/transfer-requests/${id}`, {
      headers: this.headers,
    });
  }

  submitRequest(
    workspaceId: string,
    payload: {
      playerId: string;
      toTeamId: string;
      transferType?: TransferType;
      fee?: number;
      currency?: string;
      loanStartDate?: string;
      loanEndDate?: string;
      windowId?: string;
      reason?: string;
    },
  ): Observable<TransferRequest> {
    return this.http.post<TransferRequest>(
      `${this.apiUrl}/${workspaceId}/transfer-requests`,
      payload,
      { headers: this.headers },
    );
  }

  approveRequest(
    workspaceId: string,
    id: string,
    reviewNotes?: string,
  ): Observable<TransferRequest> {
    return this.http.post<TransferRequest>(
      `${this.apiUrl}/${workspaceId}/transfer-requests/${id}/approve`,
      { reviewNotes },
      { headers: this.headers },
    );
  }

  rejectRequest(
    workspaceId: string,
    id: string,
    reviewNotes?: string,
  ): Observable<TransferRequest> {
    return this.http.post<TransferRequest>(
      `${this.apiUrl}/${workspaceId}/transfer-requests/${id}/reject`,
      { reviewNotes },
      { headers: this.headers },
    );
  }

  cancelRequest(workspaceId: string, id: string): Observable<TransferRequest> {
    return this.http.post<TransferRequest>(
      `${this.apiUrl}/${workspaceId}/transfer-requests/${id}/cancel`,
      {},
      { headers: this.headers },
    );
  }

  getPlayerHistory(workspaceId: string, playerId: string): Observable<PlayerTransferHistory> {
    return this.http.get<PlayerTransferHistory>(
      `${this.apiUrl}/${workspaceId}/players/${playerId}/transfer-history`,
      { headers: this.headers },
    );
  }
}
