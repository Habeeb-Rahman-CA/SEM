import { Component, input, model, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { Workspace } from '../../../services/workspace.service';
import { getSportBadgeClass, getSportIconClass, formatMatchStatusDetail } from '../../../shared';

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

  isOverviewLoading = input<boolean>(false);

  selectedOverviewCompId = model<string>('');
  selectedOverviewComp = model<any | null>(null);

  enterLiveMatch = output<any>();

  onSelectOverviewCompetition(comp: any) {
    this.selectedOverviewCompId.set(comp.id);
    this.selectedOverviewComp.set(comp);
  }

  getSportBadgeClass = getSportBadgeClass;
  getSportIconClass = getSportIconClass;
  formatMatchStatusDetail = formatMatchStatusDetail;
}

