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
  baseMatchState?: Match;
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
    currentMatch?: Match,
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
      baseMatchState: currentMatch,
    };

    this.updatesQueue.push(offlineUpdate);
    this.saveQueue();

    this.uiService.warning('Offline: Score change saved locally. Will sync when online.');

    // Construct a mock match object to return to satisfy UI
    const mockMatch: Match = {
      id: matchId,
      homeTeamId: payload.homeTeamId || currentMatch?.homeTeamId || '',
      awayTeamId: payload.awayTeamId || currentMatch?.awayTeamId || '',
      homeScore: payload.homeScore !== undefined ? payload.homeScore : currentMatch?.homeScore || 0,
      awayScore: payload.awayScore !== undefined ? payload.awayScore : currentMatch?.awayScore || 0,
      status: payload.status || currentMatch?.status || 'live',
      scheduledAt: payload.scheduledAt || currentMatch?.scheduledAt || new Date().toISOString(),
      venueId: payload.venueId !== undefined ? payload.venueId : currentMatch?.venueId || null,
      config: payload.config || currentMatch?.config || {},
      liveData: payload.liveData || currentMatch?.liveData || {},
      stageId: stageId,
      createdAt: currentMatch?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (currentMatch) {
      Object.assign(mockMatch, {
        homeTeam: currentMatch.homeTeam,
        awayTeam: currentMatch.awayTeam,
        venue: currentMatch.venue,
        stage: (currentMatch as any).stage,
      });
    }

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
        const getUrl = `${environment.apiUrl}/workspaces/${update.workspaceId}/events/${update.eventId}/competitions/${update.competitionId}/stages/${update.stageId}/matches`;
        return this.http.get<Match[]>(getUrl, { headers }).pipe(
          concatMap((matches) => {
            const serverMatch = matches.find((m) => m.id === update.matchId);
            if (!serverMatch) {
              // Match not found on server anymore (maybe deleted)
              this.updatesQueue = this.updatesQueue.filter((item) => item.id !== update.id);
              this.saveQueue();
              return of(null);
            }

            // Check if conflict exists
            const base = update.baseMatchState;
            let hasConflict = false;
            if (base) {
              const scoreChangedOnServer =
                serverMatch.homeScore !== base.homeScore ||
                serverMatch.awayScore !== base.awayScore;
              const statusChangedOnServer = serverMatch.status !== base.status;

              // Only conflict if server's current values are also different from our new offline payload
              const differsFromPayload =
                (update.payload.homeScore !== undefined &&
                  serverMatch.homeScore !== update.payload.homeScore) ||
                (update.payload.awayScore !== undefined &&
                  serverMatch.awayScore !== update.payload.awayScore) ||
                (update.payload.status !== undefined &&
                  serverMatch.status !== update.payload.status);

              if ((scoreChangedOnServer || statusChangedOnServer) && differsFromPayload) {
                hasConflict = true;
              }
            }

            if (hasConflict) {
              const options = {
                title: 'Sync Conflict Detected',
                message: `Match "${serverMatch.homeTeam?.name || 'Home'} vs ${serverMatch.awayTeam?.name || 'Away'}" has newer edits on the server. Server: ${serverMatch.homeScore}-${serverMatch.awayScore} (${serverMatch.status}). Your offline score: ${update.payload.homeScore ?? serverMatch.homeScore}-${update.payload.awayScore ?? serverMatch.awayScore} (${update.payload.status ?? serverMatch.status}). Overwrite server changes?`,
                confirmText: 'Overwrite Server',
                cancelText: 'Keep Server',
                type: 'warning' as const,
              };

              return from(this.uiService.confirm(options)).pipe(
                concatMap((confirmOverwrite) => {
                  if (confirmOverwrite) {
                    return this.patchMatch(update, headers);
                  } else {
                    // Discard local changes, remove from queue
                    this.updatesQueue = this.updatesQueue.filter((item) => item.id !== update.id);
                    this.saveQueue();
                    this.uiService.info('Local offline updates discarded. Server version kept.');
                    return of(null);
                  }
                }),
              );
            } else {
              return this.patchMatch(update, headers);
            }
          }),
          catchError((err) => {
            console.error('Failed to sync offline update:', err);
            // Keep in queue for retry if network or other error occurs
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

  private patchMatch(update: OfflineUpdate, headers: HttpHeaders): Observable<Match> {
    const url = `${environment.apiUrl}/workspaces/${update.workspaceId}/events/${update.eventId}/competitions/${update.competitionId}/stages/${update.stageId}/matches/${update.matchId}`;
    return this.http.patch<Match>(url, update.payload, { headers }).pipe(
      tap(() => {
        // Remove from queue on success
        this.updatesQueue = this.updatesQueue.filter((item) => item.id !== update.id);
        this.saveQueue();
      }),
    );
  }

  getPendingCount(): number {
    return this.updatesQueue.length;
  }
}
