import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';
import { HttpCacheService } from './http-cache.service';

export interface WorkspaceBootstrap {
  workspace: any;
  currentUser: {
    userId: string;
    roleSlug: string | null;
    roleName: string | null;
    permissions: string[];
  };
  members: any[];
  roles: any[];
  sports: Array<{ id: string; name: string; code: string }>;
  teams: Array<{
    id: string;
    name: string;
    code: string | null;
    logoUrl: string | null;
  }>;
  players: Array<{
    id: string;
    userId: string;
    teamId: string;
    jerseyNumber: string | null;
    position: string | null;
    user: { id: string; username: string; avatarUrl: string | null } | null;
    team: { id: string; name: string } | null;
  }>;
  events: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
    logoUrl: string | null;
  }>;
  counts: {
    teams: number;
    players: number;
    events: number;
    members: number;
  };
  generatedAt: string;
}

/**
 * Fetches one merged payload with everything the workspace shell needs
 * on first load: workspace record, members, roles, teams, players,
 * events, sports, and the current user's role & permissions.
 *
 * When the caller opens tabs that need heavyweight lists (e.g. every
 * match ever played), those still go through their dedicated services
 * — bootstrap covers the workspace shell only.
 *
 * The response is cached for 60s so revisiting the workspace within
 * a minute serves from memory. Mutations should invalidate via
 * HttpCacheService.invalidate('/bootstrap') to force a refresh.
 */
@Injectable({ providedIn: 'root' })
export class BootstrapService {
  private cache = inject(HttpCacheService);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getBootstrap(
    workspaceId: string,
    options: { forceRefresh?: boolean } = {},
  ): Observable<WorkspaceBootstrap> {
    return this.cache
      .get<WorkspaceBootstrap>(`${this.apiUrl}/${workspaceId}/bootstrap`, {
        headers: this.headers(),
        ttlMs: 60_000,
        forceRefresh: options.forceRefresh,
      })
      .pipe(tap((payload) => this.seedRelatedCaches(workspaceId, payload)));
  }

  invalidate(workspaceId?: string) {
    this.cache.invalidate(workspaceId ? `/workspaces/${workspaceId}/bootstrap` : '/bootstrap');
  }

  /**
   * Populate the cache slots that per-domain services would otherwise
   * refetch. Downstream callers using HttpCacheService.get() will now
   * hit the cache instead of making a second network trip.
   */
  private seedRelatedCaches(workspaceId: string, payload: WorkspaceBootstrap): void {
    const base = `${this.apiUrl}/${workspaceId}`;
    this.cache.set(`${base}/members`, payload.members, 60_000);
    this.cache.set(`${base}/roles`, payload.roles, 60_000);
    this.cache.set(`${base}/teams`, payload.teams, 60_000);
    this.cache.set(`${base}/players`, payload.players, 60_000);
    this.cache.set(`${base}/events`, payload.events, 60_000);
  }
}
