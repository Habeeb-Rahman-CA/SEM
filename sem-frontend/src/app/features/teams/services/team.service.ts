import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';
import { Team } from '../../workspaces/services/workspace.service';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getTeams(workspaceId: string): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.apiUrl}/${workspaceId}/teams`, {
      headers: this.headers,
    });
  }

  createTeam(
    workspaceId: string,
    payload: {
      name: string;
      code?: string | null;
      description?: string | null;
      logoUrl?: string | null;
      primaryColor?: string | null;
      secondaryColor?: string | null;
      coaches?: Array<{
        id: string;
        name: string;
        role?: string | null;
        avatarUrl?: string | null;
        bio?: string | null;
      }>;
      achievements?: Array<{
        id: string;
        title: string;
        year?: number | null;
        competitionName?: string | null;
        description?: string | null;
      }>;
    },
  ): Observable<Team> {
    return this.http.post<Team>(`${this.apiUrl}/${workspaceId}/teams`, payload, {
      headers: this.headers,
    });
  }

  updateTeam(
    workspaceId: string,
    teamId: string,
    payload: {
      name?: string;
      code?: string | null;
      description?: string | null;
      logoUrl?: string | null;
      primaryColor?: string | null;
      secondaryColor?: string | null;
      coaches?: Array<{
        id: string;
        name: string;
        role?: string | null;
        avatarUrl?: string | null;
        bio?: string | null;
      }>;
      achievements?: Array<{
        id: string;
        title: string;
        year?: number | null;
        competitionName?: string | null;
        description?: string | null;
      }>;
    },
  ): Observable<Team> {
    return this.http.patch<Team>(`${this.apiUrl}/${workspaceId}/teams/${teamId}`, payload, {
      headers: this.headers,
    });
  }

  removeTeam(workspaceId: string, teamId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/teams/${teamId}`, {
      headers: this.headers,
    });
  }

  getTeamStats(workspaceId: string, teamId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${workspaceId}/teams/${teamId}/stats`, {
      headers: this.headers,
    });
  }

  getTeamAnalytics(workspaceId: string, teamId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${workspaceId}/teams/${teamId}/analytics`, {
      headers: this.headers,
    });
  }

  getPublicTeam(teamId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/public/teams/${teamId}`);
  }

  getPublicTeamAnalytics(teamId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/public/teams/${teamId}/analytics`);
  }

  getPublicTeamChemistry(teamId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/public/teams/${teamId}/chemistry`);
  }

  getTeamChemistry(workspaceId: string, teamId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${workspaceId}/teams/${teamId}/chemistry`, {
      headers: this.headers,
    });
  }
}
