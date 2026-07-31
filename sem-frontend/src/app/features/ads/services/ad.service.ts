import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type AdPlacement = 'public-portal' | 'public-event' | 'live-hub' | 'live-match';

export interface Advertisement {
  id: string;
  workspaceId: string;
  name: string;
  title: string | null;
  imageUrl: string;
  targetUrl: string;
  placement: AdPlacement;
  eventId: string | null;
  event?: { id: string; name: string } | null;
  sponsorId: string | null;
  sponsor?: { id: string; name: string; logoUrl?: string | null } | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  weight: number;
  impressionCount: number;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdStats {
  totalAds: number;
  activeAds: number;
  totalImpressions: number;
  totalClicks: number;
  overallCtr: number;
  perPlacement: Array<{
    placement: AdPlacement;
    ads: number;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
}

export interface AdInput {
  name: string;
  title?: string | null;
  imageUrl: string;
  targetUrl: string;
  placement: AdPlacement;
  eventId?: string | null;
  sponsorId?: string | null;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  weight?: number;
}

export interface ServedAd {
  id: string;
  title: string | null;
  imageUrl: string;
  targetUrl: string;
  sponsorName: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private wsBase(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/ads`;
  }

  // ─── Workspace CRUD ────────────────────────────────────────────────

  list(workspaceId: string): Observable<Advertisement[]> {
    return this.http.get<Advertisement[]>(this.wsBase(workspaceId), {
      headers: this.authHeaders,
    });
  }

  stats(workspaceId: string): Observable<AdStats> {
    return this.http.get<AdStats>(`${this.wsBase(workspaceId)}/stats`, {
      headers: this.authHeaders,
    });
  }

  create(workspaceId: string, payload: AdInput): Observable<Advertisement> {
    return this.http.post<Advertisement>(this.wsBase(workspaceId), payload, {
      headers: this.authHeaders,
    });
  }

  update(workspaceId: string, adId: string, payload: Partial<AdInput>): Observable<Advertisement> {
    return this.http.patch<Advertisement>(`${this.wsBase(workspaceId)}/${adId}`, payload, {
      headers: this.authHeaders,
    });
  }

  remove(workspaceId: string, adId: string): Observable<void> {
    return this.http.delete<void>(`${this.wsBase(workspaceId)}/${adId}`, {
      headers: this.authHeaders,
    });
  }

  // ─── Public (no auth) ─────────────────────────────────────────────

  serve(placement: AdPlacement, eventId?: string): Observable<ServedAd | null> {
    const params: Record<string, string> = { placement };
    if (eventId) params['eventId'] = eventId;
    return this.http.get<ServedAd | null>(`${environment.apiUrl}/public/ads/serve`, {
      params,
    });
  }

  recordImpression(adId: string): void {
    // Fire-and-forget beacon so it survives navigations & tab closes.
    const url = `${environment.apiUrl}/public/ads/${encodeURIComponent(adId)}/impression`;
    if (this.tryBeacon(url)) return;
    this.http.post(url, {}, { observe: 'response' }).subscribe({
      error: () => {
        /* swallow — analytics best-effort */
      },
    });
  }

  recordClick(adId: string): void {
    const url = `${environment.apiUrl}/public/ads/${encodeURIComponent(adId)}/click`;
    if (this.tryBeacon(url)) return;
    this.http.post(url, {}, { observe: 'response' }).subscribe({
      error: () => {
        /* swallow */
      },
    });
  }

  private tryBeacon(url: string): boolean {
    if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
      return false;
    }
    try {
      // Empty blob keeps content-type consistent with a POST body.
      const blob = new Blob([], { type: 'application/json' });
      return navigator.sendBeacon(url, blob);
    } catch {
      return false;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  placementLabel(p: AdPlacement): string {
    switch (p) {
      case 'public-portal':
        return 'Events portal';
      case 'public-event':
        return 'Event page';
      case 'live-hub':
        return 'Live hub';
      case 'live-match':
        return 'Live scoreboard';
    }
  }

  isWithinSchedule(ad: Advertisement): boolean {
    const now = Date.now();
    if (!ad.isActive) return false;
    if (ad.startDate && new Date(ad.startDate).getTime() > now) return false;
    if (ad.endDate && new Date(ad.endDate).getTime() < now) return false;
    return true;
  }

  ctrFor(ad: Advertisement): number {
    if (!ad.impressionCount) return 0;
    return Math.round((ad.clickCount / ad.impressionCount) * 10_000) / 100;
  }
}
