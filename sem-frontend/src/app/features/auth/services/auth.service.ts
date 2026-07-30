import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, from } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StorageService } from '../../../core/services/storage.service';
import { CapacitorService } from '../../../core/services/capacitor.service';

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
  private storage = inject(StorageService);
  private capacitorService = inject(CapacitorService);
  private apiUrl = `${environment.apiUrl}/auth`;

  // ── Reactive state signals ──────────────────────────────────────────────────
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  token = signal<string | null>(null);
  defaultWorkspaceId = signal<string | null>(null);

  // ── Private: refresh token stored only in memory for XSS protection ─────────
  private _refreshToken: string | null = null;

  constructor() {
    // Session is restored asynchronously via init() in APP_INITIALIZER
  }

  async init(): Promise<void> {
    await this.restoreSession();
  }

  // ─── Session persistence ────────────────────────────────────────────────────

  private async restoreSession(): Promise<void> {
    const savedToken = await this.storage.getItem('token');
    const savedUser = await this.storage.getItem('user');
    this._refreshToken = await this.storage.getSessionItem('refreshToken');

    if (savedToken && savedUser) {
      const user = JSON.parse(savedUser);
      this.token.set(savedToken);
      this.currentUser.set(user);
      this.isAuthenticated.set(true);

      if (user?.id) {
        this.defaultWorkspaceId.set(await this.storage.getItem(`default_ws_${user.id}`));
      } else {
        this.defaultWorkspaceId.set(await this.storage.getItem('default_ws'));
      }

      // Register native push notifications
      this.capacitorService.registerPushNotifications(
        (token) => this.savePushToken(token).subscribe(),
        (notification) => console.log('Push notification received:', notification),
      );

      // Silently verify token; refresh if expired
      return new Promise<void>((resolve) => {
        this.fetchProfile().subscribe({
          next: () => resolve(),
          error: () => {
            if (this._refreshToken) {
              from(this.doRefresh(this._refreshToken)).subscribe({
                next: (tokens) => {
                  this.applyAccessToken(tokens.accessToken);
                  resolve();
                },
                error: () => {
                  this.logout();
                  resolve();
                },
              });
            } else {
              this.logout();
              resolve();
            }
          },
        });
      });
    }
  }

  // ─── Auth flows ─────────────────────────────────────────────────────────────

  register(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { username, password });
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { username, password }).pipe(
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
    return this.http
      .post<void>(`${this.apiUrl}/logout-all`, {})
      .pipe(tap(() => this.clearSession()));
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
      await this.storage.setSessionItem('refreshToken', response.refreshToken);
    }
    return response;
  }

  /** Read the in-memory refresh token (used by authInterceptor) */
  refreshToken(): string | null {
    return this._refreshToken;
  }

  private applySession(response: AuthResponse): void {
    this.storage.setItem('token', response.accessToken);
    this.storage.setItem('user', JSON.stringify(response.user));
    this._refreshToken = response.refreshToken;
    this.storage.setSessionItem('refreshToken', response.refreshToken);

    this.token.set(response.accessToken);
    this.currentUser.set(response.user);
    this.isAuthenticated.set(true);

    if (response.user?.id) {
      this.storage.getItem(`default_ws_${response.user.id}`).then((val) => {
        this.defaultWorkspaceId.set(val);
      });
    }

    // Register native push notifications
    this.capacitorService.registerPushNotifications(
      (token) => this.savePushToken(token).subscribe(),
      (notification) => console.log('Push notification received:', notification),
    );
  }

  private applyAccessToken(accessToken: string): void {
    this.storage.setItem('token', accessToken);
    this.token.set(accessToken);
  }

  private clearSession(): void {
    this.storage.removeItem('token');
    this.storage.removeItem('user');
    this.storage.removeSessionItem('refreshToken');
    this._refreshToken = null;
    this.token.set(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.defaultWorkspaceId.set(null);
  }

  // ─── Profile ─────────────────────────────────────────────────────────────────

  fetchProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.storage.setItem('user', JSON.stringify(user));
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  updateProfile(username?: string, avatarUrl?: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/profile`, { username, avatarUrl }).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.storage.setItem('user', JSON.stringify(user));
      }),
    );
  }

  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/change-password`, {
      oldPassword,
      newPassword,
    });
  }

  savePushToken(pushToken: string | null): Observable<any> {
    return this.http.post(`${this.apiUrl}/push-token`, { pushToken });
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
    return this.defaultWorkspaceId();
  }

  setDefaultWorkspaceId(workspaceId: string): void {
    const user = this.currentUser();
    this.defaultWorkspaceId.set(workspaceId);
    if (user?.id) {
      this.storage.setItem(`default_ws_${user.id}`, workspaceId);
    } else {
      this.storage.setItem('default_ws', workspaceId);
    }
  }
}
