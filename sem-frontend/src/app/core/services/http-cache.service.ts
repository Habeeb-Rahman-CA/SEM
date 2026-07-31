import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface InflightEntry<T> {
  observable$: Observable<T>;
}

/**
 * HttpCacheService centralizes three concerns that together dramatically
 * cut client → server chatter:
 *
 *   1. Response cache with per-key TTL — repeated reads of the same URL
 *      within the TTL window return synchronously from memory.
 *   2. In-flight deduplication — if two components request the same URL
 *      at the same time (a common startup pattern), only one HTTP call
 *      goes out and both subscribers get the shared response.
 *   3. Pattern-based invalidation — mutations can wipe just the parts of
 *      the cache they know are stale (e.g. `invalidate('/teams')` after
 *      creating a team).
 *
 * The service is stateless-per-URL: pass the same URL + params and you
 * get the same cache slot. It does NOT bypass Angular's HTTP interceptors
 * or auth headers — those still apply on the underlying request.
 */
@Injectable({ providedIn: 'root' })
export class HttpCacheService {
  private http = inject(HttpClient);
  private cache = new Map<string, CacheEntry<any>>();
  private inflight = new Map<string, InflightEntry<any>>();

  private key(url: string, params?: HttpParams): string {
    if (!params) return url;
    const q = params.toString();
    return q ? `${url}?${q}` : url;
  }

  /**
   * Cached GET. Returns immediately from cache if fresh; otherwise
   * dedupes concurrent requests to the same URL.
   *
   * @param options.ttlMs Cache lifetime in milliseconds (default 30s).
   *                      Pass 0 to skip caching but keep dedup.
   * @param options.forceRefresh Bypass the cache and revalidate.
   */
  get<T>(
    url: string,
    options: {
      headers?: HttpHeaders;
      params?: HttpParams;
      ttlMs?: number;
      forceRefresh?: boolean;
    } = {},
  ): Observable<T> {
    const ttl = options.ttlMs ?? 30_000;
    const cacheKey = this.key(url, options.params);
    const now = Date.now();

    if (!options.forceRefresh && ttl > 0) {
      const hit = this.cache.get(cacheKey);
      if (hit && hit.expiresAt > now) {
        return of(hit.value as T);
      }
    }

    const pending = this.inflight.get(cacheKey);
    if (pending) {
      return pending.observable$ as Observable<T>;
    }

    const shared$ = this.http
      .get<T>(url, { headers: options.headers, params: options.params })
      .pipe(
        tap((value) => {
          if (ttl > 0) {
            this.cache.set(cacheKey, {
              value,
              expiresAt: Date.now() + ttl,
            });
          }
          this.inflight.delete(cacheKey);
        }),
        catchError((err) => {
          this.inflight.delete(cacheKey);
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.inflight.set(cacheKey, { observable$: shared$ });
    return shared$;
  }

  /**
   * Invalidate every cache entry whose URL contains the given substring
   * (or matches the regex). Use after a mutation to drop stale reads.
   */
  invalidate(pattern: string | RegExp): void {
    const test =
      typeof pattern === 'string'
        ? (k: string) => k.includes(pattern)
        : (k: string) => pattern.test(k);
    for (const key of Array.from(this.cache.keys())) {
      if (test(key)) this.cache.delete(key);
    }
  }

  /**
   * Drop everything. Called on logout / workspace switch to prevent
   * user A's data leaking into user B's session in the same tab.
   */
  clearAll(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  /**
   * Optimistically seed the cache (e.g. from a bootstrap payload that
   * contains data another service would otherwise re-fetch). The stored
   * value uses the standard TTL rule.
   */
  set<T>(url: string, value: T, ttlMs = 30_000, params?: HttpParams): void {
    if (ttlMs <= 0) return;
    this.cache.set(this.key(url, params), {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /** Introspection — useful in devtools. */
  stats(): { entries: number; inflight: number } {
    return {
      entries: this.cache.size,
      inflight: this.inflight.size,
    };
  }
}
