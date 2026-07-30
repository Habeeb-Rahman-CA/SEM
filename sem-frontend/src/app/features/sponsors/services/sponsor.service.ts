import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type SponsorTier = 'title' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'partner';

export interface Sponsor {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  category: string | null;
  tier: SponsorTier | null;
  contactName: string | null;
  contactEmail: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventSponsor {
  id: string;
  eventId: string;
  sponsorId: string;
  tier: SponsorTier | null;
  displayOrder: number;
  sponsor: Sponsor;
  createdAt: string;
  updatedAt: string;
}

export interface PublicEventSponsor {
  id: string;
  sponsorId: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  category: string | null;
  tier: SponsorTier | null;
  displayOrder: number;
}

export interface SponsorInput {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  category?: string | null;
  tier?: SponsorTier | null;
  contactName?: string | null;
  contactEmail?: string | null;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SponsorService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private wsBase(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}`;
  }

  // ─── Workspace catalog ───────────────────────────────────────────────

  list(workspaceId: string): Observable<Sponsor[]> {
    return this.http.get<Sponsor[]>(`${this.wsBase(workspaceId)}/sponsors`, {
      headers: this.authHeaders,
    });
  }

  create(workspaceId: string, payload: SponsorInput): Observable<Sponsor> {
    return this.http.post<Sponsor>(`${this.wsBase(workspaceId)}/sponsors`, payload, {
      headers: this.authHeaders,
    });
  }

  update(
    workspaceId: string,
    sponsorId: string,
    payload: Partial<SponsorInput>,
  ): Observable<Sponsor> {
    return this.http.patch<Sponsor>(`${this.wsBase(workspaceId)}/sponsors/${sponsorId}`, payload, {
      headers: this.authHeaders,
    });
  }

  remove(workspaceId: string, sponsorId: string): Observable<void> {
    return this.http.delete<void>(`${this.wsBase(workspaceId)}/sponsors/${sponsorId}`, {
      headers: this.authHeaders,
    });
  }

  // ─── Per-event attachment ────────────────────────────────────────────

  listForEvent(workspaceId: string, eventId: string): Observable<EventSponsor[]> {
    return this.http.get<EventSponsor[]>(`${this.wsBase(workspaceId)}/events/${eventId}/sponsors`, {
      headers: this.authHeaders,
    });
  }

  attach(
    workspaceId: string,
    eventId: string,
    payload: { sponsorId: string; tier?: SponsorTier | null; displayOrder?: number },
  ): Observable<EventSponsor> {
    return this.http.post<EventSponsor>(
      `${this.wsBase(workspaceId)}/events/${eventId}/sponsors`,
      payload,
      { headers: this.authHeaders },
    );
  }

  updateAttachment(
    workspaceId: string,
    eventId: string,
    sponsorId: string,
    payload: { tier?: SponsorTier | null; displayOrder?: number },
  ): Observable<EventSponsor> {
    return this.http.patch<EventSponsor>(
      `${this.wsBase(workspaceId)}/events/${eventId}/sponsors/${sponsorId}`,
      payload,
      { headers: this.authHeaders },
    );
  }

  detach(workspaceId: string, eventId: string, sponsorId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.wsBase(workspaceId)}/events/${eventId}/sponsors/${sponsorId}`,
      { headers: this.authHeaders },
    );
  }

  // ─── Public ──────────────────────────────────────────────────────────

  listPublicForEvent(eventId: string): Observable<PublicEventSponsor[]> {
    return this.http.get<PublicEventSponsor[]>(
      `${environment.apiUrl}/public/events/${eventId}/sponsors`,
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  tierBadgeClass(tier: SponsorTier | null | undefined): string {
    switch (tier) {
      case 'title':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'platinum':
        return 'bg-slate-300/15 text-slate-200 border-slate-300/30';
      case 'gold':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'silver':
        return 'bg-slate-400/15 text-slate-300 border-slate-400/30';
      case 'bronze':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'partner':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  }

  isWithinVisibilityWindow(sponsor: Sponsor): boolean {
    const now = Date.now();
    if (!sponsor.isActive) return false;
    if (sponsor.startDate && new Date(sponsor.startDate).getTime() > now) return false;
    if (sponsor.endDate && new Date(sponsor.endDate).getTime() < now) return false;
    return true;
  }
}
