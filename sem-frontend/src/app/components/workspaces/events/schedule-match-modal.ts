import { Component, inject, signal, effect, model, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Workspace, WorkspaceEvent, Competition, CompetitionStage, Match } from '../../../services/workspace.service';
import { Venue } from '../../../services/venue.service';
import { CompetitionService } from '../../../services/competition.service';
import { UiService } from '../../../services/ui.service';

@Component({
  selector: 'app-schedule-match-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (isOpen()) {
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      (click)="isOpen.set(false)">
      <div
        class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md flex flex-col shadow-2xl relative overflow-hidden"
        (click)="$event.stopPropagation()">
        <div class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500"></div>

        <!-- Header -->
        <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i class="fi fi-rr-calendar text-violet-400"></i>
              <span>Schedule Match</span>
            </h3>
            <p class="text-xs text-slate-400 mt-1">Set date, time and venue for this fixture.</p>
          </div>
          <button (click)="isOpen.set(false)" class="text-slate-400 hover:text-white transition cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 text-left">
          @if (error()) {
          <div class="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-rose-300 text-xs flex items-center gap-2">
            <i class="fi fi-rr-exclamation-triangle"></i>
            {{ error() }}
          </div>
          }

          <!-- Match Teams Preview -->
          @if (match()) {
          <div class="bg-slate-950/40 border border-white/5 rounded-xl p-4 flex items-center justify-center gap-4 mb-5">
            <div class="text-right flex-1 truncate text-xs font-bold text-white">
              {{ match()?.homeTeam?.name || 'Home' }}
            </div>
            <div class="text-[10px] text-slate-500 font-extrabold">VS</div>
            <div class="text-left flex-1 truncate text-xs font-bold text-white">
              {{ match()?.awayTeam?.name || 'Away' }}
            </div>
          </div>
          }

          <form (submit)="onSubmit(); $event.preventDefault()" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="sch-date" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Time</label>
              <input id="sch-date" type="datetime-local"
                class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none w-full"
                [ngModel]="scheduledDate()" (ngModelChange)="scheduledDate.set($event)" name="scheduledDate" required />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="sch-venue" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Venue</label>
              <select id="sch-venue"
                class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none w-full"
                [ngModel]="venueId()" (ngModelChange)="venueId.set($event)" name="venueId">
                <option value="">No Venue Selected</option>
                @for (v of venues(); track v.id) {
                <option [value]="v.id">{{ v.name }} ({{ v.location }})</option>
                }
              </select>
            </div>

            <div class="pt-2 flex gap-2">
              <button type="button" (click)="isOpen.set(false)"
                class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" [disabled]="isSaving()"
                class="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2">
                @if (isSaving()) {
                <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Saving...
                } @else { Save Schedule }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    }
  `
})
export class ScheduleMatchModalComponent {
  private competitionService = inject(CompetitionService);
  private uiService = inject(UiService);

  workspace = input.required<Workspace | null>();
  selectedEvent = input.required<WorkspaceEvent | null>();
  selectedCompetition = input.required<Competition | null>();
  selectedStage = input.required<CompetitionStage | null>();
  match = input<Match | null>();
  venues = input<Venue[]>([]);

  isOpen = model<boolean>(false);
  matchScheduled = output<Match>();

  scheduledDate = signal('');
  venueId = signal('');
  isSaving = signal(false);
  error = signal('');

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const m = this.match();
      if (open && m) {
        this.error.set('');
        this.venueId.set(m.venueId || '');
        if (m.scheduledAt) {
          const date = new Date(m.scheduledAt);
          // Format as YYYY-MM-DDThh:mm
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          const hh = String(date.getHours()).padStart(2, '0');
          const min = String(date.getMinutes()).padStart(2, '0');
          this.scheduledDate.set(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
        } else {
          this.scheduledDate.set('');
        }
      }
    }, { allowSignalWrites: true });
  }

  async onSubmit() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    const m = this.match();
    if (!ws || !event || !comp || !stage || !m) return;

    this.isSaving.set(true);
    this.error.set('');

    try {
      const updated = await firstValueFrom(
        this.competitionService.updateMatch(ws.id, event.id, comp.id, stage.id, m.id, {
          scheduledAt: this.scheduledDate() ? new Date(this.scheduledDate()).toISOString() : null,
          venueId: this.venueId() || null
        })
      );
      this.uiService.success('Match scheduled successfully!');
      this.matchScheduled.emit(updated);
      this.isOpen.set(false);
    } catch (err: any) {
      console.error('Failed to schedule match', err);
      this.error.set(err.error?.message ?? 'Failed to schedule match.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
