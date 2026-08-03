import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { EventDashboardData } from '../../models/report.interface';

@Component({
  selector: 'app-event-dashboard-panel',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    @if (!data()) {
      <div
        class="py-8 text-center text-slate-500 text-xs font-bold border border-dashed border-white/5 rounded-xl"
      >
        No event analytics data available.
      </div>
    } @else {
      <div class="space-y-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            class="bg-slate-950/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden group animate-fade-in"
          >
            <div
              class="absolute -right-4 -bottom-4 text-violet-500/10 text-6xl group-hover:scale-110 transition-all duration-300"
            >
              <i class="fi fi-rr-chart-histogram"></i>
            </div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Completion Rate
            </div>
            <div class="text-2xl font-black text-white mt-2">
              {{ data()?.kpis?.eventCompletionRate | number: '1.1-1' }}%
            </div>
            <div class="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                class="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-1000"
                [style.width.%]="data()?.kpis?.eventCompletionRate"
              ></div>
            </div>
          </div>
          <div
            class="bg-slate-950/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden group animate-fade-in"
          >
            <div
              class="absolute -right-4 -bottom-4 text-emerald-500/10 text-6xl group-hover:scale-110 transition-all duration-300"
            >
              <i class="fi fi-rr-calendar"></i>
            </div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Events
            </div>
            <div class="text-2xl font-black text-white mt-2">{{ data()?.kpis?.totalEvents }}</div>
            <div class="text-[9px] text-emerald-400 mt-2 font-bold flex items-center gap-1">
              <span
                class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"
              ></span>
              {{ data()?.kpis?.ongoingEvents }} Ongoing &middot;
              {{ data()?.kpis?.upcomingEvents }} Upcoming
            </div>
          </div>
          <div
            class="bg-slate-950/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden group animate-fade-in"
          >
            <div
              class="absolute -right-4 -bottom-4 text-amber-500/10 text-6xl group-hover:scale-110 transition-all duration-300"
            >
              <i class="fi fi-rr-trophy"></i>
            </div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Matches
            </div>
            <div class="text-2xl font-black text-white mt-2">{{ data()?.kpis?.totalMatches }}</div>
            <div class="text-[9px] text-amber-400 mt-2 font-bold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
              {{ data()?.kpis?.completedMatches }} Completed &middot;
              {{ data()?.kpis?.liveMatches }} Live
            </div>
          </div>
          <div
            class="bg-slate-950/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden group animate-fade-in"
          >
            <div
              class="absolute -right-4 -bottom-4 text-cyan-500/10 text-6xl group-hover:scale-110 transition-all duration-300"
            >
              <i class="fi fi-rr-users"></i>
            </div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Teams / Players
            </div>
            <div class="text-2xl font-black text-white mt-2">
              {{ data()?.kpis?.activeTeamsCount }} / {{ data()?.kpis?.activePlayersCount }}
            </div>
            <div class="text-[9px] text-slate-500 mt-2 font-bold">
              From {{ data()?.kpis?.totalRegisteredTeams }} registered teams
            </div>
          </div>
        </div>

        <div class="bg-slate-950/20 border border-white/5 rounded-2xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3
              class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"
            >
              <i class="fi fi-rr-list text-violet-500"></i> Event Breakdowns
            </h3>
            <span
              class="text-[9px] text-slate-400 font-bold bg-slate-900 border border-white/5 px-2 py-1 rounded-md"
            >
              {{ data()?.eventBreakdowns?.length }} Events Total
            </span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  class="border-b border-white/5 text-slate-500 text-[10px] uppercase font-bold tracking-wider"
                >
                  <th class="pb-3 pl-2">Event</th>
                  <th class="pb-3">Status</th>
                  <th class="pb-3">Sport</th>
                  <th class="pb-3 text-center">Teams</th>
                  <th class="pb-3 text-center">Competitions</th>
                  <th class="pb-3 text-center">Matches</th>
                  <th class="pb-3 text-right pr-2">Completion Progress</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                @for (eb of data()?.eventBreakdowns; track eb.name) {
                  <tr class="hover:bg-white/[0.02] transition-colors">
                    <td class="py-3.5 pl-2 font-bold text-white">{{ eb.name }}</td>
                    <td class="py-3.5">
                      <span
                        [class]="
                          eb.status === 'completed'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : eb.status === 'ongoing'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                              : 'bg-slate-800/40 border-slate-700/40 text-slate-400'
                        "
                        class="px-2 py-0.5 border rounded-md text-[9px] uppercase font-bold"
                      >
                        {{ eb.status }}
                      </span>
                    </td>
                    <td class="py-3.5 text-slate-400 capitalize">{{ eb.sport }}</td>
                    <td class="py-3.5 text-center text-slate-300 font-medium">
                      {{ eb.teamsRegistered }}
                    </td>
                    <td class="py-3.5 text-center text-slate-300 font-medium">
                      {{ eb.competitionsCount }}
                    </td>
                    <td class="py-3.5 text-center text-slate-300 font-medium">
                      {{ eb.matchesCount }}
                    </td>
                    <td class="py-3.5 text-right pr-2">
                      <div class="flex items-center justify-end gap-2">
                        <span class="font-extrabold text-white text-[10px]"
                          >{{ eb.progress }}%</span
                        >
                        <div
                          class="w-16 bg-slate-900 h-1.5 rounded-full overflow-hidden inline-block"
                        >
                          <div
                            class="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full"
                            [style.width.%]="eb.progress"
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    }
  `,
})
export class EventDashboardPanel {
  data = input.required<EventDashboardData | null>();
}
