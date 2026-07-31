import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getEventReports(workspaceId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${workspaceId}/analytics/event-reports`, {
      headers: this.headers,
    });
  }

  getParticipationTrends(workspaceId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${workspaceId}/analytics/participation-trends`, {
      headers: this.headers,
    });
  }

  getHistoricalComparisons(workspaceId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${workspaceId}/analytics/historical-comparisons`, {
      headers: this.headers,
    });
  }

  getOrganizerInsights(workspaceId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${workspaceId}/analytics/organizer-insights`, {
      headers: this.headers,
    });
  }
}
