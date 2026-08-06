/**
 * offline.interceptor.ts
 * -------------------------------------------------------------------
 * Production Offline Interceptor:
 * 1. For GET requests: automatically caches live responses into IndexedDB.
 *    When offline (or on network failure), serves data from IndexedDB cache
 *    so UI pages load seamlessly offline.
 * 2. For POST/PUT/PATCH/DELETE requests:
 *    When offline (or on status 0 network error), enqueues the mutation into
 *    IndexedDB offline queue and returns an optimistic synthetic HttpResponse
 *    to keep the Angular UI responsive without breaking user workflow.
 * -------------------------------------------------------------------
 */
import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { IndexedDbService } from '../services/indexed-db.service';
import { OfflineSyncService } from '../services/offline-sync.service';

export const offlineInterceptor: HttpInterceptorFn = (req, next) => {
  const indexedDb = inject(IndexedDbService);
  const offlineSync = inject(OfflineSyncService);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const cacheKey = req.urlWithParams;

  // Derive human-readable entity name from URL
  const deriveEntityName = (url: string): string => {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1] || 'Record';
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
  };

  // ─── 1. GET REQUEST HANDLING ───
  if (req.method === 'GET') {
    if (!isOnline) {
      // Offline: Try fetching from IndexedDB API Cache
      return from(indexedDb.getApiCache(cacheKey)).pipe(
        switchMap((cached) => {
          if (cached) {
            console.log(`[OfflineInterceptor] Serving offline cached GET for: ${cacheKey}`);
            return of(
              new HttpResponse({
                status: 200,
                body: cached.body,
                headers: req.headers,
              }),
            );
          }
          return throwError(
            () =>
              new HttpErrorResponse({
                error: 'No offline cache available for this resource',
                status: 503,
                statusText: 'Service Unavailable (Offline)',
              }),
          );
        }),
      );
    }

    // Online: Execute request & update IndexedDB cache asynchronously
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse && event.ok) {
          // Cache successful GET responses
          indexedDb.setApiCache(cacheKey, event.body);
        }
      }),
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 0) {
          // Network connection dropped during fetch -> Fallback to IndexedDB
          return from(indexedDb.getApiCache(cacheKey)).pipe(
            switchMap((cached) => {
              if (cached) {
                offlineSync.isOffline.set(true);
                return of(
                  new HttpResponse({
                    status: 200,
                    body: cached.body,
                    headers: req.headers,
                  }),
                );
              }
              return throwError(() => error);
            }),
          );
        }
        return throwError(() => error);
      }),
    );
  }

  // ─── 2. MUTATION REQUEST HANDLING (POST, PUT, PATCH, DELETE) ───
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (!isOnline) {
      // Offline: Queue mutation in IndexedDB and return synthetic response
      const entityName = deriveEntityName(req.url);
      const payload = req.body;

      return from(
        offlineSync.enqueueOperation(req.method as any, req.url, payload, entityName),
      ).pipe(
        switchMap((item) => {
          const bodyObj = payload as Record<string, any> | null;
          const syntheticBody =
            bodyObj && typeof bodyObj === 'object'
              ? { ...bodyObj, id: bodyObj['id'] || item.id, _offline: true }
              : { success: true, id: item.id, _offline: true };

          return of(
            new HttpResponse({
              status: req.method === 'POST' ? 201 : 200,
              body: syntheticBody,
            }),
          );
        }),
      );
    }

    // Online: Try sending mutation, fallback to offline queue if status === 0
    return next(req).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 0) {
          offlineSync.isOffline.set(true);
          const entityName = deriveEntityName(req.url);

          return from(
            offlineSync.enqueueOperation(req.method as any, req.url, req.body, entityName),
          ).pipe(
            switchMap((item) => {
              const bodyObj = req.body as Record<string, any> | null;
              const syntheticBody =
                bodyObj && typeof bodyObj === 'object'
                  ? { ...bodyObj, id: bodyObj['id'] || item.id, _offline: true }
                  : { success: true, id: item.id, _offline: true };

              return of(
                new HttpResponse({
                  status: req.method === 'POST' ? 201 : 200,
                  body: syntheticBody,
                }),
              );
            }),
          );
        }
        return throwError(() => error);
      }),
    );
  }

  return next(req);
};
