import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { PrometheusRegistry } from './prometheus.registry';

/**
 * HttpMetricsInterceptor auto-records every HTTP request's method,
 * route pattern, status code, and duration. Attached globally, it
 * produces the two workhorse series any dashboard needs:
 *
 *   sem_http_requests_total{method,route,status}
 *   sem_http_request_duration_seconds_bucket{method,route,status,le}
 *
 * Route uses the pattern (e.g. `/api/workspaces/:id`) not the resolved
 * URL, so cardinality stays bounded no matter how many workspaces exist.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly registry: PrometheusRegistry) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const type = ctx.getType();
    if (type !== 'http') return next.handle();

    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const startNs = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => this.record(req, res, startNs),
        error: () => this.record(req, res, startNs, true),
      }),
    );
  }

  private record(
    req: Request,
    res: Response,
    startNs: bigint,
    error = false,
  ): void {
    const durationSec =
      Number(process.hrtime.bigint() - startNs) / 1_000_000_000;
    const method = req.method || 'GET';
    const route = this.routeOf(req);
    const status = String(res.statusCode || (error ? 500 : 200));

    const labels = { method, route, status };
    this.registry.incCounter('sem_http_requests_total', labels);
    this.registry.observeHistogram(
      'sem_http_request_duration_seconds',
      durationSec,
      labels,
    );
    if (error || res.statusCode >= 500) {
      this.registry.incCounter('sem_errors_total', { route, status });
    }
  }

  private routeOf(req: Request): string {
    // Nest attaches the resolved route pattern to `req.route.path`;
    // fall back to `originalUrl` stripped of query for unmatched paths.
    const routePath = (req as any).route?.path as string | undefined;
    if (routePath) {
      const prefix = (req as any).baseUrl || '';
      return `${prefix}${routePath}` || '/';
    }
    return (req.originalUrl || '/').split('?')[0];
  }
}
