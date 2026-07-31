import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';
import { HttpCacheService } from './http-cache.service';

export interface ReferenceSport {
  id: string;
  name: string;
  code: string;
}

export interface ReferenceCurrency {
  code: string;
  symbol: string;
  label: string;
}

export interface ReferenceOption {
  value: string;
  label: string;
}

export interface ReferenceData {
  sports: ReferenceSport[];
  currencies: ReferenceCurrency[];
  contractTypes: ReferenceOption[];
  transferTypes: ReferenceOption[];
  accessLevels: ReferenceOption[];
  generatedAt: string;
}

/**
 * Long-TTL cache for static reference data. The backend also sets
 * `Cache-Control: public, max-age=1800`, so even a full-page reload will
 * usually hit the browser's HTTP cache — this in-memory layer just
 * eliminates the redundant fetch entirely within a session.
 */
@Injectable({ providedIn: 'root' })
export class ReferenceDataService {
  private cache = inject(HttpCacheService);
  private authService = inject(AuthService);
  private readonly url = `${environment.apiUrl}/reference-data`;

  private headers(): HttpHeaders {
    const token = this.authService.token();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  getAll(): Observable<ReferenceData> {
    return this.cache.get<ReferenceData>(this.url, {
      headers: this.headers(),
      // 30 minutes — matches the server's Cache-Control max-age
      ttlMs: 30 * 60 * 1000,
    });
  }

  getSports(): Observable<ReferenceSport[]> {
    return this.getAll().pipe(map((r) => r.sports));
  }

  getCurrencies(): Observable<ReferenceCurrency[]> {
    return this.getAll().pipe(map((r) => r.currencies));
  }
}
