import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export interface PlanLimits {
  workspaces: number;
  membersPerWorkspace: number;
  eventsPerWorkspace: number;
  storageMb: number;
  reportsLevel: 'basic' | 'standard' | 'advanced';
  publicPortal: boolean;
  liveScoring: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

export interface SubscriptionPlan {
  id: string;
  code: 'free' | 'standard' | 'professional' | 'enterprise';
  name: string;
  tier: 'free' | 'standard' | 'professional' | 'enterprise';
  description: string | null;
  limits: PlanLimits;
  priceCents: number;
  currency: string;
  billingInterval: 'month' | 'year';
  trialDays: number;
  sortOrder: number;
  isActive: boolean;
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';

export interface Subscription {
  id: string;
  workspaceId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  plan?: SubscriptionPlan;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceUsage {
  members: number;
  events: number;
  storageMb: number;
}

export interface SubscriptionSnapshot {
  subscription: Subscription;
  plan: SubscriptionPlan;
  usage: WorkspaceUsage;
  enforcementEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  listPublicPlans(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${environment.apiUrl}/public/plans`);
  }

  getWorkspaceSubscription(workspaceId: string): Observable<SubscriptionSnapshot> {
    return this.http.get<SubscriptionSnapshot>(
      `${environment.apiUrl}/workspaces/${workspaceId}/subscription`,
      { headers: this.authHeaders },
    );
  }

  changePlan(
    workspaceId: string,
    payload: { planCode: string; startTrial?: boolean },
  ): Observable<Subscription> {
    return this.http.post<Subscription>(
      `${environment.apiUrl}/workspaces/${workspaceId}/subscription/change`,
      payload,
      { headers: this.authHeaders },
    );
  }

  cancel(workspaceId: string): Observable<Subscription> {
    return this.http.post<Subscription>(
      `${environment.apiUrl}/workspaces/${workspaceId}/subscription/cancel`,
      {},
      { headers: this.authHeaders },
    );
  }

  resume(workspaceId: string): Observable<Subscription> {
    return this.http.post<Subscription>(
      `${environment.apiUrl}/workspaces/${workspaceId}/subscription/resume`,
      {},
      { headers: this.authHeaders },
    );
  }

  /**
   * Format a plan's headline price for the pricing page.
   */
  formatPrice(plan: SubscriptionPlan): { amount: string; period: string; free: boolean } {
    if (plan.priceCents === 0 && plan.code !== 'enterprise') {
      return { amount: 'Free', period: 'forever', free: true };
    }
    if (plan.code === 'enterprise') {
      return { amount: 'Custom', period: 'contact sales', free: false };
    }
    const symbol = plan.currency === 'USD' ? '$' : `${plan.currency} `;
    const amount = (plan.priceCents / 100).toFixed(0);
    return { amount: `${symbol}${amount}`, period: `/ ${plan.billingInterval}`, free: false };
  }

  formatLimit(value: number, unit = ''): string {
    if (value === -1) return 'Unlimited';
    if (value === 0) return '—';
    if (unit === 'MB' && value >= 1000) {
      return `${(value / 1000).toFixed(0)} GB`;
    }
    return unit ? `${value.toLocaleString()} ${unit}` : value.toLocaleString();
  }
}
