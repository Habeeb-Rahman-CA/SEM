import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';

/**
 * FieldSelectInterceptor honors a `?fields=a,b,c.d` query parameter on
 * GET requests and trims the response down to just those top-level and
 * dotted-path fields.
 *
 * Rationale: many endpoints return rich payloads with nested relations
 * because the primary caller (a detail view) needs them. Lightweight
 * consumers (dropdown pickers, autocomplete) can now request just the
 * fields they actually render, cutting bytes over the wire without
 * needing a bespoke DTO endpoint.
 *
 *   GET /workspaces/:id/players?fields=id,user.username
 *
 * Rules:
 *   - Only applies to GET requests with an explicit `fields` param
 *   - Works on both objects and arrays (each element gets pruned)
 *   - Nested paths use dot notation (max depth 5 to avoid pathological
 *     traversals)
 *   - Unknown fields are silently ignored — a client asking for a field
 *     the server doesn't return simply gets nothing back for that key,
 *     never a 400
 */
@Injectable()
export class FieldSelectInterceptor implements NestInterceptor {
  private readonly MAX_DEPTH = 5;

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    if (req.method !== 'GET') return next.handle();

    const raw = req.query?.['fields'];
    if (!raw || typeof raw !== 'string') return next.handle();

    const paths = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (paths.length === 0) return next.handle();

    return next.handle().pipe(map((body) => this.prune(body, paths)));
  }

  private prune(body: any, paths: string[]): any {
    if (body === null || body === undefined) return body;
    if (Array.isArray(body)) {
      return body.map((item) => this.prune(item, paths));
    }
    if (typeof body !== 'object') return body;

    const out: Record<string, any> = {};
    for (const path of paths) {
      const parts = path.split('.').slice(0, this.MAX_DEPTH);
      this.copyPath(body, out, parts);
    }
    return out;
  }

  private copyPath(
    source: any,
    target: Record<string, any>,
    parts: string[],
  ): void {
    if (parts.length === 0) return;
    const [head, ...rest] = parts;
    if (source == null || typeof source !== 'object') return;
    const value = source[head];
    if (value === undefined) return;

    if (rest.length === 0) {
      target[head] = value;
      return;
    }
    if (Array.isArray(value)) {
      target[head] = value.map((v) => {
        const inner: Record<string, any> = {};
        this.copyPath(v, inner, rest);
        return inner;
      });
      return;
    }
    if (typeof value === 'object' && value !== null) {
      target[head] = target[head] ?? {};
      this.copyPath(value, target[head], rest);
      return;
    }
    // scalar mid-path — bail (client asked for x.y but x is a scalar)
  }
}
