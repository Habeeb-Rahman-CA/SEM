import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';
import { Player } from '../../workspaces/services/workspace.service';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getPlayers(workspaceId: string): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.apiUrl}/${workspaceId}/players`, {
      headers: this.headers,
    });
  }

  createPlayer(
    workspaceId: string,
    payload: {
      userId: string;
      jerseyNumber?: string | null;
      teamId: string;
      bio?: string;
      position?: string;
      achievements?: Array<{
        id: string;
        title: string;
        description?: string | null;
        year?: number | null;
      }>;
    },
  ): Observable<Player> {
    return this.http.post<Player>(`${this.apiUrl}/${workspaceId}/players`, payload, {
      headers: this.headers,
    });
  }

  updatePlayer(
    workspaceId: string,
    playerId: string,
    payload: {
      jerseyNumber?: string | null;
      teamId?: string | null;
      bio?: string;
      position?: string;
      achievements?: Array<{
        id: string;
        title: string;
        description?: string | null;
        year?: number | null;
      }>;
    },
  ): Observable<Player> {
    return this.http.patch<Player>(`${this.apiUrl}/${workspaceId}/players/${playerId}`, payload, {
      headers: this.headers,
    });
  }

  removePlayer(workspaceId: string, playerId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/players/${playerId}`, {
      headers: this.headers,
    });
  }

  getPlayerStats(workspaceId: string, playerId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${workspaceId}/players/${playerId}/stats`, {
      headers: this.headers,
    });
  }

  getPlayerInsights(workspaceId: string, playerId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${workspaceId}/players/${playerId}/insights`, {
      headers: this.headers,
    });
  }

  getPublicPlayer(playerId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/public/players/${playerId}`);
  }

  getPublicPlayerInsights(playerId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/public/players/${playerId}/insights`);
  }

  getHallOfFame(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/public/players/hall-of-fame`);
  }
}
