import { Component, inject, signal, effect, model, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Workspace, WorkspaceEvent } from '../../workspaces/services/workspace.service';
import { EventService } from '../services/event.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-duplicate-event-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        (click)="isOpen.set(false)"
      >
        <div
          class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
          (click)="$event.stopPropagation()"
        >
          <!-- Gradient top line -->
          <div
            class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500"
          ></div>

          <!-- Header -->
          <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <i class="fi fi-rr-copy text-violet-400"></i>
                <span>Duplicate Event</span>
              </h3>
              <p class="text-xs text-slate-400 mt-1">
                Create a new event cycle by duplicating
                <span class="text-violet-400 font-semibold">{{ targetEvent()?.name }}</span>
              </p>
            </div>
            <button
              (click)="isOpen.set(false)"
              class="text-slate-400 hover:text-white transition cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                />
              </svg>
            </button>
          </div>

          <!-- Form Content -->
          <div class="p-6 overflow-y-auto flex-1">
            @if (success()) {
              <div
                class="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-300 text-xs flex items-center gap-2"
              >
                <i class="fi fi-rr-check-circle text-base flex-shrink-0"></i>
                {{ success() }}
              </div>
            }
            @if (error()) {
              <div
                class="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-rose-300 text-xs flex items-center gap-2"
              >
                <i class="fi fi-rr-exclamation text-base flex-shrink-0"></i>
                {{ error() }}
              </div>
            }

            <form (submit)="onSubmit(); $event.preventDefault()" class="flex flex-col gap-5">
              <!-- New Event Name -->
              <div class="flex flex-col gap-1.5 text-left">
                <label
                  for="dup-e-name"
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                  >New Event Name <span class="text-rose-400">*</span></label
                >
                <input
                  id="dup-e-name"
                  type="text"
                  placeholder="e.g. Annual Sports Meet 2029"
                  autocomplete="off"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
                  [ngModel]="name()"
                  (ngModelChange)="name.set($event)"
                  name="name"
                  required
                />
              </div>

              <!-- Start & End Date -->
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5 text-left">
                  <label
                    for="dup-e-start"
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                    >Start Date</label
                  >
                  <input
                    id="dup-e-start"
                    type="datetime-local"
                    (click)="showDatePicker($event)"
                    class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all w-full"
                    [ngModel]="startDate()"
                    (ngModelChange)="startDate.set($event)"
                    name="startDate"
                  />
                </div>
                <div class="flex flex-col gap-1.5 text-left">
                  <label
                    for="dup-e-end"
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                    >End Date</label
                  >
                  <input
                    id="dup-e-end"
                    type="datetime-local"
                    (click)="showDatePicker($event)"
                    class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all w-full"
                    [ngModel]="endDate()"
                    (ngModelChange)="endDate.set($event)"
                    name="endDate"
                  />
                </div>
              </div>

              <!-- Options Divider -->
              <div class="flex items-center gap-2 my-2">
                <div class="h-[1px] bg-white/5 flex-1"></div>
                <span class="text-[9px] font-bold text-slate-500 uppercase tracking-wider"
                  >Duplication Preferences</span
                >
                <div class="h-[1px] bg-white/5 flex-1"></div>
              </div>

              <!-- Duplication Options Checkboxes -->
              <div class="flex flex-col gap-3">
                <!-- Competitions -->
                <div
                  (click)="duplicateCompetitions.set(!duplicateCompetitions())"
                  class="border hover:border-violet-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all select-none"
                  [class]="
                    duplicateCompetitions()
                      ? 'border-violet-500/40 bg-violet-500/5'
                      : 'border-white/5 bg-slate-950/40'
                  "
                >
                  <div class="flex flex-col text-left gap-0.5">
                    <span class="text-xs font-bold text-white">Competitions</span>
                    <span class="text-[10px] text-slate-400">Copy all competition categories</span>
                  </div>
                  <div
                    class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                    [class]="
                      duplicateCompetitions()
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'border-white/20 bg-slate-950'
                    "
                  >
                    @if (duplicateCompetitions()) {
                      <i class="fi fi-rr-check text-[8px]"></i>
                    }
                  </div>
                </div>

                <!-- Stages -->
                @if (duplicateCompetitions()) {
                  <div
                    (click)="duplicateStages.set(!duplicateStages())"
                    class="border hover:border-violet-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all select-none"
                    [class]="
                      duplicateStages()
                        ? 'border-violet-500/40 bg-violet-500/5'
                        : 'border-white/5 bg-slate-950/40'
                    "
                  >
                    <div class="flex flex-col text-left gap-0.5">
                      <span class="text-xs font-bold text-white">Stages & Brackets</span>
                      <span class="text-[10px] text-slate-400"
                        >Copy matches' stages (e.g. Group stage, Knockout)</span
                      >
                    </div>
                    <div
                      class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                      [class]="
                        duplicateStages()
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'border-white/20 bg-slate-950'
                      "
                    >
                      @if (duplicateStages()) {
                        <i class="fi fi-rr-check text-[8px]"></i>
                      }
                    </div>
                  </div>
                }

                <!-- Teams -->
                @if (duplicateCompetitions()) {
                  <div
                    (click)="duplicateTeams.set(!duplicateTeams())"
                    class="border hover:border-violet-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all select-none"
                    [class]="
                      duplicateTeams()
                        ? 'border-violet-500/40 bg-violet-500/5'
                        : 'border-white/5 bg-slate-950/40'
                    "
                  >
                    <div class="flex flex-col text-left gap-0.5">
                      <span class="text-xs font-bold text-white">Team Enrollments</span>
                      <span class="text-[10px] text-slate-400"
                        >Enroll the same teams in copy-created competitions</span
                      >
                    </div>
                    <div
                      class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                      [class]="
                        duplicateTeams()
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'border-white/20 bg-slate-950'
                      "
                    >
                      @if (duplicateTeams()) {
                        <i class="fi fi-rr-check text-[8px]"></i>
                      }
                    </div>
                  </div>
                }

                <!-- Point Systems -->
                <div
                  (click)="duplicatePointSystems.set(!duplicatePointSystems())"
                  class="border hover:border-violet-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all select-none"
                  [class]="
                    duplicatePointSystems()
                      ? 'border-violet-500/40 bg-violet-500/5'
                      : 'border-white/5 bg-slate-950/40'
                  "
                >
                  <div class="flex flex-col text-left gap-0.5">
                    <span class="text-xs font-bold text-white">Point Systems & Scoring</span>
                    <span class="text-[10px] text-slate-400"
                      >Preserve win/draw/loss point allocations</span
                    >
                  </div>
                  <div
                    class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                    [class]="
                      duplicatePointSystems()
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'border-white/20 bg-slate-950'
                    "
                  >
                    @if (duplicatePointSystems()) {
                      <i class="fi fi-rr-check text-[8px]"></i>
                    }
                  </div>
                </div>

                <!-- Venues -->
                <div
                  (click)="duplicateVenues.set(!duplicateVenues())"
                  class="border hover:border-violet-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all select-none"
                  [class]="
                    duplicateVenues()
                      ? 'border-violet-500/40 bg-violet-500/5'
                      : 'border-white/5 bg-slate-950/40'
                  "
                >
                  <div class="flex flex-col text-left gap-0.5">
                    <span class="text-xs font-bold text-white">Venue Assignments</span>
                    <span class="text-[10px] text-slate-400"
                      >Copy venue connections to the new event</span
                    >
                  </div>
                  <div
                    class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                    [class]="
                      duplicateVenues()
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'border-white/20 bg-slate-950'
                    "
                  >
                    @if (duplicateVenues()) {
                      <i class="fi fi-rr-check text-[8px]"></i>
                    }
                  </div>
                </div>

                <!-- General Settings -->
                <div
                  (click)="duplicateSettings.set(!duplicateSettings())"
                  class="border hover:border-violet-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all select-none"
                  [class]="
                    duplicateSettings()
                      ? 'border-violet-500/40 bg-violet-500/5'
                      : 'border-white/5 bg-slate-950/40'
                  "
                >
                  <div class="flex flex-col text-left gap-0.5">
                    <span class="text-xs font-bold text-white"
                      >Public Settings & Announcements</span
                    >
                    <span class="text-[10px] text-slate-400"
                      >Copy gallery images, visibility, and announcements</span
                    >
                  </div>
                  <div
                    class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                    [class]="
                      duplicateSettings()
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'border-white/20 bg-slate-950'
                    "
                  >
                    @if (duplicateSettings()) {
                      <i class="fi fi-rr-check text-[8px]"></i>
                    }
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="pt-4 flex gap-3">
                <button
                  type="button"
                  (click)="isOpen.set(false)"
                  class="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white hover:text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="isSaving() || !name()"
                  class="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  @if (isSaving()) {
                    <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      ></path>
                    </svg>
                    Duplicating...
                  } @else {
                    Duplicate
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `,
})
export class DuplicateEventModalComponent {
  private eventService = inject(EventService);
  private uiService = inject(UiService);

  workspace = input.required<Workspace | null>();
  targetEvent = input<WorkspaceEvent | null>(null);

  isOpen = model<boolean>(false);
  eventDuplicated = output<WorkspaceEvent>();

  // Local Form Signals
  name = signal('');
  startDate = signal('');
  endDate = signal('');

  // Preferences Signals
  duplicateCompetitions = signal(true);
  duplicateStages = signal(true);
  duplicateVenues = signal(true);
  duplicateTeams = signal(true);
  duplicatePointSystems = signal(true);
  duplicateSettings = signal(true);

  isSaving = signal(false);
  error = signal('');
  success = signal('');

  constructor() {
    effect(
      () => {
        const open = this.isOpen();
        const event = this.targetEvent();
        if (open && event) {
          this.name.set(`${event.name} (Copy)`);
          this.startDate.set(this.formatToLocalDatetime(event.startDate));
          this.endDate.set(this.formatToLocalDatetime(event.endDate));
          this.duplicateCompetitions.set(true);
          this.duplicateStages.set(true);
          this.duplicateVenues.set(true);
          this.duplicateTeams.set(true);
          this.duplicatePointSystems.set(true);
          this.duplicateSettings.set(true);
          this.error.set('');
          this.success.set('');
        }
      },
      { allowSignalWrites: true },
    );
  }

  showDatePicker(event: any) {
    if (event.target && typeof event.target.showPicker === 'function') {
      try {
        event.target.showPicker();
      } catch (e) {
        console.warn('showPicker is not supported or blocked:', e);
      }
    }
  }

  private formatToLocalDatetime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().substring(0, 16);
  }

  onSubmit() {
    const ws = this.workspace();
    const event = this.targetEvent();
    if (!ws || !event || !this.name().trim()) return;

    this.isSaving.set(true);
    this.error.set('');
    this.success.set('');

    const payload = {
      name: this.name().trim(),
      startDate: this.startDate() ? new Date(this.startDate()).toISOString() : undefined,
      endDate: this.endDate() ? new Date(this.endDate()).toISOString() : undefined,
      duplicateCompetitions: this.duplicateCompetitions(),
      duplicateStages: this.duplicateCompetitions() && this.duplicateStages(),
      duplicateTeams: this.duplicateCompetitions() && this.duplicateTeams(),
      duplicatePointSystems: this.duplicatePointSystems(),
      duplicateVenues: this.duplicateVenues(),
      duplicateSettings: this.duplicateSettings(),
    };

    this.eventService.duplicateEvent(ws.id, event.id, payload).subscribe({
      next: (duplicatedEvent) => {
        this.isSaving.set(false);
        this.success.set(`Event duplicated successfully!`);
        this.eventDuplicated.emit(duplicatedEvent);
        setTimeout(() => this.isOpen.set(false), 1500);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.error.set(err.error?.message ?? 'Failed to duplicate event.');
      },
    });
  }
}
