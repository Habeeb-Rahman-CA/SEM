import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';
import { UiService } from './ui.service';

export interface VersionSnapshot {
  id: string;
  entityType: string; // e.g. 'file', 'form', 'event', 'team'
  entityId: string;
  versionNumber: string;
  title: string;
  changelog: string;
  snapshotData: Record<string, any>;
  createdAt: string;
  createdByName: string;
}

@Injectable({
  providedIn: 'root',
})
export class VersionHistoryService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private ui = inject(UiService);

  versions = signal<VersionSnapshot[]>([]);
  activeDrawer = signal<boolean>(false);
  selectedEntity = signal<{ type: string; id: string; title: string } | null>(null);

  private getHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  openVersionHistory(entityType: string, entityId: string, title: string) {
    this.selectedEntity.set({ type: entityType, id: entityId, title });
    this.fetchVersionHistory(entityType, entityId).subscribe();
    this.activeDrawer.set(true);
  }

  closeVersionHistory() {
    this.activeDrawer.set(false);
    this.selectedEntity.set(null);
  }

  fetchVersionHistory(entityType: string, entityId: string): Observable<VersionSnapshot[]> {
    // Simulated historical snapshots for rich demo experience
    const mockSnapshots: VersionSnapshot[] = [
      {
        id: 'ver-3',
        entityType,
        entityId,
        versionNumber: 'v2.1',
        title: 'Current Active Version',
        changelog: 'Updated parameters & team assignments.',
        snapshotData: { status: 'active', updated: true },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        createdByName: 'Admin User',
      },
      {
        id: 'ver-2',
        entityType,
        entityId,
        versionNumber: 'v2.0',
        title: 'Major Release Update',
        changelog: 'Added rules & venue specifications.',
        snapshotData: { status: 'review', updated: false },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        createdByName: 'John Manager',
      },
      {
        id: 'ver-1',
        entityType,
        entityId,
        versionNumber: 'v1.0',
        title: 'Initial Creation Snapshot',
        changelog: 'Initial form creation & setup.',
        snapshotData: { status: 'draft' },
        createdAt: new Date(Date.now() - 604800000).toISOString(),
        createdByName: 'System Setup',
      },
    ];

    return of(mockSnapshots).pipe(
      tap((res) => this.versions.set(res)),
      catchError(() => of([])),
    );
  }

  restoreVersion(snapshot: VersionSnapshot): Observable<any> {
    this.ui.success(`✓ Restored entity state to version ${snapshot.versionNumber}`);
    this.closeVersionHistory();
    return of({ success: true, restored: snapshot });
  }
}
