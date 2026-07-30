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
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BillingContact,
  BillingContactRole,
  BillingProfile,
  BillingService,
  Invoice,
} from '../../services/billing.service';
import {
  SubscriptionService,
  SubscriptionSnapshot,
} from '../../../subscriptions/services/subscription.service';
import { UiService } from '../../../../core/services/ui.service';
import { PaymentsService, ProviderInfo } from '../../services/payments.service';

type Tab = 'overview' | 'invoices' | 'contacts' | 'tax';

@Component({
  selector: 'app-billing-centre',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  templateUrl: './billing-centre.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingCentreComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private billingService = inject(BillingService);
  private subscriptionService = inject(SubscriptionService);
  private paymentsService = inject(PaymentsService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  activeTab = signal<Tab>('overview');

  isLoading = signal<boolean>(true);
  isMutating = signal<boolean>(false);
  error = signal<string | null>(null);

  profile = signal<BillingProfile | null>(null);
  contacts = signal<BillingContact[]>([]);
  invoices = signal<Invoice[]>([]);
  subscription = signal<SubscriptionSnapshot | null>(null);

  // Detail modal
  selectedInvoice = signal<Invoice | null>(null);
  paymentAmount = signal<string>('');
  paymentMethod = signal<'card' | 'bank_transfer' | 'manual' | 'other'>('manual');
  paymentReference = signal<string>('');

  // Contact editor
  editingContact = signal<BillingContact | null>(null);
  contactName = signal('');
  contactEmail = signal('');
  contactPhone = signal('');
  contactRole = signal<BillingContactRole>('primary');
  contactReceivesInvoices = signal<boolean>(true);
  isContactModalOpen = signal<boolean>(false);

  // Tax form draft (mirrors profile signals)
  taxDraft = signal<Partial<BillingProfile>>({});

  // Payment gateway
  provider = signal<ProviderInfo | null>(null);
  isPayModalOpen = signal<boolean>(false);
  isPaying = signal<boolean>(false);
  payProgress = signal<'idle' | 'creating' | 'confirming' | 'success' | 'failed'>('idle');
  payErrorMessage = signal<string | null>(null);
  activeIntentRef = signal<string | null>(null);

  tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'fi-rr-apps' },
    { key: 'invoices', label: 'Invoices', icon: 'fi-rr-receipt' },
    { key: 'contacts', label: 'Contacts', icon: 'fi-rr-users' },
    { key: 'tax', label: 'Tax profile', icon: 'fi-rr-briefcase' },
  ];

  unpaidBalanceCents = computed(() =>
    this.invoices()
      .filter((inv) => inv.status === 'issued' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.totalCents - this.paidTotal(inv), 0),
  );

  lifetimeSpendCents = computed(() =>
    this.invoices()
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.totalCents, 0),
  );

  invoiceCurrency = computed(() => {
    return this.invoices()[0]?.currency ?? this.profile()?.defaultCurrency ?? 'USD';
  });

  paidTotal(inv: Invoice): number {
    return (inv.payments ?? [])
      .filter((p) => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amountCents, 0);
  }

  outstanding(inv: Invoice): number {
    return Math.max(0, inv.totalCents - this.paidTotal(inv));
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.workspaceId.set(id);
      if (id) this.loadAll();
    });
    const qp = this.route.snapshot.queryParamMap.get('tab');
    if (qp && ['overview', 'invoices', 'contacts', 'tax'].includes(qp)) {
      this.activeTab.set(qp as Tab);
    }
  }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  private loadAll() {
    this.isLoading.set(true);
    this.error.set(null);
    Promise.all([
      new Promise<BillingProfile>((resolve, reject) =>
        this.billingService.getProfile(this.workspaceId()).subscribe({
          next: resolve,
          error: reject,
        }),
      ),
      new Promise<BillingContact[]>((resolve, reject) =>
        this.billingService.listContacts(this.workspaceId()).subscribe({
          next: resolve,
          error: reject,
        }),
      ),
      new Promise<Invoice[]>((resolve, reject) =>
        this.billingService.listInvoices(this.workspaceId()).subscribe({
          next: resolve,
          error: reject,
        }),
      ),
      new Promise<SubscriptionSnapshot>((resolve, reject) =>
        this.subscriptionService
          .getWorkspaceSubscription(this.workspaceId())
          .subscribe({ next: resolve, error: reject }),
      ),
      new Promise<ProviderInfo | null>((resolve) =>
        this.paymentsService.getProvider(this.workspaceId()).subscribe({
          next: (p) => resolve(p),
          error: () => resolve(null), // provider info is nice-to-have
        }),
      ),
    ])
      .then(([profile, contacts, invoices, subscription, provider]) => {
        this.profile.set(profile);
        this.taxDraft.set({ ...profile });
        this.contacts.set(contacts);
        this.invoices.set(invoices);
        this.subscription.set(subscription);
        this.provider.set(provider);
        this.isLoading.set(false);
      })
      .catch((err) => {
        this.error.set(err?.error?.message ?? 'Failed to load billing data');
        this.isLoading.set(false);
      });
  }

  // ─── Payment gateway ───────────────────────────────────────────────

  openPayModal() {
    if (!this.selectedInvoice()) return;
    this.payProgress.set('idle');
    this.payErrorMessage.set(null);
    this.activeIntentRef.set(null);
    this.isPayModalOpen.set(true);
  }

  closePayModal() {
    this.isPayModalOpen.set(false);
  }

  startPayment() {
    const inv = this.selectedInvoice();
    if (!inv || this.isPaying()) return;
    this.isPaying.set(true);
    this.payProgress.set('creating');
    this.payErrorMessage.set(null);

    this.paymentsService.createIntentForInvoice(this.workspaceId(), inv.id).subscribe({
      next: (intent) => {
        this.activeIntentRef.set(intent.providerRef);
        // Mock provider: metadata.mockMode === true, we confirm directly here.
        // Real providers: metadata contains clientSecret / checkoutUrl; the
        // frontend would hand off to the SDK/redirect. For real providers
        // we leave the modal open and rely on a subsequent webhook +
        // manual refresh to update the invoice.
        const mockMode = (intent.metadata as any)?.mockMode === true;
        if (mockMode && intent.providerRef) {
          this.payProgress.set('confirming');
          this.paymentsService.confirmMock(this.workspaceId(), intent.providerRef).subscribe({
            next: () => this.finalizePayment(true),
            error: (err) =>
              this.finalizePayment(false, err?.error?.message ?? 'Confirmation failed'),
          });
        } else {
          // Real provider — hand off. In a full Stripe integration you'd
          // Stripe.confirmCardPayment(clientSecret) here. For now we tell
          // the user to complete the checkout in the provider's UI.
          this.isPaying.set(false);
          this.payProgress.set('idle');
          const url = (intent.metadata as any)?.checkoutUrl;
          if (typeof url === 'string' && url.startsWith('http')) {
            window.location.href = url;
          } else {
            this.ui.success('Payment intent created. Complete checkout in the provider portal.');
          }
        }
      },
      error: (err) =>
        this.finalizePayment(false, err?.error?.message ?? 'Failed to create payment intent'),
    });
  }

  private finalizePayment(success: boolean, errorMessage?: string) {
    this.isPaying.set(false);
    if (success) {
      this.payProgress.set('success');
      this.ui.success('Payment succeeded.');
      // Re-fetch the invoice + list so paid status updates in the UI.
      const inv = this.selectedInvoice();
      if (inv) {
        this.billingService.getInvoice(this.workspaceId(), inv.id).subscribe((fresh) => {
          this.selectedInvoice.set(fresh);
          this.invoices.update((list) => list.map((i) => (i.id === fresh.id ? fresh : i)));
        });
      }
      setTimeout(() => this.closePayModal(), 1500);
    } else {
      this.payProgress.set('failed');
      this.payErrorMessage.set(errorMessage ?? 'Payment failed');
    }
  }

  refundInvoice() {
    const inv = this.selectedInvoice();
    if (!inv || this.isMutating()) return;
    if (
      !confirm(
        `Refund ${this.formatMoney(inv.totalCents, inv.currency)} from ${inv.invoiceNumber}?`,
      )
    )
      return;
    this.isMutating.set(true);
    this.paymentsService.refund(this.workspaceId(), inv.id).subscribe({
      next: () => {
        this.isMutating.set(false);
        this.ui.success('Refund processed.');
        // Re-fetch to reflect the void status.
        this.billingService.getInvoice(this.workspaceId(), inv.id).subscribe((fresh) => {
          this.selectedInvoice.set(fresh);
          this.invoices.update((list) => list.map((i) => (i.id === fresh.id ? fresh : i)));
        });
      },
      error: (err) => {
        this.isMutating.set(false);
        this.ui.error(err?.error?.message ?? 'Refund failed.');
      },
    });
  }

  formatMoney(cents: number, currency?: string): string {
    return this.billingService.formatMoney(cents, currency ?? this.invoiceCurrency());
  }

  statusPill(status: any): string {
    return this.billingService.statusPillClass(status);
  }

  // ─── Invoice modal ─────────────────────────────────────────────────

  openInvoice(inv: Invoice) {
    this.selectedInvoice.set(inv);
    this.paymentAmount.set(((this.outstanding(inv) || inv.totalCents) / 100).toFixed(2));
    this.paymentMethod.set('manual');
    this.paymentReference.set('');
  }

  closeInvoice() {
    this.selectedInvoice.set(null);
  }

  recordPayment() {
    const inv = this.selectedInvoice();
    if (!inv || this.isMutating()) return;
    const cents = Math.round(Number(this.paymentAmount()) * 100);
    if (!cents || cents <= 0) {
      this.ui.error('Enter a positive payment amount.');
      return;
    }
    this.isMutating.set(true);
    this.billingService
      .recordPayment(this.workspaceId(), inv.id, {
        amountCents: cents,
        method: this.paymentMethod(),
        reference: this.paymentReference().trim() || null,
      })
      .subscribe({
        next: (updated) => {
          this.isMutating.set(false);
          this.invoices.update((list) => list.map((i) => (i.id === updated.id ? updated : i)));
          this.selectedInvoice.set(updated);
          this.ui.success('Payment recorded.');
        },
        error: (err) => {
          this.isMutating.set(false);
          this.ui.error(err?.error?.message ?? 'Failed to record payment.');
        },
      });
  }

  voidInvoice() {
    const inv = this.selectedInvoice();
    if (!inv || this.isMutating()) return;
    if (!confirm("Void this invoice? This can't be undone.")) return;
    this.isMutating.set(true);
    this.billingService.voidInvoice(this.workspaceId(), inv.id).subscribe({
      next: (updated) => {
        this.isMutating.set(false);
        this.invoices.update((list) => list.map((i) => (i.id === updated.id ? updated : i)));
        this.selectedInvoice.set(updated);
        this.ui.success('Invoice voided.');
      },
      error: (err) => {
        this.isMutating.set(false);
        this.ui.error(err?.error?.message ?? 'Failed to void invoice.');
      },
    });
  }

  // ─── Contact editor ────────────────────────────────────────────────

  openNewContact() {
    this.editingContact.set(null);
    this.contactName.set('');
    this.contactEmail.set('');
    this.contactPhone.set('');
    this.contactRole.set('primary');
    this.contactReceivesInvoices.set(true);
    this.isContactModalOpen.set(true);
  }

  openEditContact(c: BillingContact) {
    this.editingContact.set(c);
    this.contactName.set(c.name);
    this.contactEmail.set(c.email);
    this.contactPhone.set(c.phone ?? '');
    this.contactRole.set(c.role);
    this.contactReceivesInvoices.set(c.receivesInvoices);
    this.isContactModalOpen.set(true);
  }

  closeContactModal() {
    this.isContactModalOpen.set(false);
  }

  saveContact() {
    const name = this.contactName().trim();
    const email = this.contactEmail().trim();
    if (!name || !email) {
      this.ui.error('Name and email are required.');
      return;
    }
    this.isMutating.set(true);
    const payload = {
      name,
      email,
      phone: this.contactPhone().trim() || null,
      role: this.contactRole(),
      receivesInvoices: this.contactReceivesInvoices(),
    };
    const editing = this.editingContact();
    const req = editing
      ? this.billingService.updateContact(this.workspaceId(), editing.id, payload)
      : this.billingService.createContact(this.workspaceId(), payload);
    req.subscribe({
      next: (saved) => {
        this.isMutating.set(false);
        if (editing) {
          this.contacts.update((list) => list.map((c) => (c.id === saved.id ? saved : c)));
        } else {
          this.contacts.update((list) => [...list, saved]);
        }
        this.ui.success(editing ? 'Contact updated.' : 'Contact added.');
        this.closeContactModal();
      },
      error: (err) => {
        this.isMutating.set(false);
        this.ui.error(err?.error?.message ?? 'Failed to save contact.');
      },
    });
  }

  removeContact(c: BillingContact) {
    if (!confirm(`Remove ${c.name} from billing contacts?`)) return;
    this.billingService.removeContact(this.workspaceId(), c.id).subscribe({
      next: () => {
        this.contacts.update((list) => list.filter((x) => x.id !== c.id));
        this.ui.success('Contact removed.');
      },
      error: (err) => this.ui.error(err?.error?.message ?? 'Failed to remove.'),
    });
  }

  // ─── Tax profile ───────────────────────────────────────────────────

  saveTaxProfile() {
    if (this.isMutating()) return;
    this.isMutating.set(true);
    this.billingService.updateProfile(this.workspaceId(), this.taxDraft()).subscribe({
      next: (saved) => {
        this.isMutating.set(false);
        this.profile.set(saved);
        this.taxDraft.set({ ...saved });
        this.ui.success('Billing profile saved.');
      },
      error: (err) => {
        this.isMutating.set(false);
        this.ui.error(err?.error?.message ?? 'Failed to save profile.');
      },
    });
  }

  updateTaxDraft<K extends keyof BillingProfile>(key: K, value: BillingProfile[K]) {
    this.taxDraft.update((prev) => ({ ...prev, [key]: value }));
  }

  taxDraftValue<K extends keyof BillingProfile>(key: K): BillingProfile[K] | '' {
    return (this.taxDraft()?.[key] ?? '') as BillingProfile[K];
  }
}
