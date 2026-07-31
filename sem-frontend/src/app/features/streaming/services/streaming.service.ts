import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type StreamPlatform = 'youtube' | 'twitch' | 'facebook' | 'vimeo' | 'custom';
export type StreamStatus = 'scheduled' | 'live' | 'ended' | 'error';
export type ClipType = 'moment' | 'goal' | 'save' | 'card' | 'wicket' | 'try' | 'other';

export interface StreamHighlight {
  id: string;
  workspaceId: string;
  sessionId: string;
  title: string;
  description: string | null;
  timestampSec: number;
  durationSec: number | null;
  clipUrl: string | null;
  thumbnailUrl: string | null;
  tags: string[] | null;
  clipType: ClipType;
  createdBy?: { id: string; username: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface StreamSession {
  id: string;
  workspaceId: string;
  eventId: string | null;
  matchId: string | null;
  title: string;
  description: string | null;
  platform: StreamPlatform;
  streamUrl: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  streamKey: string | null;
  status: StreamStatus;
  scheduledStart: string | null;
  actualStart: string | null;
  endedAt: string | null;
  viewerCount: number;
  viewerCountPeak: number;
  showScoreOverlay: boolean;
  showStats: boolean;
  showTeamNames: boolean;
  isPublic: boolean;
  overlayColor: string | null;
  match?: {
    id: string;
    status: string;
    scheduledAt: string | null;
    homeScore: number;
    awayScore: number;
    homeTeam: { id: string; name: string; code: string | null } | null;
    awayTeam: { id: string; name: string; code: string | null } | null;
    stage?: { id: string; competition?: { id: string; name: string } };
  } | null;
  event?: { id: string; name: string } | null;
  highlights?: StreamHighlight[];
  createdBy?: { id: string; username: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface OverlayData {
  sessionId: string;
  status: StreamStatus;
  title: string;
  showScoreOverlay: boolean;
  showStats: boolean;
  showTeamNames: boolean;
  overlayColor: string | null;
  viewerCount: number;
  event: { id: string; name: string } | null;
  match: {
    id: string;
    status: string;
    scheduledAt: string | null;
    homeScore: number;
    awayScore: number;
    homeTeam: {
      id: string;
      name: string;
      code: string | null;
      logoUrl: string | null;
    } | null;
    awayTeam: {
      id: string;
      name: string;
      code: string | null;
      logoUrl: string | null;
    } | null;
    competition: {
      id: string;
      name: string;
      sport: { id: string; name: string; code: string } | null;
    } | null;
    liveData: any;
  } | null;
  generatedAt: string;
}

export interface StreamSummary {
  total: number;
  live: number;
  scheduled: number;
  ended: number;
  totalHighlights: number;
  currentViewers: number;
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class StreamingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;
  private readonly publicUrl = `${environment.apiUrl}/public/streaming`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getSummary(workspaceId: string): Observable<StreamSummary> {
    return this.http.get<StreamSummary>(`${this.apiUrl}/${workspaceId}/streaming/summary`, {
      headers: this.headers,
    });
  }

  getSessions(
    workspaceId: string,
    filter: { status?: string; eventId?: string } = {},
  ): Observable<StreamSession[]> {
    let params = new HttpParams();
    if (filter.status) params = params.set('status', filter.status);
    if (filter.eventId) params = params.set('eventId', filter.eventId);
    return this.http.get<StreamSession[]>(`${this.apiUrl}/${workspaceId}/streaming/sessions`, {
      headers: this.headers,
      params,
    });
  }

  getSessionById(workspaceId: string, id: string): Observable<StreamSession> {
    return this.http.get<StreamSession>(`${this.apiUrl}/${workspaceId}/streaming/sessions/${id}`, {
      headers: this.headers,
    });
  }

  createSession(
    workspaceId: string,
    payload: Partial<StreamSession> & {
      title: string;
      platform: StreamPlatform;
      streamUrl: string;
    },
  ): Observable<StreamSession> {
    return this.http.post<StreamSession>(
      `${this.apiUrl}/${workspaceId}/streaming/sessions`,
      payload,
      { headers: this.headers },
    );
  }

  updateSession(
    workspaceId: string,
    id: string,
    payload: Partial<StreamSession>,
  ): Observable<StreamSession> {
    return this.http.patch<StreamSession>(
      `${this.apiUrl}/${workspaceId}/streaming/sessions/${id}`,
      payload,
      { headers: this.headers },
    );
  }

  goLive(workspaceId: string, id: string): Observable<StreamSession> {
    return this.http.post<StreamSession>(
      `${this.apiUrl}/${workspaceId}/streaming/sessions/${id}/go-live`,
      {},
      { headers: this.headers },
    );
  }

  endStream(workspaceId: string, id: string): Observable<StreamSession> {
    return this.http.post<StreamSession>(
      `${this.apiUrl}/${workspaceId}/streaming/sessions/${id}/end`,
      {},
      { headers: this.headers },
    );
  }

  updateViewerCount(
    workspaceId: string,
    id: string,
    viewerCount: number,
  ): Observable<StreamSession> {
    return this.http.post<StreamSession>(
      `${this.apiUrl}/${workspaceId}/streaming/sessions/${id}/viewer-count`,
      { viewerCount },
      { headers: this.headers },
    );
  }

  deleteSession(workspaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/streaming/sessions/${id}`, {
      headers: this.headers,
    });
  }

  createHighlight(
    workspaceId: string,
    payload: Partial<StreamHighlight> & {
      sessionId: string;
      title: string;
      timestampSec: number;
    },
  ): Observable<StreamHighlight> {
    return this.http.post<StreamHighlight>(
      `${this.apiUrl}/${workspaceId}/streaming/highlights`,
      payload,
      { headers: this.headers },
    );
  }

  updateHighlight(
    workspaceId: string,
    highlightId: string,
    payload: Partial<StreamHighlight>,
  ): Observable<StreamHighlight> {
    return this.http.patch<StreamHighlight>(
      `${this.apiUrl}/${workspaceId}/streaming/highlights/${highlightId}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteHighlight(workspaceId: string, highlightId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/streaming/highlights/${highlightId}`,
      { headers: this.headers },
    );
  }

  // Public spectator endpoints
  getPublicLive(): Observable<StreamSession[]> {
    return this.http.get<StreamSession[]>(`${this.publicUrl}/live`);
  }

  getPublicSession(id: string): Observable<StreamSession> {
    return this.http.get<StreamSession>(`${this.publicUrl}/sessions/${id}`);
  }

  getOverlay(id: string): Observable<OverlayData> {
    return this.http.get<OverlayData>(`${this.publicUrl}/overlay/${id}`);
  }

  formatTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
}
