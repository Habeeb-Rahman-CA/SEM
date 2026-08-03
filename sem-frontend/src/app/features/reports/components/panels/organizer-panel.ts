import { Component, input } from '@angular/core';
import { OrganizerInsightsData } from '../../models/report.interface';

@Component({
  selector: 'app-organizer-panel',
  standalone: true,
  template: `
    @if (!data()) {
      <div
        class="py-8 text-center text-slate-500 text-xs font-bold border border-dashed border-white/5 rounded-xl"
      >
        No organizer insights available.
      </div>
    } @else {
      <div class="space-y-6 animate-fade-in">
        <div
          class="relative overflow-hidden bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-rose-950/30 border border-violet-500/20 rounded-2xl p-6 backdrop-blur-md shadow-2xl shadow-violet-950/20 space-y-4"
        >
          <div
            class="absolute -right-16 -top-16 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl"
          ></div>
          <div
            class="absolute -left-16 -bottom-16 w-32 h-32 bg-rose-600/10 rounded-full blur-3xl"
          ></div>

          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25"
            >
              <i class="fi fi-rr-sparkles text-md"></i>
            </div>
            <div>
              <h3 class="text-sm font-black text-white tracking-tight">
                AI-Driven Operational Recommendations
              </h3>
              <p class="text-[9px] text-slate-400 font-bold">
                Calculated from historical audit logs, venue metrics, and match schedules
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div class="bg-slate-950/60 border border-white/5 rounded-xl p-4 space-y-2">
              <h4
                class="text-[10px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5"
              >
                <i class="fi fi-rr-exclamation text-xs"></i> Key Bottlenecks Identified
              </h4>
              <ul class="space-y-1.5">
                @for (bot of data()?.aiRecommendation?.bottlenecksIdentified; track bot) {
                  <li class="text-[11px] text-slate-300 font-bold flex items-start gap-1.5">
                    <span class="text-rose-500 mt-0.5">•</span>
                    <span>{{ bot }}</span>
                  </li>
                }
              </ul>
            </div>

            <div class="bg-slate-950/60 border border-white/5 rounded-xl p-4 space-y-2">
              <h4
                class="text-[10px] font-black text-violet-400 uppercase tracking-wider flex items-center gap-1.5"
              >
                <i class="fi fi-rr-bulb text-xs"></i> Actionable Solutions
              </h4>
              <ul class="space-y-1.5">
                @for (rec of data()?.aiRecommendation?.recommendations; track rec) {
                  <li class="text-[11px] text-slate-300 font-bold flex items-start gap-1.5">
                    <span class="text-violet-400 mt-0.5">•</span>
                    <span>{{ rec }}</span>
                  </li>
                }
              </ul>
            </div>
          </div>

          <div
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs"
          >
            <div class="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              Estimated Efficiency Score Gain:
              <span class="text-emerald-400 font-black">{{
                data()?.aiRecommendation?.predictedEfficiencyGain
              }}</span>
            </div>
            <button
              class="bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-white px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all duration-300 flex items-center gap-1.5 active:scale-95"
            >
              Optimize Schedule Flow <i class="fi fi-rr-arrow-small-right"></i>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-slate-950/20 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3
              class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"
            >
              <i class="fi fi-rr-users text-rose-500"></i> Organizer Activity & Productivity
            </h3>
            <div class="space-y-4">
              @for (op of data()?.productivity; track op.name) {
                <div class="space-y-1.5">
                  <div class="flex justify-between text-xs font-bold text-slate-300 capitalize">
                    <span>{{ op.name }}</span>
                    <span class="text-white text-[10px] font-black"
                      >{{ op.totalActions }} Actions</span
                    >
                  </div>
                  <div class="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div
                      class="bg-gradient-to-r from-rose-500 to-orange-500 h-full rounded-full transition-all duration-1000"
                      [style.width.%]="op.totalActions * 2"
                    ></div>
                  </div>
                  <div class="text-[9px] text-slate-500 font-bold">
                    {{ op.scoreUpdates }} Scores Updated &middot; {{ op.matchesCreated }} Matches
                    Created
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="bg-slate-950/20 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3
              class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"
            >
              <i class="fi fi-rr-exclamation text-rose-500"></i> Operational Warnings
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div
                class="bg-slate-950 border border-white/5 rounded-xl p-4 flex flex-col justify-center items-center text-center space-y-2"
              >
                <div
                  class="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400"
                >
                  <i class="fi fi-rr-clock text-sm"></i>
                </div>
                <div>
                  <div class="text-xl font-black text-white">
                    {{ data()?.bottlenecks?.delayedMatchesCount }}
                  </div>
                  <div class="text-[9px] text-slate-500 uppercase font-bold mt-1">
                    Delayed Matches
                  </div>
                </div>
              </div>
              <div
                class="bg-slate-950 border border-white/5 rounded-xl p-4 flex flex-col justify-center items-center text-center space-y-2"
              >
                <div
                  class="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400"
                >
                  <i class="fi fi-rr-marker text-sm"></i>
                </div>
                <div>
                  <div class="text-xl font-black text-white">
                    {{ data()?.bottlenecks?.venueConflictsCount }}
                  </div>
                  <div class="text-[9px] text-slate-500 uppercase font-bold mt-1">
                    Venue Conflicts
                  </div>
                </div>
              </div>
            </div>
            <div
              class="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-[10px] text-rose-300 font-bold flex items-start gap-2"
            >
              <i class="fi fi-rr-info text-xs mt-0.5"></i>
              <span
                >Delayed matches represent scheduled matches that remained unplayed more than 2
                hours after their kickoff time.</span
              >
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class OrganizerPanel {
  data = input.required<OrganizerInsightsData | null>();
}
