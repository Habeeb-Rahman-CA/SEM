import { Component, input, output, signal, computed } from '@angular/core';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';

@Component({
  selector: 'app-double-elimination-bracket',
  standalone: true,
  imports: [AvatarComponent],
  template: `
    <div class="flex flex-col gap-6 w-full text-slate-100">
      <!-- Filter controls -->
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h4 class="text-sm font-bold text-white flex items-center gap-2">
            <i class="fi fi-rr-diagram-project text-violet-400"></i>
            <span>Double Elimination Bracket</span>
          </h4>
          <p class="text-xs text-slate-400">Track progression across winner & loser brackets</p>
        </div>

        <div class="flex bg-slate-950/60 p-1 rounded-xl border border-white/5">
          <button (click)="activeTab.set('all')"
            [class]="activeTab() === 'all' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20' : 'text-slate-400 border border-transparent'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer">
            <i class="fi fi-rr-apps mr-1.5"></i>All Brackets
          </button>
          <button (click)="activeTab.set('winner')"
            [class]="activeTab() === 'winner' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20' : 'text-slate-400 border border-transparent'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer">
            <i class="fi fi-rr-arrow-trend-up mr-1.5"></i>Winner Bracket
          </button>
          <button (click)="activeTab.set('loser')"
            [class]="activeTab() === 'loser' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20' : 'text-slate-400 border border-transparent'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer">
            <i class="fi fi-rr-arrow-trend-down mr-1.5"></i>Loser Bracket
          </button>
          <button (click)="activeTab.set('finals')"
            [class]="activeTab() === 'finals' ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20' : 'text-slate-400 border border-transparent'"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer">
            <i class="fi fi-rr-trophy mr-1.5"></i>Grand Finals
          </button>
        </div>
      </div>

      <!-- Main Layout -->
      <div class="flex flex-col gap-8 overflow-x-auto pb-4 custom-scrollbar">
        <!-- ── WINNER BRACKET ── -->
        @if (activeTab() === 'all' || activeTab() === 'winner') {
        <div class="flex flex-col gap-3 min-w-[800px]">
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fi fi-rr-circle-arrow-up text-emerald-400"></i> Winner Bracket
          </div>
          <div class="flex gap-6 items-stretch">
            @for (round of wbRounds(); track round.name) {
            <div class="flex-1 min-w-[240px] flex flex-col justify-around bg-slate-900/30 border border-white/5 rounded-2xl p-4 gap-4">
              <div class="text-[10px] font-bold text-slate-400 border-b border-white/5 pb-2 uppercase tracking-wide">
                {{ round.name }}
              </div>
              @for (match of round.matches; track match.id) {
              <div (click)="selectMatch(match)"
                class="bg-slate-950 border hover:border-violet-500/40 cursor-pointer rounded-xl p-3 flex flex-col gap-2 transition-all relative overflow-hidden group shadow-lg"
                [class.border-white/5]="match.status !== 'live'"
                [class.border-emerald-500/40]="match.status === 'live'">
                @if (match.status === 'live') {
                  <div class="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping m-2"></div>
                }
                
                <!-- Home team -->
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2 max-w-[170px] truncate">
                    <app-avatar [name]="match.homeTeam?.name || 'TBD'" [logoUrl]="match.homeTeam?.logoUrl" customClass="w-5 h-5 rounded-md" textClass="text-[8px] font-bold" />
                    <span [class.text-slate-400]="!match.homeTeam" [class.font-semibold]="match.homeTeam" class="truncate">
                      {{ match.homeTeam?.name || 'Winner of slot ' + (match.config?.matchSlot !== undefined ? match.config.matchSlot * 2 : 'TBD') }}
                    </span>
                  </div>
                  @if (match.status === 'completed') {
                    <span class="font-bold text-slate-300">{{ match.homeScore }}</span>
                  }
                </div>

                <!-- Away team -->
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2 max-w-[170px] truncate">
                    <app-avatar [name]="match.awayTeam?.name || 'TBD'" [logoUrl]="match.awayTeam?.logoUrl" customClass="w-5 h-5 rounded-md" textClass="text-[8px] font-bold" />
                    <span [class.text-slate-400]="!match.awayTeam" [class.font-semibold]="match.awayTeam" class="truncate">
                      {{ match.awayTeam?.name || 'Winner of slot ' + (match.config?.matchSlot !== undefined ? match.config.matchSlot * 2 + 1 : 'TBD') }}
                    </span>
                  </div>
                  @if (match.status === 'completed') {
                    <span class="font-bold text-slate-300">{{ match.awayScore }}</span>
                  }
                </div>

                <!-- Footer details -->
                <div class="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-slate-500">
                  <span class="capitalize flex items-center gap-1">
                    @if (match.status === 'live') {
                      <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Live
                    } @else if (match.status === 'completed') {
                      <i class="fi fi-rr-check-circle text-violet-400"></i> Done
                    } @else {
                      Scheduled
                    }
                  </span>
                  <span>Slot {{ match.config?.matchSlot }}</span>
                </div>
              </div>
              }
            </div>
            }
          </div>
        </div>
        }

        <!-- ── LOSER BRACKET ── -->
        @if (activeTab() === 'all' || activeTab() === 'loser') {
        <div class="flex flex-col gap-3 min-w-[800px]">
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pt-4 border-t border-white/5">
            <i class="fi fi-rr-circle-arrow-down text-rose-400"></i> Loser Bracket (One loss away from elimination)
          </div>
          <div class="flex gap-6 items-stretch">
            @for (round of lbRounds(); track round.name) {
            <div class="flex-1 min-w-[240px] flex flex-col justify-around bg-slate-900/30 border border-white/5 rounded-2xl p-4 gap-4">
              <div class="text-[10px] font-bold text-slate-400 border-b border-white/5 pb-2 uppercase tracking-wide">
                {{ round.name }}
              </div>
              @for (match of round.matches; track match.id) {
              <div (click)="selectMatch(match)"
                class="bg-slate-950 border hover:border-violet-500/40 cursor-pointer rounded-xl p-3 flex flex-col gap-2 transition-all relative overflow-hidden group shadow-lg"
                [class.border-white/5]="match.status !== 'live'"
                [class.border-emerald-500/40]="match.status === 'live'">
                @if (match.status === 'live') {
                  <div class="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping m-2"></div>
                }

                <!-- Home team -->
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2 max-w-[170px] truncate">
                    <app-avatar [name]="match.homeTeam?.name || 'TBD'" [logoUrl]="match.homeTeam?.logoUrl" customClass="w-5 h-5 rounded-md" textClass="text-[8px] font-bold" />
                    <span [class.text-slate-400]="!match.homeTeam" [class.font-semibold]="match.homeTeam" class="truncate">
                      {{ match.homeTeam?.name || 'TBD' }}
                    </span>
                  </div>
                  @if (match.status === 'completed') {
                    <span class="font-bold text-slate-300">{{ match.homeScore }}</span>
                  }
                </div>

                <!-- Away team -->
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2 max-w-[170px] truncate">
                    <app-avatar [name]="match.awayTeam?.name || 'TBD'" [logoUrl]="match.awayTeam?.logoUrl" customClass="w-5 h-5 rounded-md" textClass="text-[8px] font-bold" />
                    <span [class.text-slate-400]="!match.awayTeam" [class.font-semibold]="match.awayTeam" class="truncate">
                      {{ match.awayTeam?.name || 'TBD' }}
                    </span>
                  </div>
                  @if (match.status === 'completed') {
                    <span class="font-bold text-slate-300">{{ match.awayScore }}</span>
                  }
                </div>

                <!-- Footer details -->
                <div class="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-slate-500">
                  <span class="capitalize flex items-center gap-1">
                    @if (match.status === 'live') {
                      <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Live
                    } @else if (match.status === 'completed') {
                      <i class="fi fi-rr-check-circle text-violet-400"></i> Done
                    } @else {
                      Scheduled
                    }
                  </span>
                  <span>Slot {{ match.config?.matchSlot }}</span>
                </div>
              </div>
              }
            </div>
            }
          </div>
        </div>
        }

        <!-- ── GRAND FINALS ── -->
        @if (activeTab() === 'all' || activeTab() === 'finals') {
        <div class="flex flex-col gap-3 min-w-[400px]">
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pt-4 border-t border-t-white/5">
            <i class="fi fi-rr-trophy text-yellow-400"></i> Championship Finals
          </div>
          <div class="flex gap-6 items-stretch">
            @for (match of gfMatches(); track match.id) {
            <div class="flex-1 min-w-[240px] flex flex-col bg-slate-900/30 border border-white/5 rounded-2xl p-4 gap-4 justify-center">
              <div class="text-[10px] font-bold text-slate-400 border-b border-white/5 pb-2 uppercase tracking-wide flex justify-between">
                <span>{{ match.config?.round }}</span>
                @if (match.config?.bracket === 'grand_final_reset') {
                  <span class="text-rose-400 text-[8px] bg-rose-500/10 px-1 rounded border border-rose-500/20">Reset Match</span>
                }
              </div>

              <div (click)="selectMatch(match)"
                class="bg-slate-950 border hover:border-violet-500/40 cursor-pointer rounded-xl p-3 flex flex-col gap-2 transition-all relative overflow-hidden group shadow-lg"
                [class.border-white/5]="match.status !== 'live'"
                [class.border-emerald-500/40]="match.status === 'live'">
                @if (match.status === 'live') {
                  <div class="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping m-2"></div>
                }

                <!-- Home team -->
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2 max-w-[170px] truncate">
                    <app-avatar [name]="match.homeTeam?.name || 'TBD'" [logoUrl]="match.homeTeam?.logoUrl" customClass="w-5 h-5 rounded-md" textClass="text-[8px] font-bold" />
                    <span [class.text-slate-400]="!match.homeTeam" [class.font-semibold]="match.homeTeam" class="truncate">
                      {{ match.homeTeam?.name || 'WB Champion' }}
                    </span>
                  </div>
                  @if (match.status === 'completed') {
                    <span class="font-bold text-slate-300">{{ match.homeScore }}</span>
                  }
                </div>

                <!-- Away team -->
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2 max-w-[170px] truncate">
                    <app-avatar [name]="match.awayTeam?.name || 'TBD'" [logoUrl]="match.awayTeam?.logoUrl" customClass="w-5 h-5 rounded-md" textClass="text-[8px] font-bold" />
                    <span [class.text-slate-400]="!match.awayTeam" [class.font-semibold]="match.awayTeam" class="truncate">
                      {{ match.awayTeam?.name || 'LB Champion' }}
                    </span>
                  </div>
                  @if (match.status === 'completed') {
                    <span class="font-bold text-slate-300">{{ match.awayScore }}</span>
                  }
                </div>

                <!-- Footer details -->
                <div class="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-slate-500">
                  <span class="capitalize flex items-center gap-1">
                    @if (match.status === 'live') {
                      <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Live
                    } @else if (match.status === 'completed') {
                      <i class="fi fi-rr-check-circle text-violet-400"></i> Done
                    } @else if (match.config?.bracket === 'grand_final_reset' && match.status === 'inactive') {
                      <i class="fi fi-rr-clock text-slate-600"></i> If Required
                    } @else {
                      Scheduled
                    }
                  </span>
                  <span>Final Match</span>
                </div>
              </div>
            </div>
            }
          </div>
        </div>
        }
      </div>
    </div>
  `
})
export class DoubleEliminationBracketComponent {
  matches = input.required<any[]>();
  canScore = input<boolean>(false);
  matchSelected = output<any>();

