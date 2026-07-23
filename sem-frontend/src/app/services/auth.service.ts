import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, from } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  avatarUrl?: string | null;
  isSuperAdmin?: boolean;
  needsPasswordChange?: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenPair {
  user: User;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  // ── Reactive state signals ──────────────────────────────────────────────────
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  token = signal<string | null>(null);

  // ── Private: refresh token stored only in memory for XSS protection ─────────
  private _refreshToken: string | null = null;

  constructor() {
    this.restoreSession();
  }

  // ─── Session persistence ────────────────────────────────────────────────────

  private restoreSession(): void {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    // Refresh token is stored in sessionStorage to survive page refresh
    // but NOT persist across browser sessions (more secure than localStorage)
    this._refreshToken = sessionStorage.getItem('refreshToken');

    if (savedToken && savedUser) {
      this.token.set(savedToken);
      this.currentUser.set(JSON.parse(savedUser));
      this.isAuthenticated.set(true);

      // Silently verify token; refresh if expired
      this.fetchProfile().subscribe({
        error: () => {
          if (this._refreshToken) {
            from(this.doRefresh(this._refreshToken)).subscribe({
              next: (tokens) => this.applyAccessToken(tokens.accessToken),
              error: () => this.logout(),
            });
          } else {
            this.logout();
          }
        },
      });
    }
  }

  // ─── Auth flows ─────────────────────────────────────────────────────────────

  register(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { username, password });
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap((response) => {
          this.applySession(response);
        }),
      );
  }

  logout(): void {
    // Revoke the refresh token server-side (best-effort)
    if (this._refreshToken) {
      this.http
        .post(`${this.apiUrl}/logout`, { refreshToken: this._refreshToken })
        .subscribe({ error: () => {} });
    }
    this.clearSession();
    this.router.navigateByUrl('/login');
  }

  logoutAll(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout-all`, {}).pipe(
      tap(() => this.clearSession()),
    );
  }

  // ─── Token management ────────────────────────────────────────────────────────

  /** Called by authInterceptor on 401 responses */
  async doRefresh(refreshToken: string): Promise<TokenPair> {
    const response = await this.http
      .post<TokenPair>(`${this.apiUrl}/refresh`, { refreshToken })
      .toPromise();
    if (!response) throw new Error('Refresh failed');
    this.applyAccessToken(response.accessToken);
    if (response.refreshToken) {
      this._refreshToken = response.refreshToken;
      sessionStorage.setItem('refreshToken', response.refreshToken);
    }
    return response;
  }

  /** Read the in-memory refresh token (used by authInterceptor) */
  refreshToken(): string | null {
    return this._refreshToken;
  }

  private applySession(response: AuthResponse): void {
    localStorage.setItem('token', response.accessToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    this._refreshToken = response.refreshToken;
    sessionStorage.setItem('refreshToken', response.refreshToken);

    this.token.set(response.accessToken);
    this.currentUser.set(response.user);
    this.isAuthenticated.set(true);
  }

  private applyAccessToken(accessToken: string): void {
    localStorage.setItem('token', accessToken);
    this.token.set(accessToken);
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('refreshToken');
    this._refreshToken = null;
    this.token.set(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  // ─── Profile ─────────────────────────────────────────────────────────────────

  fetchProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        localStorage.setItem('user', JSON.stringify(user));
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  updateProfile(username?: string, avatarUrl?: string): Observable<User> {
    return this.http
      .patch<User>(`${this.apiUrl}/profile`, { username, avatarUrl })
      .pipe(
        tap((user) => {
          this.currentUser.set(user);
          localStorage.setItem('user', JSON.stringify(user));
        }),
      );
  }

  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/change-password`, {
      oldPassword,
      newPassword,
    });
  }

  fetchProfileDetails(): Observable<{
    user: User & { createdAt: string };
    workspaces: Array<{
      id: string;
      name: string;
      slug: string;
      role: { slug: string; name: string };
    }>;
    teams: Array<{
      id: string;
      name: string;
      code: string;
      logoUrl?: string;
      jerseyNumber?: string;
      workspace: { id: string; name: string };
    }>;
  }> {
    return this.http.get<any>(`${this.apiUrl}/profile/details`);
  }

  // ─── Role / permission helpers ───────────────────────────────────────────────

  isSuperAdmin(): boolean {
    return this.currentUser()?.isSuperAdmin === true;
  }

  /**
   * Checks if the current user has the given role slug within a workspace.
   * Caller must provide the role slug from the workspace membership data.
   */
  hasRole(roleSlug: string, memberRoleSlug: string | undefined): boolean {
    if (this.isSuperAdmin()) return true;
    return memberRoleSlug === roleSlug;
  }

  /**
   * Checks if the current user has ANY of the given role slugs.
   */
  hasAnyRole(allowedSlugs: string[], memberRoleSlug: string | undefined): boolean {
    if (this.isSuperAdmin()) return true;
    return allowedSlugs.includes(memberRoleSlug ?? '');
  }

  // ─── Default workspace helpers (unchanged) ────────────────────────────────────

  getDefaultWorkspaceId(): string | null {
    const user = this.currentUser();
    if (user?.id) {
      return localStorage.getItem(`default_ws_${user.id}`);
    }
    return localStorage.getItem('default_ws');
  }

  setDefaultWorkspaceId(workspaceId: string): void {
    const user = this.currentUser();
    if (user?.id) {
      localStorage.setItem(`default_ws_${user.id}`, workspaceId);
    }
    localStorage.setItem('default_ws', workspaceId);
  }
}
