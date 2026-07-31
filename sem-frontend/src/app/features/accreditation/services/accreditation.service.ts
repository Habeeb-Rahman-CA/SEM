import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type HolderType = 'player' | 'official' | 'volunteer' | 'media' | 'guest' | 'staff';
export type AccessLevel = 'general' | 'restricted' | 'vip' | 'all_areas';
export type CredentialStatus = 'active' | 'revoked' | 'expired' | 'lost';
export type ScanResult =
  | 'granted'
  | 'denied_expired'
  | 'denied_revoked'
  | 'denied_zone'
  | 'denied_not_found'
  | 'denied_not_yet_valid';

export interface AccessZone {
  id: string;
  workspaceId: string;
  venueId: string | null;
  name: string;
  description: string | null;
  allowedHolderTypes: HolderType[] | null;
  allowedAccessLevels: AccessLevel[] | null;
  capacity: number | null;
  color: string | null;
  isActive: boolean;
  venue?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialAccessGrant {
  id: string;
  credentialId: string;
  zoneId: string;
  zone?: AccessZone;
}

export interface Credential {
  id: string;
  workspaceId: string;
  eventId: string | null;
  holderType: HolderType;
  holderUserId: string | null;
  holderPlayerId: string | null;
  holderName: string;
  holderRole: string | null;
  organization: string | null;
  code: string;
  photoUrl: string | null;
  accessLevel: AccessLevel;
  validFrom: string;
  validUntil: string;
  status: CredentialStatus;
  notes: string | null;
  issuedById: string | null;
  holderUser?: { id: string; username: string } | null;
  holderPlayer?: {
    id: string;
    user: { username: string };
    team: { id: string; name: string };
  } | null;
  event?: { id: string; title: string } | null;
  accessGrants?: CredentialAccessGrant[];
  attendanceLogs?: AttendanceLog[];
  issuedBy?: { id: string; username: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceLog {
  id: string;
  workspaceId: string;
  credentialId: string | null;
  zoneId: string | null;
  scannedAt: string;
  scannedById: string | null;
  direction: 'in' | 'out';
  result: ScanResult;
  scannedCode: string | null;
  notes: string | null;
  credential?: Credential | null;
  zone?: AccessZone | null;
  scannedBy?: { id: string; username: string } | null;
  createdAt: string;
}

export interface ScanResponse {
  result: ScanResult;
  direction: 'in' | 'out';
  credential: Credential | null;
  zone: AccessZone | null;
  message: string;
  log: AttendanceLog;
}

export interface AccreditationSummary {
  totalCredentials: number;
  activeCredentials: number;
  revoked: number;
  expired: number;
  totalZones: number;
  totalScansToday: number;
  grantedToday: number;
  deniedToday: number;
  expiringSoon: number;
  byHolderType: Record<string, number>;
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AccreditationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getSummary(workspaceId: string): Observable<AccreditationSummary> {
    return this.http.get<AccreditationSummary>(
      `${this.apiUrl}/${workspaceId}/accreditation/summary`,
      { headers: this.headers },
    );
  }

  getCredentials(
    workspaceId: string,
    filter: { holderType?: HolderType; eventId?: string } = {},
  ): Observable<Credential[]> {
    let params = new HttpParams();
    if (filter.holderType) params = params.set('holderType', filter.holderType);
    if (filter.eventId) params = params.set('eventId', filter.eventId);
    return this.http.get<Credential[]>(`${this.apiUrl}/${workspaceId}/accreditation/credentials`, {
      headers: this.headers,
      params,
    });
  }

  getCredentialById(workspaceId: string, id: string): Observable<Credential> {
    return this.http.get<Credential>(
      `${this.apiUrl}/${workspaceId}/accreditation/credentials/${id}`,
      { headers: this.headers },
    );
  }

  verify(workspaceId: string, code: string): Observable<Credential> {
    return this.http.get<Credential>(
      `${this.apiUrl}/${workspaceId}/accreditation/verify/${encodeURIComponent(code)}`,
      { headers: this.headers },
    );
  }

  createCredential(
    workspaceId: string,
    payload: Partial<Credential> & {
      holderType: HolderType;
      holderName: string;
      validFrom: string;
      validUntil: string;
      zoneIds?: string[];
    },
  ): Observable<Credential> {
    return this.http.post<Credential>(
      `${this.apiUrl}/${workspaceId}/accreditation/credentials`,
      payload,
      { headers: this.headers },
    );
  }

  updateCredential(
    workspaceId: string,
    id: string,
    payload: Partial<Credential> & { zoneIds?: string[] },
  ): Observable<Credential> {
    return this.http.patch<Credential>(
      `${this.apiUrl}/${workspaceId}/accreditation/credentials/${id}`,
      payload,
      { headers: this.headers },
    );
  }

  revokeCredential(workspaceId: string, id: string): Observable<Credential> {
    return this.http.post<Credential>(
      `${this.apiUrl}/${workspaceId}/accreditation/credentials/${id}/revoke`,
      {},
      { headers: this.headers },
    );
  }

  deleteCredential(workspaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/accreditation/credentials/${id}`, {
      headers: this.headers,
    });
  }

  getZones(workspaceId: string): Observable<AccessZone[]> {
    return this.http.get<AccessZone[]>(`${this.apiUrl}/${workspaceId}/accreditation/zones`, {
      headers: this.headers,
    });
  }

  createZone(
    workspaceId: string,
    payload: Partial<AccessZone> & { name: string },
  ): Observable<AccessZone> {
    return this.http.post<AccessZone>(
      `${this.apiUrl}/${workspaceId}/accreditation/zones`,
      payload,
      { headers: this.headers },
    );
  }

  updateZone(
    workspaceId: string,
    zoneId: string,
    payload: Partial<AccessZone>,
  ): Observable<AccessZone> {
    return this.http.patch<AccessZone>(
      `${this.apiUrl}/${workspaceId}/accreditation/zones/${zoneId}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteZone(workspaceId: string, zoneId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/accreditation/zones/${zoneId}`, {
      headers: this.headers,
    });
  }

  scan(
    workspaceId: string,
    payload: { code: string; zoneId?: string; direction?: 'in' | 'out'; notes?: string },
  ): Observable<ScanResponse> {
    return this.http.post<ScanResponse>(
      `${this.apiUrl}/${workspaceId}/accreditation/scan`,
      payload,
      { headers: this.headers },
    );
  }

  getAttendance(
    workspaceId: string,
    filter: { credentialId?: string; zoneId?: string; limit?: number } = {},
  ): Observable<AttendanceLog[]> {
    let params = new HttpParams();
    if (filter.credentialId) params = params.set('credentialId', filter.credentialId);
    if (filter.zoneId) params = params.set('zoneId', filter.zoneId);
    if (filter.limit) params = params.set('limit', String(filter.limit));
    return this.http.get<AttendanceLog[]>(
      `${this.apiUrl}/${workspaceId}/accreditation/attendance`,
      { headers: this.headers, params },
    );
  }

  expireStale(workspaceId: string): Observable<{ expired: number }> {
    return this.http.post<{ expired: number }>(
      `${this.apiUrl}/${workspaceId}/accreditation/expire-stale`,
      {},
      { headers: this.headers },
    );
  }

  qrPayload(code: string): string {
    return `sem://credential/${encodeURIComponent(code)}`;
  }

  qrImageUrl(code: string): string {
    const payload = this.qrPayload(code);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
  }
}
