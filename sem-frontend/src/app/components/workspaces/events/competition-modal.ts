import { Component, inject, signal, effect, model, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Workspace, WorkspaceEvent, Sport, Competition, PointsConfigEntry } from '../../../services/workspace.service';
import { CompetitionService } from '../../../services/competition.service';

@Component({
  selector: 'app-competition-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (isOpen()) {
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      (click)="isOpen.set(false)">
      <div
        class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
        (click)="$event.stopPropagation()">
        <div class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500"></div>

        <!-- Header -->
        <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              @if (editingCompetition()) {
              <span>Edit Competition:</span>
              <span class="text-violet-400">{{ editingCompetition()?.name }}</span>
              } @else {
              <span>Create New Competition</span>
              }
            </h3>
            <p class="text-xs text-slate-400 mt-1">
              @if (editingCompetition()) {
              Update the competition details and points configuration.
              } @else {
              Add a new competition/category under this event.
              }
            </p>
          </div>
          <button (click)="isOpen.set(false)" class="text-slate-400 hover:text-white transition cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <!-- Form Content -->
        <div class="p-6 overflow-y-auto flex-1 text-left">
          @if (success()) {
          <div
            class="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-300 text-xs flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24"
              fill="currentColor">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            {{ success() }}
          </div>
          }
          @if (error()) {
          <div
            class="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-rose-300 text-xs flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24"
              fill="currentColor">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {{ error() }}
          </div>
          }

          <form (submit)="onSubmit(); $event.preventDefault()"
            class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <!-- Left: Basic Details -->
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-1.5">
                <label for="c-name" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Competition
                  Name <span class="text-rose-400">*</span></label>
                <input id="c-name" type="text" placeholder="e.g. Under-19 Football Tournament" autocomplete="off"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
                  [ngModel]="name()" (ngModelChange)="name.set($event)" name="cName"
                  required />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="c-sport" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sport <span
                    class="text-rose-400">*</span></label>
                <select id="c-sport"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all w-full"
                  [ngModel]="sportId()" (ngModelChange)="sportId.set($event)" name="cSport"
                  required>
                  <option value="" disabled selected>Select a sport...</option>
                  @for (sport of sports(); track sport.id) {
                  <option [value]="sport.id">{{ sport.name }}</option>
                  }
                </select>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="c-status"
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                <select id="c-status"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all w-full"
                  [ngModel]="status()" (ngModelChange)="status.set($event)" name="cStatus">
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <!-- Right: Overall Points Config (Optional) -->
            <div class="flex flex-col gap-3 md:border-l border-white/5 md:pl-6">
              <div class="flex items-center justify-between">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Points Breakdown Configuration <span class="text-slate-500 normal-case font-normal">(for overall standings)</span></label>
                <button type="button" (click)="addPointsRow()"
                  class="px-2 py-1 bg-violet-600/10 hover:bg-violet-600 border border-violet-500/20 hover:border-transparent text-[10px] font-bold text-violet-300 hover:text-white rounded-md transition cursor-pointer">
                  + Add Rank
                </button>
              </div>

              <div class="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                @for (row of pointsConfig(); track row.position; let idx = $index) {
                <div class="flex items-center gap-2 bg-slate-950/40 border border-white/5 rounded-xl p-2.5">
                  <div class="w-10 text-center font-bold text-xs text-violet-400">#{{ row.position }}</div>
                  <input type="text" [ngModel]="row.label"
                    (ngModelChange)="updatePointsRow(idx, 'label', $event)" placeholder="Label (e.g. Winner)"
                    class="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-violet-500" />
                  <input type="number" [ngModel]="row.points"
                    (ngModelChange)="updatePointsRow(idx, 'points', $event)" placeholder="Points"
                    class="w-16 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-violet-500 text-center" />
                  <button type="button" (click)="removePointsRow(idx)"
                    class="text-rose-450 hover:text-rose-300 text-xs font-bold transition p-1 cursor-pointer">✕</button>
                </div>
                } @empty {
                <p class="text-[11px] text-slate-500 italic py-4 text-center">No points configuration added yet. By default, this competition will not yield overall event leaderboard points.</p>
                }
              </div>
            </div>

            <!-- Actions -->
            <div class="md:col-span-2 pt-2 flex gap-2">
              <button type="button" (click)="isOpen.set(false)"
                class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white hover:text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" [disabled]="isSaving() || !name() || !sportId()"
                class="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2">
                @if (isSaving()) {
                <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Saving...
                } @else { Save }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    }
  `
})
export class CompetitionModalComponent {
  private competitionService = inject(CompetitionService);

  workspace = input.required<Workspace | null>();
  selectedEvent = input.required<WorkspaceEvent | null>();
  editingCompetition = input<Competition | null>(null);
  sports = input<Sport[]>([]);

  isOpen = model<boolean>(false);
  competitionSaved = output<Competition>();

  // Local Form Signals
  name = signal('');
  sportId = signal('');
  status = signal('upcoming');
  pointsConfig = signal<PointsConfigEntry[]>([]);

  isSaving = signal(false);
  error = signal('');
  success = signal('');

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const comp = this.editingCompetition();
      if (open) {
        if (comp) {
          this.name.set(comp.name);
          this.sportId.set(comp.sportId);
          this.status.set(comp.status);
          this.pointsConfig.set(comp.pointsConfig ? [...comp.pointsConfig] : []);
        } else {
          this.name.set('');
          this.sportId.set('');
          this.status.set('upcoming');
          this.pointsConfig.set([]);
        }
        this.error.set('');
        this.success.set('');
      }
    }, { allowSignalWrites: true });
  }

  addPointsRow() {
    const current = this.pointsConfig();
    const nextPosition = current.length > 0 ? Math.max(...current.map(r => r.position)) + 1 : 1;
    const defaultLabels: Record<number, string> = { 1: 'Winner', 2: 'Runner-up', 3: '3rd Place', 4: '4th Place' };
    this.pointsConfig.set([...current, { position: nextPosition, label: defaultLabels[nextPosition] ?? `${nextPosition}th Place`, points: 0 }]);
  }

  removePointsRow(index: number) {
    this.pointsConfig.update(rows => rows.filter((_, i) => i !== index));
  }

  updatePointsRow(index: number, field: keyof PointsConfigEntry, value: any) {
    this.pointsConfig.update(rows => rows.map((r, i) => i === index ? { ...r, [field]: field === 'points' || field === 'position' ? Number(value) : value } : r));
  }

  onSubmit() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    if (!ws || !event || !this.name().trim() || !this.sportId()) return;

    this.isSaving.set(true);
    this.error.set('');
    this.success.set('');

    const points = this.pointsConfig();
    const payload = {
      name: this.name().trim(),
      sportId: this.sportId(),
      status: this.status(),
      pointsConfig: points.length > 0 ? points : null,
    };

    const comp = this.editingCompetition();
    const request$ = comp
      ? this.competitionService.updateCompetition(ws.id, event.id, comp.id, payload)
      : this.competitionService.createCompetition(ws.id, event.id, payload);

    request$.subscribe({
      next: (savedComp) => {
        this.isSaving.set(false);
        this.success.set(comp ? 'Competition updated successfully!' : `Competition "${savedComp.name}" created successfully!`);
        this.competitionSaved.emit(savedComp);
        setTimeout(() => this.isOpen.set(false), 1500);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.error.set(err.error?.message ?? 'Failed to save competition.');
      }
    });
  }
}
