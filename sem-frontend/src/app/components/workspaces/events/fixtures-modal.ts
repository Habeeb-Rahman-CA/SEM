import { Component, inject, signal, effect, model, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Workspace, WorkspaceEvent, Competition, CompetitionStage, Team } from '../../../services/workspace.service';
import { Venue } from '../../../services/venue.service';
import { CompetitionService } from '../../../services/competition.service';
import { UiService } from '../../../services/ui.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';

@Component({
  selector: 'app-fixtures-modal',
  standalone: true,
  imports: [FormsModule, AvatarComponent],
  template: `
    @if (isOpen()) {
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      (click)="isOpen.set(false)">
      <div
        class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
        (click)="$event.stopPropagation()">
        <div class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500"></div>

        <!-- Header -->
        <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <span>Setup Stage & Generate Fixtures</span>
            </h3>
            <p class="text-xs text-slate-400 mt-1">Configure competition format, groups, stages and select participating teams.</p>
          </div>
          <button (click)="isOpen.set(false)" class="text-slate-400 hover:text-white transition cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto flex-1 text-left">
          @if (error()) {
          <div class="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-rose-300 text-xs flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {{ error() }}
          </div>
          }

          <form (submit)="onSubmit(); $event.preventDefault()" class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <!-- Left Column: Config -->
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-1.5">
                <label for="f-stage-name" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stage Name</label>
                <input id="f-stage-name" type="text" placeholder="e.g. Group Stage, Main Draw"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none w-full"
                  [ngModel]="stageName()" (ngModelChange)="stageName.set($event)" name="stageName" required />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="f-stage-type" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stage Format</label>
                <select id="f-stage-type"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none w-full"
                  [ngModel]="stageType()" (ngModelChange)="stageType.set($event)" name="stageType">
                  <option value="league">Round Robin (League)</option>
                  <option value="group">Group Standings Only</option>
                  <option value="knockout">Single Elimination (Knockout)</option>
                  <option value="group_knockout">Groups + Knockouts Bracket</option>
                </select>
              </div>

              <!-- Format Specific configs -->
              @if (stageType() === 'league') {
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label for="f-games" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Games Per Team</label>
                  <input id="f-games" type="number" min="1" max="10"
                    class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none text-center"
                    [ngModel]="gamesPerTeam()" (ngModelChange)="gamesPerTeam.set($event)" name="gamesPerTeam" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label for="f-twolegged" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Match Type</label>
                  <select id="f-twolegged"
                    class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                    [ngModel]="twoLegged() ? 'true' : 'false'" (ngModelChange)="twoLegged.set($event === 'true')" name="twoLegged">
                    <option value="false">Single Legged</option>
                    <option value="true">Double Legged (Home/Away)</option>
                  </select>
                </div>
              </div>
              }

              @if (stageType() === 'group') {
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label for="f-g-count" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Groups Count</label>
                  <input id="f-g-count" type="number" min="1" max="8"
                    class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none text-center"
                    [ngModel]="groupsCount()" (ngModelChange)="groupsCount.set($event)" name="groupsCount" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label for="f-adv-count" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Advancing per Group</label>
                  <input id="f-adv-count" type="number" min="1" max="4"
                    class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none text-center"
                    [ngModel]="advancingCount()" (ngModelChange)="advancingCount.set($event)" name="advancingCount" />
                </div>
              </div>
              }

              @if (stageType() === 'knockout') {
              <div class="flex flex-col gap-1.5">
                <label for="f-ko-legs" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Match Legs</label>
                <select id="f-ko-legs"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  [ngModel]="twoLegged() ? 'true' : 'false'" (ngModelChange)="twoLegged.set($event === 'true')" name="koLegs">
                  <option value="false">Single Match (Decided on day)</option>
                  <option value="true">Two Legged (Aggregate Scores)</option>
                </select>
              </div>
              }

              @if (stageType() === 'group_knockout') {
              <div class="flex flex-col gap-4 border border-white/5 bg-slate-950/20 rounded-2xl p-4">
                <div class="flex flex-col gap-1.5">
                  <label for="f-gk-subtype" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Structure Format</label>
                  <select id="f-gk-subtype"
                    class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                    [ngModel]="groupKnockoutSubtype()" (ngModelChange)="groupKnockoutSubtype.set($event)" name="gkSubtype">
                    <option value="multiple_groups">Multiple Groups (Groups A, B... to Knockouts)</option>
                    <option value="single_group">Single Group Standings (Top teams to Finals)</option>
                  </select>
                </div>

                @if (groupKnockoutSubtype() === 'multiple_groups') {
                <div class="grid grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label for="f-gk-gcount" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Groups Count</label>
                    <select id="f-gk-gcount"
                      class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                      [ngModel]="groupsCount()" (ngModelChange)="groupsCount.set($event)" name="gkGCount">
                      <option [value]="2">2 Groups</option>
                      <option [value]="4">4 Groups</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label for="f-gk-advtype" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qualified per Group</label>
                    <select id="f-gk-advtype"
                      class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                      [ngModel]="advancingType()" (ngModelChange)="advancingType.set($event)" name="gkAdvType">
                      <option value="winner">Group Winner Only</option>
                      <option value="winner_and_runner">Winner & Runner-Up (Top 2)</option>
                    </select>
                  </div>
                </div>
                } @else {
                <div class="flex flex-col gap-1.5">
                  <label for="f-gk-advcount" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teams Advancing to Knockouts</label>
                  <select id="f-gk-advcount"
                    class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                    [ngModel]="singleGroupAdvancing()" (ngModelChange)="singleGroupAdvancing.set($event)" name="gkAdvCount">
                    <option [value]="2">Top 2 Teams (Final Match)</option>
                    <option [value]="4">Top 4 Teams (Semi-Finals Bracket)</option>
                  </select>
                </div>
                }

                <div class="flex flex-col gap-1.5">
                  <label for="f-gk-legs" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Knockout Match Legs</label>
                  <select id="f-gk-legs"
                    class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                    [ngModel]="twoLegged() ? 'true' : 'false'" (ngModelChange)="twoLegged.set($event === 'true')" name="gkLegs">
                    <option value="false">Single Legged</option>
                    <option value="true">Two Legged (Aggregate Scores)</option>
                  </select>
                </div>
              </div>
              }

              <!-- Common configs -->
              <div class="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div class="flex flex-col gap-1.5">
                  <label for="f-winpt" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Points for Win</label>
                  <input id="f-winpt" type="number"
                    class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none text-center"
                    [ngModel]="winPoint()" (ngModelChange)="winPoint.set($event)" name="winPoint" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label for="f-drawpt" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Points for Draw</label>
                  <input id="f-drawpt" type="number"
                    class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none text-center"
                    [ngModel]="drawPoint()" (ngModelChange)="drawPoint.set($event)" name="drawPoint" />
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="f-venue" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preferred Venue <span class="text-slate-500 normal-case font-normal">(optional)</span></label>
                <select id="f-venue"
                  class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  [ngModel]="venueId()" (ngModelChange)="venueId.set($event)" name="venueId">
                  <option value="">No preferred venue (scheduled manually)</option>
                  @for (venue of venues(); track venue.id) {
                  <option [value]="venue.id">{{ venue.name }} ({{ venue.location }})</option>
                  }
                </select>
              </div>
            </div>

            <!-- Right Column: Select Teams -->
            <div class="flex flex-col gap-3 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 h-full">
              <div class="flex items-center justify-between">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Teams to Enroll</label>
                <span class="text-[10px] text-violet-400 font-bold">{{ selectedFixtureTeamIds().length }} selected</span>
              </div>

              @if (teams().length === 0) {
              <div class="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
                No teams found in this workspace. Please create teams first.
              </div>
              } @else {
              <div class="grid grid-cols-1 gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                @for (team of teams(); track team.id) {
                <div (click)="toggleFixtureTeam(team.id)" [class]="selectedFixtureTeamIds().includes(team.id) 
                          ? 'border-violet-500/40 bg-violet-500/5' 
                          : 'border-white/5 bg-slate-950/40'"
                  class="border hover:border-violet-500/30 rounded-xl px-3 py-2 flex items-center justify-between gap-3 cursor-pointer transition-all select-none">
                  <div class="flex items-center gap-2">
                    <app-avatar [name]="team.name" [logoUrl]="team.logoUrl" customClass="w-6 h-6 rounded-lg flex-shrink-0" textClass="text-[8px] font-extrabold text-white" />
                    <span class="text-xs font-semibold text-white truncate max-w-[150px]">{{ team.name }}</span>
                  </div>
                  <div class="w-4 h-4 rounded border flex items-center justify-center transition-all" [class]="selectedFixtureTeamIds().includes(team.id)
                            ? 'bg-violet-600 border-violet-600 text-white'
                            : 'border-white/20 bg-slate-950'">
                    @if (selectedFixtureTeamIds().includes(team.id)) {
                    <i class="fi fi-rr-check text-[8px]"></i>
                    }
                  </div>
                </div>
                }
              </div>
              }
            </div>

            <!-- Full Width Actions -->
            <div class="md:col-span-2 pt-2 flex gap-2">
              <button type="button" (click)="isOpen.set(false)"
                class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white hover:text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" [disabled]="isGenerating() || !stageName() || selectedFixtureTeamIds().length < 2"
                class="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2">
                @if (isGenerating()) {
                <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Generating Fixtures...
                } @else { Generate Fixtures }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    }
  `
})
export class FixturesModalComponent {
  private competitionService = inject(CompetitionService);
  private uiService = inject(UiService);

