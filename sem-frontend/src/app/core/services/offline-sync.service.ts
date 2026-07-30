import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of, BehaviorSubject } from 'rxjs';
import { catchError, concatMap, tap } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { UiService } from './ui.service';
import { Match } from '../../features/workspaces/services/workspace.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';

export interface OfflineUpdate {
  id: string;
  workspaceId: string;
  eventId: string;
  competitionId: string;
  stageId: string;
  matchId: string;
  payload: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class OfflineSyncService {
  private storage = inject(StorageService);
  private uiService = inject(UiService);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private readonly queueKey = 'offline_match_updates';
  private updatesQueue: OfflineUpdate[] = [];

  // Track synchronization status
  isSyncing = new BehaviorSubject<boolean>(false);

  constructor() {
    this.loadQueue();

    // Auto-sync when connection is restored
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncPendingUpdates().subscribe();
      });
    }
  }

  private async loadQueue() {
    const data = await this.storage.getItem(this.queueKey);
    if (data) {
      this.updatesQueue = JSON.parse(data);
    }
  }

  private async saveQueue() {
    await this.storage.setItem(this.queueKey, JSON.stringify(this.updatesQueue));
  }

  // Queue a new update and return a mock Match object reflecting the updates
  queueMatchUpdate(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    payload: any,
  ): Observable<Match> {
    const updateId = Math.random().toString(36).substring(2, 9);
    const offlineUpdate: OfflineUpdate = {
      id: updateId,
      workspaceId,
      eventId,
      competitionId,
      stageId,
      matchId,
      payload,
      timestamp: Date.now(),
    };

    this.updatesQueue.push(offlineUpdate);
    this.saveQueue();

    this.uiService.warning('Offline: Score change saved locally. Will sync when online.');

    // Construct a mock match object to return to satisfy UI
    const mockMatch: Match = {
      id: matchId,
      homeTeamId: payload.homeTeamId || '',
      awayTeamId: payload.awayTeamId || '',
      homeScore: payload.homeScore !== undefined ? payload.homeScore : 0,
      awayScore: payload.awayScore !== undefined ? payload.awayScore : 0,
      status: payload.status || 'live',
      scheduledAt: payload.scheduledAt || new Date().toISOString(),
      venueId: payload.venueId || null,
      config: payload.config || {},
      liveData: payload.liveData || {},
      stageId: stageId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return of(mockMatch);
  }

  // Sync all pending updates sequentially
  syncPendingUpdates(): Observable<any> {
    if (this.updatesQueue.length === 0 || this.isSyncing.value) {
      return of(null);
    }

    this.isSyncing.next(true);
    this.uiService.info(`Syncing ${this.updatesQueue.length} offline updates...`);

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.token()}`,
    });

    // Process sequentially using concatMap
    return from(this.updatesQueue).pipe(
      concatMap((update) => {
        const url = `${environment.apiUrl}/workspaces/${update.workspaceId}/events/${update.eventId}/competitions/${update.competitionId}/stages/${update.stageId}/matches/${update.matchId}`;
        return this.http.patch<Match>(url, update.payload, { headers }).pipe(
          tap(() => {
            // Remove from queue on success
            this.updatesQueue = this.updatesQueue.filter((item) => item.id !== update.id);
            this.saveQueue();
          }),
          catchError((err) => {
            console.error('Failed to sync offline update:', err);
            // Keep in queue and let user know
            return of(null);
          }),
        );
      }),
      tap({
        complete: () => {
          this.isSyncing.next(false);
          if (this.updatesQueue.length === 0) {
            this.uiService.success('All offline scores synced successfully!');
          } else {
            this.uiService.warning(
              `${this.updatesQueue.length} updates failed to sync. Will retry.`,
            );
          }
        },
      }),
    );
  }

  getPendingCount(): number {
    return this.updatesQueue.length;
  }
}
