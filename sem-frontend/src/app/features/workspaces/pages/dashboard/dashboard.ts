import { Component, input, model, output, computed } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { Workspace } from '../../services/workspace.service';
import { getSportBadgeClass, getSportIconClass, formatMatchStatusDetail } from '../../../../shared';

@Component({
  selector: 'app-workspace-dashboard',
  standalone: true,
  imports: [NgClass, DatePipe],
  templateUrl: './dashboard.html',
})
export class WorkspaceDashboardComponent {
  workspace = input.required<Workspace | null>();
  activeTab = model<
    | 'overview'
    | 'members'
    | 'settings'
    | 'teams'
    | 'players'
    | 'events'
    | 'venues'
    | 'reports'
    | 'files'
    | 'volunteers'
    | 'equipment'
  >();

  liveMatches = input<any[]>([]);
  upcomingMatches = input<any[]>([]);
  completedMatches = input<any[]>([]);
  runningCompetitions = input<any[]>([]);
  topScorers = input<any[]>([]);
  topRatedPlayers = input<any[]>([]);

  teamsCount = input<number>(0);
  playersCount = input<number>(0);
  eventsCount = input<number>(0);
  venuesCount = input<number>(0);
  membersCount = input<number>(0);

  // Raw collections for computing dashboard widgets
  teams = input<any[]>([]);
  players = input<any[]>([]);
  events = input<any[]>([]);
  venues = input<any[]>([]);
  members = input<any[]>([]);
  notifications = input<any[]>([]);

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

  // ─── Pending Tasks ───
  pendingTasks = computed(() => {
    const tasks: any[] = [];
    const currentWorkspace = this.workspace();
    if (!currentWorkspace) return tasks;

    // Task 1: No Venues Configured
    if (this.venues().length === 0) {
      tasks.push({
        id: 'no-venues',
        title: 'Configure Venues',
        description: 'Add your first venue to start scheduling match fixtures.',
        actionLabel: 'Add Venue',
        actionTab: 'venues',
        severity: 'error',
        icon: 'fi fi-rr-marker',
      });
    }

    // Task 2: No Teams Configured
    if (this.teams().length === 0) {
      tasks.push({
        id: 'no-teams',
        title: 'Register Teams',
        description: 'Add teams to register players and schedule competitions.',
        actionLabel: 'Add Team',
        actionTab: 'teams',
        severity: 'error',
        icon: 'fi fi-rr-users-alt',
      });
    }

    // Task 3: No Events Created
    if (this.events().length === 0) {
      tasks.push({
        id: 'no-events',
        title: 'Create Event',
        description: 'Set up an event (e.g. tournament or league) to coordinate competitions.',
        actionLabel: 'New Event',
        actionTab: 'events',
        severity: 'warning',
        icon: 'fi fi-rr-trophy',
      });
    }

    // Task 4: Teams with fewer than 5 players (Understaffed for 5v5)
    const understaffed = this.teams().filter((t) => {
      const pCount = this.players().filter((p) => p.teamId === t.id).length;
      return pCount < 5;
    });
    for (const team of understaffed) {
      const pCount = this.players().filter((p) => p.teamId === team.id).length;
      tasks.push({
        id: `understaffed-${team.id}`,
        title: `Roster Alert: ${team.name}`,
        description: `Only ${pCount}/5 players registered. A minimum of 5 players is required for 5v5 soccer.`,
        actionLabel: 'Add Players',
        actionTab: 'players',
        severity: 'warning',
        icon: 'fi fi-rr-running',
      });
    }

    // Task 5: Upcoming Matches missing Venues
    const unscheduledMatches = this.upcomingMatches().filter((m) => !m.venueId && !m.venue);
    for (const match of unscheduledMatches) {
      const matchName = `${match.homeTeam?.name || 'TBD'} vs ${match.awayTeam?.name || 'TBD'}`;
      tasks.push({
        id: `unscheduled-${match.id}`,
        title: `Assign Venue`,
        description: `"${matchName}" is scheduled but lacks a playing venue.`,
        actionLabel: 'Assign Venue',
        actionTab: 'events',
        severity: 'warning',
        icon: 'fi fi-rr-calendar-clock',
      });
    }

    // Task 6: Delayed Matches
    const now = new Date();
    const delayed = this.upcomingMatches().filter(
      (m) => m.scheduledAt && new Date(m.scheduledAt) < now,
    );
    for (const match of delayed) {
      const matchName = `${match.homeTeam?.name || 'TBD'} vs ${match.awayTeam?.name || 'TBD'}`;
      tasks.push({
        id: `delayed-${match.id}`,
        title: `Delayed Match: ${matchName}`,
        description: `Scheduled to start at ${new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} but has not started yet.`,
        actionLabel: 'Start Match',
        actionTab: 'events',
        severity: 'error',
        icon: 'fi fi-rr-clock',
        match,
      });
    }

    // Task 7: Live matches running too long / unfinished matches
    const liveMatches = this.liveMatches();
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    for (const match of liveMatches) {
      const matchName = `${match.homeTeam?.name || 'TBD'} vs ${match.awayTeam?.name || 'TBD'}`;
      const isTooLong = match.updatedAt && new Date(match.updatedAt).getTime() < twoHoursAgo;
      tasks.push({
        id: `live-${match.id}`,
        title: isTooLong ? `Unfinished Match Alert: ${matchName}` : `Match In Progress`,
        description: isTooLong
          ? `Match has been live for over 2 hours. Please check status or finalize the score.`
          : `"${matchName}" is currently live. Enter scoring console to log events.`,
        actionLabel: isTooLong ? 'Review Score' : 'Score Match',
        actionTab: 'events',
        severity: isTooLong ? 'warning' : 'info',
        icon: isTooLong ? 'fi fi-rr-time-forward' : 'fi fi-rr-play-alt',
        match,
      });
    }

    // Task 7: Pending invitations
    const pendingInvites = this.members().filter((m) => m.status === 'invited');
    if (pendingInvites.length > 0) {
      tasks.push({
        id: 'pending-invites',
        title: 'Pending Collaborators',
        description: `${pendingInvites.length} pending invite(s) sent to organizers.`,
        actionLabel: 'Manage Members',
        actionTab: 'members',
        severity: 'info',
        icon: 'fi fi-rr-envelope',
      });
    }

    return tasks;
  });

