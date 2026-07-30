import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sponsor, SponsorInput, SponsorTier, SponsorService } from '../../services/sponsor.service';
import { UiService } from '../../../../core/services/ui.service';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture';

@Component({
  selector: 'app-sponsor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, PhotoCaptureComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sponsor-modal.html',
})
export class SponsorModalComponent {
  private sponsorService = inject(SponsorService);
  private ui = inject(UiService);

  workspaceId = input.required<string>();
  editingSponsor = input<Sponsor | null>(null);

  isOpen = model<boolean>(false);
  saved = output<Sponsor>();

  name = signal('');
  description = signal('');
  logoUrl = signal('');
  websiteUrl = signal('');
  category = signal('');
  tier = signal<SponsorTier | ''>('');
  contactName = signal('');
  contactEmail = signal('');
  isActive = signal<boolean>(true);
  startDate = signal('');
  endDate = signal('');
  notes = signal('');

  isSaving = signal(false);
  error = signal('');

  readonly tierOptions: Array<{ value: SponsorTier; label: string }> = [
    { value: 'title', label: 'Title Sponsor' },
    { value: 'platinum', label: 'Platinum' },
    { value: 'gold', label: 'Gold' },
    { value: 'silver', label: 'Silver' },
    { value: 'bronze', label: 'Bronze' },
    { value: 'partner', label: 'Partner' },
  ];

  constructor() {
    effect(
      () => {
        const open = this.isOpen();
        const sponsor = this.editingSponsor();
        if (!open) return;
        if (sponsor) {
          this.name.set(sponsor.name);
          this.description.set(sponsor.description ?? '');
          this.logoUrl.set(sponsor.logoUrl ?? '');
          this.websiteUrl.set(sponsor.websiteUrl ?? '');
          this.category.set(sponsor.category ?? '');
          this.tier.set(sponsor.tier ?? '');
          this.contactName.set(sponsor.contactName ?? '');
          this.contactEmail.set(sponsor.contactEmail ?? '');
          this.isActive.set(sponsor.isActive);
          this.startDate.set(sponsor.startDate ? this.toDateInput(sponsor.startDate) : '');
          this.endDate.set(sponsor.endDate ? this.toDateInput(sponsor.endDate) : '');
          this.notes.set(sponsor.notes ?? '');
        } else {
          this.name.set('');
          this.description.set('');
          this.logoUrl.set('');
          this.websiteUrl.set('');
          this.category.set('');
          this.tier.set('');
          this.contactName.set('');
          this.contactEmail.set('');
          this.isActive.set(true);
          this.startDate.set('');
          this.endDate.set('');
          this.notes.set('');
        }
        this.error.set('');
      },
      { allowSignalWrites: true },
    );
  }

  onLogoUploaded(url: string) {
    this.logoUrl.set(url);
    this.ui.success('Logo uploaded.');
  }

  save() {
    const name = this.name().trim();
    if (!name) {
      this.error.set('Sponsor name is required.');
      return;
    }
    this.isSaving.set(true);
    const payload: SponsorInput = {
      name,
      description: this.description().trim() || null,
      logoUrl: this.logoUrl().trim() || null,
      websiteUrl: this.websiteUrl().trim() || null,
      category: this.category().trim() || null,
      tier: this.tier() || null,
      contactName: this.contactName().trim() || null,
      contactEmail: this.contactEmail().trim() || null,
      isActive: this.isActive(),
      startDate: this.startDate() ? new Date(this.startDate()).toISOString() : null,
      endDate: this.endDate() ? new Date(this.endDate()).toISOString() : null,
      notes: this.notes().trim() || null,
    };

    const editing = this.editingSponsor();
    const req$ = editing
      ? this.sponsorService.update(this.workspaceId(), editing.id, payload)
      : this.sponsorService.create(this.workspaceId(), payload);

    req$.subscribe({
      next: (sponsor) => {
        this.isSaving.set(false);
        this.saved.emit(sponsor);
        this.ui.success(editing ? 'Sponsor updated.' : 'Sponsor created.');
        this.isOpen.set(false);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to save sponsor.');
      },
    });
  }

  close() {
    this.isOpen.set(false);
  }

  private toDateInput(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
