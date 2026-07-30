import { Component, computed, inject, input, output, signal } from '@angular/core';
import { PhotoCaptureComponent } from '../../../../shared/components/photo-capture/photo-capture';
import { Match } from '../../../workspaces/services/workspace.service';
import { CompetitionService } from '../../services/competition.service';
import { UiService } from '../../../../core/services/ui.service';

/**
 * MatchEvidencePanelComponent
 *
 * Sits inside a scoring console and lets referees / statisticians attach
 * photographic evidence to the current match (goals, disputed calls, injuries,
 * team sheets, etc.). Photos are captured via the shared PhotoCapture
 * component and appended to `match.liveData.evidencePhotos`, then persisted
 * via `CompetitionService.updateMatch` so they show up for anyone else looking
 * at the same match.
 */
@Component({
  selector: 'app-match-evidence-panel',
  standalone: true,
  imports: [PhotoCaptureComponent],
  template: `
    <div class="bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h4 class="text-sm font-bold text-white flex items-center gap-2">
            <i class="fi fi-rr-camera text-violet-400"></i> Match Evidence Photos
          </h4>
          <p class="text-[10px] text-slate-400 mt-0.5">
            Capture injuries, disputed calls, or team sheets — visible to all officials.
          </p>
        </div>
        <span
          class="px-2 py-0.5 rounded-md bg-slate-800 border border-white/10 text-[10px] font-mono text-slate-400"
        >
          {{ photos().length }}
        </span>
      </div>

      @if (canScore()) {
        <app-photo-capture
          uploadType="event"
          shape="thumb"
          buttonLabel="Capture Photo"
          [imageUrl]="null"
          [disabled]="isSaving()"
          (imageUploaded)="onPhotoUploaded($event)"
        />
      }

      @if (photos().length > 0) {
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          @for (url of photos(); track url) {
            <div
              class="relative rounded-xl overflow-hidden border border-white/10 aspect-square bg-slate-950 group"
            >
              <a [href]="url" target="_blank" rel="noopener">
                <img [src]="url" alt="Evidence" class="w-full h-full object-cover" />
              </a>
              @if (canScore()) {
                <button
                  type="button"
                  (click)="removePhoto(url)"
                  class="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  aria-label="Remove photo"
                >
                  <i class="fi fi-rr-cross text-[8px]"></i>
                </button>
              }
            </div>
          }
        </div>
      } @else {
        <div
          class="rounded-xl border border-dashed border-white/10 py-6 text-center text-xs text-slate-500"
        >
          No evidence photos attached yet.
        </div>
      }
    </div>
  `,
})
export class MatchEvidencePanelComponent {
  private competitionService = inject(CompetitionService);
  private ui = inject(UiService);

  workspaceId = input.required<string>();
  eventId = input.required<string>();
  competitionId = input.required<string>();
  stageId = input.required<string>();
  match = input.required<Match>();
  canScore = input<boolean>(false);

  matchUpdated = output<Match>();

  isSaving = signal(false);

  photos = computed<string[]>(() => this.match()?.liveData?.evidencePhotos ?? []);

  onPhotoUploaded(url: string) {
    const next = [...this.photos(), url];
    this.persist(next, 'Photo attached to match evidence.');
  }

  removePhoto(url: string) {
    const next = this.photos().filter((u) => u !== url);
    this.persist(next, 'Evidence photo removed.');
  }

  private persist(nextPhotos: string[], toast: string) {
    const match = this.match();
    if (!match) return;

    this.isSaving.set(true);
    const nextLiveData = { ...(match.liveData || {}), evidencePhotos: nextPhotos };

    this.competitionService
      .updateMatch(
        this.workspaceId(),
        this.eventId(),
        this.competitionId(),
        this.stageId(),
        match.id,
        { liveData: nextLiveData },
        match,
      )
      .subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.matchUpdated.emit(updated);
          this.ui.success(toast);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.ui.error(err?.error?.message || 'Failed to save evidence photo.');
        },
      });
  }
}
