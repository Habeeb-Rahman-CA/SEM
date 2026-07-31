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
import { AdInput, AdPlacement, Advertisement, AdService } from '../../services/ad.service';
import { WorkspaceEvent } from '../../../workspaces/services/workspace.service';
import { Sponsor } from '../../../sponsors/services/sponsor.service';
import { UiService } from '../../../../core/services/ui.service';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture';

@Component({
  selector: 'app-ad-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, PhotoCaptureComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ad-modal.html',
})
export class AdModalComponent {
  private adService = inject(AdService);
  private ui = inject(UiService);

  workspaceId = input.required<string>();
  editingAd = input<Advertisement | null>(null);
  events = input<WorkspaceEvent[]>([]);
  sponsors = input<Sponsor[]>([]);

  isOpen = model<boolean>(false);
  saved = output<Advertisement>();

  readonly placements: Array<{ value: AdPlacement; label: string; hint: string }> = [
    {
      value: 'public-portal',
      label: 'Events portal',
      hint: 'Shown on the /events browse page',
    },
    {
      value: 'public-event',
      label: 'Event page',
      hint: 'Shown on the public event page below the hero',
    },
    {
      value: 'live-hub',
      label: 'Live hub',
      hint: 'Shown on /live above the match grid',
    },
    {
      value: 'live-match',
      label: 'Live scoreboard',
      hint: 'Shown inside live match modals + match highlight pages',
    },
  ];

  name = signal('');
  title = signal('');
  imageUrl = signal('');
  targetUrl = signal('');
  placement = signal<AdPlacement>('public-event');
  eventId = signal<string>('');
  sponsorId = signal<string>('');
  isActive = signal<boolean>(true);
  startDate = signal('');
  endDate = signal('');
  weight = signal<number>(1);

  isSaving = signal(false);
  error = signal('');

  constructor() {
    effect(
      () => {
        const open = this.isOpen();
        const ad = this.editingAd();
        if (!open) return;
        if (ad) {
          this.name.set(ad.name);
          this.title.set(ad.title ?? '');
          this.imageUrl.set(ad.imageUrl);
          this.targetUrl.set(ad.targetUrl);
          this.placement.set(ad.placement);
          this.eventId.set(ad.eventId ?? '');
          this.sponsorId.set(ad.sponsorId ?? '');
          this.isActive.set(ad.isActive);
          this.startDate.set(ad.startDate ? this.toDateInput(ad.startDate) : '');
          this.endDate.set(ad.endDate ? this.toDateInput(ad.endDate) : '');
          this.weight.set(ad.weight);
        } else {
          this.name.set('');
          this.title.set('');
          this.imageUrl.set('');
          this.targetUrl.set('');
          this.placement.set('public-event');
          this.eventId.set('');
          this.sponsorId.set('');
          this.isActive.set(true);
          this.startDate.set('');
          this.endDate.set('');
          this.weight.set(1);
        }
        this.error.set('');
      },
      { allowSignalWrites: true },
    );
  }

  onCreativeUploaded(url: string) {
    this.imageUrl.set(url);
    this.ui.success('Creative uploaded.');
  }

  save() {
    const name = this.name().trim();
    const imageUrl = this.imageUrl().trim();
    const targetUrl = this.targetUrl().trim();
    if (!name) {
      this.error.set('Give the ad an internal name.');
      return;
    }
    if (!imageUrl) {
      this.error.set('Upload a creative image.');
      return;
    }
    if (!targetUrl) {
      this.error.set('Target URL is required.');
      return;
    }
    if (!/^https?:\/\//i.test(targetUrl)) {
      this.error.set('Target URL must start with http:// or https://');
      return;
    }

    this.isSaving.set(true);
    const payload: AdInput = {
      name,
      title: this.title().trim() || null,
      imageUrl,
      targetUrl,
      placement: this.placement(),
      eventId: this.eventId() || null,
      sponsorId: this.sponsorId() || null,
      isActive: this.isActive(),
      startDate: this.startDate() ? new Date(this.startDate()).toISOString() : null,
      endDate: this.endDate() ? new Date(this.endDate()).toISOString() : null,
      weight: Math.max(1, Number(this.weight()) || 1),
    };

    const editing = this.editingAd();
    const req$ = editing
      ? this.adService.update(this.workspaceId(), editing.id, payload)
      : this.adService.create(this.workspaceId(), payload);

    req$.subscribe({
      next: (ad) => {
        this.isSaving.set(false);
        this.saved.emit(ad);
        this.ui.success(editing ? 'Advertisement updated.' : 'Advertisement created.');
        this.isOpen.set(false);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to save advertisement.');
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
