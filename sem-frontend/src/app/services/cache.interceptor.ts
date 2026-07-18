/**
 * cache.interceptor.ts
 * -------------------------------------------------------------------
 * In-memory HTTP GET cache with configurable TTL.
 *
 * Strategy:
 *  - Cache all GET requests that match the API base URL.
 *  - Short TTL (10 s) for frequently-changing resources (matches, members).
 *  - Longer TTL (60 s) for stable resources (sports, roles, permissions).
 *  - Mutation requests (POST/PATCH/DELETE) automatically bust the cache
 *    for the affected resource path.
 * -------------------------------------------------------------------
 */
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';

interface CacheEntry {
  response: HttpResponse<unknown>;
  expiresAt: number;
}

// Simple in-memory store (survives the SPA lifetime, cleared on hard refresh)
const cache = new Map<string, CacheEntry>();

// TTL rules: matched in order, first match wins
const TTL_RULES: Array<{ pattern: RegExp; ttlMs: number }> = [
  { pattern: /\/workspaces\/sports$/,      ttlMs: 5 * 60_000 }, // 5 min — almost never changes
  { pattern: /\/system-settings\/roles/,   ttlMs: 5 * 60_000 }, // 5 min
  { pattern: /\/system-settings\/permissions/, ttlMs: 5 * 60_000 },
  { pattern: /\/roles$/,                   ttlMs: 60_000 },     // 1 min — workspace roles
  { pattern: /\/venues$/,                  ttlMs: 60_000 },     // 1 min
  { pattern: /\/teams$/,                   ttlMs: 30_000 },     // 30 s
  { pattern: /\/players$/,                 ttlMs: 30_000 },
  { pattern: /\/events$/,                  ttlMs: 20_000 },     // 20 s
  { pattern: /\/competitions$/,            ttlMs: 20_000 },
  { pattern: /\/stages$/,                  ttlMs: 20_000 },
  { pattern: /\/matches$/,                 ttlMs: 10_000 },     // 10 s — live scoring
  { pattern: /\/members$/,                 ttlMs: 30_000 },     // 30 s
];

const API_BASE = 'http://localhost:3001/api';

function getTtl(url: string): number {
  const rule = TTL_RULES.find(r => r.pattern.test(url));
  return rule ? rule.ttlMs : 15_000; // 15 s default
}

/** Derive the cache key prefix to bust when a mutation happens on this path */
function bustPatternFor(url: string): string {
  // Strip query params and the last path segment (the ID) for list-busting
  return url.split('?')[0];
}

function bustCache(mutatedUrl: string) {
  const base = bustPatternFor(mutatedUrl);
  for (const key of cache.keys()) {
    // Bust the list endpoint and the specific resource endpoint
    if (key.startsWith(base) || base.startsWith(key)) {
      cache.delete(key);
    }
  }
}

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Only cache GET requests to our API
  if (req.method !== 'GET' || !req.url.startsWith(API_BASE)) {
    // For mutations, bust the cache for the affected resource
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && req.url.startsWith(API_BASE)) {
      return next(req).pipe(
        tap(event => {
          if (event instanceof HttpResponse && event.ok) {
            bustCache(req.url);
          }
        })
      );
    }
    return next(req);
  }

  const cacheKey = req.url;
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return of(cached.response.clone());
  }

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && event.ok) {
        cache.set(cacheKey, {
          response: event.clone(),
          expiresAt: now + getTtl(req.url),
        });
      }
    })
  );
};
