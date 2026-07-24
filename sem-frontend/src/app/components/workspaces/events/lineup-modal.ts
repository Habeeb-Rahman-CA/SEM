import { Component, inject, signal, effect, model, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Workspace, WorkspaceEvent, Competition, CompetitionStage, Match, Player } from '../../../services/workspace.service';
import { CompetitionService } from '../../../services/competition.service';
import { UiService } from '../../../services/ui.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';

@Component({
  selector: 'app-lineup-modal',
  standalone: true,
  imports: [FormsModule, AvatarComponent],
  template: `
    @if (isOpen()) {
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      (click)="isOpen.set(false)">
      <div
        class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden"
        (click)="$event.stopPropagation()">
        <div class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500"></div>

        <!-- Header -->
        <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i class="fi fi-rr-users text-violet-400"></i> Match Lineup Setup
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">Select the starting lineup and designated goalkeeper for both teams.</p>
          </div>
          <button (click)="isOpen.set(false)" class="text-slate-400 hover:text-white transition cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <!-- Lineup Selection Panels -->
        <div class="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          <!-- Home Team Panel -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2 border-b border-white/5 pb-2">
              <app-avatar [name]="selectedMatch()?.homeTeam?.name || 'HM'" [logoUrl]="selectedMatch()?.homeTeam?.logoUrl" customClass="w-7 h-7 rounded-lg" textClass="text-[10px] font-black text-white" />
              <h4 class="text-sm font-bold text-white">{{ selectedMatch()?.homeTeam?.name }} Starting Lineup</h4>
            </div>

            <div class="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              @for (item of getHomePlayersInForm(); track item.playerId) {
              <div class="flex items-center justify-between gap-3 p-2 border border-white/5 rounded-xl bg-slate-950/20">
                <div class="flex items-center gap-2.5 min-w-0">
                  <button (click)="togglePlayerInLineup(item.playerId)"
                    class="w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer"
                    [class]="item.isPlaying ? 'bg-violet-600 border-violet-600 text-white' : 'border-white/20 bg-slate-950'">
                    @if (item.isPlaying) { <i class="fi fi-rr-check text-[10px]"></i> }
                  </button>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-white truncate">{{ item.player.user.username }}</p>
                    <p class="text-[10px] text-slate-500">Jersey #{{ item.player.jerseyNumber || 'N/A' }}</p>
                  </div>
                </div>

                @if (item.isPlaying) {
                <button (click)="setGoalkeeper(selectedMatch()!.homeTeamId!, item.playerId)"
                  class="px-2.5 py-1 text-[9px] font-bold rounded-lg border transition-all cursor-pointer"
                  [class]="item.isGoalkeeper 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                    : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'">
                  GK
                </button>
                }
              </div>
              } @empty {
              <p class="text-xs text-slate-500 italic text-center py-4">No players registered under this team.</p>
              }
            </div>
          </div>

          <!-- Away Team Panel -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2 border-b border-white/5 pb-2">
              <app-avatar [name]="selectedMatch()?.awayTeam?.name || 'AW'" [logoUrl]="selectedMatch()?.awayTeam?.logoUrl" customClass="w-7 h-7 rounded-lg" textClass="text-[10px] font-black text-white" />
              <h4 class="text-sm font-bold text-white">{{ selectedMatch()?.awayTeam?.name }} Starting Lineup</h4>
            </div>

            <div class="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              @for (item of getAwayPlayersInForm(); track item.playerId) {
              <div class="flex items-center justify-between gap-3 p-2 border border-white/5 rounded-xl bg-slate-950/20">
                <div class="flex items-center gap-2.5 min-w-0">
                  <button (click)="togglePlayerInLineup(item.playerId)"
                    class="w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer"
                    [class]="item.isPlaying ? 'bg-violet-600 border-violet-600 text-white' : 'border-white/20 bg-slate-950'">
                    @if (item.isPlaying) { <i class="fi fi-rr-check text-[10px]"></i> }
                  </button>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-white truncate">{{ item.player.user.username }}</p>
                    <p class="text-[10px] text-slate-500">Jersey #{{ item.player.jerseyNumber || 'N/A' }}</p>
                  </div>
                </div>

                @if (item.isPlaying) {
                <button (click)="setGoalkeeper(selectedMatch()!.awayTeamId!, item.playerId)"
                  class="px-2.5 py-1 text-[9px] font-bold rounded-lg border transition-all cursor-pointer"
                  [class]="item.isGoalkeeper 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                    : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'">
                  GK
                </button>
                }
              </div>
              } @empty {
              <p class="text-xs text-slate-500 italic text-center py-4">No players registered under this team.</p>
              }
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-3">
          <button (click)="isOpen.set(false)"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white hover:text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer">
            Cancel
          </button>
          <button (click)="saveLineup()"
            class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition cursor-pointer">
            Save & Confirm Lineup
          </button>
        </div>
      </div>
    </div>
    }
  `
})
export class LineupModalComponent {
  private competitionService = inject(CompetitionService);
  private uiService = inject(UiService);

