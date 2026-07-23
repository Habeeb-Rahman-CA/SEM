import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  throwError,
  BehaviorSubject,
  Observable,
  from,
} from 'rxjs';
import {
  catchError,
  filter,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { AuthService } from './auth.service';

/** URLs that must never receive the Authorization header */
const PUBLIC_URLS = ['/auth/login', '/auth/register', '/auth/refresh'];

let isRefreshing = false;
const refreshSubject$ = new BehaviorSubject<string | null>(null);

/**
 * Functional HTTP interceptor that:
 * 1. Attaches `Authorization: Bearer <accessToken>` to every non-public request.
 * 2. On 401 responses, queues concurrent requests and retries them once after
 *    a transparent token refresh.
 * 3. Falls back to `logout()` if the refresh itself fails.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<any> => {
  const authService = inject(AuthService);

  // Skip public endpoints
  const isPublic = PUBLIC_URLS.some((url) => req.url.includes(url));
  if (isPublic) {
    return next(req);
  }

  const token = authService.token();
  const authReq = addToken(req, token);

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        return handle401(req, next, authService);
      }
      return throwError(() => err);
    }),
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) return req;
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
  originalReq: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
): Observable<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject$.next(null);

    const refreshToken = authService.refreshToken();
    if (!refreshToken) {
      isRefreshing = false;
      authService.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return from(authService.doRefresh(refreshToken)).pipe(
      tap((tokens) => {
        isRefreshing = false;
        refreshSubject$.next(tokens.accessToken);
      }),
      switchMap((tokens) => next(addToken(originalReq, tokens.accessToken))),
      catchError((err) => {
        isRefreshing = false;
        authService.logout();
        return throwError(() => err);
      }),
    );
  }

  // Queue concurrent 401s until refresh completes
  return refreshSubject$.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap((token) => next(addToken(originalReq, token))),
  );
}
