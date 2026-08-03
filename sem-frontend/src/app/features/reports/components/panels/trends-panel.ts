import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ParticipationTrendsData } from '../../models/report.interface';

@Component({
  selector: 'app-trends-panel',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    @if (!data()) {
      <div
        class="py-8 text-center text-slate-500 text-xs font-bold border border-dashed border-white/5 rounded-xl"
      >
        No trends data available.
      </div>
    } @else {
      <div class="space-y-6 animate-fade-in">
        <div class="bg-slate-950/20 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3
            class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"
          >
            <i class="fi fi-rr-chart-line-up text-amber-500"></i> Monthly Participation Growth
          </h3>
          <div
            class="relative w-full h-48 bg-slate-950/40 rounded-xl p-4 flex flex-col justify-between"
          >
            <svg viewBox="0 0 500 150" class="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.3" />
                  <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
                </linearGradient>
              </defs>
              <line
                x1="0"
                y1="30"
                x2="500"
                y2="30"
                stroke="rgba(255,255,255,0.03)"
                stroke-width="1"
              />
              <line
                x1="0"
                y1="75"
                x2="500"
                y2="75"
                stroke="rgba(255,255,255,0.03)"
                stroke-width="1"
              />
              <line
                x1="0"
                y1="120"
                x2="500"
                y2="120"
                stroke="rgba(255,255,255,0.03)"
                stroke-width="1"
              />
              <path d="M 0 150 Q 125 100 250 80 T 500 20 L 500 150 Z" fill="url(#chartGrad)" />
              <path
                d="M 0 150 Q 125 100 250 80 T 500 20"
                fill="none"
                stroke="#f59e0b"
                stroke-width="2.5"
              />
              <circle cx="250" cy="80" r="4" fill="#f59e0b" stroke="#020617" stroke-width="2" />
              <circle cx="500" cy="20" r="4" fill="#f59e0b" stroke="#020617" stroke-width="2" />
            </svg>
            <div
              class="flex justify-between text-[8px] text-slate-500 font-extrabold uppercase mt-2"
            >
              @for (gt of data()?.growthTrend; track gt.month) {
                <span>{{ gt.month }}</span>
              }
            </div>
          </div>
          <div class="text-[9px] text-slate-400 font-bold">
            Cumulative Growth: Total registered players reached
            <span class="text-white font-extrabold">{{ lastTotalPlayers() }}</span>
            across all seasons.
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-slate-950/20 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3
              class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"
            >
              <i class="fi fi-rr-trophy text-amber-500"></i> Popularity by Sport
            </h3>
            <div class="space-y-4">
              @for (sd of data()?.sportsData; track sd.sport) {
                <div class="space-y-1.5">
                  <div class="flex justify-between text-xs font-bold text-slate-300 capitalize">
                    <span>{{ sd.sport }}</span>
                    <span class="text-white text-[10px] font-black"
                      >{{ sd.participantsEstimate }} Estimated Participants</span
                    >
                  </div>
                  <div class="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div
                      class="bg-gradient-to-r from-amber-500 to-yellow-500 h-full rounded-full transition-all duration-1000"
                      [style.width.%]="sd.events * 25"
                    ></div>
                  </div>
                  <div class="text-[9px] text-slate-500 font-bold">
                    {{ sd.events }} Events &middot; {{ sd.competitions }} Competitions scheduled
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="bg-slate-950/20 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3
              class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"
            >
              <i class="fi fi-rr-running text-amber-500"></i> Age-Group Demographics
            </h3>
            <div class="space-y-4">
              @for (ad of data()?.ageGroupsData; track ad.group) {
                <div
                  class="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[10px] text-amber-400 font-black animate-scale-up"
                    >
                      {{ ad.group }}
                    </div>
                    <span class="text-xs font-bold text-slate-300">Category / Group</span>
                  </div>
                  <div class="text-right">
                    <div class="text-xs font-black text-white">{{ ad.count }} Players</div>
                    <div class="text-[9px] text-amber-400 font-bold">
                      {{ ad.percentage | number: '1.1-1' }}% Distribution
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class TrendsPanel {
  data = input.required<ParticipationTrendsData | null>();

  lastTotalPlayers(): number | undefined {
    const list = this.data()?.growthTrend;
    if (!list || list.length === 0) return undefined;
    return list[list.length - 1].totalPlayers;
  }
}