  activeTab = signal<'all' | 'winner' | 'loser' | 'finals'>('all');

  // Parse and group WB matches
  wbRounds = computed(() => {
    const list = this.matches().filter((m) => m.config?.bracket === 'winner');
    const grouped = new Map<string, any[]>();
    for (const m of list) {
      const r = m.config?.round || 'WB Round';
      if (!grouped.has(r)) grouped.set(r, []);
      grouped.get(r)!.push(m);
    }
    
    // Sort matches within rounds by matchSlot
    for (const [r, mList] of grouped.entries()) {
      mList.sort((a, b) => (a.config?.matchSlot ?? 0) - (b.config?.matchSlot ?? 0));
    }

    // Convert map to array and sort rounds in sequence
    return Array.from(grouped.entries()).map(([name, matches]) => ({
      name,
      matches,
    })).sort((a, b) => {
      // Short simple heuristic sort
      if (a.name.includes('Final') && !b.name.includes('Final')) return 1;
      if (!a.name.includes('Final') && b.name.includes('Final')) return -1;
      return a.name.localeCompare(b.name);
    });
  });

  // Parse and group LB matches
  lbRounds = computed(() => {
    const list = this.matches().filter((m) => m.config?.bracket === 'loser');
    const grouped = new Map<string, any[]>();
    for (const m of list) {
      const r = m.config?.round || 'LB Round';
      if (!grouped.has(r)) grouped.set(r, []);
      grouped.get(r)!.push(m);
    }

    for (const [r, mList] of grouped.entries()) {
      mList.sort((a, b) => (a.config?.matchSlot ?? 0) - (b.config?.matchSlot ?? 0));
    }

    return Array.from(grouped.entries()).map(([name, matches]) => ({
      name,
      matches,
    })).sort((a, b) => {
      if (a.name.includes('Final') && !b.name.includes('Final')) return 1;
      if (!a.name.includes('Final') && b.name.includes('Final')) return -1;
      
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
      if (numA && numB) return numA - numB;
      return a.name.localeCompare(b.name);
    });
  });

  // Grand finals
  gfMatches = computed(() => {
    return this.matches()
      .filter((m) => m.config?.bracket === 'grand_final' || m.config?.bracket === 'grand_final_reset')
      .sort((a, b) => {
        const valA = a.config?.bracket === 'grand_final_reset' ? 1 : 0;
        const valB = b.config?.bracket === 'grand_final_reset' ? 1 : 0;
        return valA - valB;
      });
  });

  selectMatch(match: any) {
    // If the match is not inactive (like an un-triggered Grand Final Reset match) and canScore is true
    if (match.status !== 'inactive') {
      this.matchSelected.emit(match);
    }
  }
}
