import { Component, computed, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Match, Player, Team } from '../../../workspaces/services/workspace.service';
import { computeTeamStats } from '../../utils/standings.util';

@Component({
  selector: 'app-team-report-panel',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  template: `
    @if (!selectedTeamId()) {
      <div
        class="py-8 text-center text-slate-500 text-xs font-bold border border-dashed border-white/5 rounded-xl"
      >
        Please select a Team from filters above to preview this report.
      </div>
    } @else {
      <div class="space-y-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl text-center">
            <div class="text-xl font-black text-white">{{ stats().played }}</div>
            <div class="text-[9px] text-slate-500 uppercase font-bold mt-1">Played</div>
          </div>
          <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl text-center">
            <div class="text-xl font-black text-emerald-400">{{ stats().won }}</div>
            <div class="text-[9px] text-slate-500 uppercase font-bold mt-1">Wins</div>
          </div>
          <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl text-center">
            <div class="text-xl font-black text-rose-500">{{ stats().lost }}</div>
            <div class="text-[9px] text-slate-500 uppercase font-bold mt-1">Losses</div>
          </div>
          <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl text-center">
            <div class="text-xl font-black text-white font-mono">
              {{ stats().winRate | number: '1.1-1' }}%
            </div>
            <div class="text-[9px] text-slate-500 uppercase font-bold mt-1">Win Rate</div>
          </div>
        </div>

        <div class="space-y-2">
          <h3 class="text-xs font-extrabold text-white flex items-center gap-2">
            <i class="fi fi-rr-users text-slate-400"></i> Active Roster ({{ roster().length }}
            players)
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            @for (p of roster(); track p.id) {
              <div
                class="p-3 bg-slate-950/40 border border-white/5 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div class="text-xs font-extrabold text-white">{{ p.user.username }}</div>
                  <div class="text-[9px] text-slate-500">
                    Jersey Number: {{ p.jerseyNumber || 'N/A' }}
                  </div>
                </div>
                <div class="text-[9px] text-slate-500 font-mono">
                  Registered {{ p.createdAt | date: 'shortDate' }}
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class TeamReportPanel {
  selectedTeamId = input.required<string>();
  teams = input.required<Team[]>();
  players = input.required<Player[]>();
  matches = input.required<Match[]>();

  selectedTeam = computed(() => this.teams().find((t) => t.id === this.selectedTeamId()));
  roster = computed(() => this.players().filter((p) => p.teamId === this.selectedTeamId()));
  teamMatches = computed(() =>
    this.matches().filter(
      (m) => m.homeTeamId === this.selectedTeamId() || m.awayTeamId === this.selectedTeamId(),
    ),
  );
  stats = computed(() => computeTeamStats(this.selectedTeamId(), this.teamMatches()));
}
