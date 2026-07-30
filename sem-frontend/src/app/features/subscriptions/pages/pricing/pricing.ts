import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SubscriptionPlan, SubscriptionService } from '../../services/subscription.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pricing.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);

  plans = signal<SubscriptionPlan[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  featureRows = computed(() => {
    const plans = this.plans();
    if (plans.length === 0) return [];
    return [
      {
        label: 'Workspaces',
        values: plans.map((p) => this.subscriptionService.formatLimit(p.limits.workspaces)),
      },
      {
        label: 'Members per workspace',
        values: plans.map((p) =>
          this.subscriptionService.formatLimit(p.limits.membersPerWorkspace),
        ),
      },
      {
        label: 'Events per workspace',
        values: plans.map((p) => this.subscriptionService.formatLimit(p.limits.eventsPerWorkspace)),
      },
      {
        label: 'Photo storage',
        values: plans.map((p) => this.subscriptionService.formatLimit(p.limits.storageMb, 'MB')),
      },
      {
        label: 'Reports',
        values: plans.map((p) => this.capitalize(p.limits.reportsLevel)),
      },
      {
        label: 'Public event portal',
        values: plans.map((p) => (p.limits.publicPortal ? 'Included' : '—')),
      },
      {
        label: 'Live scoring',
        values: plans.map((p) => (p.limits.liveScoring ? 'Included' : '—')),
      },
      {
        label: 'Custom branding',
        values: plans.map((p) => (p.limits.customBranding ? 'Included' : '—')),
      },
      {
        label: 'API access',
        values: plans.map((p) => (p.limits.apiAccess ? 'Included' : '—')),
      },
      {
        label: 'Priority support',
        values: plans.map((p) => (p.limits.prioritySupport ? 'Included' : '—')),
      },
    ];
  });

  ngOnInit() {
    this.subscriptionService.listPublicPlans().subscribe({
      next: (list) => {
        this.plans.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load plans');
        this.isLoading.set(false);
      },
    });
  }

  formatPrice(plan: SubscriptionPlan) {
    return this.subscriptionService.formatPrice(plan);
  }

  ctaLabel(plan: SubscriptionPlan): string {
    if (plan.code === 'free') return 'Start free';
    if (plan.code === 'enterprise') return 'Contact sales';
    return plan.trialDays > 0 ? `Start ${plan.trialDays}-day trial` : 'Get started';
  }

  tierAccent(plan: SubscriptionPlan): {
    border: string;
    ring: string;
    button: string;
    label: string;
  } {
    if (plan.code === 'professional') {
      return {
        border: 'border-violet-500/40',
        ring: 'ring-2 ring-violet-500/30',
        button: 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20',
        label: 'Most popular',
      };
    }
    if (plan.code === 'enterprise') {
      return {
        border: 'border-amber-500/30',
        ring: '',
        button: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30',
        label: 'Custom',
      };
    }
    return {
      border: 'border-white/10',
      ring: '',
      button: 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10',
      label: '',
    };
  }

  private capitalize(v: string): string {
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
  }
}
