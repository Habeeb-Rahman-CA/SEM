import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';
import { WorkspaceEvent, PublicEventsPage } from '../../workspaces/services/workspace.service';

@Injectable({ providedIn: 'root' })
export class EventService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getEvents(workspaceId: string, archived?: boolean): Observable<WorkspaceEvent[]> {
    const url =
      archived !== undefined
        ? `${this.apiUrl}/${workspaceId}/events?archived=${archived}`
        : `${this.apiUrl}/${workspaceId}/events`;
    return this.http.get<WorkspaceEvent[]>(url, {
      headers: this.headers,
    });
  }

  archiveEvent(workspaceId: string, eventId: string): Observable<WorkspaceEvent> {
    return this.http.patch<WorkspaceEvent>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/archive`,
      {},
      { headers: this.headers },
    );
  }

  restoreEvent(workspaceId: string, eventId: string): Observable<WorkspaceEvent> {
    return this.http.patch<WorkspaceEvent>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/restore`,
      {},
      { headers: this.headers },
    );
  }

  duplicateEvent(
    workspaceId: string,
    eventId: string,
    payload: {
      name: string;
      startDate?: string;
      endDate?: string;
      duplicateCompetitions?: boolean;
      duplicateStages?: boolean;
      duplicateVenues?: boolean;
      duplicateTeams?: boolean;
      duplicatePointSystems?: boolean;
      duplicateSettings?: boolean;
    },
  ): Observable<WorkspaceEvent> {
    return this.http.post<WorkspaceEvent>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/duplicate`,
      payload,
      { headers: this.headers },
    );
  }

  searchEvents(
    workspaceId: string,
    params: {
      query?: string;
      sport?: string;
      organizer?: string;
      status?: string;
      venue?: string;
      startDate?: string;
      endDate?: string;
      competitionName?: string;
      workspaceIdFilter?: string;
      sortBy?: string;
      sortOrder?: string;
    },
  ): Observable<WorkspaceEvent[]> {
    let queryParams: any = {};
    Object.keys(params).forEach((key) => {
      const val = (params as any)[key];
      if (val !== undefined && val !== null && val !== '') {
        queryParams[key] = val.toString();
      }
    });
    return this.http.get<WorkspaceEvent[]>(`${this.apiUrl}/${workspaceId}/events/search`, {
      headers: this.headers,
      params: queryParams,
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
      isPublic?: boolean;
      gallery?: string[];
      announcements?: Array<{
        id: string;
        title: string;
        content: string;
        createdAt: string;
      }>;
      sponsors?: Array<{
        id: string;
        name: string;
        logoUrl?: string | null;
        url?: string | null;
        tier?: string | null;
      }>;
      registrationStatus?: string;
      venue?: string;
      sport?: string;
      organizers?: string;
    },
  ): Observable<WorkspaceEvent> {
    return this.http.post<WorkspaceEvent>(`${this.apiUrl}/${workspaceId}/events`, payload, {
      headers: this.headers,
    });
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
      isPublic?: boolean;
      gallery?: string[];
      announcements?: Array<{
        id: string;
        title: string;
        content: string;
        createdAt: string;
      }>;
      sponsors?: Array<{
        id: string;
        name: string;
        logoUrl?: string | null;
        url?: string | null;
        tier?: string | null;
      }>;
      registrationStatus?: string;
      venue?: string;
      sport?: string;
      organizers?: string;
    },
  ): Observable<WorkspaceEvent> {
    return this.http.patch<WorkspaceEvent>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}`,
      payload,
      { headers: this.headers },
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

  getPublicEvents(
    params: {
      query?: string;
      status?: 'upcoming' | 'ongoing' | 'completed';
      sport?: string;
      venue?: string;
      limit?: number;
      offset?: number;
      sortBy?: 'startDate' | 'name' | 'status';
      sortOrder?: 'ASC' | 'DESC';
    } = {},
  ): Observable<PublicEventsPage> {
    const queryParams: Record<string, string> = {};
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        queryParams[key] = String(val);
      }
    }
    return this.http.get<PublicEventsPage>(`${environment.apiUrl}/public/events`, {
      params: queryParams,
    });
  }

  getPublicCompetitions(eventId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/public/events/${eventId}/competitions`);
  }

  getPublicMatch(matchId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/public/events/match/${matchId}`);
  }

  getPublicLiveMatches(filters: { sport?: string; eventId?: string } = {}): Observable<any[]> {
    const params: Record<string, string> = {};
    if (filters.sport) params['sport'] = filters.sport;
    if (filters.eventId) params['eventId'] = filters.eventId;
    return this.http.get<any[]>(`${environment.apiUrl}/public/events/live-matches`, {
      params,
    });
  }

  getPublicStages(eventId: string, competitionId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.apiUrl}/public/events/${eventId}/competitions/${competitionId}/stages`,
    );
  }

  getPublicMatches(eventId: string, competitionId: string, stageId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.apiUrl}/public/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`,
    );
  }

  getPublicCompetitionStats(eventId: string, competitionId: string): Observable<any> {
    return this.http.get<any>(
      `${environment.apiUrl}/public/events/${eventId}/competitions/${competitionId}/stats`,
    );
  }

  getPublicStandings(eventId: string, competitionId: string, stageId: string): Observable<any> {
    return this.http.get<any>(
      `${environment.apiUrl}/public/events/${eventId}/competitions/${competitionId}/stages/${stageId}/standings`,
    );
  }

  getPublicResults(eventId: string, competitionId: string): Observable<any> {
    return this.http.get<any>(
      `${environment.apiUrl}/public/events/${eventId}/competitions/${competitionId}/results`,
    );
  }

  getPublicTournamentStory(
    eventId: string,
    competitionId: string,
    day?: number,
    date?: string,
  ): Observable<any> {
    const params: Record<string, string> = {};
    if (day !== undefined) params['day'] = String(day);
    if (date !== undefined) params['date'] = date;
    return this.http.get<any>(
      `${environment.apiUrl}/public/events/${eventId}/competitions/${competitionId}/story`,
      { params },
    );
  }

  getAttendanceForecast(workspaceId: string, eventId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/attendance-forecast`,
      {
        headers: this.headers,
      },
    );
  }
}
