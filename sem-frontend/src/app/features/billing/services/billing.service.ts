import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export interface BillingProfile {
  id: string;
  workspaceId: string;
  companyName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  taxId: string | null;
  taxIdType: string | null;
  taxRatePercent: number;
  defaultCurrency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BillingContactRole = 'primary' | 'secondary' | 'finance' | 'legal';

export interface BillingContact {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  phone: string | null;
  role: BillingContactRole;
  receivesInvoices: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'void';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

export interface InvoicePaymentRecord {
  id: string;
  amountCents: number;
  currency: string;
  method: 'card' | 'bank_transfer' | 'manual' | 'other';
  reference?: string | null;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  occurredAt: string;
  notes?: string | null;
}

export interface InvoiceBillToSnapshot {
  companyName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  taxId: string | null;
  taxIdType: string | null;
  contacts: Array<{ name: string; email: string; role: string }>;
}

export interface Invoice {
  id: string;
  workspaceId: string;
  subscriptionId: string | null;
  planId: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  lineItems: InvoiceLineItem[];
  payments: InvoicePaymentRecord[];
  billTo: InvoiceBillToSnapshot | null;
  notes: string | null;
  plan?: { id: string; code: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private base(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/billing`;
  }

  getProfile(workspaceId: string): Observable<BillingProfile> {
    return this.http.get<BillingProfile>(`${this.base(workspaceId)}/profile`, {
      headers: this.authHeaders,
    });
  }

  updateProfile(workspaceId: string, payload: Partial<BillingProfile>): Observable<BillingProfile> {
    return this.http.patch<BillingProfile>(`${this.base(workspaceId)}/profile`, payload, {
      headers: this.authHeaders,
    });
  }

  listContacts(workspaceId: string): Observable<BillingContact[]> {
    return this.http.get<BillingContact[]>(`${this.base(workspaceId)}/contacts`, {
      headers: this.authHeaders,
    });
  }

  createContact(
    workspaceId: string,
    payload: Omit<BillingContact, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>,
  ): Observable<BillingContact> {
    return this.http.post<BillingContact>(`${this.base(workspaceId)}/contacts`, payload, {
      headers: this.authHeaders,
    });
  }

  updateContact(
    workspaceId: string,
    contactId: string,
    payload: Omit<BillingContact, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>,
  ): Observable<BillingContact> {
    return this.http.patch<BillingContact>(
      `${this.base(workspaceId)}/contacts/${contactId}`,
      payload,
      { headers: this.authHeaders },
    );
  }

  removeContact(workspaceId: string, contactId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(workspaceId)}/contacts/${contactId}`, {
      headers: this.authHeaders,
    });
  }

  listInvoices(workspaceId: string): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.base(workspaceId)}/invoices`, {
      headers: this.authHeaders,
    });
  }

  getInvoice(workspaceId: string, invoiceId: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.base(workspaceId)}/invoices/${invoiceId}`, {
      headers: this.authHeaders,
    });
  }

  recordPayment(
    workspaceId: string,
    invoiceId: string,
    payload: {
      amountCents: number;
      method?: 'card' | 'bank_transfer' | 'manual' | 'other';
      reference?: string | null;
      notes?: string | null;
    },
  ): Observable<Invoice> {
    return this.http.post<Invoice>(
      `${this.base(workspaceId)}/invoices/${invoiceId}/payments`,
      payload,
      { headers: this.authHeaders },
    );
  }

  voidInvoice(workspaceId: string, invoiceId: string): Observable<Invoice> {
    return this.http.post<Invoice>(
      `${this.base(workspaceId)}/invoices/${invoiceId}/void`,
      {},
      { headers: this.authHeaders },
    );
  }

  formatMoney(cents: number, currency: string): string {
    const symbol = currency === 'USD' ? '$' : `${currency} `;
    const amount = (cents / 100).toFixed(2);
    return `${symbol}${amount}`;
  }

  statusPillClass(status: InvoiceStatus): string {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
      case 'issued':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/25';
      case 'overdue':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/25';
      case 'void':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/25';
      case 'draft':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
    }
  }
}
