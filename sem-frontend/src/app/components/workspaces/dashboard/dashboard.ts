import { Component, input, model, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { Workspace } from '../../../services/workspace.service';

@Component({
  selector: 'app-workspace-dashboard',
  standalone: true,
  imports: [NgClass],
  templateUrl: './dashboard.html',
})
export class WorkspaceDashboardComponent {
  workspace = input.required<Workspace | null>();
  activeTab = model<'overview' | 'members' | 'settings' | 'teams' | 'players' | 'events' | 'venues' | 'reports'>();

  liveMatches = input<any[]>([]);
  upcomingMatches = input<any[]>([]);
  runningCompetitions = input<any[]>([]);
  topScorers = input<any[]>([]);
  topRatedPlayers = input<any[]>([]);

  teamsCount = input<number>(0);
  playersCount = input<number>(0);
  eventsCount = input<number>(0);
  venuesCount = input<number>(0);
  membersCount = input<number>(0);

  canCreateEvent = input<boolean>(false);
  canManageTeams = input<boolean>(false);
  canManagePlayers = input<boolean>(false);
  canManageVenues = input<boolean>(false);

  selectedOverviewCompId = model<string>('');
  selectedOverviewComp = model<any | null>(null);

  enterLiveMatch = output<any>();

  onSelectOverviewCompetition(comp: any) {
    this.selectedOverviewCompId.set(comp.id);
    this.selectedOverviewComp.set(comp);
  }

  getSportBadgeClass(sportCode?: string): string {
    switch (sportCode?.toLowerCase()) {
      case 'football': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'cricket': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'badminton': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default: return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    }
  }

  getSportIconClass(sportCode?: string): string {
    switch (sportCode?.toLowerCase()) {
      case 'football': return 'fi fi-rr-football';
      case 'cricket': return 'fi fi-rr-bowling';
      case 'badminton': return 'fi fi-rr-trophy';
      default: return 'fi fi-rr-trophy';
    }
  }

  formatMatchStatusDetail(match: any): string {
    if (match.status !== 'live') return 'Scheduled';
    const sport = match.stage?.competition?.sport?.code || 'football';
    const live = match.liveData || {};

    if (sport === 'football') {
      const half = live.currentHalf === 1 ? '1st Half' : live.currentHalf === 2 ? '2nd Half' : live.currentHalf === 3 ? 'ET 1' : live.currentHalf === 4 ? 'ET 2' : 'Live';
      const mins = Math.floor((live.elapsedSeconds || 0) / 60);
      return `${half} ${mins}'`;
    }
    if (sport === 'cricket') {
      const overs = live.currentOvers || '0.0';
      const wkt = live.wickets || 0;
      return `Overs: ${overs} (${wkt} wkts)`;
    }
    if (sport === 'badminton') {
      return live.matchStatus || 'Game in Progress';
    }
    return 'LIVE';
  }
}
