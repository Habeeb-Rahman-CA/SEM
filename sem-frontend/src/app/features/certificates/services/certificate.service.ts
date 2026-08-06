import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type CertificateType = 'participation' | 'winners' | 'referee' | 'volunteer' | 'organizer';

export interface DigitalCertificate {
  id: string;
  code: string;
  workspaceId: string;
  eventId?: string;
  recipientName: string;
  recipientEmail?: string;
  certificateType: CertificateType;
  certificateTitle: string;
  eventName: string;
  position?: string;
  issueDate: string;
  qrVerificationUrl: string;
  isVerified: boolean;
  metadata: {
    signatoryName: string;
    signatoryTitle: string;
    workspaceName: string;
    achievementSummary?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class CertificateService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private wsBase(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/certificates`;
  }

  list(workspaceId: string, eventId?: string): Observable<DigitalCertificate[]> {
    const params: Record<string, string> = {};
    if (eventId) params['eventId'] = eventId;
    return this.http.get<DigitalCertificate[]>(this.wsBase(workspaceId), {
      headers: this.authHeaders,
      params,
    });
  }

  generate(
    workspaceId: string,
    payload: {
      recipientName: string;
      recipientEmail?: string;
      certificateType: CertificateType;
      eventName: string;
      eventId?: string;
      position?: string;
      issueDate?: string;
    },
  ): Observable<DigitalCertificate> {
    return this.http.post<DigitalCertificate>(`${this.wsBase(workspaceId)}/generate`, payload, {
      headers: this.authHeaders,
    });
  }

  bulkGenerate(
    workspaceId: string,
    payload: {
      eventName: string;
      eventId?: string;
      types?: CertificateType[];
      recipients?: Array<{
        name: string;
        email?: string;
        type: CertificateType;
        position?: string;
      }>;
    },
  ): Observable<{ generatedCount: number; certificates: DigitalCertificate[] }> {
    return this.http.post<{ generatedCount: number; certificates: DigitalCertificate[] }>(
      `${this.wsBase(workspaceId)}/bulk-generate`,
      payload,
      { headers: this.authHeaders },
    );
  }

  verifyPublic(code: string): Observable<DigitalCertificate> {
    return this.http.get<DigitalCertificate>(
      `${environment.apiUrl}/public/certificates/verify/${code}`,
    );
  }

  getTypeBadgeClass(type: CertificateType): string {
    switch (type) {
      case 'winners':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'participation':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      case 'referee':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'volunteer':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'organizer':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  }

  getTypeIcon(type: CertificateType): string {
    switch (type) {
      case 'winners':
        return 'fi fi-sr-trophy';
      case 'participation':
        return 'fi fi-rr-medal';
      case 'referee':
        return 'fi fi-rr-whistle';
      case 'volunteer':
        return 'fi fi-rr-hand-holding-heart';
      case 'organizer':
        return 'fi fi-rr-user-tie';
      default:
        return 'fi fi-rr-document';
    }
  }
}
