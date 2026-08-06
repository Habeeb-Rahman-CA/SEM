import { Component, input } from '@angular/core';
import { OrganizationStatsData } from '../../models/report.interface';
import { CentsToCurrencyPipe } from '../../pipes/cents-to-currency.pipe';

@Component({
  selector: 'app-org-stats-panel',
  standalone: true,
  imports: [CentsToCurrencyPipe],
  template: `
    @if (!data()) {
      <div
        class="py-8 text-center text-slate-500 text-xs font-bold border border-dashed border-white/5 rounded-xl"
      >
        No organization-wide statistics available.
      </div>
    } @else {
      <div class="space-y-6 animate-fade-in text-white">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl">
            <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider">
              Total Players
            </div>
            <div class="text-xl font-black text-white mt-1">
              {{ data()?.participation?.totalRegisteredPlayers }}
            </div>
            <div class="text-[8px] text-slate-400 mt-0.5">
              {{ data()?.participation?.totalRegisteredTeams }} Registered Teams
            </div>
          </div>
          <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl">
            <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider">
              Total Invoiced Revenue
            </div>
            <div class="text-xl font-black text-emerald-400 mt-1">
              {{ data()?.finance?.totalRevenue | centsToCurrency }}
            </div>
            <div class="text-[8px] text-rose-400 mt-0.5">
              {{ data()?.finance?.outstandingRevenue | centsToCurrency }} Outstanding
            </div>
          </div>
          <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl">
            <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider">
              Total Est. Attendance
            </div>
            <div class="text-xl font-black text-blue-400 mt-1">
              {{ data()?.attendance?.totalAttendance }}
            </div>
            <div class="text-[8px] text-slate-400 mt-0.5">
              Avg: {{ data()?.attendance?.averageAttendance }} per event
            </div>
          </div>
          <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl">
            <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider">
              Capacity Utilization
            </div>
            <div class="text-xl font-black text-amber-500 mt-1">
              {{ data()?.attendance?.averageCapacityUtilization }}%
            </div>
            <div class="text-[8px] text-slate-400 mt-0.5">
              Across {{ data()?.attendance?.breakdown?.length }} Events
            </div>
          </div>
        </div>

        <div class="bg-slate-950/20 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3
            class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"
          >
            <i class="fi fi-rr-users text-violet-400"></i> Participation & Demographics
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-3">
              <h4 class="text-[10px] font-black text-violet-400 uppercase tracking-wider">
                Sports Distribution
              </h4>
              <div class="space-y-3">
                @for (sd of data()?.participation?.sportsDistribution; track sd.sport) {
                  <div
                    class="flex items-center justify-between text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <div class="font-extrabold text-white capitalize">{{ sd.sport }}</div>
                      <div class="text-[9px] text-slate-500">
                        {{ sd.events }} Events &middot; {{ sd.competitions }} Competitions
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="font-black text-slate-300">{{ sd.participants }}</div>
                      <div class="text-[8px] text-slate-500 uppercase font-bold">Est. Players</div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-3">
              <h4 class="text-[10px] font-black text-violet-400 uppercase tracking-wider">
                Age Division Demographics
              </h4>
              <div class="space-y-3">
                @for (ad of data()?.participation?.ageGroups; track ad.group) {
                  <div>
                    <div class="flex justify-between text-xs font-bold text-slate-300">
                      <span>{{ ad.group }} Division</span>
                      <span>{{ ad.count }} Players ({{ ad.percentage }}%)</span>
                    </div>
                    <div class="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-1.5">
                      <div
                        class="bg-violet-600 h-full rounded-full transition-all duration-1000"
                        [style.width.%]="ad.percentage"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-2">
            <h4 class="text-[10px] font-black text-violet-400 uppercase tracking-wider">
              Monthly Registration Growth
            </h4>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-white/5 text-[9px] uppercase font-bold text-slate-500">
                    <th class="py-2 px-2">Month</th>
                    <th class="py-2 px-2 text-center">New Players</th>
                    <th class="py-2 px-2 text-center">New Teams</th>
                    <th class="py-2 px-2 text-right">Total Players</th>
                    <th class="py-2 px-2 text-right">Total Teams</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5 text-slate-300">
                  @for (g of data()?.participation?.growth; track g.month) {
                    <tr>
                      <td class="py-2 px-2 font-bold">{{ g.month }}</td>
                      <td class="py-2 px-2 text-center text-emerald-400">+{{ g.newPlayers }}</td>
                      <td class="py-2 px-2 text-center text-blue-400">+{{ g.newTeams }}</td>
                      <td class="py-2 px-2 text-right">{{ g.totalPlayers }}</td>
                      <td class="py-2 px-2 text-right">{{ g.totalTeams }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="bg-slate-950/20 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3
            class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"
          >
            <i class="fi fi-rr-trophy text-indigo-400"></i> Performance & Leaderboard
          </h3>
          <div class="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-2">
            <h4 class="text-[10px] font-black text-indigo-400 uppercase tracking-wider">
              Top 5 Teams by Win Rate
            </h4>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-white/5 text-[9px] uppercase font-bold text-slate-500">
                    <th class="py-2 px-2 w-12 text-center">Rank</th>
                    <th class="py-2 px-2">Team Name</th>
                    <th class="py-2 px-2 text-center">Played</th>
                    <th class="py-2 px-2 text-center">Won</th>
                    <th class="py-2 px-2 text-center">Drawn</th>
                    <th class="py-2 px-2 text-center">Lost</th>
                    <th class="py-2 px-2 text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5 text-slate-300">
                  @for (r of data()?.performance?.teamRankings; track r.name; let idx = $index) {
                    <tr class="hover:bg-white/2 transition-colors">
                      <td class="py-2 px-2 text-center font-extrabold text-slate-400">
                        {{ idx + 1 }}
                      </td>
                      <td class="py-2 px-2 font-bold text-white">{{ r.name }}</td>
                      <td class="py-2 px-2 text-center">{{ r.played }}</td>
                      <td class="py-2 px-2 text-center text-emerald-400 font-bold">{{ r.won }}</td>
                      <td class="py-2 px-2 text-center">{{ r.drawn }}</td>
                      <td class="py-2 px-2 text-center text-rose-500">{{ r.lost }}</td>
                      <td class="py-2 px-2 text-right font-black text-indigo-400">
                        {{ r.winRate }}%
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="bg-slate-950/20 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3
            class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"
          >
            <i class="fi fi-rr-usd-square text-emerald-400"></i> Financial Analytics
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-3">
              <h4 class="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                Payment Method Distribution
              </h4>
              <div class="space-y-3">
                @for (pm of data()?.finance?.paymentMethodsDistribution; track pm.method) {
                  <div
                    class="flex items-center justify-between text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0"
                  >
                    <div class="capitalize font-bold text-white">{{ pm.method }}</div>
                    <div class="text-right">
                      <div class="font-extrabold text-emerald-400">
                        {{ pm.totalAmount | centsToCurrency }}
                      </div>
                      <div class="text-[9px] text-slate-500">{{ pm.count }} Transactions</div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-3">
              <h4 class="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                Invoice Status Counts
              </h4>
              <div class="space-y-3">
                @for (sc of data()?.finance?.statusCounts; track sc.status) {
                  <div
                    class="flex items-center justify-between text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0"
                  >
                    <div class="capitalize font-bold text-white">{{ sc.status }}</div>
                    <div class="text-right font-black text-slate-300">{{ sc.count }}</div>
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-2">
            <h4 class="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
              Monthly Billing Trend
            </h4>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-white/5 text-[9px] uppercase font-bold text-slate-500">
                    <th class="py-2 px-2">Month</th>
                    <th class="py-2 px-2 text-center">Invoices Issued</th>
                    <th class="py-2 px-2 text-right">Invoiced Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5 text-slate-300">
                  @for (m of data()?.finance?.monthlyRevenueTrend; track m.month) {
                    <tr>
                      <td class="py-2 px-2 font-bold">{{ m.month }}</td>
                      <td class="py-2 px-2 text-center">{{ m.invoicesCount }}</td>
                      <td class="py-2 px-2 text-right font-extrabold text-emerald-400">
                        {{ m.revenue | centsToCurrency }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="bg-slate-950/20 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3
            class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"
          >
            <i class="fi fi-rr-calendar-lines text-blue-400"></i> Event Attendance & Turnout
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-2">
              <h4 class="text-[10px] font-black text-blue-400 uppercase tracking-wider">
                Monthly Turnout Trend
              </h4>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      class="border-b border-white/5 text-[9px] uppercase font-bold text-slate-500"
                    >
                      <th class="py-2 px-2">Month</th>
                      <th class="py-2 px-2 text-right">Est. Attendance</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/5 text-slate-300">
                    @for (mat of data()?.attendance?.monthlyAttendanceTrend; track mat.month) {
                      <tr>
                        <td class="py-2 px-2 font-bold">{{ mat.month }}</td>
                        <td class="py-2 px-2 text-right text-blue-400 font-extrabold">
                          {{ mat.attendance }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div class="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-2">
              <h4 class="text-[10px] font-black text-blue-400 uppercase tracking-wider">
                Seasonal Activity
              </h4>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      class="border-b border-white/5 text-[9px] uppercase font-bold text-slate-500"
                    >
                      <th class="py-2 px-2">Season</th>
                      <th class="py-2 px-2 text-center">Events</th>
                      <th class="py-2 px-2 text-center">Attendance</th>
                      <th class="py-2 px-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/5 text-slate-300">
                    @for (st of data()?.seasonalTrends; track st.season) {
                      <tr>
                        <td class="py-2 px-2 font-bold capitalize text-white">{{ st.season }}</td>
                        <td class="py-2 px-2 text-center">{{ st.eventsCount }}</td>
                        <td class="py-2 px-2 text-center text-blue-400">{{ st.attendance }}</td>
                        <td class="py-2 px-2 text-right text-emerald-400 font-extrabold">
                          {{ st.revenue | centsToCurrency }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-2">
            <h4 class="text-[10px] font-black text-blue-400 uppercase tracking-wider">
              Detailed Event Attendance Breakdown
            </h4>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-white/5 text-[9px] uppercase font-bold text-slate-500">
                    <th class="py-2 px-2">Event Name</th>
                    <th class="py-2 px-2 text-center">Spectators</th>
                    <th class="py-2 px-2 text-center">Participants</th>
                    <th class="py-2 px-2 text-center">Total Attendance</th>
                    <th class="py-2 px-2 text-center">Capacity</th>
                    <th class="py-2 px-2 text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5 text-slate-300">
                  @for (b of data()?.attendance?.breakdown; track b.eventId) {
                    <tr>
                      <td class="py-2 px-2 font-bold">{{ b.eventName }}</td>
                      <td class="py-2 px-2 text-center">{{ b.spectators }}</td>
                      <td class="py-2 px-2 text-center">{{ b.participants }}</td>
                      <td class="py-2 px-2 text-center text-blue-400">{{ b.total }}</td>
                      <td class="py-2 px-2 text-center">{{ b.capacity }}</td>
                      <td class="py-2 px-2 text-right font-black text-amber-500">
                        {{ b.utilization }}%
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          class="relative overflow-hidden bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-violet-950/30 border border-violet-500/20 rounded-2xl p-6 backdrop-blur-md shadow-2xl shadow-violet-950/20 space-y-4"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25"
            >
              <i class="fi fi-rr-sparkles text-md"></i>
            </div>
            <div>
              <h3 class="text-sm font-black text-white tracking-tight">
                AI Operating Insights & Strategic Planning
              </h3>
              <p class="text-[9px] text-slate-400 font-bold">
                Predictive recommendations based on active participation growth and historical
                billing
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div class="bg-slate-950/60 border border-white/5 rounded-xl p-4 space-y-2">
              <h4 class="text-[10px] font-black text-violet-400 uppercase tracking-wider">
                Growth Forecast
              </h4>
              <p class="text-xs text-slate-300 leading-relaxed">
                {{ data()?.predictiveInsights?.growthForecast }}
              </p>
            </div>
            <div class="bg-slate-950/60 border border-white/5 rounded-xl p-4 space-y-2">
              <h4 class="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                Budget Projection
              </h4>
              <p class="text-xs text-slate-300 leading-relaxed">
                {{ data()?.predictiveInsights?.budgetProjection }}
              </p>
            </div>
            <div class="bg-slate-950/60 border border-white/5 rounded-xl p-4 space-y-2">
              <h4 class="text-[10px] font-black text-amber-500 uppercase tracking-wider">
                Efficiency Opportunities
              </h4>
              <p class="text-xs text-slate-300 leading-relaxed">
                {{ data()?.predictiveInsights?.efficiencyOpportunities }}
              </p>
            </div>
          </div>

          <div class="bg-slate-950/60 border border-white/5 rounded-xl p-4 space-y-2 mt-4">
            <h4 class="text-[10px] font-black text-violet-400 uppercase tracking-wider">
              Recommended Resource Allocation
            </h4>
            <ul class="space-y-1.5 pl-1.5">
              @for (rec of data()?.predictiveInsights?.resourceRecommendations; track rec) {
                <li class="text-[11px] text-slate-300 font-bold flex items-start gap-1.5">
                  <span class="text-violet-400 mt-0.5">•</span>
                  <span>{{ rec }}</span>
                </li>
              }
            </ul>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class OrgStatsPanel {
  data = input.required<OrganizationStatsData | null>();
}
