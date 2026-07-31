import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type AuctionStatus = 'draft' | 'scheduled' | 'live' | 'paused' | 'completed' | 'cancelled';
export type AuctionPlayerStatus = 'available' | 'in_bidding' | 'sold' | 'unsold' | 'withdrawn';
export type BidStatus = 'active' | 'winning' | 'outbid' | 'withdrawn';

export interface AuctionCategory {
  id: string;
  workspaceId: string;
  auctionId: string;
  name: string;
  description: string | null;
  basePrice: string;
  orderIndex: number;
  color: string | null;
}

export interface AuctionPlayer {
  id: string;
  workspaceId: string;
  auctionId: string;
  playerId: string;
  categoryId: string | null;
  customBasePrice: string | null;
  orderIndex: number;
  status: AuctionPlayerStatus;
  soldToTeamId: string | null;
  soldPrice: string | null;
  soldAt: string | null;
  notes: string | null;
  player?: {
    id: string;
    user: { id: string; username: string };
    team?: { id: string; name: string };
    position?: string | null;
  };
  category?: AuctionCategory | null;
  soldToTeam?: { id: string; name: string } | null;
}

export interface AuctionBid {
  id: string;
  workspaceId: string;
  auctionId: string;
  auctionPlayerId: string;
  teamId: string;
  amount: string;
  status: BidStatus;
  placedAt: string;
  team?: { id: string; name: string };
  placedBy?: { id: string; username: string };
}

export interface AuctionTeamBudget {
  id: string;
  workspaceId: string;
  auctionId: string;
  teamId: string;
  initialBudget: string;
  spent: string;
  playersBought: number;
  team?: { id: string; name: string };
}

