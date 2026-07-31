import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BrandingService,
  UpdateBrandingPayload,
  WorkspaceBranding,
} from '../../services/branding.service';
import {
  SubscriptionService,
  SubscriptionSnapshot,
} from '../../../subscriptions/services/subscription.service';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture';
import { UiService } from '../../../../core/services/ui.service';

type Tab = 'identity' | 'colors' | 'domain' | 'login' | 'email' | 'pdf' | 'social';

@Component({
  selector: 'app-branding-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PhotoCaptureComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branding-settings.html',
})
export class BrandingSettingsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private brandingService = inject(BrandingService);
  private subscriptionService = inject(SubscriptionService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  activeTab = signal<Tab>('identity');

  branding = signal<WorkspaceBranding | null>(null);
  subscription = signal<SubscriptionSnapshot | null>(null);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  isVerifying = signal<boolean>(false);
  error = signal<string | null>(null);

  // Draft — mirrors the branding fields; edits are staged until Save.
  draft = signal<UpdateBrandingPayload>({});

  tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'identity', label: 'Identity', icon: 'fi-rr-badge' },
    { key: 'colors', label: 'Colours', icon: 'fi-rr-palette' },
    { key: 'domain', label: 'Custom domain', icon: 'fi-rr-globe' },
    { key: 'login', label: 'Login page', icon: 'fi-rr-sign-in-alt' },
    { key: 'email', label: 'Email', icon: 'fi-rr-envelope' },
    { key: 'pdf', label: 'PDF reports', icon: 'fi-rr-file-pdf' },
    { key: 'social', label: 'Social', icon: 'fi-rr-share' },
  ];

  planAllowsBranding = computed(() => {
    const snap = this.subscription();
    // Not-yet-loaded → assume allowed (avoids UI flicker); server enforces.
    if (!snap) return true;
    // If enforcement is off, features are effectively unlimited.
    if (!snap.enforcementEnabled) return true;
    return !!snap.plan.limits.customBranding;
  });

  hasChanges = computed(() => {
    const draft = this.draft();
    const cfg = this.branding();
    if (!cfg) return false;
    return Object.keys(draft).some((k) => {
      const key = k as keyof UpdateBrandingPayload;
      const a = (draft as any)[key];
      const b = (cfg as any)[key];
      // Normalise null vs empty for text fields
      if (a === '' && b == null) return false;
      if (a == null && b === '') return false;
      return JSON.stringify(a) !== JSON.stringify(b);
    });
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.workspaceId.set(id);
      if (id) this.loadAll();
    });
  }

  private loadAll() {
    this.isLoading.set(true);
    this.error.set(null);
    Promise.all([
      new Promise<WorkspaceBranding>((resolve, reject) =>
        this.brandingService.get(this.workspaceId()).subscribe({
          next: resolve,
          error: reject,
        }),
      ),
      new Promise<SubscriptionSnapshot | null>((resolve) =>
        this.subscriptionService.getWorkspaceSubscription(this.workspaceId()).subscribe({
          next: resolve,
          error: () => resolve(null),
        }),
      ),
    ])
      .then(([branding, subscription]) => {
        this.branding.set(branding);
        this.subscription.set(subscription);
        this.draft.set({});
        this.isLoading.set(false);
      })
      .catch((err) => {
        this.error.set(err?.error?.message ?? 'Failed to load branding');
        this.isLoading.set(false);
      });
  }

  setTab(t: Tab) {
    this.activeTab.set(t);
  }

  /** Return draft value if the field has been edited, otherwise the server value. */
  fieldValue(key: string): any {
    const draft = this.draft() as Record<string, unknown>;
    if (key in draft) return draft[key];
    const b = this.branding() as unknown as Record<string, unknown> | null;
    return b ? b[key] : '';
  }

  setField(key: string, value: unknown) {
    this.draft.update((prev) => ({ ...(prev as any), [key]: value }));
  }

  setSocial(platform: string, value: string) {
    const existing =
      (this.draft().socialLinks as Record<string, unknown> | undefined) ??
      (this.branding()?.socialLinks as Record<string, unknown> | undefined) ??
      {};
    this.draft.update((prev) => ({
      ...prev,
      socialLinks: { ...existing, [platform]: value || null } as any,
    }));
  }

  socialValue(platform: string): string {
    const draft = this.draft().socialLinks as Record<string, unknown> | undefined;
    if (draft && platform in draft) return (draft[platform] as string) ?? '';
    const b = this.branding()?.socialLinks as Record<string, unknown> | undefined;
    return (b?.[platform] as string) ?? '';
  }

  save() {
    if (!this.hasChanges() || this.isSaving()) return;
    this.isSaving.set(true);
    this.brandingService.update(this.workspaceId(), this.draft()).subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        this.branding.set(saved);
        this.draft.set({});
        this.ui.success('Branding saved.');
      },
      error: (err) => {
        this.isSaving.set(false);
        const violations = err?.error?.feature;
        if (violations === 'customBranding') {
          this.ui.error(
            "Your plan doesn't include custom branding. Upgrade to Professional or Enterprise.",
          );
        } else {
          this.ui.error(err?.error?.message ?? 'Failed to save branding.');
        }
      },
    });
  }

  discard() {
    this.draft.set({});
  }

  verifyDomain() {
    if (this.isVerifying()) return;
    // If there are unsaved domain edits, save first so the token is current.
    if (this.draft().customDomain !== undefined) {
      this.ui.error('Save the domain change first, then verify.');
      return;
    }
    this.isVerifying.set(true);
    this.brandingService.verifyDomain(this.workspaceId()).subscribe({
      next: (saved) => {
        this.isVerifying.set(false);
        this.branding.set(saved);
        this.ui.success(
          saved.customDomainVerified
            ? 'Domain verified.'
            : 'Verification pending — DNS may take a few minutes to propagate.',
        );
      },
      error: (err) => {
        this.isVerifying.set(false);
        this.ui.error(err?.error?.message ?? 'Domain verification failed.');
      },
    });
  }
}
