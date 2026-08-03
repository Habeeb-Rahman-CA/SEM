import { Component, computed, input, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  CompetitionStage,
  CompetitionStats,
  CompetitionTeam,
  Match,
} from '../../../workspaces/services/workspace.service';
import { CompetitionTab, StandingRow } from '../../models/report.interface';
import { getStandingsForStage } from '../../utils/standings.util';

@Component({
  selector: 'app-competition-report-panel',
  standalone: true,
  imports: [NgClass],
  template: `
    @if (!selectedCompetitionId()) {
      <div
        class="py-8 text-center text-slate-500 text-xs font-bold border border-dashed border-white/5 rounded-xl"
      >
        Please select an Event and Competition from filters above to preview this report.
      </div>
    } @else {
      <div class="flex gap-2 mb-4">
        <button
          (click)="selectedTab.set('standings')"
          [class]="
            selectedTab() === 'standings'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
              : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/5'
          "
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
        >
          Standings Table
        </button>
        <button
          (click)="selectedTab.set('matches')"
          [class]="
            selectedTab() === 'matches'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
              : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/5'
          "
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
        >
          Fixtures & Results
        </button>
        <button
          (click)="selectedTab.set('stats')"
          [class]="
            selectedTab() === 'stats'
              ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
              : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/5'
          "
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
        >
          Leaderboard Stats
        </button>
      </div>

      <div class="bg-slate-950/20 border border-white/5 rounded-xl p-4">
        @if (selectedTab() === 'standings') {
          <div class="space-y-6">
            @for (stage of stages(); track stage.id) {
              @if (isLeague(stage)) {
                <div class="space-y-3">
                  <h3 class="text-xs font-extrabold text-white flex items-center gap-2">
                    <i class="fi fi-rr-angle-small-right text-indigo-400"></i> Stage:
                    {{ stage.name }} (Points Table)
                  </h3>
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr
                          class="border-b border-white/5 text-[10px] uppercase font-bold text-slate-500"
                        >
                          <th class="py-2.5 px-3 w-12 text-center">Pos</th>
                          <th class="py-2.5 px-3">Team</th>
                          <th class="py-2.5 px-3 text-center">P</th>
                          <th class="py-2.5 px-3 text-center">W</th>
                          <th class="py-2.5 px-3 text-center">D</th>
                          <th class="py-2.5 px-3 text-center">L</th>
                          <th class="py-2.5 px-3 text-center">GF</th>
                          <th class="py-2.5 px-3 text-center">GA</th>
                          <th class="py-2.5 px-3 text-center">GD</th>
                          <th class="py-2.5 px-3 text-center text-indigo-400 font-extrabold">
                            Pts
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-white/5">
                        @for (row of standingsFor(stage); track row.teamId; let idx = $index) {
                          <tr class="hover:bg-white/2 transition-colors">
                            <td class="py-3 px-3 text-center font-extrabold text-slate-400">
                              @if (idx === 0) {
                                <i class="fi fi-rr-medal text-amber-400"></i> 1
                              } @else if (idx === 1) {
                                <i class="fi fi-rr-medal text-slate-300"></i> 2
                              } @else if (idx === 2) {
                                <i class="fi fi-rr-medal text-amber-600"></i> 3
                              } @else {
                                {{ idx + 1 }}
                              }
                            </td>
                            <td class="py-3 px-3 font-extrabold text-white">{{ row.teamName }}</td>
                            <td class="py-3 px-3 text-center">{{ row.played }}</td>
                            <td class="py-3 px-3 text-center text-emerald-400 font-bold">
                              {{ row.won }}
                            </td>
                            <td class="py-3 px-3 text-center text-amber-400">{{ row.drawn }}</td>
                            <td class="py-3 px-3 text-center text-rose-500">{{ row.lost }}</td>
                            <td class="py-3 px-3 text-center text-slate-400">{{ row.gf }}</td>
                            <td class="py-3 px-3 text-center text-slate-400">{{ row.ga }}</td>
                            <td
                              class="py-3 px-3 text-center font-bold"
                              [ngClass]="
                                row.gd > 0
                                  ? 'text-emerald-400'
                                  : row.gd < 0
                                    ? 'text-rose-500'
                                    : 'text-slate-400'
                              "
                            >
                              {{ row.gd > 0 ? '+' : '' }}{{ row.gd }}
                            </td>
                            <td
                              class="py-3 px-3 text-center text-indigo-400 font-black bg-indigo-500/5"
                            >
                              {{ row.pts }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              } @else {
                <div class="p-3 bg-slate-900/40 rounded-xl border border-white/5">
                  <p class="text-[11px] text-slate-400 font-bold font-sans">
                    Stage: {{ stage.name }} (Knockout/Bracket Format - Points Table not applicable)
                  </p>
                </div>
              }
            }
          </div>
        }

        @if (selectedTab() === 'matches') {
          <div class="space-y-3">
            @for (m of matches(); track m.id) {
              <div
                class="flex items-center justify-between p-3 bg-slate-900/40 border border-white/5 rounded-xl hover:bg-slate-900/60 transition-colors"
              >
                <div class="flex items-center gap-4 flex-1">
                  <div class="text-right w-1/3 truncate text-xs font-black text-white">
                    {{ m.homeTeam?.name || 'TBD' }}
                  </div>
                  <div
                    class="flex items-center justify-center px-3 py-1 bg-slate-950 border border-white/10 rounded-lg text-xs font-extrabold text-white font-mono min-w-16"
                  >
                    @if (m.status === 'completed') {
                      {{ m.homeScore }} - {{ m.awayScore }}
                    } @else if (m.status === 'live') {
                      <span class="text-rose-500 animate-pulse"
                        >{{ m.homeScore }} - {{ m.awayScore }}</span
                      >
                    } @else {
                      VS
                    }
                  </div>
                  <div class="text-left w-1/3 truncate text-xs font-black text-white">
                    {{ m.awayTeam?.name || 'TBD' }}
                  </div>
                </div>
                <div class="text-right pl-4">
                  <div class="text-[10px] text-slate-500 font-bold">
                    {{ stageNameFor(m.stageId) }}
                    @if (m.config?.round) {
                      &middot; {{ m.config.round }}
                    }
                  </div>
                  <div class="text-[9px] text-slate-600 mt-0.5">
                    {{ m.venue?.name || 'No Venue' }} &middot; Status:
                    <span class="capitalize">{{ m.status }}</span>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="text-center py-6">
                <p class="text-xs text-slate-500 font-bold">No match fixtures scheduled yet.</p>
              </div>
            }
          </div>
        }

        @if (selectedTab() === 'stats') {
          @if (competitionStats()) {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-slate-900/20 border border-white/5 rounded-xl p-4 space-y-3">
                <h3 class="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <i class="fi fi-rr-star text-amber-400"></i> Top Rated Players
                </h3>
                <div class="divide-y divide-white/5 text-xs">
                  @for (p of competitionStats()?.topRated; track p.playerId; let idx = $index) {
                    <div class="flex items-center justify-between py-2">
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] text-slate-500 font-bold">#{{ idx + 1 }}</span>
                        <div>
                          <div class="font-extrabold text-white">{{ p.playerName }}</div>
                          <div class="text-[9px] text-slate-500 font-bold">{{ p.teamName }}</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-black text-indigo-400 font-mono">
                          {{ p.avgRating.toFixed(2) }}
                        </div>
                        <div class="text-[8px] text-slate-600 font-bold">
                          {{ p.appearances }} apps
                        </div>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-slate-500 text-center py-4">No rated appearances yet.</div>
                  }
                </div>
              </div>

              <div class="bg-slate-900/20 border border-white/5 rounded-xl p-4 space-y-3">
                <h3 class="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <i class="fi fi-rr-crown text-amber-500"></i> Most MVPs Won
                </h3>
                <div class="divide-y divide-white/5 text-xs">
                  @for (p of competitionStats()?.mostMvps; track p.playerId; let idx = $index) {
                    <div class="flex items-center justify-between py-2">
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] text-slate-500 font-bold">#{{ idx + 1 }}</span>
                        <div>
                          <div class="font-extrabold text-white">{{ p.playerName }}</div>
                          <div class="text-[9px] text-slate-500 font-bold">{{ p.teamName }}</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-black text-emerald-400 font-mono">{{ p.mvps }}</div>
                        <div class="text-[8px] text-slate-600 font-bold">Awards</div>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-slate-500 text-center py-4">No MVP awards issued yet.</div>
                  }
                </div>
              </div>
            </div>
          } @else {
            <div class="text-center py-6 text-slate-500 text-xs font-bold">
              Failed to load competition statistics.
            </div>
          }
        }
      </div>
    }
  `,
})
export class CompetitionReportPanel {
  selectedCompetitionId = input.required<string>();
  stages = input.required<CompetitionStage[]>();
  matches = input.required<Match[]>();
  competitionTeams = input.required<CompetitionTeam[]>();
  competitionStats = input.required<CompetitionStats | null>();

  selectedTab = signal<CompetitionTab>('standings');

  stageMap = computed(() => new Map(this.stages().map((s) => [s.id, s])));

  isLeague(stage: CompetitionStage): boolean {
    return stage.type === 'league' || stage.type === 'group' || stage.type === 'group_knockout';
  }

  stageNameFor(stageId: string | null | undefined): string {
    if (!stageId) return '';
    return this.stageMap().get(stageId)?.name || '';
  }

  standingsFor(stage: CompetitionStage): StandingRow[] {
    return getStandingsForStage(stage, this.matches(), this.competitionTeams());
  }
}
