import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of, firstValueFrom } from 'rxjs';
import { catchError, concatMap, tap } from 'rxjs/operators';
import { UiService } from './ui.service';
import { IndexedDbService, OfflineQueueItem, SyncLogEntry } from './indexed-db.service';
import { AuthService } from '../../features/auth/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class OfflineSyncService {
  private indexedDb = inject(IndexedDbService);
  private ui = inject(UiService);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // Reactive State Signals
  isOffline = signal<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  isSyncing = signal<boolean>(false);
  pendingItems = signal<OfflineQueueItem[]>([]);
  syncLogs = signal<SyncLogEntry[]>([]);
  showQueueModal = signal<boolean>(false);
  justSyncedCount = signal<number | null>(null);

  pendingCount = computed(() => this.pendingItems().length);

  constructor() {
    this.init();
  }

  async init() {
    await this.refreshQueue();
    await this.refreshLogs();

    if (typeof window !== 'undefined') {
      this.isOffline.set(!navigator.onLine);

      window.addEventListener('online', () => {
        console.log('[OfflineSyncService] Connection Restored -> Triggering Auto-Sync');
        this.isOffline.set(false);
        this.ui.info('🌐 Internet restored! Auto-syncing pending offline changes...');
        this.syncPendingOperations();
      });

      window.addEventListener('offline', () => {
        console.log('[OfflineSyncService] Network Disconnected -> Switched to Offline Mode');
        this.isOffline.set(true);
        this.ui.warning('⚡ Internet connection lost. Switched to Offline IndexedDB mode.');
      });
    }
  }

  async refreshQueue() {
    const queue = await this.indexedDb.getOfflineQueue();
    this.pendingItems.set(queue);
  }

  async refreshLogs() {
    const logs = await this.indexedDb.getSyncLogs(25);
    this.syncLogs.set(logs);
  }

  /**
   * Enqueue a mutating request (POST, PUT, PATCH, DELETE) when offline or network fails
   */
  async enqueueOperation(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    payload: any,
    entityName: string = 'Record',
    description?: string,
  ): Promise<OfflineQueueItem> {
    const id = `off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const actionDesc =
      description ||
      `${method} ${entityName} (${url.split('/').pop() || 'item'}) created/updated offline`;

    const item: OfflineQueueItem = {
      id,
      method,
      url,
      payload,
      timestamp: Date.now(),
      entityName,
      description: actionDesc,
      status: 'pending',
    };

    await this.indexedDb.enqueueOfflineItem(item);
    await this.refreshQueue();

    this.ui.warning(
      `⚡ Offline: ${entityName} change saved locally to IndexedDB. Will auto-sync when online.`,
    );

    return item;
  }

  /**
   * Execute sequential auto-sync replay for all pending queue items
   */
  syncPendingOperations(): Observable<any> {
    const items = [...this.pendingItems()];

    if (items.length === 0 || this.isSyncing()) {
      return of(null);
    }

    this.isSyncing.set(true);
    const totalToSync = items.length;

    const token = this.authService.token();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

    return from(items).pipe(
      concatMap((item) => this.processSingleSyncItem(item, headers)),
      tap({
        complete: async () => {
          this.isSyncing.set(false);
          await this.refreshQueue();
          await this.refreshLogs();

          const remaining = this.pendingCount();
          if (remaining === 0) {
            this.justSyncedCount.set(totalToSync);
            this.ui.success(
              `✅ Auto-Sync Complete! ${totalToSync} offline operations saved to server.`,
            );
            setTimeout(() => this.justSyncedCount.set(null), 6000);
          } else {
            this.ui.warning(
              `⚠️ Sync partially completed. ${remaining} item(s) failed or conflict.`,
            );
          }
        },
      }),
    );
  }

  private processSingleSyncItem(item: OfflineQueueItem, headers: HttpHeaders): Observable<any> {
    const req$ = this.executeHttpRequest(item.method, item.url, item.payload, headers);

    return req$.pipe(
      concatMap(async (response) => {
        // Success: Remove item from queue, log to history
        await this.indexedDb.removeQueueItem(item.id);

        const log: SyncLogEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          method: item.method,
          url: item.url,
          timestamp: item.timestamp,
          syncedAt: Date.now(),
          status: 'success',
          description: item.description,
        };
        await this.indexedDb.addSyncLog(log);
        return response;
      }),
      catchError(async (error) => {
        console.error(`[OfflineSync] Sync failed for item ${item.id}:`, error);

        item.status = 'failed';
        item.errorDetails = error?.error?.message || error?.message || 'Server error during sync';
        await this.indexedDb.enqueueOfflineItem(item);

        const log: SyncLogEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          method: item.method,
          url: item.url,
          timestamp: item.timestamp,
          syncedAt: Date.now(),
          status: 'failed',
          description: `Failed: ${item.description}`,
        };
        await this.indexedDb.addSyncLog(log);

        return of(null);
      }),
    );
  }

  private executeHttpRequest(
    method: string,
    url: string,
    payload: any,
    headers: HttpHeaders,
  ): Observable<any> {
    switch (method.toUpperCase()) {
      case 'POST':
        return this.http.post(url, payload, { headers });
      case 'PUT':
        return this.http.put(url, payload, { headers });
      case 'PATCH':
        return this.http.patch(url, payload, { headers });
      case 'DELETE':
        return this.http.delete(url, { headers });
      default:
        return of(null);
    }
  }

  async removeItem(id: string) {
    await this.indexedDb.removeQueueItem(id);
    await this.refreshQueue();
    this.ui.info('Removed offline item from queue.');
  }

  async clearAll() {
    await this.indexedDb.clearOfflineQueue();
    await this.refreshQueue();
    this.ui.info('Cleared offline queue.');
  }

  openQueueInspector() {
    this.showQueueModal.set(true);
  }

  closeQueueInspector() {
    this.showQueueModal.set(false);
  }
}
