import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type FeatureCode =
  | 'publicPortal'
  | 'liveScoring'
  | 'customBranding'
  | 'apiAccess'
  | 'prioritySupport'
  | 'reportsAdvanced'
  | 'sponsorsEnabled'
  | 'adsEnabled';

export type QuotaCode = 'workspaces' | 'membersPerWorkspace' | 'eventsPerWorkspace' | 'storageMb';

export interface EntitlementFeature {
  code: FeatureCode;
  displayName: string;
  description: string;
  allowed: boolean;
  source: 'plan' | 'override' | 'default' | 'enforcement-off';
  overrideExpiresAt: string | null;
}

export interface EntitlementQuota {
  code: QuotaCode;
  current: number;
  max: number;
}

export interface Entitlements {
  workspaceId: string;
  enforcementEffective: boolean;
  plan: { code: string; name: string; tier: string };
  features: Record<FeatureCode, EntitlementFeature>;
  quotas: Record<QuotaCode, EntitlementQuota>;
  overrides: Array<{
    id: string;
    featureCode: string;
    enabled: boolean;
    expiresAt: string | null;
    reason: string | null;
  }>;
}

interface CacheEntry {
  fetchedAt: number;
  data: Entitlements;
}

/**
 * Frontend entitlement gateway. Wraps GET /workspaces/:id/entitlements
 * with a per-workspace in-memory cache (2 min TTL) so nav guards and
 * feature toggles can consult it synchronously via the signal API.
 *
 * Callers:
 *   - `entitlements(workspaceId)` — reactive signal, null until first load
 *   - `isEntitled(workspaceId, feature)` — computed boolean
 *   - `load(workspaceId)` — trigger/refresh; returns the observable so
 *     UI can await it if it needs a fresh copy
 *   - `refresh(workspaceId)` — force-refresh (post-mutation)
 *
 * When the backend is unreachable or the workspace has no snapshot yet,
 * `isEntitled` returns `true` (fail-open). Rationale: the server still
 * enforces every gate; the client-side check is purely for UX (dimming
 * disabled nav items, hiding upgrade CTAs). A false-negative there means
 * users can't see the button at all, which is worse than showing a
 * button that hits a 403 they can then click through to upgrade.
 */
@Injectable({ providedIn: 'root' })
export class LicensingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private readonly ttlMs = 2 * 60 * 1000;
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Observable<Entitlements>>();

  /** Reactive per-workspace snapshot. */
  private snapshots = signal<Record<string, Entitlements>>({});

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  entitlements(workspaceId: string): Signal<Entitlements | null> {
    return computed(() => this.snapshots()[workspaceId] ?? null);
  }

  /**
   * Sync check — safe to call from templates. Returns true when:
   *   - snapshot is missing (fail-open — server still enforces)
   *   - enforcement is off globally
   *   - feature is allowed by plan or override
   */
  isEntitled(workspaceId: string, feature: FeatureCode): boolean {
    const snap = this.snapshots()[workspaceId];
    if (!snap) return true;
    if (!snap.enforcementEffective) return true;
    return snap.features[feature]?.allowed ?? true;
  }

  /** Reactive version of {@link isEntitled}. */
  entitled(workspaceId: string, feature: FeatureCode): Signal<boolean> {
    return computed(() => this.isEntitled(workspaceId, feature));
  }

  load(workspaceId: string): Observable<Entitlements> {
    const cached = this.cache.get(workspaceId);
    if (cached && Date.now() - cached.fetchedAt < this.ttlMs) {
      return new Observable<Entitlements>((sub) => {
        sub.next(cached.data);
        sub.complete();
      });
    }
    const pending = this.inFlight.get(workspaceId);
    if (pending) return pending;

    const req = this.http
      .get<Entitlements>(`${environment.apiUrl}/workspaces/${workspaceId}/entitlements`, {
        headers: this.authHeaders,
      })
      .pipe(
        tap({
          next: (data) => {
            this.cache.set(workspaceId, { fetchedAt: Date.now(), data });
            this.snapshots.update((prev) => ({ ...prev, [workspaceId]: data }));
            this.inFlight.delete(workspaceId);
          },
          error: () => {
            this.inFlight.delete(workspaceId);
          },
        }),
      );
    this.inFlight.set(workspaceId, req);
    return req;
  }

  refresh(workspaceId: string): Observable<Entitlements> {
    this.cache.delete(workspaceId);
    return this.load(workspaceId);
  }

  // ─── Super-admin: overrides ────────────────────────────────────────

  listOverrides(workspaceId: string) {
    return this.http.get<Entitlements['overrides']>(
      `${environment.apiUrl}/workspaces/${workspaceId}/feature-overrides`,
      { headers: this.authHeaders },
    );
  }

  setOverride(
    workspaceId: string,
    payload: {
      featureCode: FeatureCode;
      enabled: boolean;
      expiresAt?: string | null;
      reason?: string | null;
    },
  ) {
    return this.http
      .post(`${environment.apiUrl}/workspaces/${workspaceId}/feature-overrides`, payload, {
        headers: this.authHeaders,
      })
      .pipe(tap(() => this.refresh(workspaceId).subscribe({ error: () => {} })));
  }

  removeOverride(workspaceId: string, overrideId: string) {
    return this.http
      .delete(`${environment.apiUrl}/workspaces/${workspaceId}/feature-overrides/${overrideId}`, {
        headers: this.authHeaders,
      })
      .pipe(tap(() => this.refresh(workspaceId).subscribe({ error: () => {} })));
  }
}