  workspace = input.required<Workspace | null>();
  selectedEvent = input.required<WorkspaceEvent | null>();
  selectedCompetition = input.required<Competition | null>();
  selectedStage = input.required<CompetitionStage | null>();
  selectedMatch = input.required<Match | null>();
  players = input<Player[]>([]);
  matchLineup = input<any[]>([]);

  isOpen = model<boolean>(false);
  lineupSaved = output<any[]>();

  lineupForm = signal<any[]>([]);

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const match = this.selectedMatch();
      const playersList = this.players();
      const currentLineup = this.matchLineup();
      if (open && match) {
        const homePlayers = playersList.filter(p => p.teamId === match.homeTeamId);
        const awayPlayers = playersList.filter(p => p.teamId === match.awayTeamId);

        const form: any[] = [];
        for (const p of homePlayers) {
          const matchEntry = currentLineup.find(le => le.playerId === p.id);
          form.push({
            playerId: p.id,
            teamId: p.teamId,
            isPlaying: matchEntry ? matchEntry.isPlaying : false,
            isGoalkeeper: matchEntry ? !!matchEntry.isGoalkeeper : false,
            player: p
          });
        }
        for (const p of awayPlayers) {
          const matchEntry = currentLineup.find(le => le.playerId === p.id);
          form.push({
            playerId: p.id,
            teamId: p.teamId,
            isPlaying: matchEntry ? matchEntry.isPlaying : false,
            isGoalkeeper: matchEntry ? !!matchEntry.isGoalkeeper : false,
            player: p
          });
        }
        this.lineupForm.set(form);
      }
    }, { allowSignalWrites: true });
  }

  getHomePlayersInForm(): any[] {
    const match = this.selectedMatch();
    if (!match) return [];
    return this.lineupForm().filter(item => item.teamId === match.homeTeamId);
  }

  getAwayPlayersInForm(): any[] {
    const match = this.selectedMatch();
    if (!match) return [];
    return this.lineupForm().filter(item => item.teamId === match.awayTeamId);
  }

  togglePlayerInLineup(playerId: string) {
    this.lineupForm.update(prev => prev.map(item => {
      if (item.playerId === playerId) {
        const nextPlaying = !item.isPlaying;
        return {
          ...item,
          isPlaying: nextPlaying,
          isGoalkeeper: nextPlaying ? item.isGoalkeeper : false
        };
      }
      return item;
    }));
  }

  setGoalkeeper(teamId: string, playerId: string) {
    this.lineupForm.update(prev => prev.map(item => {
      if (item.teamId === teamId) {
        return { ...item, isGoalkeeper: item.playerId === playerId };
      }
      return item;
    }));
  }

  saveLineup() {
    const match = this.selectedMatch();
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    const stage = this.selectedStage();
    if (!ws || !event || !comp || !stage || !match) return;

    const payload = this.lineupForm().map(item => ({
      playerId: item.playerId,
      isPlaying: item.isPlaying,
      isGoalkeeper: item.isGoalkeeper,
      teamId: item.teamId
    }));

    this.competitionService.saveMatchLineup(ws.id, event.id, comp.id, stage.id, match.id, payload).subscribe({
      next: (updatedLineup) => {
        this.lineupSaved.emit(updatedLineup);
        this.isOpen.set(false);
        this.uiService.success('Match lineup saved successfully!');
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to save match lineup.');
      }
    });
  }
}
