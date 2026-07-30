import { Component, inject, signal, effect, model, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import {
  Workspace,
  WorkspaceEvent,
  Competition,
  CompetitionStage,
} from '../../workspaces/services/workspace.service';
import { CompetitionService } from '../services/competition.service';
import { UiService } from '../../../core/services/ui.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';

@Component({
  selector: 'app-qualification-preview-modal',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        (click)="isOpen.set(false)"
      >
        <div
          class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
          (click)="$event.stopPropagation()"
        >
          <div
            class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500"
          ></div>

          <!-- Header -->
          <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <i class="fi fi-rr-search-alt text-violet-400 text-lg"></i>
                <span>Qualification Preview</span>
              </h3>
              <p class="text-xs text-slate-400 mt-1">
                Review the projected qualification outcomes and standings before finalizing
                advancements.
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

          <!-- Content -->
          <div class="p-6 overflow-y-auto flex-1 text-left flex flex-col gap-6">
            @if (isLoading()) {
              <div class="flex flex-col items-center justify-center py-12 gap-3">
                <svg class="animate-spin w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24">
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
                <span class="text-xs text-slate-400"
                  >Calculating standings and qualification rules...</span
                >
              </div>
            } @else if (error()) {
              <div
                class="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-rose-300 text-xs flex items-center gap-2"
              >
                <i class="fi fi-rr-info text-sm flex-shrink-0"></i>
                {{ error() }}
              </div>
            } @else if (previewData()) {
              @let data = previewData()!;

              <!-- Completion Warning Banner -->
              @if (!data.isCompleted) {
                <div
                  class="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-amber-300 text-xs flex items-start gap-3"
                >
                  <i class="fi fi-rr-warning text-base flex-shrink-0 mt-0.5"></i>
                  <div>
                    <h4 class="font-bold">Group Stage Matches Incomplete</h4>
                    <p class="mt-0.5 text-slate-300">
                      Some group matches are still pending. Organizers can view this projection, but
                      cannot publish and advance teams until all matches are finished.
                    </p>
                  </div>
                </div>
              } @else {
                <div
                  class="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-emerald-300 text-xs flex items-start gap-3"
                >
                  <i class="fi fi-rr-checkbox text-base flex-shrink-0 mt-0.5"></i>
                  <div>
                    <h4 class="font-bold">Ready to Publish</h4>
                    <p class="mt-0.5 text-slate-300">
                      All matches are completed. Publish qualification now to finalize advancements
                      to the next bracket.
                    </p>
                  </div>
                </div>
              }

              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Left 2 columns: Group Standings -->
                <div class="lg:col-span-2 flex flex-col gap-6">
                  @for (groupEntry of getGroupEntries(); track groupEntry.key) {
                    <div
                      class="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-3"
                    >
                      <h4 class="text-xs font-black text-violet-400 uppercase tracking-widest">
                        {{ groupEntry.key }}
                      </h4>
                      <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr class="text-slate-400 border-b border-white/5">
                              <th class="py-2 font-bold uppercase tracking-wider text-[9px] w-8">
                                #
                              </th>
                              <th class="py-2 font-bold uppercase tracking-wider text-[9px] pl-2">
                                Team
                              </th>
                              <th
                                class="py-2 font-bold uppercase tracking-wider text-[9px] text-center w-8"
                              >
                                P
                              </th>
                              <th
                                class="py-2 font-bold uppercase tracking-wider text-[9px] text-center w-8"
                              >
                                GD
                              </th>
                              <th
                                class="py-2 font-bold uppercase tracking-wider text-[9px] text-center w-8"
                              >
                                Pts
                              </th>
                              <th
                                class="py-2 font-bold uppercase tracking-wider text-[9px] text-right pr-2"
                              >
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (row of groupEntry.value; track row.teamId) {
                              <tr
                                class="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                              >
                                <td class="py-2.5 font-bold text-slate-400">{{ row.rank }}</td>
                                <td class="py-2.5 font-medium text-white pl-2">
                                  <div class="flex items-center gap-2">
                                    <app-avatar
                                      [name]="row.teamName"
                                      customClass="w-5 h-5 rounded flex-shrink-0"
                                      textClass="text-[8px] font-bold text-white"
                                    />
                                    <span class="truncate max-w-[120px]">{{ row.teamName }}</span>
                                  </div>
                                </td>
                                <td class="py-2.5 text-center text-slate-300 font-semibold">
                                  {{ row.played }}
                                </td>
                                <td
                                  class="py-2.5 text-center text-slate-300 font-semibold"
                                  [class.text-emerald-400]="row.gd > 0"
                                  [class.text-rose-400]="row.gd < 0"
                                >
                                  {{ row.gd > 0 ? '+' : '' }}{{ row.gd }}
                                </td>
                                <td class="py-2.5 text-center font-extrabold text-violet-400">
                                  {{ row.pts }}
                                </td>
                                <td class="py-2.5 text-right pr-2">
                                  @if (
                                    row.status === 'qualified' ||
                                    row.status === 'qualified_runner_up'
                                  ) {
                                    <span
                                      class="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase tracking-wider"
                                      >Qualified</span
                                    >
                                  } @else if (row.status === 'eliminated') {
                                    <span
                                      class="text-[9px] px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded font-bold uppercase tracking-wider"
                                      >Eliminated</span
                                    >
                                  } @else {
                                    <span
                                      class="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded font-bold uppercase tracking-wider"
                                      >Pending</span
                                    >
                                  }
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }
                </div>

                <!-- Right Column: Qualified Teams Summary & Runner-up comparisons -->
                <div class="flex flex-col gap-6">
                  <!-- Qualified List -->
                  <div
                    class="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-3"
                  >
                    <h4 class="text-xs font-bold text-white flex items-center gap-1.5">
                      <i class="fi fi-rr-check text-emerald-400"></i> Projected Advancements
                    </h4>
                    <div class="flex flex-col gap-2">
                      @for (team of data.qualifiedTeams; track team.teamId) {
                        <div
                          class="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-white/5"
                        >
                          <div class="flex items-center gap-2 min-w-0">
                            <app-avatar
                              [name]="team.teamName"
                              customClass="w-5 h-5 rounded flex-shrink-0"
                              textClass="text-[8px] font-bold text-white"
                            />
                            <span class="text-xs font-semibold text-white truncate max-w-[120px]">{{
                              team.teamName
                            }}</span>
                          </div>
                          <span
                            class="text-[9px] font-bold text-violet-400 uppercase tracking-widest px-2 py-0.5 bg-violet-500/5 border border-violet-500/10 rounded"
                            >{{ team.source }}</span
                          >
                        </div>
                      } @empty {
                        <span class="text-xs text-slate-500 py-4 text-center"
                          >No teams qualified yet.</span
                        >
                      }
                    </div>
                  </div>

                  <!-- Best Runners-up Comparison -->
                  @if (data.runnersUpComparison && data.runnersUpComparison.length > 0) {
                    <div
                      class="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-3"
                    >
                      <h4 class="text-xs font-bold text-white flex items-center gap-1.5">
                        <i class="fi fi-rr-chart-simple text-violet-400"></i> Best Runners-up
                        Standings
                      </h4>
                      <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr class="text-slate-400 border-b border-white/5">
                              <th class="py-2 font-bold uppercase tracking-wider text-[9px] w-6">
                                #
                              </th>
                              <th class="py-2 font-bold uppercase tracking-wider text-[9px]">
                                Team
                              </th>
                              <th
                                class="py-2 font-bold uppercase tracking-wider text-[9px] text-center w-8"
                              >
                                Pts
                              </th>
                              <th
                                class="py-2 font-bold uppercase tracking-wider text-[9px] text-center w-8"
                              >
                                GD
                              </th>
                              <th
                                class="py-2 font-bold uppercase tracking-wider text-[9px] text-right pr-2"
                              >
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (
                              row of data.runnersUpComparison;
                              track row.teamId;
                              let idx = $index
                            ) {
                              <tr
                                class="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                              >
                                <td class="py-2 font-bold text-slate-400">{{ idx + 1 }}</td>
                                <td class="py-2 font-medium text-white">
                                  <span
                                    class="truncate max-w-[80px] block"
                                    [title]="row.teamName"
                                    >{{ row.teamName }}</span
                                  >
                                </td>
                                <td class="py-2 text-center text-slate-300 font-semibold">
                                  {{ row.pts }}
                                </td>
                                <td
                                  class="py-2 text-center text-slate-300 font-semibold"
                                  [class.text-emerald-400]="row.gd > 0"
                                  [class.text-rose-400]="row.gd < 0"
                                >
                                  {{ row.gd > 0 ? '+' : '' }}{{ row.gd }}
                                </td>
                                <td class="py-2 text-right pr-2">
                                  @if (
                                    row.status === 'qualified_runner_up' ||
                                    row.status === 'qualified'
                                  ) {
                                    <span
                                      class="text-[8px] px-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase tracking-wider"
                                      >Adv.</span
                                    >
                                  } @else {
                                    <span
                                      class="text-[8px] px-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded font-bold uppercase tracking-wider"
                                      >Out</span
                                    >
                                  }
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Footer Actions -->
          <div class="px-6 py-4 border-t border-white/5 flex gap-3">
            <button
              type="button"
              (click)="isOpen.set(false)"
              class="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white hover:text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Close Preview
            </button>
            <button
              type="button"
              (click)="onPublish()"
              [disabled]="isPublishing() || !previewData() || !previewData()!.isCompleted"
              class="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              @if (isPublishing()) {
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
                Publishing Standings...
              } @else {
                <i class="fi fi-rr-bullhorn text-xs"></i>
                Publish Qualification & Advance
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class QualificationPreviewModalComponent {
  private competitionService = inject(CompetitionService);
  private uiService = inject(UiService);

  workspace = input.required<Workspace | null>();
  selectedEvent = input.required<WorkspaceEvent | null>();
  selectedCompetition = input.required<Competition | null>();
  selectedStage = input.required<CompetitionStage | null>();

  isOpen = model<boolean>(false);
  qualificationPublished = output<void>();

  // States
  isLoading = signal(false);
  isPublishing = signal(false);
  previewData = signal<any>(null);
  error = signal('');

  constructor() {
    effect(
      () => {
        const open = this.isOpen();
        const stage = this.selectedStage();
        const ws = this.workspace();
        const event = this.selectedEvent();
        const comp = this.selectedCompetition();

        if (open && stage && ws && event && comp) {
          this.loadPreview(ws.id, event.id, comp.id, stage.id);
        }
      },
      { allowSignalWrites: true },
    );
  }

  async loadPreview(wsId: string, eventId: string, compId: string, stageId: string) {
    this.isLoading.set(true);
    this.error.set('');
    this.previewData.set(null);

    try {
      const data = await firstValueFrom(
        this.competitionService.getQualificationPreview(wsId, eventId, compId, stageId),
      );
      this.previewData.set(data);
    } catch (err: any) {
      console.error('Failed to load qualification preview', err);
      this.error.set(err.error?.message ?? 'Failed to calculate qualification standings.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getGroupEntries(): { key: string; value: any[] }[] {
    const data = this.previewData();
    if (!data || !data.groups) return [];
    return Object.entries(data.groups).map(([key, value]) => ({ key, value: value as any[] }));
  }

  async onPublish() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!ws || !event || !comp || !stage) return;

    const confirmed = await this.uiService.confirm({
      title: 'Publish Qualification',
      message:
        'Are you sure you want to publish qualification standings? This will advance teams to the next stage.',
      confirmText: 'Publish & Advance',
      type: 'info',
    });
    if (!confirmed) return;

    this.isPublishing.set(true);
    try {
      await firstValueFrom(
        this.competitionService.publishQualification(ws.id, event.id, comp.id, stage.id),
      );
      this.uiService.success(
        'Stage qualification standings published successfully! Teams advanced.',
      );
      this.qualificationPublished.emit();
      this.isOpen.set(false);
    } catch (err: any) {
      console.error('Failed to publish qualification', err);
      this.uiService.error(err.error?.message ?? 'Failed to publish qualification standings.');
    } finally {
      this.isPublishing.set(false);
    }
  }
}