  // ─── Attention Highlights ───
  attentionItems = computed(() =>
    this.pendingTasks().filter((t) => t.severity === 'error' || t.severity === 'warning'),
  );

  // ─── Recent Activities Feed ───
  recentActivities = computed(() => {
    const currentWorkspace = this.workspace();
    if (!currentWorkspace) return [];

    const wsId = currentWorkspace.id;
    // Filter and sort notifications
    const wsNotifications = this.notifications().filter((n) => n.workspaceId === wsId);
    const sorted = [...wsNotifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    if (sorted.length === 0) {
      return [
        {
          id: 'created',
          message: `Workspace "${currentWorkspace.name}" was initialized.`,
          icon: 'fi fi-rr-home',
          iconClass: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
          time: currentWorkspace.createdAt,
        },
      ];
    }

    return sorted.slice(0, 8).map((n) => {
      let icon = 'fi fi-rr-bell';
      let iconClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      const type = n.type || '';

      if (type.includes('workspace')) {
        icon = 'fi fi-rr-home';
        iconClass = 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      } else if (type.includes('member') || type.includes('invite')) {
        icon = 'fi fi-rr-users';
        iconClass = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      } else if (type.includes('team')) {
        icon = 'fi fi-rr-users-alt';
        iconClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      } else if (type.includes('player')) {
        icon = 'fi fi-rr-running';
        iconClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      } else if (type.includes('event')) {
        icon = 'fi fi-rr-trophy';
        iconClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      } else if (type.includes('competition')) {
        icon = 'fi fi-rr-list-check';
        iconClass = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      } else if (type.includes('match')) {
        icon = 'fi fi-rr-football';
        iconClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      }

      return {
        id: n.id,
        message: n.message,
        icon,
        iconClass,
        time: n.createdAt,
      };
    });
  });

  // ─── Participation Analytics ───
  avgRosterSize = computed(() => {
    const t = this.teams().length;
    return t > 0 ? (this.players().length / t).toFixed(1) : '0.0';
  });

  activeOfficials = computed(() => {
    const officialsRoles = ['owner', 'administrator', 'referee', 'statistician'];
    return this.members().filter(
      (m) => m.status === 'joined' && m.role && officialsRoles.includes(m.role.slug),
    );
  });

  venueUtilization = computed(() => {
    const list: any[] = [];
    const venues = this.venues();
    const matches = [...this.liveMatches(), ...this.upcomingMatches()];

    const counts: Record<string, number> = {};
    for (const match of matches) {
      if (match.venueId) {
        counts[match.venueId] = (counts[match.venueId] || 0) + 1;
      }
    }

    for (const v of venues) {
      list.push({
        id: v.id,
        name: v.name,
        matchCount: counts[v.id] || 0,
      });
    }

    return list.sort((a, b) => b.matchCount - a.matchCount).slice(0, 3);
  });

  sportCounts = computed(() => {
    const comps = this.runningCompetitions();
    const counts: Record<string, { count: number; name: string; code: string }> = {};

    for (const comp of comps) {
      const code = comp.sport?.code || 'football';
      const name = comp.sport?.name || 'Football';
      if (!counts[code]) {
        counts[code] = { count: 0, name, code };
      }
      counts[code].count++;
    }

    return Object.values(counts);
  });

  totalCompletedMatchesCount = computed(() => {
    let count = 0;
    for (const comp of this.runningCompetitions()) {
      if (comp.standings) {
        const sumPlayed = comp.standings.reduce(
          (acc: number, row: any) => acc + (row.played || 0),
          0,
        );
        count += Math.floor(sumPlayed / 2);
      }
    }
    return count;
  });

  // ─── Actions ───
  onTaskAction(task: any) {
    if ((task.id.startsWith('live-') || task.id.startsWith('delayed-')) && task.match) {
      this.enterLiveMatch.emit(task.match);
    } else if (task.actionTab) {
      this.activeTab.set(task.actionTab);
    }
  }

  getSportBadgeClass = getSportBadgeClass;
  getSportIconClass = getSportIconClass;
  formatMatchStatusDetail = formatMatchStatusDetail;
}
