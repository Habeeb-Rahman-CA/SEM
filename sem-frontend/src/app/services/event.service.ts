import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { WorkspaceEvent } from './workspace.service';

@Injectable({ providedIn: 'root' })
export class EventService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getEvents(workspaceId: string): Observable<WorkspaceEvent[]> {
    return this.http.get<WorkspaceEvent[]>(`${this.apiUrl}/${workspaceId}/events`, {
      headers: this.headers,
    });
  }

  createEvent(
    workspaceId: string,
    payload: {
      name: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      logoUrl?: string;
      teamIds?: string[];
    }
  ): Observable<WorkspaceEvent> {
    return this.http.post<WorkspaceEvent>(
      `${this.apiUrl}/${workspaceId}/events`,
      payload,
      { headers: this.headers }
    );
  }

  updateEvent(
    workspaceId: string,
    eventId: string,
    payload: {
      name?: string;
      description?: string;
      startDate?: string | null;
      endDate?: string | null;
      status?: string;
      logoUrl?: string;
      teamIds?: string[];
    }
  ): Observable<WorkspaceEvent> {
    return this.http.patch<WorkspaceEvent>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}`,
      payload,
      { headers: this.headers }
    );
  }

  removeEvent(workspaceId: string, eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/events/${eventId}`, {
      headers: this.headers,
    });
  }

  getEventStandings(workspaceId: string, eventId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${workspaceId}/events/${eventId}/standings`, {
      headers: this.headers,
    });
  }

  getPublicEvent(eventId: string): Observable<WorkspaceEvent> {
    return this.http.get<WorkspaceEvent>(`${environment.apiUrl}/public/events/${eventId}`);
  }

  getPublicCompetitions(eventId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/public/events/${eventId}/competitions`);
  }

  getPublicStages(eventId: string, competitionId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/public/events/${eventId}/competitions/${competitionId}/stages`);
  }

  getPublicMatches(eventId: string, competitionId: string, stageId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/public/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`);
  }

  getPublicCompetitionStats(eventId: string, competitionId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/public/events/${eventId}/competitions/${competitionId}/stats`);
  }
}
