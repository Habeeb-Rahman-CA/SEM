import { Component, inject, signal, effect, model, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkspaceService, Workspace, Team, WorkspaceEvent } from '../../../services/workspace.service';
import { EventService } from '../../../services/event.service';
import { UiService } from '../../../services/ui.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';

@Component({
  selector: 'app-event-modal',
  standalone: true,
  imports: [FormsModule, AvatarComponent],
  template: `
    @if (isOpen()) {
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      (click)="isOpen.set(false)">
      <div
        class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
        (click)="$event.stopPropagation()">
        <!-- Gradient top line -->
        <div class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500"></div>

        <!-- Header -->
        <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              @if (editingEvent()) {
              <span>Edit Event:</span>
              <span class="text-violet-400">{{ editingEvent()?.name }}</span>
              } @else {
              <span>Create New Event</span>
              }
            </h3>
            <p class="text-xs text-slate-400 mt-1">
              @if (editingEvent()) {
              Update the event details and configuration.
              } @else {
              Add a new event to this workspace.
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
        <div class="p-6 overflow-y-auto flex-1">
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
            <!-- Left Column: Event Details -->
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-1.5 text-left">
                <label for="modal-e-name" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event
                  Name <span class="text-rose-400">*</span></label>
                <input id="modal-e-name" type="text" placeholder="e.g. Annual Sports Meet 2028" autocomplete="off"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
                  [ngModel]="name()" (ngModelChange)="name.set($event)" name="eName" required />
              </div>

              <div class="flex flex-col gap-1.5 text-left">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Logo</label>
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                    @if (isUploadingLogo()) {
                    <div class="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                      <svg class="animate-spin h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                        </circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z">
                        </path>
                      </svg>
                    </div>
                    } @else if (logoUrl()) {
                    <img [src]="logoUrl()" alt="Logo Preview" class="w-full h-full object-cover" />
                    } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-500" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    }
                  </div>
                  <label
                    class="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white hover:text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer flex-shrink-0"
                    [class.opacity-50]="isUploadingLogo()" [class.pointer-events-none]="isUploadingLogo()">
                    @if (isUploadingLogo()) {
                    <span class="animate-pulse">Uploading...</span>
                    } @else {
                    Upload Logo
                    <input type="file" class="hidden" accept="image/*" (change)="onLogoUpload($event)" />
                    }
                  </label>
                  @if (logoUrl()) {
                  <button type="button" (click)="logoUrl.set('')"
                    class="text-xs text-rose-450 hover:text-rose-300 font-bold transition">Remove</button>
                  }
                </div>
              </div>

              <div class="flex flex-col gap-1.5 text-left">
                <label for="modal-e-desc"
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea id="modal-e-desc" placeholder="Details about this sports festival..." rows="3"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all w-full resize-none"
                  [ngModel]="description()" (ngModelChange)="description.set($event)"
                  name="eDesc"></textarea>
              </div>

              <div class="flex flex-col gap-1.5 text-left">
                <label for="modal-e-start" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start
                  Date & Time</label>
                <input id="modal-e-start" type="datetime-local" (click)="showDatePicker($event)"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all w-full"
                  [ngModel]="startDate()" (ngModelChange)="startDate.set($event)" name="eStartDate" />
              </div>

              <div class="flex flex-col gap-1.5 text-left">
                <label for="modal-e-end" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End
                  Date & Time</label>
                <input id="modal-e-end" type="datetime-local" (click)="showDatePicker($event)"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all w-full"
                  [ngModel]="endDate()" (ngModelChange)="endDate.set($event)" name="eEndDate" />
              </div>

              <div class="flex flex-col gap-1.5 text-left">
                <label for="modal-e-status"
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                <select id="modal-e-status"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all w-full"
                  [ngModel]="status()" (ngModelChange)="status.set($event)" name="eStatus">
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <!-- Right Column: Select Teams (Grid) -->
            <div
              class="flex flex-col gap-3 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 h-full">
              <div class="flex items-center justify-between">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Participating
                  Teams</label>
                <span class="text-[10px] text-violet-400 font-bold">{{ selectedTeamIds().length }}
                  selected</span>
              </div>

              @if (teams().length === 0) {
              <div class="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
                No teams found in this workspace. Please create teams first.
              </div>
              } @else {
              <div class="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                @for (team of teams(); track team.id) {
                <div (click)="toggleEventTeam(team.id)" [class]="selectedTeamIds().includes(team.id) 
                          ? 'border-violet-500/40 bg-violet-500/5' 
                          : 'border-white/5 bg-slate-950/40'"
                  class="border hover:border-violet-500/30 rounded-xl px-3 py-2 flex items-center justify-between gap-3 cursor-pointer transition-all select-none">
                  <div class="flex items-center gap-2">
                    <app-avatar [name]="team.name" [logoUrl]="team.logoUrl" customClass="w-6 h-6 rounded-lg flex-shrink-0" textClass="text-[8px] font-extrabold text-white" />
                    <span class="text-xs font-semibold text-white truncate max-w-[150px]">{{ team.name }}</span>
                  </div>
                  <div class="w-4 h-4 rounded border flex items-center justify-center transition-all" [class]="selectedTeamIds().includes(team.id)
                            ? 'bg-violet-600 border-violet-600 text-white'
                            : 'border-white/20 bg-slate-950'">
                    @if (selectedTeamIds().includes(team.id)) {
                    <i class="fi fi-rr-check text-[8px]"></i>
                    }
                  </div>
                </div>
                }
              </div>
              }
            </div>

            <!-- Full Width Action Buttons -->
            <div class="md:col-span-2 pt-2 flex gap-2">
              <button type="button" (click)="isOpen.set(false)"
                class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white hover:text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" [disabled]="isSaving() || !name()"
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
export class EventModalComponent {
  private workspaceService = inject(WorkspaceService);
  private eventService = inject(EventService);
  private uiService = inject(UiService);

  workspace = input.required<Workspace | null>();
  teams = input<Team[]>([]);
  editingEvent = input<WorkspaceEvent | null>(null);

  isOpen = model<boolean>(false);
  eventSaved = output<WorkspaceEvent>();

  // Local Form Signals
  name = signal('');
  description = signal('');
  startDate = signal('');
  endDate = signal('');
  status = signal('upcoming');
  logoUrl = signal('');
  selectedTeamIds = signal<string[]>([]);

  isSaving = signal(false);
  isUploadingLogo = signal(false);
  error = signal('');
  success = signal('');

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const event = this.editingEvent();
      if (open) {
        if (event) {
          this.name.set(event.name);
          this.description.set(event.description ?? '');
          this.startDate.set(this.formatToLocalDatetime(event.startDate));
          this.endDate.set(this.formatToLocalDatetime(event.endDate));
          this.status.set(event.status);
          this.logoUrl.set(event.logoUrl ?? '');
          this.selectedTeamIds.set(event.teams?.map(t => t.id) || []);
        } else {
          this.name.set('');
          this.description.set('');
          this.startDate.set('');
          this.endDate.set('');
          this.status.set('upcoming');
          this.logoUrl.set('');
          this.selectedTeamIds.set([]);
        }
        this.error.set('');
        this.success.set('');
      }
    }, { allowSignalWrites: true });
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

  toggleEventTeam(teamId: string) {
    this.selectedTeamIds.update(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  }

  private formatToLocalDatetime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().substring(0, 16);
  }

  onLogoUpload(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingLogo.set(true);
    this.workspaceService.uploadImage(file, 'event').subscribe({
      next: (res) => {
        this.isUploadingLogo.set(false);
        this.logoUrl.set(res.url);
        this.uiService.success('Event logo uploaded successfully.');
      },
      error: (err) => {
        this.isUploadingLogo.set(false);
        console.error(err);
        this.uiService.error('Event logo upload failed.');
      }
    });
  }

  onSubmit() {
    const ws = this.workspace();
    if (!ws || !this.name().trim()) return;

    this.isSaving.set(true);
    this.error.set('');
    this.success.set('');

    const payload = {
      name: this.name().trim(),
      description: this.description().trim() || undefined,
      startDate: this.startDate() ? new Date(this.startDate()).toISOString() : undefined,
      endDate: this.endDate() ? new Date(this.endDate()).toISOString() : undefined,
      status: this.status(),
      logoUrl: this.logoUrl() || undefined,
      teamIds: this.selectedTeamIds(),
    };

    const event = this.editingEvent();
    const request$ = event
      ? this.eventService.updateEvent(ws.id, event.id, payload)
      : this.eventService.createEvent(ws.id, payload);

    request$.subscribe({
      next: (savedEvent) => {
        this.isSaving.set(false);
        this.success.set(event ? 'Event updated successfully!' : `Event "${savedEvent.name}" created successfully!`);
        this.eventSaved.emit(savedEvent);
        setTimeout(() => this.isOpen.set(false), 1500);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.error.set(err.error?.message ?? 'Failed to save event.');
      }
    });
  }
}
