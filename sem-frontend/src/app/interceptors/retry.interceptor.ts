import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { retry, timer } from 'rxjs';

/**
 * Functional HTTP interceptor that retries failed GET requests up to 3 times.
 * Retries only occur for transient failures:
 * 1. Network disconnection/CORS errors (status === 0).
 * 2. Transient server issues (status >= 500).
 * Uses simple linear backoff: 1s, 2s, 3s delay.
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Only retry safe GET requests to avoid duplicating write/mutation operations
  if (req.method !== 'GET') {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: 3,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // Retry only on network issues (status 0) or internal server/gateway errors (status >= 500)
        if (error.status === 0 || error.status >= 500) {
          return timer(retryCount * 1000);
        }
        // Immediately forward client errors (400, 401, 403, 404, etc.) without retrying
        throw error;
      }
    })
  );
};
