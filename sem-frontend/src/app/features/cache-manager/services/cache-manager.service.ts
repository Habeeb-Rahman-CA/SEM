import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export interface CacheStats {
  backend: 'redis' | 'memory';
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  size?: number;
  connected?: boolean;
  namespace: string;
  hitRate: number;
}

export interface CacheKeyMeta {
  key: string;
  ttlSec: number;
  sizeBytes: number;
  preview?: string;
}

export interface CacheKeyDetail extends CacheKeyMeta {
  value: any;
}

export interface CacheKeyList {
  keys: CacheKeyMeta[];
  matched: number;
  truncated: boolean;
}

export interface DomainSetting {
  enabled: boolean;
  ttlSec: number;
}

export interface CacheDomainEntry {
  domain: string;
  settings: DomainSetting;
  isDefault: boolean;
}

export interface CacheConfig {
  id: string;
  globallyEnabled: boolean;
  namespace: string;
  domainSettings: Record<string, DomainSetting> | null;
  notes: string | null;
  updatedAt: string;
  updatedById: string | null;
}

@Injectable({ providedIn: 'root' })
export class CacheManagerService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/admin/cache`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getStats(): Observable<CacheStats> {
    return this.http.get<CacheStats>(`${this.apiUrl}/stats`, {
      headers: this.headers,
    });
  }

  listKeys(pattern = '*', limit = 200): Observable<CacheKeyList> {
    let params = new HttpParams().set('pattern', pattern).set('limit', String(limit));
    return this.http.get<CacheKeyList>(`${this.apiUrl}/keys`, {
      headers: this.headers,
      params,
    });
  }

  inspect(key: string): Observable<CacheKeyDetail> {
    const params = new HttpParams().set('key', key);
    return this.http.get<CacheKeyDetail>(`${this.apiUrl}/keys/inspect`, {
      headers: this.headers,
      params,
    });
  }

  deleteKey(key: string): Observable<{ removed: number; keys: string[] }> {
    const params = new HttpParams().set('key', key);
    return this.http.delete<{ removed: number; keys: string[] }>(`${this.apiUrl}/keys`, {
      headers: this.headers,
      params,
    });
  }

  invalidatePattern(pattern: string): Observable<{
    pattern: string;
    invalidated: number;
  }> {
    const params = new HttpParams().set('pattern', pattern);
    return this.http.delete<{ pattern: string; invalidated: number }>(`${this.apiUrl}/invalidate`, {
      headers: this.headers,
      params,
    });
  }

  invalidateDomain(
    domain: string,
    scope: {
      workspaceId?: string;
      competitionId?: string;
      season?: string;
    } = {},
  ): Observable<any> {
    let params = new HttpParams();
    if (scope.workspaceId) params = params.set('workspaceId', scope.workspaceId);
    if (scope.competitionId) params = params.set('competitionId', scope.competitionId);
    if (scope.season) params = params.set('season', scope.season);
    return this.http.post<any>(
      `${this.apiUrl}/invalidate/domain/${domain}`,
      {},
      { headers: this.headers, params },
    );
  }

  flush(): Observable<{ flushed: boolean; message?: string }> {
    const params = new HttpParams().set('confirm', 'true');
    return this.http.delete<{ flushed: boolean; message?: string }>(`${this.apiUrl}/flush`, {
      headers: this.headers,
      params,
    });
  }

  getConfig(): Observable<CacheConfig> {
    return this.http.get<CacheConfig>(`${this.apiUrl}/config`, {
      headers: this.headers,
    });
  }

  updateConfig(payload: Partial<CacheConfig>): Observable<CacheConfig> {
    return this.http.patch<CacheConfig>(`${this.apiUrl}/config`, payload, {
      headers: this.headers,
    });
  }

  listDomains(): Observable<CacheDomainEntry[]> {
    return this.http.get<CacheDomainEntry[]>(`${this.apiUrl}/config/domains`, {
      headers: this.headers,
    });
  }

  updateDomain(domain: string, settings: DomainSetting): Observable<CacheConfig> {
    return this.http.patch<CacheConfig>(`${this.apiUrl}/config/domains/${domain}`, settings, {
      headers: this.headers,
    });
  }

  resetDomain(domain: string): Observable<CacheConfig> {
    return this.http.delete<CacheConfig>(`${this.apiUrl}/config/domains/${domain}`, {
      headers: this.headers,
    });
  }
}
