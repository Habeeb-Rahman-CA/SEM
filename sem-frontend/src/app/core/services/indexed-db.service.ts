import { Injectable } from '@angular/core';

export interface ApiCacheEntry {
  key: string;
  body: any;
  headers?: Record<string, string>;
  timestamp: number;
  ttl: number;
}

export interface OfflineQueueItem {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  payload: any;
  headers?: Record<string, string>;
  timestamp: number;
  entityName: string;
  description: string;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  errorDetails?: string;
}

export interface SyncLogEntry {
  id: string;
  method: string;
  url: string;
  timestamp: number;
  syncedAt: number;
  status: 'success' | 'failed' | 'resolved';
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class IndexedDbService {
  private readonly dbName = 'TaisenOfflineDB';
  private readonly dbVersion = 1;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.initDb();
  }

  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject('IndexedDB is not supported in this environment');
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. API Cache Store
        if (!db.objectStoreNames.contains('api_cache')) {
          db.createObjectStore('api_cache', { keyPath: 'key' });
        }

        // 2. Offline Queue Store
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('status', 'status', { unique: false });
        }

        // 3. Sync History Log Store
        if (!db.objectStoreNames.contains('sync_logs')) {
          const logsStore = db.createObjectStore('sync_logs', { keyPath: 'id' });
          logsStore.createIndex('syncedAt', 'syncedAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // ─── API CACHE METHODS ───
  async getApiCache(key: string): Promise<ApiCacheEntry | null> {
    try {
      const db = await this.initDb();
      return new Promise((resolve) => {
        const tx = db.transaction('api_cache', 'readonly');
        const store = tx.objectStore('api_cache');
        const req = store.get(key);

        req.onsuccess = () => {
          const res = req.result as ApiCacheEntry | undefined;
          if (!res) {
            resolve(null);
            return;
          }
          // Check TTL validity
          if (res.ttl > 0 && Date.now() - res.timestamp > res.ttl) {
            this.deleteApiCache(key);
            resolve(null);
          } else {
            resolve(res);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async setApiCache(key: string, body: any, ttl = 300_000): Promise<void> {
    try {
      const db = await this.initDb();
      const tx = db.transaction('api_cache', 'readwrite');
      const store = tx.objectStore('api_cache');
      const entry: ApiCacheEntry = {
        key,
        body,
        timestamp: Date.now(),
        ttl,
      };
      store.put(entry);
    } catch (err) {
      console.warn('Failed to store API cache in IndexedDB:', err);
    }
  }

  async deleteApiCache(key: string): Promise<void> {
    try {
      const db = await this.initDb();
      const tx = db.transaction('api_cache', 'readwrite');
      tx.objectStore('api_cache').delete(key);
    } catch (err) {
      console.warn('Failed to delete API cache key from IndexedDB:', err);
    }
  }

  // ─── OFFLINE QUEUE METHODS ───
  async getOfflineQueue(): Promise<OfflineQueueItem[]> {
    try {
      const db = await this.initDb();
      return new Promise((resolve) => {
        const tx = db.transaction('offline_queue', 'readonly');
        const store = tx.objectStore('offline_queue');
        const index = store.index('timestamp');
        const req = index.getAll();

        req.onsuccess = () => resolve((req.result as OfflineQueueItem[]) || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async enqueueOfflineItem(item: OfflineQueueItem): Promise<void> {
    try {
      const db = await this.initDb();
      const tx = db.transaction('offline_queue', 'readwrite');
      tx.objectStore('offline_queue').put(item);
    } catch (err) {
      console.error('Failed to enqueue offline item in IndexedDB:', err);
    }
  }

  async removeQueueItem(id: string): Promise<void> {
    try {
      const db = await this.initDb();
      const tx = db.transaction('offline_queue', 'readwrite');
      tx.objectStore('offline_queue').delete(id);
    } catch (err) {
      console.warn('Failed to remove queue item from IndexedDB:', err);
    }
  }

  async clearOfflineQueue(): Promise<void> {
    try {
      const db = await this.initDb();
      const tx = db.transaction('offline_queue', 'readwrite');
      tx.objectStore('offline_queue').clear();
    } catch (err) {
      console.warn('Failed to clear offline queue in IndexedDB:', err);
    }
  }

  // ─── SYNC LOGS METHODS ───
  async addSyncLog(log: SyncLogEntry): Promise<void> {
    try {
      const db = await this.initDb();
      const tx = db.transaction('sync_logs', 'readwrite');
      tx.objectStore('sync_logs').put(log);
    } catch (err) {
      console.warn('Failed to add sync log to IndexedDB:', err);
    }
  }

  async getSyncLogs(limit = 20): Promise<SyncLogEntry[]> {
    try {
      const db = await this.initDb();
      return new Promise((resolve) => {
        const tx = db.transaction('sync_logs', 'readonly');
        const store = tx.objectStore('sync_logs');
        const req = store.getAll();

        req.onsuccess = () => {
          const list = (req.result as SyncLogEntry[]) || [];
          list.sort((a, b) => b.syncedAt - a.syncedAt);
          resolve(list.slice(0, limit));
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }
}
