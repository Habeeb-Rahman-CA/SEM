import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GalleryPhoto, GalleryService } from '../services/gallery.service';
import { UiService } from '../../../core/services/ui.service';

interface CompetitionOption {
  id: string;
  name: string;
  sport?: { code?: string; name?: string } | null;
}

interface MatchOption {
  id: string;
  competitionId: string;
  label: string;
}

@Component({
  selector: 'app-gallery-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4">
      <!-- Filter chips -->
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"> Filter </span>
        <button
          type="button"
          (click)="setFilter('all', null)"
          [class]="chipClass(activeFilter() === 'all')"
        >
          All ({{ photos().length }})
        </button>
        <button
          type="button"
          (click)="setFilter('event', null)"
          [class]="chipClass(activeFilter() === 'event')"
        >
          Event-level ({{ eventLevelCount() }})
        </button>
        @for (c of competitions(); track c.id) {
          <button
            type="button"
            (click)="setFilter('comp', c.id)"
            [class]="chipClass(activeFilter() === 'comp' && activeCompId() === c.id)"
          >
            {{ c.name }} ({{ compCount(c.id) }})
          </button>
        }
      </div>

      <!-- Uploader -->
      <div class="p-4 bg-slate-950/40 border border-white/5 rounded-2xl flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold text-violet-300 uppercase tracking-wider">
            <i class="fi fi-rr-camera-plus"></i>
            Add photo
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
              >Competition
              <span class="text-slate-600 font-normal normal-case">(optional)</span></label
            >
            <select
              class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2 text-xs text-white outline-none transition-all w-full"
              [ngModel]="uploadCompetitionId()"
              (ngModelChange)="onCompetitionSelectionChanged($event)"
              name="gmComp"
            >
              <option value="">Event-level (no competition)</option>
              @for (c of competitions(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
              >Match <span class="text-slate-600 font-normal normal-case">(optional)</span></label
            >
            <select
              class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2 text-xs text-white outline-none transition-all w-full disabled:opacity-50"
              [ngModel]="uploadMatchId()"
              (ngModelChange)="uploadMatchId.set($event)"
              name="gmMatch"
              [disabled]="!uploadCompetitionId()"
            >
              <option value="">— No specific match —</option>
              @for (m of matchesForUpload(); track m.id) {
                <option [value]="m.id">{{ m.label }}</option>
              }
            </select>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
            >Caption <span class="text-slate-600 font-normal normal-case">(optional)</span></label
          >
          <input
            type="text"
            placeholder="e.g. Winning goal celebration"
            class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
            [ngModel]="uploadCaption()"
            (ngModelChange)="uploadCaption.set($event)"
            name="gmCaption"
          />
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <label
            class="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all disabled:opacity-50"
            [class.opacity-50]="isUploading()"
            [class.pointer-events-none]="isUploading()"
          >
            @if (isUploading()) {
              <i class="fi fi-rr-spinner animate-spin text-xs"></i>
              Uploading…
            } @else {
              <i class="fi fi-rr-cloud-upload text-xs"></i>
              Choose photo
            }
            <input
              type="file"
              accept="image/*"
              class="hidden"
              (change)="onFileSelected($event)"
              [disabled]="isUploading()"
            />
          </label>
          <span class="text-[10px] text-slate-500">
            Photos are auto-optimized on delivery (Cloudinary
            <code class="text-slate-400">f_auto,q_auto</code>).
          </span>
        </div>
      </div>

      <!-- Grid -->
      @if (isLoading()) {
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          @for (_ of [1, 2, 3, 4, 5, 6, 7, 8]; track _) {
            <div class="aspect-square bg-slate-800/50 rounded-xl animate-pulse"></div>
          }
        </div>
      } @else if (filteredPhotos().length === 0) {
        <div
          class="py-10 rounded-xl border border-dashed border-white/10 text-center text-xs text-slate-500 flex flex-col items-center gap-2"
        >
          <i class="fi fi-rr-picture text-2xl"></i>
          No photos in this view.
        </div>
      } @else {
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          @for (photo of filteredPhotos(); track photo.id) {
            <div
              class="relative rounded-xl overflow-hidden border border-white/10 aspect-square bg-slate-950 group"
            >
              <a
                [href]="photo.url"
                target="_blank"
                rel="noopener noreferrer"
                class="block w-full h-full"
              >
                <img
                  [src]="thumbUrl(photo.url)"
                  [alt]="photo.caption || 'Gallery photo'"
                  loading="lazy"
                  class="w-full h-full object-cover"
                />
              </a>

              <!-- Overlay -->
              <div
                class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-slate-950/95 to-transparent flex flex-col gap-0.5"
              >
                @if (photo.caption) {
                  <span class="text-[10px] font-bold text-white truncate" [title]="photo.caption">
                    {{ photo.caption }}
                  </span>
                }
                <div class="flex items-center gap-1.5 text-[9px] text-slate-400">
                  @if (photo.matchId) {
                    <span
                      class="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                    >
                      Match
                    </span>
                  } @else if (photo.competitionId) {
                    <span
                      class="inline-flex items-center gap-1 bg-violet-500/15 text-violet-300 border border-violet-500/25 px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                    >
                      {{ compName(photo.competitionId) }}
                    </span>
                  } @else {
                    <span
                      class="inline-flex items-center gap-1 bg-slate-500/15 text-slate-300 border border-slate-500/25 px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                    >
                      Event
                    </span>
                  }
                  <span class="text-slate-500 ml-auto">
                    {{ photo.createdAt | date: 'shortDate' }}
                  </span>
                </div>
              </div>

              <!-- Delete -->
              <button
                type="button"
                (click)="removePhoto(photo)"
                class="absolute top-1.5 right-1.5 p-1.5 bg-rose-600/90 hover:bg-rose-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition cursor-pointer border-0"
                aria-label="Delete photo"
              >
                <i class="fi fi-rr-trash text-[10px]"></i>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class GalleryManagerComponent {
  private galleryService = inject(GalleryService);
  private ui = inject(UiService);

  workspaceId = input.required<string>();
  eventId = input.required<string>();
  competitions = input<CompetitionOption[]>([]);
  matches = input<MatchOption[]>([]);

  photos = signal<GalleryPhoto[]>([]);
  isLoading = signal<boolean>(false);
  isUploading = signal<boolean>(false);

  activeFilter = signal<'all' | 'event' | 'comp'>('all');
  activeCompId = signal<string | null>(null);

  uploadCompetitionId = signal<string>('');
  uploadMatchId = signal<string>('');
  uploadCaption = signal<string>('');

  matchesForUpload = computed(() => {
    const cid = this.uploadCompetitionId();
    if (!cid) return [];
    return this.matches().filter((m) => m.competitionId === cid);
  });

  eventLevelCount = computed(
    () => this.photos().filter((p) => !p.competitionId && !p.matchId).length,
  );

  filteredPhotos = computed(() => {
    const filter = this.activeFilter();
    const list = this.photos();
    if (filter === 'all') return list;
    if (filter === 'event') return list.filter((p) => !p.competitionId && !p.matchId);
    if (filter === 'comp') {
      const cid = this.activeCompId();
      return list.filter((p) => p.competitionId === cid);
    }
    return list;
  });

  constructor() {
    // Load whenever inputs are ready
    effect(() => {
      const ws = this.workspaceId();
      const ev = this.eventId();
      if (ws && ev) this.load();
    });
  }

  private load() {
    this.isLoading.set(true);
    this.galleryService.listPhotos(this.workspaceId(), this.eventId()).subscribe({
      next: (list) => {
        this.photos.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.ui.error(err?.error?.message ?? 'Failed to load gallery.');
      },
    });
  }

  chipClass(active: boolean): string {
    return (
      'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition ' +
      (active
        ? 'bg-violet-500/15 border-violet-500/40 text-violet-200'
        : 'bg-slate-950/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20')
    );
  }

  compCount(compId: string): number {
    return this.photos().filter((p) => p.competitionId === compId).length;
  }

  compName(compId: string): string {
    return this.competitions().find((c) => c.id === compId)?.name ?? 'Competition';
  }

  thumbUrl(url: string): string {
    return this.galleryService.optimize(url, { width: 400 });
  }

  setFilter(kind: 'all' | 'event' | 'comp', compId: string | null) {
    this.activeFilter.set(kind);
    this.activeCompId.set(compId);
  }

  onCompetitionSelectionChanged(next: string) {
    this.uploadCompetitionId.set(next);
    // reset match if it no longer belongs to the newly selected competition
    const currentMatch = this.uploadMatchId();
    if (
      currentMatch &&
      !this.matches().some((m) => m.id === currentMatch && m.competitionId === next)
    ) {
      this.uploadMatchId.set('');
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploading.set(true);
    this.galleryService
      .uploadPhoto(this.workspaceId(), this.eventId(), file, {
        competitionId: this.uploadCompetitionId() || undefined,
        matchId: this.uploadMatchId() || undefined,
        caption: this.uploadCaption().trim() || undefined,
      })
      .subscribe({
        next: (photo) => {
          this.isUploading.set(false);
          this.photos.update((list) => [photo, ...list]);
          this.uploadCaption.set('');
          this.ui.success('Photo added to gallery.');
          input.value = '';
        },
        error: (err) => {
          this.isUploading.set(false);
          input.value = '';
          this.ui.error(err?.error?.message ?? 'Upload failed.');
        },
      });
  }

  removePhoto(photo: GalleryPhoto) {
    if (!confirm('Remove this photo from the gallery?')) return;
    this.galleryService.removePhoto(this.workspaceId(), this.eventId(), photo.id).subscribe({
      next: () => {
        this.photos.update((list) => list.filter((p) => p.id !== photo.id));
        this.ui.success('Photo removed.');
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to delete photo.');
      },
    });
  }
}
