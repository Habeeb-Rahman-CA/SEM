import { Component, computed, input } from '@angular/core';
import { Player } from '../../../workspaces/services/workspace.service';

@Component({
  selector: 'app-player-report-panel',
  standalone: true,
  template: `
    @if (!selectedPlayerId()) {
      <div
        class="py-8 text-center text-slate-500 text-xs font-bold border border-dashed border-white/5 rounded-xl"
      >
        Please select a Player from filters above to preview this report.
      </div>
    } @else {
      <div class="space-y-6">
        <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl space-y-4">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-full bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400"
            >
              <i class="fi fi-rr-running text-lg"></i>
            </div>
            <div>
              <h3 class="text-sm font-black text-white">{{ selectedPlayer()?.user?.username }}</h3>
              <p class="text-[10px] text-slate-500 font-bold">
                Jersey Number: {{ selectedPlayer()?.jerseyNumber || 'N/A' }} &middot; Team:
                {{ selectedPlayer()?.team?.name || 'N/A' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class PlayerReportPanel {
  players = input.required<Player[]>();
  selectedPlayerId = input.required<string>();

  selectedPlayer = computed(() => this.players().find((p) => p.id === this.selectedPlayerId()));
}
