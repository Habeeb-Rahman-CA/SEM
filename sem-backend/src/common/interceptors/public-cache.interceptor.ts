import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

/**
 * Response cache headers for public traffic.
 *
 * Rationale:
 * - Public traffic is anonymous & idempotent → CDN + browser cacheable.
 * - Live/list data changes often — short TTL + stale-while-revalidate.
 * - Detail pages (event/team/player/gallery) change rarely — longer TTL.
 * - Never sets Cache-Control on authenticated routes (defaults apply).
 *
 * The interceptor is idempotent: if a controller sets its own Cache-Control
 * (e.g. the /share/* HTML endpoints) we don't override it.
 *
 * If a CDN is placed in front, `s-maxage` and `stale-while-revalidate` let
 * it serve slightly-stale responses instantly while revalidating in the
 * background — the classic "no user waits" pattern.
 */
@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  private readonly rules: Array<{ test: RegExp; policy: string }> = [
    // Live scoreboards — near-realtime
    {
      test: /\/public\/events\/live-matches(\b|\?|$)/,
      policy: 'public, max-age=10, s-maxage=15, stale-while-revalidate=30',
    },
    {
      test: /\/public\/events\/match\//,
      policy: 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
    },
    {
      test: /\/standings(\b|\?|$)/,
      policy: 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
    },
    // Match lists / results / stats change less often
    {
      test: /\/matches(\b|\?|$)/,
      policy: 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    },
    {
      test: /\/results(\b|\?|$)/,
      policy: 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    },
    {
      test: /\/stats(\b|\?|$)/,
      policy: 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    },
    // Gallery — pretty stable once uploaded
    {
      test: /\/gallery\/photos(\b|\?|$)/,
      policy: 'public, max-age=120, s-maxage=300, stale-while-revalidate=600',
    },
    // Event/player/team detail — infrequent edits
    {
      test: /\/public\/players\//,
      policy: 'public, max-age=120, s-maxage=300, stale-while-revalidate=600',
    },
    {
      test: /\/public\/teams\//,
      policy: 'public, max-age=120, s-maxage=300, stale-while-revalidate=600',
    },
    {
      test: /\/public\/events\/[^/]+$/,
      policy: 'public, max-age=60, s-maxage=180, stale-while-revalidate=300',
    },
    // Portal listing
    {
      test: /\/public\/events(\?|$)/,
      policy: 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    },
    // Everything else under /public
    {
      test: /\/public\//,
      policy: 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    },
  ];

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    // Only for /public/* GETs
    const isGet = req.method === 'GET';
    const isPublicPath = req.originalUrl?.includes('/public/');
    if (!isGet || !isPublicPath) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          // Respect existing Cache-Control from controllers
          if (res.getHeader('Cache-Control')) return;

          const url = req.originalUrl;
          for (const rule of this.rules) {
            if (rule.test.test(url)) {
              res.setHeader('Cache-Control', rule.policy);
              // Vary on Accept-Encoding so gzip/brotli variants cache separately
              res.setHeader('Vary', 'Accept-Encoding');
              return;
            }
          }
        },
        error: () => {
          // On error, tell caches not to persist the failure
          res.setHeader('Cache-Control', 'no-store');
        },
      }),
    );
  }
}
