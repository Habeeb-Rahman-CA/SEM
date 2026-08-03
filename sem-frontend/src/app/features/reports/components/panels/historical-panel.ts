import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HistoricalComparisonData } from '../../models/report.interface';

@Component({
  selector: 'app-historical-panel',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    @if (!data()) {
      <div
        class="py-8 text-center text-slate-500 text-xs font-bold border border-dashed border-white/5 rounded-xl"
      >
        No historical comparisons available.
      </div>
    } @else {
      <div class="space-y-6 animate-fade-in">
        <div class="bg-slate-950/20 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3
            class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"
          >
            <i class="fi fi-rr-time-past text-cyan-500"></i> Year-Over-Year Progression
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  class="border-b border-white/5 text-slate-500 text-[10px] uppercase font-bold tracking-wider"
                >
                  <th class="pb-3 pl-2">Year</th>
                  <th class="pb-3 text-center">Total Events</th>
                  <th class="pb-3 text-center">Completed Events</th>
                  <th class="pb-3 text-center">Teams Count</th>
                  <th class="pb-3 text-center">Players (Est.)</th>
                  <th class="pb-3 text-center">Matches</th>
                  <th class="pb-3 text-center">Avg Score/Match</th>
                  <th class="pb-3 text-right pr-2">Avg Duration</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                @for (yd of data()?.yearlyData; track yd.year) {
                  <tr class="hover:bg-white/[0.02] transition-colors">
                    <td class="py-3.5 pl-2 font-black text-white">{{ yd.year }}</td>
                    <td class="py-3.5 text-center text-slate-300 font-bold">
                      {{ yd.eventsCount }}
                    </td>
                    <td class="py-3.5 text-center text-slate-300 font-bold">
                      {{ yd.completedEvents }}
                    </td>
                    <td class="py-3.5 text-center text-slate-300 font-bold">{{ yd.teamsCount }}</td>
                    <td class="py-3.5 text-center text-slate-300 font-bold">
                      {{ yd.playersEstimatedCount }}
                    </td>
                    <td class="py-3.5 text-center text-slate-300 font-bold">
                      {{ yd.matchesCount }}
                    </td>
                    <td class="py-3.5 text-center text-cyan-400 font-extrabold">
                      {{ yd.avgScorePerMatch | number: '1.1-1' }}
                    </td>
                    <td class="py-3.5 text-right pr-2 text-slate-400 font-medium">
                      {{ yd.avgDurationDays | number: '1.0-1' }} Days
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-slate-950/20 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3
            class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"
          >
            <i class="fi fi-rr-trophy text-cyan-500"></i> Recurring Tournament Series Benchmarks
          </h3>
          <div class="space-y-6">
            @for (bench of data()?.benchmarking; track bench.tournamentName) {
              <div class="bg-slate-950/40 border border-white/5 rounded-xl p-5 space-y-3">
                <div class="flex items-center justify-between border-b border-white/5 pb-2">
                  <span class="text-xs font-black text-white tracking-wide uppercase">{{
                    bench.tournamentName
                  }}</span>
                  <span class="text-[9px] text-slate-500 font-bold">Recurring Series</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  @for (run of bench.runs; track run.name) {
                    <div class="bg-slate-950 border border-white/5 rounded-lg p-3 space-y-1">
                      <div class="text-[9px] text-slate-400 font-bold">
                        {{ run.name }} ({{ run.year }})
                      </div>
                      <div class="flex justify-between items-center mt-1">
                        <span class="text-xs font-black text-white"
                          >{{ run.participants }} Teams</span
                        >
                        <span class="text-[10px] text-cyan-400 font-extrabold"
                          >{{ run.progress }}% Complete</span
                        >
                      </div>
                      <div class="text-[9px] text-slate-500 font-bold">
                        {{ run.matches }} Matches Played
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class HistoricalPanel {
  data = input.required<HistoricalComparisonData | null>();
}
