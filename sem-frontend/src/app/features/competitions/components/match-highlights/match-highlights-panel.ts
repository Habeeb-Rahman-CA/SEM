import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Match } from '../../../workspaces/services/workspace.service';
import { CompetitionService } from '../../services/competition.service';
import { UiService } from '../../../../core/services/ui.service';

interface HighlightVideo {
  id: string;
  platform: 'youtube' | 'vimeo' | 'other';
  url: string;
  title?: string | null;
  thumbnailUrl?: string | null;
}

/**
 * Sits inside a scoring console and lets referees publish a summary and
 * external highlight videos (YouTube / Vimeo) that appear on the public
 * /public/matches/:id page.
 */
@Component({
  selector: 'app-match-highlights-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h4 class="text-sm font-bold text-white flex items-center gap-2">
            <i class="fi fi-rr-video-camera text-violet-400"></i>
            Match Highlights &amp; Summary
          </h4>
          <p class="text-[10px] text-slate-400 mt-0.5">
            Published on the spectator page and included in share previews.
          </p>
        </div>
        @if (isSaving()) {
          <span class="text-[10px] text-slate-500">Saving…</span>
        }
      </div>

      <!-- Summary -->
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Summary
        </label>
        <textarea
          rows="3"
          placeholder="Two-line recap of the match — result, key moments, MOTM…"
          class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all w-full resize-none"
          [ngModel]="summaryDraft()"
          (ngModelChange)="summaryDraft.set($event)"
          [disabled]="!canScore() || isSaving()"
        ></textarea>
        <button
          type="button"
          (click)="saveSummary()"
          [disabled]="!canScore() || isSaving() || summaryDraft() === (match().summary ?? '')"
          class="self-end px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
        >
          Save summary
        </button>
      </div>

      <!-- Add video -->
      @if (canScore()) {
        <div class="p-3 bg-slate-950/40 border border-white/5 rounded-xl flex flex-col gap-2">
          <span class="text-[10px] font-bold text-violet-300 uppercase tracking-wider">
            <i class="fi fi-rr-plus text-[10px]"></i>
            Add highlight video
          </span>
          <div class="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-2">
            <select
              class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all w-full"
              [ngModel]="newPlatform()"
              (ngModelChange)="newPlatform.set($event)"
            >
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="other">Other</option>
            </select>
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=…"
              class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
              [ngModel]="newUrl()"
              (ngModelChange)="newUrl.set($event)"
            />
          </div>
          <input
            type="text"
            placeholder="Title (optional)"
            class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
            [ngModel]="newTitle()"
            (ngModelChange)="newTitle.set($event)"
          />
          <button
            type="button"
            (click)="addVideo()"
            [disabled]="!newUrl().trim() || isSaving()"
            class="self-end px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
          >
            Add video
          </button>
        </div>
      }

      <!-- Video list -->
      @if (videos().length > 0) {
        <div class="flex flex-col gap-2">
          @for (v of videos(); track v.id) {
            <div
              class="p-2.5 rounded-lg bg-slate-950/40 border border-white/5 flex items-center gap-3"
            >
              <span
                class="w-8 h-8 rounded-md bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-300 flex-shrink-0"
              >
                <i class="fi fi-rr-video-camera text-xs"></i>
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span
                    class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 flex-shrink-0"
                  >
                    {{ v.platform }}
                  </span>
                  <span class="text-xs font-bold text-white truncate">
                    {{ v.title || v.url }}
                  </span>
                </div>
                <a
                  [href]="v.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[10px] text-slate-500 hover:text-violet-300 truncate block"
                >
                  {{ v.url }}
                </a>
              </div>
              @if (canScore()) {
                <button
                  type="button"
                  (click)="removeVideo(v.id)"
                  class="text-slate-500 hover:text-rose-400 transition cursor-pointer flex-shrink-0 bg-transparent border-0"
                  aria-label="Remove video"
                >
                  <i class="fi fi-rr-trash text-xs"></i>
                </button>
              }
            </div>
          }
        </div>
      } @else {
        <div
          class="py-4 rounded-xl border border-dashed border-white/10 text-center text-xs text-slate-500"
        >
          No highlight videos yet.
        </div>
      }
    </div>
  `,
})
export class MatchHighlightsPanelComponent {
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

  videos = computed<HighlightVideo[]>(() => (this.match() as any)?.highlightVideos ?? []);

  summaryDraft = signal('');

  newPlatform = signal<'youtube' | 'vimeo' | 'other'>('youtube');
  newUrl = signal('');
  newTitle = signal('');

  constructor() {
    // Sync summary draft from server whenever the match changes
    // (initial mount + after another editor pushes an update)
    let lastMatchId: string | null = null;
    setInterval(() => {
      const m = this.match();
      if (m && m.id !== lastMatchId) {
        lastMatchId = m.id;
        this.summaryDraft.set((m as any).summary ?? '');
      }
    }, 500);
  }

  saveSummary() {
    this.persist({ summary: this.summaryDraft() }, 'Summary saved.');
  }

  addVideo() {
    const url = this.newUrl().trim();
    if (!url) return;
    const entry: HighlightVideo = {
      id: crypto.randomUUID(),
      platform: this.newPlatform(),
      url,
      title: this.newTitle().trim() || null,
    };
    this.persist({ highlightVideos: [...this.videos(), entry] }, 'Highlight video added.');
    this.newUrl.set('');
    this.newTitle.set('');
  }

  removeVideo(id: string) {
    this.persist({ highlightVideos: this.videos().filter((v) => v.id !== id) }, 'Video removed.');
  }

  private persist(payload: any, toast: string) {
    const match = this.match();
    if (!match) return;
    this.isSaving.set(true);
    this.competitionService
      .updateMatch(
        this.workspaceId(),
        this.eventId(),
        this.competitionId(),
        this.stageId(),
        match.id,
        payload,
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
          this.ui.error(err?.error?.message ?? 'Save failed.');
        },
      });
  }
}
