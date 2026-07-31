import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';

/**
 * ETagInterceptor computes a weak ETag from the serialized response body
 * of successful GET requests. If the incoming `If-None-Match` header
 * matches, we short-circuit to a bodyless `304 Not Modified` — which
 * costs almost nothing to serve and saves the client from downloading a
 * response it already has.
 *
 * Weak ETag (W/"…") is used because we hash after serialization but
 * before compression — semantically equivalent, byte-different variants
 * (whitespace, key ordering) should still share a cache slot.
 *
 * Skipped when:
 *   - method is not GET
 *   - response body is null/undefined (nothing to hash)
 *   - controller already set an ETag
 *   - response was already committed (e.g. streamed file download)
 */
@Injectable()
export class EtagInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    if (req.method !== 'GET') return next.handle();

    return next.handle().pipe(
      map((body) => {
        if (body === undefined || body === null) return body;
        if (res.getHeader('ETag')) return body;
        if ((res as any).headersSent) return body;

        let payload: string;
        try {
          payload = typeof body === 'string' ? body : JSON.stringify(body);
        } catch {
          return body;
        }

        const hash = createHash('sha1').update(payload).digest('base64');
        const etag = `W/"${hash}"`;
        res.setHeader('ETag', etag);

        // Stamp Last-Modified from the response payload if it looks like it
        // carries a `generatedAt` timestamp — many endpoints in this project
        // do. Cheap heuristic; keeps client cache validation strong.
        if (
          typeof body === 'object' &&
          body !== null &&
          typeof body.generatedAt === 'string'
        ) {
          try {
            const d = new Date(body.generatedAt);
            if (!Number.isNaN(d.getTime())) {
              res.setHeader('Last-Modified', d.toUTCString());
            }
          } catch {
            /* ignore */
          }
        }

        const inm = req.headers['if-none-match'];
        if (inm && String(inm).includes(hash)) {
          res.status(304);
          res.setHeader('Content-Length', '0');
          // Return no body so nest doesn't serialize; response ends here
          return undefined;
        }

        return body;
      }),
    );
  }
}