  workspace = input.required<Workspace | null>();
  selectedEvent = input.required<WorkspaceEvent | null>();
  selectedCompetition = input.required<Competition | null>();
  teams = input<Team[]>([]);
  venues = input<Venue[]>([]);
  stages = input<CompetitionStage[]>([]);

  isOpen = model<boolean>(false);
  fixturesGenerated = output<void>();

  // Local Form Signals
  stageName = signal('Main Stage');
  stageType = signal<'league' | 'group' | 'knockout' | 'group_knockout'>('league');
  winPoint = signal(3);
  drawPoint = signal(1);
  twoLegged = signal(false);
  legs = signal(1);
  gamesPerTeam = signal(3);
  venueId = signal('');
  groupKnockoutSubtype = signal<'multiple_groups' | 'single_group'>('multiple_groups');
  groupsCount = signal(2);
  advancingType = signal<'winner_and_runner' | 'winner'>('winner_and_runner');
  singleGroupAdvancing = signal(2);
  advancingCount = signal(2);
  selectedFixtureTeamIds = signal<string[]>([]);

  isGenerating = signal(false);
  error = signal('');

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const existingStages = this.stages();
      const event = this.selectedEvent();
      if (open) {
        const eventTeamIds = event?.teams?.map(t => t.id) || [];
        this.selectedFixtureTeamIds.set(eventTeamIds);
        this.error.set('');

        if (existingStages.length > 0) {
          const stage = existingStages[0];
          this.stageName.set(stage.name);
          this.stageType.set(stage.type === 'group' ? 'league' : stage.type as any);
          this.winPoint.set(stage.config?.winPoint ?? 3);
          this.drawPoint.set(stage.config?.drawPoint ?? 1);
          this.twoLegged.set(stage.config?.twoLegged ?? false);
          this.groupsCount.set(stage.config?.groupsCount ?? 2);
          this.advancingCount.set(stage.config?.advancingCount ?? 2);
          this.gamesPerTeam.set(stage.config?.gamesPerTeam ?? 3);
          this.legs.set(stage.config?.legs ?? (stage.config?.twoLegged ? 2 : 1));
          this.groupKnockoutSubtype.set(stage.config?.groupKnockoutSubtype ?? 'multiple_groups');
          this.advancingType.set(stage.config?.advancingType ?? 'winner_and_runner');
          this.singleGroupAdvancing.set(stage.config?.singleGroupAdvancing ?? 2);
          this.venueId.set(stage.config?.venueId ?? '');
        } else {
          this.stageName.set('Main Stage');
          this.stageType.set('league');
          this.winPoint.set(3);
          this.drawPoint.set(1);
          this.twoLegged.set(false);
          this.legs.set(1);
          this.gamesPerTeam.set(3);
          this.venueId.set('');
          this.groupKnockoutSubtype.set('multiple_groups');
          this.groupsCount.set(2);
          this.advancingType.set('winner_and_runner');
          this.singleGroupAdvancing.set(2);
          this.advancingCount.set(2);
        }
      }
    }, { allowSignalWrites: true });
  }

  toggleFixtureTeam(teamId: string) {
    this.selectedFixtureTeamIds.update(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  }

  async onSubmit() {
    const ws = this.workspace();
    const event = this.selectedEvent();
    const comp = this.selectedCompetition();
    if (!ws || !event || !comp) return;

    const selectedIds = this.selectedFixtureTeamIds();
    if (selectedIds.length < 2) {
      this.error.set('Please select at least 2 teams to participate.');
      return;
    }

    const name = this.stageName().trim();
    if (!name) {
      this.error.set('Please enter a stage name.');
      return;
    }

    const existingStages = this.stages();
    if (existingStages.length > 0) {
      const confirmed = await this.uiService.confirm({
        title: 'Regenerate Fixtures',
        message: 'This will DELETE any existing matches and regenerate all fixtures randomly. Continue?',
        confirmText: 'Regenerate',
        type: 'warning',
      });
      if (!confirmed) return;
    }

    this.isGenerating.set(true);
    this.error.set('');

    try {
      // update competition teams selection via server call to fetch current teams
      const refreshedTeams = await firstValueFrom(this.competitionService.getCompetitionTeams(ws.id, event.id, comp.id));
      
      const config: any = {
        winPoint: this.winPoint(),
        drawPoint: this.drawPoint(),
        legs: this.twoLegged() ? 2 : 1,
        twoLegged: this.twoLegged()
      };

      if (this.stageType() === 'league') {
        config.gamesPerTeam = this.gamesPerTeam();
      } else if (this.stageType() === 'group') {
        config.groupsCount = Number(this.groupsCount());
        config.advancingCount = Number(this.advancingCount());
      } else if (this.stageType() === 'group_knockout') {
        config.groupKnockoutSubtype = this.groupKnockoutSubtype();
        config.groupsCount = this.groupKnockoutSubtype() === 'multiple_groups' ? Number(this.groupsCount()) : 1;
        config.advancingType = this.advancingType();
        config.singleGroupAdvancing = Number(this.singleGroupAdvancing());
        config.advancingCount = this.groupKnockoutSubtype() === 'multiple_groups'
          ? (this.advancingType() === 'winner_and_runner' ? 2 : 1)
          : Number(this.singleGroupAdvancing());
      }

      if (this.venueId()) {
        config.venueId = this.venueId();
      }

      const stagePayload = {
        name,
        type: this.stageType(),
        sequence: 1,
        config,
        venueId: this.venueId() || undefined,
        teamIds: selectedIds,
      };

      if (existingStages.length > 0) {
        await firstValueFrom(
          this.competitionService.updateStage(ws.id, event.id, comp.id, existingStages[0].id, stagePayload)
        );
      } else {
        await firstValueFrom(
          this.competitionService.createStage(ws.id, event.id, comp.id, stagePayload)
        );
      }

      const result = await firstValueFrom(
        this.competitionService.generateFixtures(ws.id, event.id, comp.id)
      );

      this.uiService.success(`Fixtures generated successfully! Created ${result.matchesCreated} matches.`);
      this.fixturesGenerated.emit();
      this.isOpen.set(false);
    } catch (err: any) {
      console.error('Failed to setup fixtures', err);
      this.error.set(err.error?.message ?? 'Failed to setup fixtures and generate matches.');
    } finally {
      this.isGenerating.set(false);
    }
  }
}
