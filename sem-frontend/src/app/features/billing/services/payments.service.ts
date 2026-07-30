import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'processing'
  | 'requires_action'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface PaymentIntent {
  id: string;
  workspaceId: string;
  invoiceId: string | null;
  subscriptionId: string | null;
  providerCode: string;
  providerRef: string | null;
  amountCents: number;
  currency: string;
  status: PaymentIntentStatus;
  method: string | null;
  metadata: Record<string, unknown> | null;
  confirmedAt: string | null;
  refundedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderInfo {
  code: string;
  displayName: string;
  isLive: boolean;
}

export interface PaymentAuditEntry {
  id: string;
  workspaceId: string | null;
  paymentIntentId: string | null;
  providerCode: string | null;
  event: string;
  payload: Record<string, unknown> | null;
  sourceIp: string | null;
  userId: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private base(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}`;
  }

  getProvider(workspaceId: string): Observable<ProviderInfo> {
    return this.http.get<ProviderInfo>(`${this.base(workspaceId)}/payments/provider`, {
      headers: this.authHeaders,
    });
  }

  createIntentForInvoice(
    workspaceId: string,
    invoiceId: string,
    returnUrl?: string,
  ): Observable<PaymentIntent> {
    return this.http.post<PaymentIntent>(
      `${this.base(workspaceId)}/billing/invoices/${invoiceId}/pay`,
      { returnUrl },
      { headers: this.authHeaders },
    );
  }

  confirmMock(workspaceId: string, providerRef: string): Observable<PaymentIntent> {
    return this.http.post<PaymentIntent>(
      `${this.base(workspaceId)}/payments/confirm-mock`,
      { providerRef },
      { headers: this.authHeaders },
    );
  }

  refund(
    workspaceId: string,
    invoiceId: string,
    payload: { amountCents?: number; reason?: string } = {},
  ): Observable<PaymentIntent[]> {
    return this.http.post<PaymentIntent[]>(
      `${this.base(workspaceId)}/billing/invoices/${invoiceId}/refund`,
      payload,
      { headers: this.authHeaders },
    );
  }

  listIntents(workspaceId: string, invoiceId: string): Observable<PaymentIntent[]> {
    return this.http.get<PaymentIntent[]>(
      `${this.base(workspaceId)}/billing/invoices/${invoiceId}/payment-intents`,
      { headers: this.authHeaders },
    );
  }

  listAudit(workspaceId: string, limit = 100): Observable<PaymentAuditEntry[]> {
    return this.http.get<PaymentAuditEntry[]>(
      `${this.base(workspaceId)}/payments/audit?limit=${limit}`,
      { headers: this.authHeaders },
    );
  }
}
