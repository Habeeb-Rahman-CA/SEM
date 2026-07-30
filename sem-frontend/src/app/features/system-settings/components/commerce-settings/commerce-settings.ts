import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CommerceConfigView,
  UpdateCommerceConfigPayload,
  WorkspaceService,
} from '../../../workspaces/services/workspace.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-commerce-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './commerce-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommerceSettingsComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  private ui = inject(UiService);

  config = signal<CommerceConfigView | null>(null);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  error = signal<string | null>(null);

  // Editable state — mirrors the config, edits are staged locally until Save.
  subscriptionsEnabled = signal<boolean>(false);
  /** yyyy-MM-dd for the date input (converted to ISO on save). */
  freeUntilDateInput = signal<string>('');
  paymentProvider = signal<'mock' | 'stripe'>('mock');
  stripePublishableKey = signal<string>('');
  /** Empty string means "leave the stored value alone" per the API contract. */
  stripeSecretKeyDraft = signal<string>('');
  stripeWebhookSecretDraft = signal<string>('');
  clearStripeSecretKey = signal<boolean>(false);
  clearStripeWebhookSecret = signal<boolean>(false);
  defaultCurrency = signal<string>('USD');

  hasChanges = computed(() => {
    const cfg = this.config();
    if (!cfg) return false;
    if (this.subscriptionsEnabled() !== cfg.subscriptionsEnabled) return true;
    const currentDate = cfg.freeUntilDate ? this.toDateInput(cfg.freeUntilDate) : '';
    if (this.freeUntilDateInput() !== currentDate) return true;
    if (this.paymentProvider() !== cfg.paymentProvider) return true;
    if ((this.stripePublishableKey() || '') !== (cfg.stripePublishableKey ?? '')) return true;
    if (this.stripeSecretKeyDraft().length > 0) return true;
    if (this.stripeWebhookSecretDraft().length > 0) return true;
    if (this.clearStripeSecretKey()) return true;
    if (this.clearStripeWebhookSecret()) return true;
    if (this.defaultCurrency() !== cfg.defaultCurrency) return true;
    return false;
  });

  ngOnInit() {
    this.load();
  }

  private load() {
    this.isLoading.set(true);
    this.error.set(null);
    this.workspaceService.getCommerceConfig().subscribe({
      next: (cfg) => {
        this.config.set(cfg);
        this.hydrate(cfg);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load commerce config');
        this.isLoading.set(false);
      },
    });
  }

  private hydrate(cfg: CommerceConfigView) {
    this.subscriptionsEnabled.set(cfg.subscriptionsEnabled);
    this.freeUntilDateInput.set(cfg.freeUntilDate ? this.toDateInput(cfg.freeUntilDate) : '');
    this.paymentProvider.set(cfg.paymentProvider);
    this.stripePublishableKey.set(cfg.stripePublishableKey ?? '');
    this.stripeSecretKeyDraft.set('');
    this.stripeWebhookSecretDraft.set('');
    this.clearStripeSecretKey.set(false);
    this.clearStripeWebhookSecret.set(false);
    this.defaultCurrency.set(cfg.defaultCurrency);
  }

  save() {
    if (!this.hasChanges() || this.isSaving()) return;
    this.isSaving.set(true);

    const payload: UpdateCommerceConfigPayload = {
      subscriptionsEnabled: this.subscriptionsEnabled(),
      freeUntilDate: this.freeUntilDateInput()
        ? new Date(this.freeUntilDateInput()).toISOString()
        : null,
      paymentProvider: this.paymentProvider(),
      stripePublishableKey: this.stripePublishableKey().trim() || null,
      defaultCurrency: (this.defaultCurrency() || 'USD').toUpperCase(),
    };

    // Only include secret fields when the user typed something OR ticked
    // the "clear" checkbox. Omitting a field on the API keeps the stored
    // value untouched, which is what we want for rotation UX.
    if (this.clearStripeSecretKey()) {
      payload.stripeSecretKey = '';
    } else if (this.stripeSecretKeyDraft().length > 0) {
      payload.stripeSecretKey = this.stripeSecretKeyDraft().trim();
    }
    if (this.clearStripeWebhookSecret()) {
      payload.stripeWebhookSecret = '';
    } else if (this.stripeWebhookSecretDraft().length > 0) {
      payload.stripeWebhookSecret = this.stripeWebhookSecretDraft().trim();
    }

    this.workspaceService.updateCommerceConfig(payload).subscribe({
      next: (cfg) => {
        this.config.set(cfg);
        this.hydrate(cfg);
        this.isSaving.set(false);
        this.ui.success('Commerce settings saved.');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.ui.error(err?.error?.message ?? 'Failed to save commerce config.');
      },
    });
  }

  discard() {
    const cfg = this.config();
    if (cfg) this.hydrate(cfg);
  }

  isFreeUntilInFuture(): boolean {
    const s = this.freeUntilDateInput();
    if (!s) return false;
    return new Date(s).getTime() > Date.now();
  }

  private toDateInput(iso: string): string {
    // yyyy-MM-dd for the <input type="date">
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
