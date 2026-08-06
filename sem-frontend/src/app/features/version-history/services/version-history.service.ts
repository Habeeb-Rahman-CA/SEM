import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type VersionEntityType =
  'event_rulebook' | 'match_schedule' | 'team_roster' | 'workspace_policy';

export interface VersionRecord {
  id: string;
  workspaceId: string;
  entityType: VersionEntityType;
  entityId: string;
  versionNumber: number;
  changeSummary: string;
  authorName: string;
  createdAt: string;
  snapshotData: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class FrontendVersionHistoryService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private wsBase(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/version-history`;
  }

  listVersions(
    workspaceId: string,
    entityId: string = 'rulebook-2026',
  ): Observable<VersionRecord[]> {
    return this.http.get<VersionRecord[]>(`${this.wsBase(workspaceId)}?entityId=${entityId}`, {
      headers: this.authHeaders,
    });
  }

  createVersion(
    workspaceId: string,
    payload: {
      entityType: VersionEntityType;
      entityId: string;
      changeSummary: string;
      authorName?: string;
      snapshotData: Record<string, any>;
    },
  ): Observable<VersionRecord> {
    return this.http.post<VersionRecord>(this.wsBase(workspaceId), payload, {
      headers: this.authHeaders,
    });
  }

  restoreVersion(
    workspaceId: string,
    entityId: string,
    targetVersionNumber: number,
  ): Observable<{ restoredVersion: VersionRecord; newCheckpoint: VersionRecord }> {
    return this.http.post<{ restoredVersion: VersionRecord; newCheckpoint: VersionRecord }>(
      `${this.wsBase(workspaceId)}/restore`,
      { entityId, targetVersionNumber },
      { headers: this.authHeaders },
    );
  }
}