export interface Auction {
  id: string;
  workspaceId: string;
  eventId: string | null;
  competitionId: string | null;
  name: string;
  description: string | null;
  status: AuctionStatus;
  currency: string;
  budgetPerTeam: string;
  bidIncrement: number;
  bidWindowSec: number;
  scheduledStart: string | null;
  actualStart: string | null;
  endedAt: string | null;
  currentPlayerId: string | null;
  currentRoundEndsAt: string | null;
  event?: { id: string; name: string } | null;
  competition?: { id: string; name: string } | null;
  categories?: AuctionCategory[];
  players?: AuctionPlayer[];
  teamBudgets?: AuctionTeamBudget[];
  createdBy?: { id: string; username: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LiveStatus {
  auction: {
    id: string;
    status: AuctionStatus;
    currency: string;
    bidIncrement: number;
    bidWindowSec: number;
    currentPlayerId: string | null;
    currentRoundEndsAt: string | null;
    budgetPerTeam: string;
  };
  currentPlayer: AuctionPlayer | null;
  bids: AuctionBid[];
  teamBudgets: Array<{
    id: string;
    teamId: string;
    teamName?: string;
    initialBudget: string;
    spent: string;
    remaining: string;
    playersBought: number;
  }>;
  generatedAt: string;
}

export interface AuctionSummary {
  auctionId: string;
  status: AuctionStatus;
  currency: string;
  totalPlayers: number;
  soldCount: number;
  unsoldCount: number;
  remainingCount: number;
  totalSpend: number;
  avgPrice: number;
  topPlayer: {
    id: string;
    playerName: string;
    soldToTeam?: string;
    soldPrice: string | null;
  } | null;
  perTeam: Array<{
    teamId: string;
    teamName: string;
    count: number;
    spent: number;
  }>;
  perCategory: Array<{
    categoryId: string;
    name: string;
    soldCount: number;
    unsoldCount: number;
    spent: number;
  }>;
  generatedAt: string;
}

export interface WorkspaceAuctionSummary {
  total: number;
  draft: number;
  live: number;
  completed: number;
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuctionsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getWorkspaceSummary(workspaceId: string): Observable<WorkspaceAuctionSummary> {
    return this.http.get<WorkspaceAuctionSummary>(
      `${this.apiUrl}/${workspaceId}/auctions/summary`,
      { headers: this.headers },
    );
  }

  getAuctions(workspaceId: string): Observable<Auction[]> {
    return this.http.get<Auction[]>(`${this.apiUrl}/${workspaceId}/auctions`, {
      headers: this.headers,
    });
  }

  getAuctionById(workspaceId: string, id: string): Observable<Auction> {
    return this.http.get<Auction>(`${this.apiUrl}/${workspaceId}/auctions/${id}`, {
      headers: this.headers,
    });
  }

  createAuction(
    workspaceId: string,
    payload: Partial<Auction> & { name: string },
  ): Observable<Auction> {
    return this.http.post<Auction>(`${this.apiUrl}/${workspaceId}/auctions`, payload, {
      headers: this.headers,
    });
  }

  updateAuction(workspaceId: string, id: string, payload: Partial<Auction>): Observable<Auction> {
    return this.http.patch<Auction>(`${this.apiUrl}/${workspaceId}/auctions/${id}`, payload, {
      headers: this.headers,
    });
  }

  deleteAuction(workspaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/auctions/${id}`, {
      headers: this.headers,
    });
  }

  createCategory(
    workspaceId: string,
    auctionId: string,
    payload: Partial<AuctionCategory> & { name: string },
  ): Observable<AuctionCategory> {
    return this.http.post<AuctionCategory>(
      `${this.apiUrl}/${workspaceId}/auctions/${auctionId}/categories`,
      payload,
      { headers: this.headers },
    );
  }

  updateCategory(
    workspaceId: string,
    categoryId: string,
    payload: Partial<AuctionCategory>,
  ): Observable<AuctionCategory> {
    return this.http.patch<AuctionCategory>(
      `${this.apiUrl}/${workspaceId}/auction-categories/${categoryId}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteCategory(workspaceId: string, categoryId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/auction-categories/${categoryId}`,
      { headers: this.headers },
    );
  }

  registerPlayers(
    workspaceId: string,
    auctionId: string,
    players: Array<{
      playerId: string;
      categoryId?: string;
      customBasePrice?: number;
    }>,
  ): Observable<AuctionPlayer[]> {
    return this.http.post<AuctionPlayer[]>(
      `${this.apiUrl}/${workspaceId}/auctions/${auctionId}/players`,
      { players },
      { headers: this.headers },
    );
  }

  updateAuctionPlayer(
    workspaceId: string,
    auctionPlayerId: string,
    payload: Partial<AuctionPlayer> & { customBasePrice?: number | null },
  ): Observable<AuctionPlayer> {
    return this.http.patch<AuctionPlayer>(
      `${this.apiUrl}/${workspaceId}/auction-players/${auctionPlayerId}`,
      payload,
      { headers: this.headers },
    );
  }

  removeAuctionPlayer(workspaceId: string, auctionPlayerId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/auction-players/${auctionPlayerId}`,
      { headers: this.headers },
    );
  }

  upsertTeamBudget(
    workspaceId: string,
    auctionId: string,
    payload: { teamId: string; initialBudget?: number },
  ): Observable<AuctionTeamBudget> {
    return this.http.post<AuctionTeamBudget>(
      `${this.apiUrl}/${workspaceId}/auctions/${auctionId}/team-budgets`,
      payload,
      { headers: this.headers },
    );
  }

  removeTeamBudget(workspaceId: string, budgetId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/auction-team-budgets/${budgetId}`,
      { headers: this.headers },
    );
  }

  startBidding(
    workspaceId: string,
    auctionId: string,
    auctionPlayerId: string,
  ): Observable<Auction> {
    return this.http.post<Auction>(
      `${this.apiUrl}/${workspaceId}/auctions/${auctionId}/start-bidding`,
      { auctionPlayerId },
      { headers: this.headers },
    );
  }

  placeBid(
    workspaceId: string,
    auctionId: string,
    teamId: string,
    amount: number,
  ): Observable<AuctionBid> {
    return this.http.post<AuctionBid>(
      `${this.apiUrl}/${workspaceId}/auctions/${auctionId}/bid`,
      { teamId, amount },
      { headers: this.headers },
    );
  }

  closeBidding(workspaceId: string, auctionId: string): Observable<AuctionPlayer> {
    return this.http.post<AuctionPlayer>(
      `${this.apiUrl}/${workspaceId}/auctions/${auctionId}/close-bidding`,
      {},
      { headers: this.headers },
    );
  }

  cancelRound(workspaceId: string, auctionId: string): Observable<Auction> {
    return this.http.post<Auction>(
      `${this.apiUrl}/${workspaceId}/auctions/${auctionId}/cancel-round`,
      {},
      { headers: this.headers },
    );
  }

  getLiveStatus(workspaceId: string, auctionId: string): Observable<LiveStatus> {
    return this.http.get<LiveStatus>(`${this.apiUrl}/${workspaceId}/auctions/${auctionId}/live`, {
      headers: this.headers,
    });
  }

  getSummary(workspaceId: string, auctionId: string): Observable<AuctionSummary> {
    return this.http.get<AuctionSummary>(
      `${this.apiUrl}/${workspaceId}/auctions/${auctionId}/summary`,
      { headers: this.headers },
    );
  }
}
