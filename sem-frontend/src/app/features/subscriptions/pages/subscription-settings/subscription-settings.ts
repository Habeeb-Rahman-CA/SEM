import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  SubscriptionPlan,
  SubscriptionService,
  SubscriptionSnapshot,
} from '../../services/subscription.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-subscription-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './subscription-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionSettingsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private subscriptionService = inject(SubscriptionService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  snapshot = signal<SubscriptionSnapshot | null>(null);
  plans = signal<SubscriptionPlan[]>([]);
  isLoading = signal<boolean>(true);
  isMutating = signal<boolean>(false);
  error = signal<string | null>(null);

  usageBars = computed(() => {
    const snap = this.snapshot();
    if (!snap) return [];
    const limits = snap.plan.limits;
    const usage = snap.usage;
    return [
      this.buildBar('Members', usage.members, limits.membersPerWorkspace),
      this.buildBar('Events', usage.events, limits.eventsPerWorkspace),
      this.buildBar('Storage', usage.storageMb, limits.storageMb, 'MB'),
    ];
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.workspaceId.set(id);
      if (id) this.load();
    });
  }

  private load() {
    this.isLoading.set(true);
    this.error.set(null);

    Promise.all([
      new Promise<SubscriptionSnapshot>((resolve, reject) =>
        this.subscriptionService.getWorkspaceSubscription(this.workspaceId()).subscribe({
          next: resolve,
          error: reject,
        }),
      ),
      new Promise<SubscriptionPlan[]>((resolve, reject) =>
        this.subscriptionService.listPublicPlans().subscribe({
          next: resolve,
          error: reject,
        }),
      ),
    ])
      .then(([snap, plans]) => {
        this.snapshot.set(snap);
        this.plans.set(plans);
        this.isLoading.set(false);
      })
      .catch((err) => {
        this.error.set(err?.error?.message ?? 'Failed to load subscription');
        this.isLoading.set(false);
      });
  }

  isCurrentPlan(plan: SubscriptionPlan): boolean {
    return this.snapshot()?.plan.id === plan.id;
  }

  planTier(code: string): number {
    return ['free', 'standard', 'professional', 'enterprise'].indexOf(code);
  }

  actionLabel(plan: SubscriptionPlan): string {
    const current = this.snapshot()?.plan;
    if (!current) return 'Switch';
    if (current.id === plan.id) return 'Current plan';
    const currentIdx = this.planTier(current.code);
    const targetIdx = this.planTier(plan.code);
    if (targetIdx > currentIdx) {
      return plan.trialDays > 0 && plan.priceCents > 0
        ? `Start ${plan.trialDays}-day trial`
        : 'Upgrade';
    }
    return 'Downgrade';
  }

  changePlan(plan: SubscriptionPlan) {
    if (this.isCurrentPlan(plan) || this.isMutating()) return;
    this.isMutating.set(true);
    const startTrial = plan.trialDays > 0 && plan.priceCents > 0;
    this.subscriptionService
      .changePlan(this.workspaceId(), { planCode: plan.code, startTrial })
      .subscribe({
        next: () => {
          this.ui.success(`Plan changed to ${plan.name}.`);
          this.isMutating.set(false);
          this.load();
        },
        error: (err) => {
          this.isMutating.set(false);
          const message = err?.error?.message ?? 'Failed to change plan.';
          const violations = err?.error?.violations;
          if (Array.isArray(violations) && violations.length > 0) {
            const detail = violations
              .map((v: any) => `${v.limit}: ${v.current} > ${v.max}`)
              .join(', ');
            this.ui.error(`${message} (${detail})`);
          } else {
            this.ui.error(message);
          }
        },
      });
  }

  cancel() {
    if (this.isMutating()) return;
    this.isMutating.set(true);
    this.subscriptionService.cancel(this.workspaceId()).subscribe({
      next: () => {
        this.ui.success('Subscription will end at the current period end.');
        this.isMutating.set(false);
        this.load();
      },
      error: (err) => {
        this.isMutating.set(false);
        this.ui.error(err?.error?.message ?? 'Failed to cancel.');
      },
    });
  }

  resume() {
    if (this.isMutating()) return;
    this.isMutating.set(true);
    this.subscriptionService.resume(this.workspaceId()).subscribe({
      next: () => {
        this.ui.success('Subscription resumed.');
        this.isMutating.set(false);
        this.load();
      },
      error: (err) => {
        this.isMutating.set(false);
        this.ui.error(err?.error?.message ?? 'Failed to resume.');
      },
    });
  }

  formatPrice(plan: SubscriptionPlan) {
    return this.subscriptionService.formatPrice(plan);
  }

  private buildBar(label: string, value: number, limit: number, unit = '') {
    const unlimited = limit === -1;
    const pct = unlimited ? 0 : Math.min(100, Math.round((value / Math.max(1, limit)) * 100));
    const colour = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
    return {
      label,
      value,
      limit,
      unlimited,
      pct,
      colour,
      display: unlimited
        ? `${value.toLocaleString()} ${unit || ''} · Unlimited`.trim()
        : unit === 'MB' && limit >= 1000
          ? `${(value / 1000).toFixed(2)} / ${(limit / 1000).toFixed(0)} GB`
          : `${value.toLocaleString()} / ${limit.toLocaleString()} ${unit || ''}`.trim(),
    };
  }
}
