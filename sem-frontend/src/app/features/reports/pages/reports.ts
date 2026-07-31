import { Component, input, signal, inject, computed } from '@angular/core';
import { NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  WorkspaceService,
  Workspace,
  WorkspaceMember,
  Role,
  Team,
  Player,
  WorkspaceEvent,
  Venue,
  Competition,
  CompetitionStage,
  CompetitionTeam,
  Match,
  CompetitionStats,
  Sport,
} from '../../workspaces/services/workspace.service';
import { CompetitionService } from '../../competitions/services/competition.service';
import { AnalyticsService } from '../services/analytics.service';
import { VolunteerService, Volunteer } from '../../volunteers/services/volunteer.service';

@Component({
  selector: 'app-workspace-reports',
  standalone: true,
  imports: [NgClass, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './reports.html',
})
export class WorkspaceReportsComponent {
  private competitionService = inject(CompetitionService);
  private workspaceService = inject(WorkspaceService);
  private analyticsService = inject(AnalyticsService);
  private volunteerService = inject(VolunteerService);

  workspace = input.required<Workspace | null>();
  teams = input.required<Team[]>();
  players = input.required<Player[]>();
  events = input.required<WorkspaceEvent[]>();
  venues = input.required<Venue[]>();
  members = input.required<WorkspaceMember[]>();
  roles = input.required<Role[]>();

  volunteerReportsData = signal<any[]>([]);

  totalVolunteersCount = computed(() => this.volunteerReportsData().length);
  totalStaffedShiftsCount = computed(() => {
    let count = 0;
    this.volunteerReportsData().forEach((v) => {
      count += (v.assignments || []).length;
    });
    return count;
  });
  totalServiceHoursLogged = computed(() => {
    let hours = 0;
    this.volunteerReportsData().forEach((v) => {
      const completed = (v.assignments || []).filter((a: any) => a.status === 'attended');
      completed.forEach((a: any) => {
        hours += Number(a.serviceHours || 0);
      });
    });
    return hours;
  });
  averageVolunteerRating = computed(() => {
    let sum = 0;
    let count = 0;
    this.volunteerReportsData().forEach((v) => {
      const completed = (v.assignments || []).filter(
        (a: any) => a.status === 'attended' && a.rating !== null,
      );
      completed.forEach((a: any) => {
        sum += Number(a.rating);
        count++;
      });
    });
    return count > 0 ? (sum / count).toFixed(1) : '4.8';
  });

  getVolunteerHours(v: any): number {
    const completed = (v.assignments || []).filter((a: any) => a.status === 'attended');
    return completed.reduce((sum: number, a: any) => sum + Number(a.serviceHours || 0), 0);
  }

  // State
  reportType = signal<
    | 'workspace'
    | 'event'
    | 'competition'
    | 'team'
    | 'player'
    | 'event-dashboard'
    | 'trends'
    | 'historical'
    | 'organizer'
    | 'org-stats'
    | 'volunteer'
  >('workspace');
  selectedSport = signal<string>('');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  selectedTeamId = signal<string>('');
  selectedPlayerId = signal<string>('');

  // Analytics Data States
  eventReportsData = signal<any>(null);
  participationTrendsData = signal<any>(null);
  historicalComparisonsData = signal<any>(null);
  organizerInsightsData = signal<any>(null);
  organizationStatsData = signal<any>(null);
  isLoadingAnalytics = signal<boolean>(false);

  sports = signal<Sport[]>([]);

  selectedEventId = signal<string>('');
  selectedCompetitionId = signal<string>('');
  isLoadingCompetitions = signal<boolean>(false);
  competitions = signal<Competition[]>([]);

  isLoadingDetails = signal<boolean>(false);
  competitionStats = signal<CompetitionStats | null>(null);
  stages = signal<CompetitionStage[]>([]);
  matches = signal<Match[]>([]);
  competitionTeams: CompetitionTeam[] = [];

  selectedTab = signal<'standings' | 'matches' | 'stats'>('standings');

  // Loading spinner states for exports
  isGeneratingWorkspaceReport = signal<boolean>(false);
  isGeneratingPlayerReport = signal<boolean>(false);
  isGeneratingCompExcel = signal<boolean>(false);
  isGeneratingEventExcel = signal<boolean>(false);
  isGeneratingTeamExcel = signal<boolean>(false);
  isGeneratingAnalyticsExcel = signal<boolean>(false);

  isGeneratingExcel = computed(() => {
    const type = this.reportType();
    if (type === 'workspace') return this.isGeneratingWorkspaceReport();
    if (type === 'event') return this.isGeneratingEventExcel();
    if (type === 'competition') return this.isGeneratingCompExcel();
    if (type === 'team') return this.isGeneratingTeamExcel();
    if (type === 'player') return this.isGeneratingPlayerReport();
    if (
      ['event-dashboard', 'trends', 'historical', 'organizer', 'org-stats', 'volunteer'].includes(
        type,
      )
    )
      return this.isGeneratingAnalyticsExcel();
    return false;
  });

  downloadExcelReport() {
    const type = this.reportType();
    if (type === 'workspace') this.downloadWorkspaceReport();
    else if (type === 'event') this.downloadEventExcel();
    else if (type === 'competition') this.downloadCompetitionExcel();
    else if (type === 'team') this.downloadTeamExcel();
    else if (type === 'player') this.downloadPlayerExcel();
    else if (type === 'event-dashboard') this.downloadEventDashboardExcel();
    else if (type === 'trends') this.downloadParticipationTrendsExcel();
    else if (type === 'historical') this.downloadHistoricalComparisonsExcel();
    else if (type === 'organizer') this.downloadOrganizerInsightsExcel();
    else if (type === 'org-stats') this.downloadOrganizationStatsExcel();
    else if (type === 'volunteer') this.downloadVolunteerExcel();
  }

  ngOnInit() {
    this.loadSports();
  }

  loadSports() {
    this.workspaceService.getSports().subscribe({
      next: (list) => this.sports.set(list),
      error: (err) => console.error('Failed to load sports', err),
    });
  }

  filteredEventsList = computed(() => {
    let list = this.events();
    const sportCode = this.selectedSport();
    const from = this.dateFrom();
    const to = this.dateTo();
    if (sportCode) {
      list = list.filter((e) => e.sport?.toLowerCase() === sportCode.toLowerCase());
    }
    if (from) {
      const fromDate = new Date(from);
      list = list.filter((e) => e.startDate && new Date(e.startDate) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      list = list.filter((e) => e.endDate && new Date(e.endDate) <= toDate);
    }
    return list;
  });

  filteredCompetitionsList = computed(() => {
    let list = this.competitions();
    const sportCode = this.selectedSport();
    if (sportCode) {
      list = list.filter((c) => c.sport?.code.toLowerCase() === sportCode.toLowerCase());
    }
    return list;
  });

  selectedTeam = computed(() => this.teams().find((t) => t.id === this.selectedTeamId()));
  teamRoster = computed(() => this.players().filter((p) => p.teamId === this.selectedTeamId()));
  teamMatches = computed(() =>
    this.matches().filter(
      (m) => m.homeTeamId === this.selectedTeamId() || m.awayTeamId === this.selectedTeamId(),
    ),
  );
  teamStats = computed(() => {
    const list = this.teamMatches();
    const teamId = this.selectedTeamId();
    let played = 0,
      won = 0,
      drawn = 0,
      lost = 0,
      gf = 0,
      ga = 0;
    for (const m of list) {
      if (m.status !== 'completed') continue;
      played++;
      const isHome = m.homeTeamId === teamId;
      const tScore = isHome ? m.homeScore : m.awayScore;
      const oScore = isHome ? m.awayScore : m.homeScore;
      gf += tScore;
      ga += oScore;
      if (tScore > oScore) won++;
      else if (tScore < oScore) lost++;
      else drawn++;
    }
    const winRate = played > 0 ? (won / played) * 100 : 0;
    return { played, won, drawn, lost, gf, ga, gd: gf - ga, winRate };
  });

  selectedPlayer = computed(() => this.players().find((p) => p.id === this.selectedPlayerId()));

  onEventChange(eventId: string) {
    this.selectedEventId.set(eventId);
    this.selectedCompetitionId.set('');
    this.competitions.set([]);
    this.stages.set([]);
    this.matches.set([]);
    this.competitionStats.set(null);
    this.competitionTeams = [];

    if (!eventId) return;
    this.loadEventDetails(eventId);
  }

  loadEventDetails(eventId: string) {
    const wsId = this.workspace()?.id;
    if (!wsId || !eventId) return;

    this.isLoadingDetails.set(true);
    this.competitionService.getCompetitions(wsId, eventId).subscribe({
      next: (comps) => {
        this.competitions.set(comps);
        if (comps.length === 0) {
          this.stages.set([]);
          this.matches.set([]);
          this.isLoadingDetails.set(false);
          return;
        }

        const stageRequests = comps.map((c) =>
          this.competitionService.getStages(wsId, eventId, c.id),
        );
        forkJoin(stageRequests).subscribe({
          next: (stagesArrays) => {
            const allStages = stagesArrays.flat();
            this.stages.set(allStages);
            if (allStages.length === 0) {
              this.matches.set([]);
              this.isLoadingDetails.set(false);
              return;
            }

            const matchRequests = allStages.map((s) => {
              const comp = comps.find((c) => c.id === s.competitionId);
              if (!comp) return this.competitionService.getMatches(wsId, eventId, '', s.id);
              return this.competitionService.getMatches(wsId, eventId, comp.id, s.id);
            });

            forkJoin(matchRequests).subscribe({
              next: (matchesArrays) => {
                this.matches.set(matchesArrays.flat());
                this.isLoadingDetails.set(false);
              },
              error: (err) => {
                console.error('Failed to load event matches', err);
                this.isLoadingDetails.set(false);
              },
            });
          },
          error: (err) => {
            console.error('Failed to load event stages', err);
            this.isLoadingDetails.set(false);
          },
        });
      },
      error: (err) => {
        console.error('Failed to load event competitions', err);
        this.isLoadingDetails.set(false);
      },
    });
  }

  onCompetitionChange(competitionId: string) {
    this.selectedCompetitionId.set(competitionId);
    this.stages.set([]);
    this.matches.set([]);
    this.competitionStats.set(null);
    this.competitionTeams = [];

    if (!competitionId) return;
    this.loadCompetitionDetails(competitionId);
  }

  loadCompetitionDetails(competitionId: string) {
    const wsId = this.workspace()?.id;
    const eventId = this.selectedEventId();
    if (!wsId || !eventId || !competitionId) return;

    this.isLoadingDetails.set(true);

    forkJoin({
      stages: this.competitionService.getStages(wsId, eventId, competitionId),
      teams: this.competitionService.getCompetitionTeams(wsId, eventId, competitionId),
      stats: this.competitionService.getCompetitionStats(wsId, eventId, competitionId),
    }).subscribe({
      next: (res) => {
        this.stages.set(res.stages);
        this.competitionTeams = res.teams;
        this.competitionStats.set(res.stats);

        if (res.stages.length > 0) {
          const matchRequests = res.stages.map((s) =>
            this.competitionService.getMatches(wsId, eventId, competitionId, s.id),
          );
          forkJoin(matchRequests).subscribe({
            next: (matchesArrays) => {
              this.matches.set(matchesArrays.flat());
              this.isLoadingDetails.set(false);
            },
            error: (err) => {
              console.error('Failed to load matches', err);
              this.isLoadingDetails.set(false);
            },
          });
        } else {
          this.matches.set([]);
          this.isLoadingDetails.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to load competition details', err);
        this.isLoadingDetails.set(false);
      },
    });
  }

  getStandingsForStage(stage: CompetitionStage): any[] {
    const matchesList = this.matches().filter((m) => m.stageId === stage.id);
    const winPts = stage.config?.winPoint ?? 3;
    const drawPts = stage.config?.drawPoint ?? 1;

    const statsMap = new Map<string, any>();

    for (const ct of this.competitionTeams) {
      statsMap.set(ct.teamId, {
        teamId: ct.teamId,
        teamName: ct.team.name,
        teamLogoUrl: ct.team.logoUrl,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
      });
    }

    for (const match of matchesList) {
      if (match.status !== 'completed') continue;
      if (!match.homeTeamId || !match.awayTeamId) continue;

      const home = statsMap.get(match.homeTeamId);
      const away = statsMap.get(match.awayTeamId);

      if (!home || !away) continue;

      home.played++;
      away.played++;

      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;

      home.gf += homeScore;
      home.ga += awayScore;
      away.gf += awayScore;
      away.ga += homeScore;

      if (homeScore > awayScore) {
        home.won++;
        home.pts += winPts;
        away.lost++;
      } else if (homeScore < awayScore) {
        away.won++;
        away.pts += winPts;
        home.lost++;
      } else {
        home.drawn++;
        home.pts += drawPts;
        away.drawn++;
        away.pts += drawPts;
      }

      home.gd = home.gf - home.ga;
      away.gd = away.gf - away.ga;
    }

    return Array.from(statsMap.values()).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  }

  async downloadWorkspaceReport() {
    this.isGeneratingWorkspaceReport.set(true);
    try {
      const XLSX = (await import('xlsx-js-style')) as any;
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary Info
      const wsInfoData = [
        ['Workspace Name', this.workspace()?.name],
        ['Slug', this.workspace()?.slug],
        ['Description', this.workspace()?.description || 'N/A'],
        ['Created At', this.workspace()?.createdAt],
        ['Total Teams', this.teams().length],
        ['Total Players', this.players().length],
        ['Total Events', this.events().length],
        ['Total Venues', this.venues().length],
        ['Total Collaborators', this.members().length],
      ];
      const wsInfo = XLSX.utils.aoa_to_sheet(wsInfoData);

      // Sheet 2: Teams
      const teamsData = this.teams().map((t) => ({
        'Team Name': t.name,
        Code: t.code,
        Description: t.description || '',
        'Created Date': new Date(t.createdAt).toLocaleDateString(),
      }));
      const wsTeams = XLSX.utils.json_to_sheet(teamsData);

      // Sheet 3: Players
      const playersData = this.players().map((p) => ({
        Username: p.user.username,
        'Jersey Number': p.jerseyNumber || 'N/A',
        'Team Name': p.team?.name || 'N/A',
        'Registered Date': new Date(p.createdAt).toLocaleDateString(),
      }));
      const wsPlayers = XLSX.utils.json_to_sheet(playersData);

      // Sheet 4: Venues
      const venuesData = this.venues().map((v) => ({
        'Venue Name': v.name,
        Location: v.location || '',
        'Created Date': new Date(v.createdAt).toLocaleDateString(),
      }));
      const wsVenues = XLSX.utils.json_to_sheet(venuesData);

      // Sheet 5: Events
      const eventsData = this.events().map((e) => ({
        'Event Name': e.name,
        Status: e.status,
        'Start Date': e.startDate ? new Date(e.startDate).toLocaleDateString() : 'N/A',
        'End Date': e.endDate ? new Date(e.endDate).toLocaleDateString() : 'N/A',
        Description: e.description || '',
      }));
      const wsEvents = XLSX.utils.json_to_sheet(eventsData);

      const sheets = [
        { name: 'Summary', ws: wsInfo, isAoa: true },
        { name: 'Teams', ws: wsTeams },
        { name: 'Players', ws: wsPlayers },
        { name: 'Venues', ws: wsVenues },
        { name: 'Events', ws: wsEvents },
      ];

      for (const sheet of sheets) {
        const range = XLSX.utils.decode_range(sheet.ws['!ref'] || 'A1:A1');
        const cols: any[] = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          let maxLen = 12;
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cell = sheet.ws[XLSX.utils.encode_cell({ r: R, c: C })];
            if (cell && cell.v) {
              maxLen = Math.max(maxLen, cell.v.toString().length);
            }
          }
          cols.push({ wch: maxLen + 2 });
        }
        sheet.ws['!cols'] = cols;

        const endRow = sheet.isAoa ? range.e.r : 0;
        for (let R = 0; R <= endRow; ++R) {
          if (sheet.isAoa && R > 0) continue;
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: R, c: C });
            if (!sheet.ws[address]) continue;

            if (R === 0 || (sheet.isAoa && C === 0)) {
              sheet.ws[address].s = {
                fill: { fgColor: { rgb: '5B21B6' } },
                font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Segoe UI', size: 10 },
                alignment: { horizontal: 'left', vertical: 'center' },
              };
            } else {
              sheet.ws[address].s = {
                font: { name: 'Segoe UI', size: 10 },
                alignment: { vertical: 'center' },
              };
            }
          }
        }

        XLSX.utils.book_append_sheet(wb, sheet.ws, sheet.name);
      }

      XLSX.writeFile(wb, `${this.workspace()?.slug}_workspace_report.xlsx`);
    } catch (err) {
      console.error('Failed to generate workspace report', err);
    } finally {
      this.isGeneratingWorkspaceReport.set(false);
    }
  }

  async downloadPlayerReport() {
    this.isGeneratingPlayerReport.set(true);
    try {
      const XLSX = (await import('xlsx-js-style')) as any;
      const wb = XLSX.utils.book_new();

      const playersList = this.players();
      const playersData = playersList.map((p) => {
        const member = this.members().find((m) => m.userId === p.userId);
        return {
          Username: p.user.username,
          'Jersey Number': p.jerseyNumber || 'N/A',
          'Team Name': p.team?.name || 'N/A',
          'Workspace Role': member?.role?.name || 'Viewer',
          'Registered At': new Date(p.createdAt).toLocaleDateString(),
        };
      });

      const wsPlayers = XLSX.utils.json_to_sheet(playersData);
      const range = XLSX.utils.decode_range(wsPlayers['!ref'] || 'A1:A1');
      const cols: any[] = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxLen = 12;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cell = wsPlayers[XLSX.utils.encode_cell({ r: R, c: C })];
          if (cell && cell.v) {
            maxLen = Math.max(maxLen, cell.v.toString().length);
          }
        }
        cols.push({ wch: maxLen + 2 });
      }
      wsPlayers['!cols'] = cols;

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (wsPlayers[address]) {
          wsPlayers[address].s = {
            fill: { fgColor: { rgb: '5B21B6' } },
            font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Segoe UI', size: 10 },
            alignment: { horizontal: 'left', vertical: 'center' },
          };
        }
      }

      XLSX.utils.book_append_sheet(wb, wsPlayers, 'Player Roster');
      XLSX.writeFile(wb, `${this.workspace()?.slug}_player_report.xlsx`);
    } catch (err) {
      console.error('Failed to generate player report', err);
    } finally {
      this.isGeneratingPlayerReport.set(false);
    }
  }

  async downloadCompetitionExcel() {
    const comp = this.competitions().find((c) => c.id === this.selectedCompetitionId());
    if (!comp) return;

    this.isGeneratingCompExcel.set(true);

    try {
      const XLSX = (await import('xlsx-js-style')) as any;
      const wb = XLSX.utils.book_new();

      // Sheet 1: Standings
      const standingsData: any[] = [];
      const leagueStages = this.stages().filter(
        (s) => s.type === 'league' || s.type === 'group' || s.type === 'group_knockout',
      );

      if (leagueStages.length > 0) {
        for (const stage of leagueStages) {
          standingsData.push([`Stage: ${stage.name}`]);
          standingsData.push([
            'Rank',
            'Team Name',
            'Played',
            'Won',
            'Drawn',
            'Lost',
            'GF',
            'GA',
            'GD',
            'Points',
          ]);

          const standings = this.getStandingsForStage(stage);
          standings.forEach((row, idx) => {
            standingsData.push([
              idx + 1,
              row.teamName,
              row.played,
              row.won,
              row.drawn,
              row.lost,
              row.gf,
              row.ga,
              row.gd,
              row.pts,
            ]);
          });
          standingsData.push([]);
        }
      } else {
        standingsData.push(['No league/group standings available for this format.']);
      }
      const wsStandings = XLSX.utils.aoa_to_sheet(standingsData);

      // Sheet 2: Matches
      const matchesData = this.matches().map((m) => ({
        Stage: this.stages().find((s) => s.id === m.stageId)?.name || 'N/A',
        'Round/Leg': m.config?.round
          ? `${m.config.round} ${m.config.leg ? '(Leg ' + m.config.leg + ')' : ''}`
          : 'N/A',
        'Home Team': m.homeTeam?.name || 'TBD',
        'Home Score': m.status === 'completed' ? m.homeScore : '-',
        'Away Score': m.status === 'completed' ? m.awayScore : '-',
        'Away Team': m.awayTeam?.name || 'TBD',
        Status: m.status.toUpperCase(),
        Venue: m.venue?.name || 'N/A',
      }));
      const wsMatches = XLSX.utils.json_to_sheet(matchesData);

      // Sheet 3: Statistics
      const stats = this.competitionStats();
      const statsData: any[] = [];
      if (stats) {
        statsData.push(['TOP RATED PLAYERS']);
        statsData.push(['Rank', 'Player Name', 'Team Name', 'Matches', 'Average Rating']);
        stats.topRated.forEach((p, idx) => {
          statsData.push([idx + 1, p.playerName, p.teamName, p.appearances, p.avgRating]);
        });
        statsData.push([]);

        if (stats.mostMvps && stats.mostMvps.length > 0) {
          statsData.push(['MOST MVPS']);
          statsData.push(['Rank', 'Player Name', 'Team Name', 'MVPs Won']);
          stats.mostMvps.forEach((p, idx) => {
            statsData.push([idx + 1, p.playerName, p.teamName, p.mvps]);
          });
          statsData.push([]);
        }

        if (stats.sportCode === 'football' && stats.topScorers) {
          statsData.push(['TOP GOAL SCORERS']);
          statsData.push(['Rank', 'Player Name', 'Team Name', 'Goals']);
          stats.topScorers.forEach((p, idx) => {
            statsData.push([idx + 1, p.playerName, p.teamName, p.goals]);
          });
          statsData.push([]);
        } else if (stats.sportCode === 'cricket' && stats.topRuns) {
          statsData.push(['TOP RUN SCORERS']);
          statsData.push(['Rank', 'Player Name', 'Team Name', 'Innings', 'Runs']);
          stats.topRuns.forEach((p, idx) => {
            statsData.push([idx + 1, p.playerName, p.teamName, p.innings, p.runs]);
          });
          statsData.push([]);
        }
      } else {
        statsData.push(['No statistics available.']);
      }
      const wsStats = XLSX.utils.aoa_to_sheet(statsData);

      const sheets = [
        { name: 'Standings', ws: wsStandings, isStandings: true },
        { name: 'Matches', ws: wsMatches },
        { name: 'Player Stats', ws: wsStats, isStats: true },
      ];

      for (const sheet of sheets) {
        const range = XLSX.utils.decode_range(sheet.ws['!ref'] || 'A1:A1');
        const cols: any[] = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          let maxLen = 12;
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cell = sheet.ws[XLSX.utils.encode_cell({ r: R, c: C })];
            if (cell && cell.v) {
              maxLen = Math.max(maxLen, cell.v.toString().length);
            }
          }
          cols.push({ wch: maxLen + 2 });
        }
        sheet.ws['!cols'] = cols;

        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = sheet.ws[address];
            if (!cell) continue;

            const val = cell.v ? cell.v.toString() : '';
            const isHeaderRow =
              (!sheet.isStandings && !sheet.isStats && R === 0) ||
              (sheet.isStandings && (val === 'Rank' || val.startsWith('Stage:'))) ||
              (sheet.isStats &&
                (val === 'Rank' ||
                  val.endsWith('PLAYERS') ||
                  val.endsWith('MVPS') ||
                  val.endsWith('SCORERS')));

            if (isHeaderRow) {
              cell.s = {
                fill: {
                  fgColor: { rgb: val.includes(':') || val.endsWith('S') ? '1E1B4B' : '5B21B6' },
                },
                font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Segoe UI', size: 10 },
                alignment: { horizontal: 'left', vertical: 'center' },
              };
            } else {
              cell.s = {
                font: { name: 'Segoe UI', size: 10 },
                alignment: { vertical: 'center' },
              };
            }
          }
        }

        XLSX.utils.book_append_sheet(wb, sheet.ws, sheet.name);
      }

      XLSX.writeFile(wb, `${comp.name.replace(/\s+/g, '_')}_standings.xlsx`);
    } catch (err) {
      console.error('Failed to export competition Excel', err);
    } finally {
      this.isGeneratingCompExcel.set(false);
    }
  }

  async downloadEventExcel() {
    const event = this.events().find((e) => e.id === this.selectedEventId());
    if (!event) return;

    this.isGeneratingEventExcel.set(true);
    try {
      const XLSX = (await import('xlsx-js-style')) as any;
      const wb = XLSX.utils.book_new();

      const wsSummaryData = [
        ['Event Name', event.name],
        ['Sport Category', event.sport || 'N/A'],
        ['Status', event.status.toUpperCase()],
        ['Start Date', event.startDate ? new Date(event.startDate).toLocaleDateString() : 'N/A'],
        ['End Date', event.endDate ? new Date(event.endDate).toLocaleDateString() : 'N/A'],
        ['Description', event.description || 'N/A'],
        ['Total Competitions', this.competitions().length],
        ['Total Matches', this.matches().length],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryData);

      const compsData = this.competitions().map((c) => ({
        'Category Name': c.name,
        Sport: c.sport?.name || 'N/A',
        Status: c.status.toUpperCase(),
        'Created Date': new Date(c.createdAt).toLocaleDateString(),
      }));
      const wsComps = XLSX.utils.json_to_sheet(compsData);

      const matchesData = this.matches().map((m) => ({
        Competition:
          this.competitions().find((c) => c.id === m.stageId)?.name ||
          this.stages().find((s) => s.id === m.stageId)?.name ||
          'N/A',
        'Home Team': m.homeTeam?.name || 'TBD',
        'Home Score': m.status === 'completed' ? m.homeScore : '-',
        'Away Score': m.status === 'completed' ? m.awayScore : '-',
        'Away Team': m.awayTeam?.name || 'TBD',
        Status: m.status.toUpperCase(),
        Venue: m.venue?.name || 'N/A',
      }));
      const wsMatches = XLSX.utils.json_to_sheet(matchesData);

      const sheets = [
        { name: 'Summary', ws: wsSummary, isAoa: true },
        { name: 'Competitions', ws: wsComps },
        { name: 'Matches', ws: wsMatches },
      ];

      for (const sheet of sheets) {
        const range = XLSX.utils.decode_range(sheet.ws['!ref'] || 'A1:A1');
        const cols: any[] = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          let maxLen = 12;
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cell = sheet.ws[XLSX.utils.encode_cell({ r: R, c: C })];
            if (cell && cell.v) {
              maxLen = Math.max(maxLen, cell.v.toString().length);
            }
          }
          cols.push({ wch: maxLen + 2 });
        }
        sheet.ws['!cols'] = cols;

        const endRow = sheet.isAoa ? range.e.r : 0;
        for (let R = 0; R <= endRow; ++R) {
          if (sheet.isAoa && R > 0) continue;
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: R, c: C });
            if (!sheet.ws[address]) continue;

            if (R === 0 || (sheet.isAoa && C === 0)) {
              sheet.ws[address].s = {
                fill: { fgColor: { rgb: '4F46E5' } },
                font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Segoe UI', size: 10 },
                alignment: { horizontal: 'left', vertical: 'center' },
              };
            } else {
              sheet.ws[address].s = {
                font: { name: 'Segoe UI', size: 10 },
                alignment: { vertical: 'center' },
              };
            }
          }
        }

        XLSX.utils.book_append_sheet(wb, sheet.ws, sheet.name);
      }

      XLSX.writeFile(wb, `${event.name.replace(/\s+/g, '_')}_event_report.xlsx`);
    } catch (err) {
      console.error('Failed to generate event report', err);
    } finally {
      this.isGeneratingEventExcel.set(false);
    }
  }

  async downloadTeamExcel() {
    const team = this.selectedTeam();
    if (!team) return;

    this.isGeneratingTeamExcel.set(true);
    try {
      const XLSX = (await import('xlsx-js-style')) as any;
      const wb = XLSX.utils.book_new();

      const stats = this.teamStats();

      const wsSummaryData = [
        ['Team Name', team.name],
        ['Team Code', team.code],
        ['Description', team.description || 'N/A'],
        ['Created Date', new Date(team.createdAt).toLocaleDateString()],
        [],
        ['PERFORMANCE METRICS'],
        ['Matches Played', stats.played],
        ['Matches Won', stats.won],
        ['Matches Drawn', stats.drawn],
        ['Matches Lost', stats.lost],
        ['Goals/Runs Scored (GF)', stats.gf],
        ['Goals/Runs Conceded (GA)', stats.ga],
        ['Goal/Run Difference (GD)', stats.gd],
        ['Win Percentage', `${stats.winRate.toFixed(1)}%`],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryData);

      const rosterData = this.teamRoster().map((p) => ({
        'Player Username': p.user.username,
        'Jersey Number': p.jerseyNumber || 'N/A',
        'Registered Date': new Date(p.createdAt).toLocaleDateString(),
      }));
      const wsRoster = XLSX.utils.json_to_sheet(rosterData);

      const matchesData = this.teamMatches().map((m) => {
        const isHome = m.homeTeamId === team.id;
        const opponent = isHome ? m.awayTeam?.name : m.homeTeam?.name;
        const compName =
          this.competitions().find((c) => c.id === m.stageId)?.name ||
          this.stages().find((s) => s.id === m.stageId)?.name ||
          'N/A';

        let scoreStr = '-';
        let outcome = 'N/A';
        if (m.status === 'completed') {
          scoreStr = `${m.homeScore} - ${m.awayScore}`;
          const tScore = isHome ? m.homeScore : m.awayScore;
          const oScore = isHome ? m.awayScore : m.homeScore;
          outcome = tScore > oScore ? 'WIN' : tScore < oScore ? 'LOSS' : 'DRAW';
        }

        return {
          Competition: compName,
          'Opponent Team': opponent || 'TBD',
          Venue: m.venue?.name || 'N/A',
          Score: scoreStr,
          Outcome: outcome,
          Status: m.status.toUpperCase(),
          'Scheduled Date': m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : 'N/A',
        };
      });
      const wsMatches = XLSX.utils.json_to_sheet(matchesData);

      const sheets = [
        { name: 'Summary', ws: wsSummary, isAoa: true },
        { name: 'Roster', ws: wsRoster },
        { name: 'Match History', ws: wsMatches },
      ];

      for (const sheet of sheets) {
        const range = XLSX.utils.decode_range(sheet.ws['!ref'] || 'A1:A1');
        const cols: any[] = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          let maxLen = 12;
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cell = sheet.ws[XLSX.utils.encode_cell({ r: R, c: C })];
            if (cell && cell.v) {
              maxLen = Math.max(maxLen, cell.v.toString().length);
            }
          }
          cols.push({ wch: maxLen + 2 });
        }
        sheet.ws['!cols'] = cols;

        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = sheet.ws[address];
            if (!cell) continue;

            const val = cell.v ? cell.v.toString() : '';
            const isHeaderRow =
              (!sheet.isAoa && R === 0) ||
              (sheet.isAoa && (R === 0 || C === 0 || val === 'PERFORMANCE METRICS'));

            if (isHeaderRow) {
              cell.s = {
                fill: { fgColor: { rgb: val === 'PERFORMANCE METRICS' ? '1E1B4B' : '4F46E5' } },
                font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Segoe UI', size: 10 },
                alignment: { horizontal: 'left', vertical: 'center' },
              };
            } else {
              cell.s = {
                font: { name: 'Segoe UI', size: 10 },
                alignment: { vertical: 'center' },
              };
            }
          }
        }

        XLSX.utils.book_append_sheet(wb, sheet.ws, sheet.name);
      }

      XLSX.writeFile(wb, `${team.name.replace(/\s+/g, '_')}_team_report.xlsx`);
    } catch (err) {
      console.error('Failed to generate team report', err);
    } finally {
      this.isGeneratingTeamExcel.set(false);
    }
  }

  async downloadPlayerExcel() {
    const player = this.selectedPlayer();
    if (!player) return;

    this.isGeneratingPlayerReport.set(true);
    try {
      const XLSX = (await import('xlsx-js-style')) as any;
      const wb = XLSX.utils.book_new();

      const member = this.members().find((m) => m.userId === player.userId);
      const stats = this.competitionStats();

      const ratedStats = stats?.topRated.find((r) => r.playerId === player.id);
      const mvpStats = stats?.mostMvps?.find((m) => m.playerId === player.id);
      const goalStats = stats?.topScorers?.find((s) => s.playerId === player.id);
      const runStats = stats?.topRuns?.find((r) => r.playerId === player.id);
      const assistStats = stats?.topAssists?.find((a) => a.playerId === player.id);
      const wicketStats = stats?.topWickets?.find((w) => w.playerId === player.id);

      const wsSummaryData = [
        ['Player Username', player.user.username],
        ['Jersey Number', player.jerseyNumber || 'N/A'],
        ['Team Name', player.team?.name || 'N/A'],
        ['Workspace Role', member?.role?.name || 'Viewer'],
        ['Registered Date', new Date(player.createdAt).toLocaleDateString()],
        [],
        ['COMPETITION PERFORMANCE'],
        ['Appearances', ratedStats?.appearances || 0],
        ['Average Rating', ratedStats?.avgRating ? ratedStats.avgRating.toFixed(2) : 'N/A'],
        ['MVPs Won', mvpStats?.mvps || 0],
      ];

      if (stats?.sportCode === 'football') {
        wsSummaryData.push(['Goals Scored', goalStats?.goals || 0]);
        wsSummaryData.push(['Assists Provided', assistStats?.assists || 0]);
      } else if (stats?.sportCode === 'cricket') {
        wsSummaryData.push(['Runs Scored', runStats?.runs || 0]);
        wsSummaryData.push(['Wickets Taken', wicketStats?.wickets || 0]);
      }

      const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryData);

      const range = XLSX.utils.decode_range(wsSummary['!ref'] || 'A1:A1');
      const cols: any[] = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxLen = 12;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cell = wsSummary[XLSX.utils.encode_cell({ r: R, c: C })];
          if (cell && cell.v) {
            maxLen = Math.max(maxLen, cell.v.toString().length);
          }
        }
        cols.push({ wch: maxLen + 2 });
      }
      wsSummary['!cols'] = cols;

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = wsSummary[address];
          if (!cell) continue;

          const val = cell.v ? cell.v.toString() : '';
          const isHeader = R === 0 || C === 0 || val === 'COMPETITION PERFORMANCE';

          if (isHeader) {
            cell.s = {
              fill: { fgColor: { rgb: val === 'COMPETITION PERFORMANCE' ? '1E1B4B' : '059669' } },
              font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Segoe UI', size: 10 },
              alignment: { horizontal: 'left', vertical: 'center' },
            };
          } else {
            cell.s = {
              font: { name: 'Segoe UI', size: 10 },
              alignment: { vertical: 'center' },
            };
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, wsSummary, 'Player Profile');
      XLSX.writeFile(wb, `${player.user.username}_player_report.xlsx`);
    } catch (err) {
      console.error('Failed to generate player report', err);
    } finally {
      this.isGeneratingPlayerReport.set(false);
    }
  }

  selectReportType(
    type:
      | 'workspace'
      | 'event'
      | 'competition'
      | 'team'
      | 'player'
      | 'event-dashboard'
      | 'trends'
      | 'historical'
      | 'organizer'
      | 'org-stats'
      | 'volunteer',
  ) {
    this.reportType.set(type);
    const wsId = this.workspace()?.id;
    if (!wsId) return;

    if (type === 'event-dashboard') {
      this.isLoadingAnalytics.set(true);
      this.analyticsService.getEventReports(wsId).subscribe({
        next: (data) => {
          this.eventReportsData.set(data);
          this.isLoadingAnalytics.set(false);
        },
        error: (err) => {
          console.error('Failed to load event reports', err);
          this.isLoadingAnalytics.set(false);
        },
      });
    } else if (type === 'trends') {
      this.isLoadingAnalytics.set(true);
      this.analyticsService.getParticipationTrends(wsId).subscribe({
        next: (data) => {
          this.participationTrendsData.set(data);
          this.isLoadingAnalytics.set(false);
        },
        error: (err) => {
          console.error('Failed to load trends data', err);
          this.isLoadingAnalytics.set(false);
        },
      });
    } else if (type === 'historical') {
      this.isLoadingAnalytics.set(true);
      this.analyticsService.getHistoricalComparisons(wsId).subscribe({
        next: (data) => {
          this.historicalComparisonsData.set(data);
          this.isLoadingAnalytics.set(false);
        },
        error: (err) => {
          console.error('Failed to load historical comparisons', err);
          this.isLoadingAnalytics.set(false);
        },
      });
    } else if (type === 'organizer') {
      this.isLoadingAnalytics.set(true);
      this.analyticsService.getOrganizerInsights(wsId).subscribe({
        next: (data) => {
          this.organizerInsightsData.set(data);
          this.isLoadingAnalytics.set(false);
        },
        error: (err) => {
          console.error('Failed to load organizer insights', err);
          this.isLoadingAnalytics.set(false);
        },
      });
    } else if (type === 'org-stats') {
      this.isLoadingAnalytics.set(true);
      this.analyticsService.getOrganizationStats(wsId).subscribe({
        next: (data) => {
          this.organizationStatsData.set(data);
          this.isLoadingAnalytics.set(false);
        },
        error: (err) => {
          console.error('Failed to load organization stats', err);
          this.isLoadingAnalytics.set(false);
        },
      });
    } else if (type === 'volunteer') {
      this.isLoadingAnalytics.set(true);
      this.volunteerService.getVolunteers(wsId).subscribe({
        next: (data) => {
          this.volunteerReportsData.set(data);
          this.isLoadingAnalytics.set(false);
        },
        error: (err) => {
          console.error('Failed to load volunteer reports', err);
          this.isLoadingAnalytics.set(false);
        },
      });
    }
  }

  async downloadEventDashboardExcel() {
    const data = this.eventReportsData();
    if (!data) return;
    this.isGeneratingAnalyticsExcel.set(true);
    try {
      const XLSX = (await import('xlsx-js-style')) as any;
      const wb = XLSX.utils.book_new();

      const kpis = data.kpis;
      const wsKpiData = [
        ['Metric', 'Value'],
        ['Total Events', kpis.totalEvents],
        ['Completed Events', kpis.completedEvents],
        ['Ongoing Events', kpis.ongoingEvents],
        ['Upcoming Events', kpis.upcomingEvents],
        ['Event Completion Rate (%)', kpis.eventCompletionRate.toFixed(1)],
        ['Total Matches', kpis.totalMatches],
        ['Completed Matches', kpis.completedMatches],
        ['Live Matches', kpis.liveMatches],
        ['Scheduled Matches', kpis.scheduledMatches],
        ['Match Completion Rate (%)', kpis.matchCompletionRate.toFixed(1)],
        ['Total Registered Teams', kpis.totalRegisteredTeams],
        ['Active Teams Count', kpis.activeTeamsCount],
        ['Total Registered Players', kpis.totalRegisteredPlayers],
        ['Active Players Count', kpis.activePlayersCount],
        ['Total Venues', kpis.totalVenues],
      ];
      const wsKpis = XLSX.utils.aoa_to_sheet(wsKpiData);
      XLSX.utils.book_append_sheet(wb, wsKpis, 'KPIs Summary');

      const breakdowns = data.eventBreakdowns.map((eb: any) => ({
        'Event Name': eb.name,
        Status: eb.status,
        Sport: eb.sport,
        'Start Date': eb.startDate ? new Date(eb.startDate).toLocaleDateString() : 'N/A',
        'End Date': eb.endDate ? new Date(eb.endDate).toLocaleDateString() : 'N/A',
        'Teams Registered': eb.teamsRegistered,
        'Competitions Count': eb.competitionsCount,
        'Matches Count': eb.matchesCount,
        'Matches Completed': eb.matchesCompleted,
        'Progress (%)': eb.progress,
      }));
      const wsBreakdowns = XLSX.utils.json_to_sheet(breakdowns);
      XLSX.utils.book_append_sheet(wb, wsBreakdowns, 'Event Breakdowns');

      XLSX.writeFile(wb, `${this.workspace()?.slug}_event_reports_dashboard.xlsx`);
    } catch (err) {
      console.error(err);
    } finally {
      this.isGeneratingAnalyticsExcel.set(false);
    }
  }

  async downloadParticipationTrendsExcel() {
    const data = this.participationTrendsData();
    if (!data) return;
    this.isGeneratingAnalyticsExcel.set(true);
    try {
      const XLSX = (await import('xlsx-js-style')) as any;
      const wb = XLSX.utils.book_new();

      const growth = data.growthTrend.map((gt: any) => ({
        Month: gt.month,
        'New Players': gt.newPlayers,
        'New Teams': gt.newTeams,
        'Total Cumulative Players': gt.totalPlayers,
        'Total Cumulative Teams': gt.totalTeams,
      }));
      const wsGrowth = XLSX.utils.json_to_sheet(growth);
      XLSX.utils.book_append_sheet(wb, wsGrowth, 'Growth Trend');

      const sports = data.sportsData.map((sd: any) => ({
        Sport: sd.sport,
        Events: sd.events,
        Competitions: sd.competitions,
        'Participants (Estimate)': sd.participantsEstimate,
      }));
      const wsSports = XLSX.utils.json_to_sheet(sports);
      XLSX.utils.book_append_sheet(wb, wsSports, 'Sports Distribution');

      const age = data.ageGroupsData.map((ad: any) => ({
        'Age Group': ad.group,
        Count: ad.count,
        'Percentage (%)': ad.percentage,
      }));
      const wsAge = XLSX.utils.json_to_sheet(age);
      XLSX.utils.book_append_sheet(wb, wsAge, 'Age Demographics');

      const seasonal = data.seasonalData.map((sd: any) => ({
        Season: sd.season,
        'Events Scheduled': sd.count,
      }));
      const wsSeasonal = XLSX.utils.json_to_sheet(seasonal);
      XLSX.utils.book_append_sheet(wb, wsSeasonal, 'Seasonal Patterns');

      XLSX.writeFile(wb, `${this.workspace()?.slug}_participation_trends.xlsx`);
    } catch (err) {
      console.error(err);
    } finally {
      this.isGeneratingAnalyticsExcel.set(false);
    }
  }

  async downloadHistoricalComparisonsExcel() {
    const data = this.historicalComparisonsData();
    if (!data) return;
    this.isGeneratingAnalyticsExcel.set(true);
    try {
      const XLSX = (await import('xlsx-js-style')) as any;
      const wb = XLSX.utils.book_new();

      const yearly = data.yearlyData.map((yd: any) => ({
        Year: yd.year,
        'Total Events': yd.eventsCount,
        'Completed Events': yd.completedEvents,
        'Total Teams': yd.teamsCount,
        'Players (Estimate)': yd.playersEstimatedCount,
        Matches: yd.matchesCount,
        'Avg Score Per Match': yd.avgScorePerMatch,
        'Avg Duration (Days)': yd.avgDurationDays,
      }));
      const wsYearly = XLSX.utils.json_to_sheet(yearly);
      XLSX.utils.book_append_sheet(wb, wsYearly, 'YoY Comparison');

      const benchmarking: any[] = [];
      data.benchmarking.forEach((bench: any) => {
        bench.runs.forEach((run: any) => {
          benchmarking.push({
            'Tournament Series': bench.tournamentName,
            'Specific Event': run.name,
            Year: run.year,
            'Teams Count': run.participants,
            Matches: run.matches,
            'Completion Rate (%)': run.progress,
          });
        });
      });
      const wsBench = XLSX.utils.json_to_sheet(benchmarking);
      XLSX.utils.book_append_sheet(wb, wsBench, 'Tournament Benchmarks');

      XLSX.writeFile(wb, `${this.workspace()?.slug}_historical_comparisons.xlsx`);
    } catch (err) {
      console.error(err);
    } finally {
      this.isGeneratingAnalyticsExcel.set(false);
    }
  }

  async downloadOrganizerInsightsExcel() {
    const data = this.organizerInsightsData();
    if (!data) return;
    this.isGeneratingAnalyticsExcel.set(true);
    try {
      const XLSX = (await import('xlsx-js-style')) as any;
      const wb = XLSX.utils.book_new();

      const productivity = data.productivity.map((p: any) => ({
        Organizer: p.name,
        'Score Updates': p.scoreUpdates,
        'Matches Created': p.matchesCreated,
        'Total Activity Logs': p.totalActions,
      }));
      const wsProductivity = XLSX.utils.json_to_sheet(productivity);
      XLSX.utils.book_append_sheet(wb, wsProductivity, 'Organizer Productivity');

      const bottlenecks = [
        ['Bottleneck Metric', 'Count / Value'],
        ['Delayed Matches Count (2hr+ past schedule)', data.bottlenecks.delayedMatchesCount],
        ['Venue Overlap Conflicts Count', data.bottlenecks.venueConflictsCount],
      ];
      const wsBottlenecks = XLSX.utils.aoa_to_sheet(bottlenecks);
      XLSX.utils.book_append_sheet(wb, wsBottlenecks, 'Bottlenecks');

      const ai = [
        ['AI Operational Recommendations'],
        ['Bottlenecks Identified'],
        ...data.aiRecommendation.bottlenecksIdentified.map((bi: string) => [` - ${bi}`]),
        [],
        ['Actionable Recommendations'],
        ...data.aiRecommendation.recommendations.map((rec: string) => [` - ${rec}`]),
        [],
        ['Predicted Efficiency Gain', data.aiRecommendation.predictedEfficiencyGain],
      ];
      const wsAi = XLSX.utils.aoa_to_sheet(ai);
      XLSX.utils.book_append_sheet(wb, wsAi, 'AI Suggestions');

      XLSX.writeFile(wb, `${this.workspace()?.slug}_organizer_insights.xlsx`);
    } catch (err) {
      console.error(err);
    } finally {
      this.isGeneratingAnalyticsExcel.set(false);
    }
  }

  downloadCSV() {
    const type = this.reportType();
    if (type === 'workspace') {
      const headers = ['Team Name', 'Code', 'Description', 'Created Date'];
      const rows = this.teams().map((t) => [
        t.name,
        t.code,
        t.description || '',
        new Date(t.createdAt).toLocaleDateString(),
      ]);
      this.exportToCSV(`${this.workspace()?.slug}_workspace_teams.csv`, headers, rows);
    } else if (type === 'event') {
      const event = this.events().find((e) => e.id === this.selectedEventId());
      if (!event) return;
      const headers = ['Category Name', 'Sport', 'Status', 'Created Date'];
      const rows = this.competitions().map((c) => [
        c.name,
        c.sport?.name || 'N/A',
        c.status.toUpperCase(),
        new Date(c.createdAt).toLocaleDateString(),
      ]);
      this.exportToCSV(`${event.name.replace(/\s+/g, '_')}_competitions.csv`, headers, rows);
    } else if (type === 'competition') {
      const comp = this.competitions().find((c) => c.id === this.selectedCompetitionId());
      if (!comp) return;

      const leagueStages = this.stages().filter(
        (s) => s.type === 'league' || s.type === 'group' || s.type === 'group_knockout',
      );
      if (leagueStages.length > 0) {
        const headers = [
          'Stage',
          'Rank',
          'Team Name',
          'Played',
          'Won',
          'Drawn',
          'Lost',
          'GF',
          'GA',
          'GD',
          'Points',
        ];
        const rows: any[][] = [];
        for (const stage of leagueStages) {
          const standings = this.getStandingsForStage(stage);
          standings.forEach((row, idx) => {
            rows.push([
              stage.name,
              idx + 1,
              row.teamName,
              row.played,
              row.won,
              row.drawn,
              row.lost,
              row.gf,
              row.ga,
              row.gd,
              row.pts,
            ]);
          });
        }
        this.exportToCSV(`${comp.name.replace(/\s+/g, '_')}_standings.csv`, headers, rows);
      } else {
        const headers = ['Stage', 'Home Team', 'Home Score', 'Away Score', 'Away Team', 'Status'];
        const rows = this.matches().map((m) => [
          this.stages().find((s) => s.id === m.stageId)?.name || 'N/A',
          m.homeTeam?.name || 'TBD',
          m.status === 'completed' ? m.homeScore : '-',
          m.status === 'completed' ? m.awayScore : '-',
          m.awayTeam?.name || 'TBD',
          m.status.toUpperCase(),
        ]);
        this.exportToCSV(`${comp.name.replace(/\s+/g, '_')}_fixtures.csv`, headers, rows);
      }
    } else if (type === 'team') {
      const team = this.selectedTeam();
      if (!team) return;
      const headers = ['Player Username', 'Jersey Number', 'Registered Date'];
      const rows = this.teamRoster().map((p) => [
        p.user.username,
        p.jerseyNumber || 'N/A',
        new Date(p.createdAt).toLocaleDateString(),
      ]);
      this.exportToCSV(`${team.name.replace(/\s+/g, '_')}_roster.csv`, headers, rows);
    } else if (type === 'player') {
      const player = this.selectedPlayer();
      if (!player) return;
      const member = this.members().find((m) => m.userId === player.userId);
      const stats = this.competitionStats();
      const ratedStats = stats?.topRated.find((r) => r.playerId === player.id);
      const mvpStats = stats?.mostMvps?.find((m) => m.playerId === player.id);

      const headers = ['Metric', 'Value'];
      const rows = [
        ['Username', player.user.username],
        ['Jersey Number', player.jerseyNumber || 'N/A'],
        ['Team Name', player.team?.name || 'N/A'],
        ['Workspace Role', member?.role?.name || 'Viewer'],
        ['Registered Date', new Date(player.createdAt).toLocaleDateString()],
        ['Appearances', ratedStats?.appearances || 0],
        ['Average Rating', ratedStats?.avgRating ? ratedStats.avgRating.toFixed(2) : 'N/A'],
        ['MVPs Won', mvpStats?.mvps || 0],
      ];
      this.exportToCSV(`${player.user.username}_profile.csv`, headers, rows);
    } else if (type === 'event-dashboard') {
      const data = this.eventReportsData();
      if (!data) return;
      const headers = [
        'Event Name',
        'Status',
        'Sport',
        'Teams',
        'Competitions',
        'Matches',
        'Completed',
        'Progress (%)',
      ];
      const rows = data.eventBreakdowns.map((eb: any) => [
        eb.name,
        eb.status,
        eb.sport,
        eb.teamsRegistered,
        eb.competitionsCount,
        eb.matchesCount,
        eb.matchesCompleted,
        eb.progress,
      ]);
      this.exportToCSV(`${this.workspace()?.slug}_event_reports_summary.csv`, headers, rows);
    } else if (type === 'trends') {
      const data = this.participationTrendsData();
      if (!data) return;
      const headers = ['Month', 'New Players', 'New Teams', 'Total Players', 'Total Teams'];
      const rows = data.growthTrend.map((gt: any) => [
        gt.month,
        gt.newPlayers,
        gt.newTeams,
        gt.totalPlayers,
        gt.totalTeams,
      ]);
      this.exportToCSV(`${this.workspace()?.slug}_participation_trends.csv`, headers, rows);
    } else if (type === 'historical') {
      const data = this.historicalComparisonsData();
      if (!data) return;
      const headers = [
        'Year',
        'Events Count',
        'Completed Events',
        'Teams Count',
        'Players Estimate',
        'Matches Count',
        'Avg Score',
        'Avg Duration (Days)',
      ];
      const rows = data.yearlyData.map((yd: any) => [
        yd.year,
        yd.eventsCount,
        yd.completedEvents,
        yd.teamsCount,
        yd.playersEstimatedCount,
        yd.matchesCount,
        yd.avgScorePerMatch,
        yd.avgDurationDays,
      ]);
      this.exportToCSV(`${this.workspace()?.slug}_historical_comparisons.csv`, headers, rows);
    } else if (type === 'organizer') {
      const data = this.organizerInsightsData();
      if (!data) return;
      const headers = ['Organizer Name', 'Score Updates', 'Matches Created', 'Total Actions'];
      const rows = data.productivity.map((p: any) => [
        p.name,
        p.scoreUpdates,
        p.matchesCreated,
        p.totalActions,
      ]);
      this.exportToCSV(`${this.workspace()?.slug}_organizer_productivity.csv`, headers, rows);
    }
  }

  exportToCSV(filename: string, headers: string[], rows: any[][]) {
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((val) => {
            if (val === null || val === undefined) return '""';
            const str = val.toString().replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  printOfficialReport() {
    const ws = this.workspace();
    if (!ws) return;

    const type = this.reportType();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate the print preview.');
      return;
    }

    let titleText = `Report - ${ws.name}`;
    if (type === 'workspace') titleText = `Workspace Summary - ${ws.name}`;
    else if (type === 'event') {
      const event = this.events().find((e) => e.id === this.selectedEventId());
      if (event) titleText = `Event Report - ${event.name}`;
    } else if (type === 'competition') {
      const comp = this.competitions().find((c) => c.id === this.selectedCompetitionId());
      if (comp) titleText = `Tournament Report - ${comp.name}`;
    } else if (type === 'team') {
      const team = this.selectedTeam();
      if (team) titleText = `Team Performance - ${team.name}`;
    } else if (type === 'player') {
      const player = this.selectedPlayer();
      if (player) titleText = `Player Performance - ${player.user.username}`;
    } else if (type === 'event-dashboard') {
      titleText = `Event Reports Summary - ${ws.name}`;
    } else if (type === 'trends') {
      titleText = `Participation Trends - ${ws.name}`;
    } else if (type === 'historical') {
      titleText = `Historical comparisons - ${ws.name}`;
    } else if (type === 'organizer') {
      titleText = `Organizer Insights - ${ws.name}`;
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${titleText}</title>
        <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/2.1.0/uicons-regular-rounded/css/uicons-regular-rounded.css">
        <style>
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            color: #1e293b;
            background-color: #ffffff;
            margin: 0;
            padding: 40px;
            line-height: 1.5;
          }
          .header-container {
            border-bottom: 3px double #cbd5e1;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title {
            font-size: 26px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
            color: #1e1b4b;
          }
          .subtitle {
            font-size: 14px;
            color: #64748b;
            margin: 5px 0 0 0;
            font-weight: 600;
          }
          .meta-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 15px;
            margin-bottom: 35px;
            font-size: 13px;
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .meta-item {
            display: flex;
            flex-direction: column;
          }
          .meta-label {
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .meta-value {
            font-weight: 600;
            color: #0f172a;
          }
          .section-title {
            font-size: 16px;
            font-weight: 800;
            color: #312e81;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 6px;
            margin: 30px 0 15px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .section-title i {
            font-size: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 20px;
          }
          th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
          }
          td {
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
            color: #334155;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          .rank {
            font-weight: 700;
            text-align: center;
            width: 40px;
          }
          .pts-col {
            font-weight: 800;
            background-color: #f1f5f9 !important;
            text-align: center;
            width: 50px;
          }
          .center-col {
            text-align: center;
          }
          .match-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid #e2e8f0;
            padding: 10px 15px;
            margin-bottom: 8px;
            border-radius: 6px;
            font-size: 12px;
          }
          .match-teams {
            display: flex;
            align-items: center;
            gap: 15px;
            font-weight: 700;
            flex-grow: 1;
          }
          .match-score {
            font-family: monospace;
            font-size: 14px;
            font-weight: 900;
            background: #f1f5f9;
            padding: 3px 8px;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
          }
          .match-meta {
            font-size: 11px;
            color: #64748b;
            text-align: right;
            margin-left: 20px;
          }
          .leaderboards-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 20px;
          }
          .print-btn-container {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
          }
          .btn {
            background-color: #4f46e5;
            color: white;
            border: none;
            padding: 10px 18px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 6px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .btn-secondary {
            background-color: #e2e8f0;
            color: #334155;
          }
          @media print {
            .print-btn-container {
              display: none;
            }
            body {
              padding: 0;
            }
            .match-row, .meta-grid {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-btn-container">
          <button class="btn" onclick="window.print();"><i class="fi fi-rr-print"></i> Print / Save PDF</button>
          <button class="btn btn-secondary" onclick="window.close();">Close Window</button>
        </div>
    `;

    if (type === 'workspace') {
      htmlContent += `
        <div class="header-container">
          <div>
            <h1 class="title">Official Workspace Summary</h1>
            <p class="subtitle">${ws.name} (/${ws.slug})</p>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 14px; color: #4f46e5;">SEM Analytics</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Report Generated: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">Total Teams</span><span class="meta-value">${this.teams().length}</span></div>
          <div class="meta-item"><span class="meta-label">Total Players</span><span class="meta-value">${this.players().length}</span></div>
          <div class="meta-item"><span class="meta-label">Total Events</span><span class="meta-value">${this.events().length}</span></div>
          <div class="meta-item"><span class="meta-label">Total Venues</span><span class="meta-value">${this.venues().length}</span></div>
        </div>

        <h2 class="section-title"><i class="fi fi-rr-users"></i> Registered Teams</h2>
        <table>
          <thead>
            <tr><th>Team Name</th><th>Code</th><th>Description</th><th>Created Date</th></tr>
          </thead>
          <tbody>
            ${this.teams()
              .map(
                (t) =>
                  `<tr><td><b>${t.name}</b></td><td>${t.code}</td><td>${t.description || '-'}</td><td>${new Date(t.createdAt).toLocaleDateString()}</td></tr>`,
              )
              .join('')}
          </tbody>
        </table>

        <h2 class="section-title"><i class="fi fi-rr-calendar"></i> Events Calendar</h2>
        <table>
          <thead>
            <tr><th>Event Name</th><th>Status</th><th>Dates</th></tr>
          </thead>
          <tbody>
            ${this.events()
              .map(
                (e) =>
                  `<tr><td><b>${e.name}</b></td><td>${e.status.toUpperCase()}</td><td>${e.startDate ? new Date(e.startDate).toLocaleDateString() : '-'} to ${e.endDate ? new Date(e.endDate).toLocaleDateString() : '-'}</td></tr>`,
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'event') {
      const event = this.events().find((e) => e.id === this.selectedEventId());
      if (!event) return;
      htmlContent += `
        <div class="header-container">
          <div>
            <h1 class="title">Official Event Report</h1>
            <p class="subtitle">${event.name}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 14px; color: #4f46e5;">${ws.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Report Generated: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">Sport Category</span><span class="meta-value">${event.sport || 'General'}</span></div>
          <div class="meta-item"><span class="meta-label">Dates</span><span class="meta-value">${event.startDate ? new Date(event.startDate).toLocaleDateString() : '-'} to ${event.endDate ? new Date(event.endDate).toLocaleDateString() : '-'}</span></div>
          <div class="meta-item"><span class="meta-label">Organizers</span><span class="meta-value">${event.organizers || 'N/A'}</span></div>
          <div class="meta-item"><span class="meta-label">Status</span><span class="meta-value" style="text-transform: capitalize;">${event.status}</span></div>
        </div>

        <h2 class="section-title">Competitions & Categories</h2>
        <table>
          <thead>
            <tr><th>Category Name</th><th>Sport</th><th>Status</th><th>Total Matches</th></tr>
          </thead>
          <tbody>
            ${this.competitions()
              .map(
                (c) =>
                  `<tr><td><b>${c.name}</b></td><td>${c.sport?.name || '-'}</td><td>${c.status.toUpperCase()}</td><td>${this.matches().filter((m) => this.stages().find((s) => s.id === m.stageId)?.competitionId === c.id).length}</td></tr>`,
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'competition') {
      const event = this.events().find((e) => e.id === this.selectedEventId());
      const comp = this.competitions().find((c) => c.id === this.selectedCompetitionId());
      const stats = this.competitionStats();
      if (!event || !comp) return;

      htmlContent += `
        <div class="header-container">
          <div>
            <h1 class="title">Official Tournament Report</h1>
            <p class="subtitle">${event.name} &middot; ${comp.name}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 14px; color: #4f46e5;">${ws.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Report Generated: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Workspace</span>
            <span class="meta-value">${ws.name} (/${ws.slug})</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Event / Sports Festival</span>
            <span class="meta-value">${event.name}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Competition Category</span>
            <span class="meta-value">${comp.name} (${comp.sport?.name || 'General'})</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Status</span>
            <span class="meta-value" style="text-transform: capitalize;">${comp.status}</span>
          </div>
        </div>
      `;

      const leagueStages = this.stages().filter(
        (s) => s.type === 'league' || s.type === 'group' || s.type === 'group_knockout',
      );
      if (leagueStages.length > 0) {
        htmlContent += `<h2 class="section-title"><i class="fi fi-rr-trophy"></i> Competition Standings</h2>`;
        for (const stage of leagueStages) {
          htmlContent += `
            <h3 style="font-size: 13px; font-weight: 700; margin: 15px 0 8px 0; color: #475569;">Stage: ${stage.name}</h3>
            <table>
              <thead>
                <tr>
                  <th class="rank">Pos</th>
                  <th>Team</th>
                  <th style="text-align: center;">P</th>
                  <th style="text-align: center;">W</th>
                  <th style="text-align: center;">D</th>
                  <th style="text-align: center;">L</th>
                  <th style="text-align: center;">GF</th>
                  <th style="text-align: center;">GA</th>
                  <th style="text-align: center;">GD</th>
                  <th class="pts-col">Pts</th>
                </tr>
              </thead>
              <tbody>
          `;

          const standings = this.getStandingsForStage(stage);
          standings.forEach((row, idx) => {
            let medalIcon = '';
            if (idx === 0)
              medalIcon =
                '<i class="fi fi-rr-medal text-amber-400" style="color:#d97706; margin-right:3px;"></i> ';
            else if (idx === 1)
              medalIcon =
                '<i class="fi fi-rr-medal text-slate-300" style="color:#475569; margin-right:3px;"></i> ';
            else if (idx === 2)
              medalIcon =
                '<i class="fi fi-rr-medal text-amber-600" style="color:#b45309; margin-right:3px;"></i> ';

            htmlContent += `
              <tr>
                <td class="rank">${medalIcon}${idx + 1}</td>
                <td style="font-weight: 600;">${row.teamName}</td>
                <td class="center-col">${row.played}</td>
                <td class="center-col" style="color: #16a34a; font-weight: 600;">${row.won}</td>
                <td class="center-col" style="color: #d97706;">${row.drawn}</td>
                <td class="center-col" style="color: #dc2626;">${row.lost}</td>
                <td class="center-col">${row.gf}</td>
                <td class="center-col">${row.ga}</td>
                <td class="center-col" style="font-weight: 600; color: ${row.gd > 0 ? '#16a34a' : row.gd < 0 ? '#dc2626' : '#475569'};">
                  ${row.gd > 0 ? '+' + row.gd : row.gd}
                </td>
                <td class="pts-col">${row.pts}</td>
              </tr>
            `;
          });

          htmlContent += `
              </tbody>
            </table>
          `;
        }
      }

      if (this.matches().length > 0) {
        htmlContent += `<h2 class="section-title"><i class="fi fi-rr-calendar"></i> Fixtures & Match Results</h2>`;
        this.matches().forEach((m) => {
          const stageName = this.stages().find((s) => s.id === m.stageId)?.name || 'N/A';
          const roundName = m.config?.round
            ? `${m.config.round} ${m.config.leg ? '(Leg ' + m.config.leg + ')' : ''}`
            : 'N/A';

          let scoreDisplay = 'VS';
          if (m.status === 'completed') {
            scoreDisplay = `${m.homeScore} - ${m.awayScore}`;
          } else if (m.status === 'live') {
            scoreDisplay = `${m.homeScore} - ${m.awayScore} (LIVE)`;
          }

          htmlContent += `
            <div class="match-row">
              <div class="match-teams">
                <span style="flex-grow: 1; text-align: right; max-width: 45%;">${m.homeTeam?.name || 'TBD'}</span>
                <span class="match-score">${scoreDisplay}</span>
                <span style="flex-grow: 1; text-align: left; max-width: 45%;">${m.awayTeam?.name || 'TBD'}</span>
              </div>
              <div class="match-meta">
                <div style="font-weight: 700; color: #475569;">Stage: ${stageName} (${roundName})</div>
                <div>${m.venue?.name || 'No Venue'} &middot; Status: <span style="text-transform: capitalize; font-weight: 600;">${m.status}</span></div>
              </div>
            </div>
          `;
        });
      }

      if (stats) {
        htmlContent += `<h2 class="section-title"><i class="fi fi-rr-chart-pie"></i> Tournament Statistics</h2>`;
        htmlContent += `<div class="leaderboards-grid">`;

        htmlContent += `
          <div>
            <h3 style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px;"><i class="fi fi-rr-star" style="color:#d97706;"></i> Top Rated Players</h3>
            <table>
              <thead>
                <tr>
                  <th class="rank">#</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th style="text-align: center;">Rating</th>
                </tr>
              </thead>
              <tbody>
        `;
        stats.topRated.slice(0, 5).forEach((p, idx) => {
          htmlContent += `
            <tr>
              <td class="rank">${idx + 1}</td>
              <td style="font-weight: 600;">${p.playerName}</td>
              <td>${p.teamName}</td>
              <td style="text-align: center; font-weight: 700; color:#4f46e5;">${p.avgRating.toFixed(2)}</td>
            </tr>
          `;
        });
        htmlContent += `</tbody></table></div>`;

        if (stats.mostMvps && stats.mostMvps.length > 0) {
          htmlContent += `
            <div>
              <h3 style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px;"><i class="fi fi-rr-crown" style="color:#d97706;"></i> Most MVPs</h3>
              <table>
                <thead>
                  <tr>
                    <th class="rank">#</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th style="text-align: center;">MVPs</th>
                  </tr>
                </thead>
                <tbody>
          `;
          stats.mostMvps.slice(0, 5).forEach((p, idx) => {
            htmlContent += `
              <tr>
                <td class="rank">${idx + 1}</td>
                <td style="font-weight: 600;">${p.playerName}</td>
                <td>${p.teamName}</td>
                <td style="text-align: center; font-weight: 700; color:#4f46e5;">${p.mvps}</td>
              </tr>
            `;
          });
          htmlContent += `</tbody></table></div>`;
        }
        htmlContent += `</div>`;
      }
    } else if (type === 'team') {
      const team = this.selectedTeam();
      if (!team) return;
      const stats = this.teamStats();

      htmlContent += `
        <div class="header-container">
          <div>
            <h1 class="title">Team Performance Report</h1>
            <p class="subtitle">${team.name} (${team.code})</p>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 14px; color: #4f46e5;">${ws.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Report Generated: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">Matches Played</span><span class="meta-value">${stats.played}</span></div>
          <div class="meta-item"><span class="meta-label">Wins / Draws / Losses</span><span class="meta-value">${stats.won} W / ${stats.drawn} D / ${stats.lost} L</span></div>
          <div class="meta-item"><span class="meta-label">Goals/Runs For/Against</span><span class="meta-value">${stats.gf} GF / ${stats.ga} GA (${stats.gd >= 0 ? '+' : ''}${stats.gd} GD)</span></div>
          <div class="meta-item"><span class="meta-label">Win Percentage</span><span class="meta-value">${stats.winRate.toFixed(1)}%</span></div>
        </div>

        <h2 class="section-title">Active Roster</h2>
        <table>
          <thead>
            <tr><th>Player Name</th><th>Jersey Number</th><th>Registered Date</th></tr>
          </thead>
          <tbody>
            ${this.teamRoster()
              .map(
                (p) =>
                  `<tr><td><b>${p.user.username}</b></td><td>${p.jerseyNumber || '-'}</td><td>${new Date(p.createdAt).toLocaleDateString()}</td></tr>`,
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'player') {
      const player = this.selectedPlayer();
      if (!player) return;
      const member = this.members().find((m) => m.userId === player.userId);
      const stats = this.competitionStats();
      const ratedStats = stats?.topRated.find((r) => r.playerId === player.id);
      const mvpStats = stats?.mostMvps?.find((m) => m.playerId === player.id);

      htmlContent += `
        <div class="header-container">
          <div>
            <h1 class="title">Player Performance Report</h1>
            <p class="subtitle">${player.user.username}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 14px; color: #4f46e5;">${ws.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Report Generated: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">Jersey Number</span><span class="meta-value">${player.jerseyNumber || 'N/A'}</span></div>
          <div class="meta-item"><span class="meta-label">Current Team</span><span class="meta-value">${player.team?.name || 'N/A'}</span></div>
          <div class="meta-item"><span class="meta-label">Workspace Role</span><span class="meta-value">${member?.role?.name || 'Viewer'}</span></div>
          <div class="meta-item"><span class="meta-label">Registered Date</span><span class="meta-value">${new Date(player.createdAt).toLocaleDateString()}</span></div>
        </div>

        <h2 class="section-title">Competition Statistics Summary</h2>
        <table>
          <thead>
            <tr><th>Appearances</th><th>Average Rating</th><th>MVPs Won</th></tr>
          </thead>
          <tbody>
            <tr>
              <td class="center-col"><b>${ratedStats?.appearances || 0}</b></td>
              <td class="center-col"><b>${ratedStats?.avgRating ? ratedStats.avgRating.toFixed(2) : 'N/A'}</b></td>
              <td class="center-col"><b>${mvpStats?.mvps || 0}</b></td>
            </tr>
          </tbody>
        </table>
      `;
    } else if (type === 'event-dashboard') {
      const data = this.eventReportsData();
      if (data) {
        let rowsHtml = '';
        data.eventBreakdowns.forEach((eb: any) => {
          rowsHtml += `
            <tr>
              <td><b>${eb.name}</b></td>
              <td><span>${eb.status}</span></td>
              <td>${eb.sport}</td>
              <td style="text-align: center;">${eb.teamsRegistered}</td>
              <td style="text-align: center;">${eb.competitionsCount}</td>
              <td style="text-align: center;">${eb.matchesCount}</td>
              <td style="text-align: right;"><b>${eb.progress}%</b></td>
            </tr>
          `;
        });
        htmlContent += `
          <h1 class="report-title">Advanced Event Reports Summary</h1>
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-label">Completion Rate</span><span class="meta-value">${data.kpis.eventCompletionRate.toFixed(1)}%</span></div>
            <div class="meta-item"><span class="meta-label">Total Matches</span><span class="meta-value">${data.kpis.totalMatches}</span></div>
            <div class="meta-item"><span class="meta-label">Active Teams</span><span class="meta-value">${data.kpis.activeTeamsCount}</span></div>
            <div class="meta-item"><span class="meta-label">Active Players</span><span class="meta-value">${data.kpis.activePlayersCount}</span></div>
          </div>
          <h2 class="section-title">Event Breakdowns</h2>
          <table>
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Status</th>
                <th>Sport</th>
                <th style="text-align: center;">Teams</th>
                <th style="text-align: center;">Competitions</th>
                <th style="text-align: center;">Matches</th>
                <th style="text-align: right;">Progress</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `;
      }
    } else if (type === 'trends') {
      const data = this.participationTrendsData();
      if (data) {
        let sportsHtml = '';
        data.sportsData.forEach((sd: any) => {
          sportsHtml += `<tr><td><b>${sd.sport}</b></td><td style="text-align: center;">${sd.events}</td><td style="text-align: center;">${sd.competitions}</td><td style="text-align: right;">${sd.participantsEstimate}</td></tr>`;
        });
        let ageHtml = '';
        data.ageGroupsData.forEach((ad: any) => {
          ageHtml += `<tr><td><b>${ad.group}</b></td><td style="text-align: center;">${ad.count}</td><td style="text-align: right;">${ad.percentage}%</td></tr>`;
        });
        htmlContent += `
          <h1 class="report-title">Participation Trends & Demographics</h1>
          <h2 class="section-title">Sports Distribution</h2>
          <table>
            <thead>
              <tr><th>Sport Name</th><th style="text-align: center;">Events</th><th style="text-align: center;">Competitions</th><th style="text-align: right;">Estimated Participants</th></tr>
            </thead>
            <tbody>${sportsHtml}</tbody>
          </table>

          <h2 class="section-title">Age Demographics</h2>
          <table>
            <thead>
              <tr><th>Age Group</th><th style="text-align: center;">Player Count</th><th style="text-align: right;">Percentage</th></tr>
            </thead>
            <tbody>${ageHtml}</tbody>
          </table>
        `;
      }
    } else if (type === 'historical') {
      const data = this.historicalComparisonsData();
      if (data) {
        let yearlyHtml = '';
        data.yearlyData.forEach((yd: any) => {
          yearlyHtml += `
            <tr>
              <td><b>${yd.year}</b></td>
              <td style="text-align: center;">${yd.eventsCount}</td>
              <td style="text-align: center;">${yd.completedEvents}</td>
              <td style="text-align: center;">${yd.teamsCount}</td>
              <td style="text-align: center;">${yd.playersEstimatedCount}</td>
              <td style="text-align: center;">${yd.matchesCount}</td>
              <td style="text-align: center;">${yd.avgScorePerMatch}</td>
              <td style="text-align: right;">${yd.avgDurationDays} days</td>
            </tr>
          `;
        });
        htmlContent += `
          <h1 class="report-title">Historical YoY Comparative Analytics</h1>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th style="text-align: center;">Total Events</th>
                <th style="text-align: center;">Completed Events</th>
                <th style="text-align: center;">Teams Registered</th>
                <th style="text-align: center;">Players (Est.)</th>
                <th style="text-align: center;">Matches Played</th>
                <th style="text-align: center;">Avg Score</th>
                <th style="text-align: right;">Avg Duration</th>
              </tr>
            </thead>
            <tbody>${yearlyHtml}</tbody>
          </table>
        `;
      }
    } else if (type === 'organizer') {
      const data = this.organizerInsightsData();
      if (data) {
        let prodHtml = '';
        data.productivity.forEach((p: any) => {
          prodHtml += `<tr><td><b>${p.name}</b></td><td style="text-align: center;">${p.scoreUpdates}</td><td style="text-align: center;">${p.matchesCreated}</td><td style="text-align: right;">${p.totalActions}</td></tr>`;
        });
        let aiRecs = '';
        data.aiRecommendation.recommendations.forEach((rec: string) => {
          aiRecs += `<li>${rec}</li>`;
        });
        let aiBottles = '';
        data.aiRecommendation.bottlenecksIdentified.forEach((bi: string) => {
          aiBottles += `<li>${bi}</li>`;
        });

        htmlContent += `
          <h1 class="report-title">Organizer Insights Hub</h1>
          <h2 class="section-title">Organizer Activity & Productivity</h2>
          <table>
            <thead>
              <tr><th>Name</th><th style="text-align: center;">Score Updates</th><th style="text-align: center;">Matches Created</th><th style="text-align: right;">Total Actions</th></tr>
            </thead>
            <tbody>${prodHtml}</tbody>
          </table>

          <div style="border: 1px dashed #4f46e5; background-color: #faf5ff; padding: 20px; border-radius: 8px; margin-top: 25px;">
            <div style="font-weight: bold; color: #4f46e5; margin-bottom: 10px;">🤖 AI-Generated Recommendations</div>
            <p><b>Identified Bottlenecks:</b></p>
            <ul>${aiBottles}</ul>
            <p><b>Suggested Actions:</b></p>
            <ul>${aiRecs}</ul>
            <p><b>Forecasted Impact:</b> ${data.aiRecommendation.predictedEfficiencyGain}</p>
          </div>
        `;
      }
    } else if (type === 'org-stats') {
      const data = this.organizationStatsData();
      if (data) {
        let partGrowthHtml = '';
        data.participation.growth.forEach((g: any) => {
          partGrowthHtml += `<tr><td>${g.month}</td><td style="text-align: center;">${g.newPlayers}</td><td style="text-align: center;">${g.newTeams}</td><td style="text-align: right;">${g.totalPlayers}</td><td style="text-align: right;">${g.totalTeams}</td></tr>`;
        });

        let sportsDistHtml = '';
        data.participation.sportsDistribution.forEach((s: any) => {
          sportsDistHtml += `<tr><td><b>${s.sport}</b></td><td style="text-align: center;">${s.events}</td><td style="text-align: center;">${s.competitions}</td><td style="text-align: right;">${s.participants}</td></tr>`;
        });

        let ageGroupsHtml = '';
        data.participation.ageGroups.forEach((a: any) => {
          ageGroupsHtml += `<tr><td>${a.group}</td><td style="text-align: center;">${a.count}</td><td style="text-align: right;">${a.percentage}%</td></tr>`;
        });

        let teamRankingsHtml = '';
        data.performance.teamRankings.forEach((r: any, idx: number) => {
          teamRankingsHtml += `<tr><td style="text-align: center;">${idx + 1}</td><td><b>${r.name}</b></td><td style="text-align: center;">${r.played}</td><td style="text-align: center;">${r.won}</td><td style="text-align: center;">${r.drawn}</td><td style="text-align: center;">${r.lost}</td><td style="text-align: right;">${r.winRate}%</td></tr>`;
        });

        let monthlyRevenueHtml = '';
        data.finance.monthlyRevenueTrend.forEach((m: any) => {
          monthlyRevenueHtml += `<tr><td>${m.month}</td><td style="text-align: center;">${m.invoicesCount}</td><td style="text-align: right;">$${(m.revenue / 100).toFixed(2)}</td></tr>`;
        });

        let pmDistHtml = '';
        data.finance.paymentMethodsDistribution.forEach((p: any) => {
          pmDistHtml += `<tr><td>${p.method.toUpperCase()}</td><td style="text-align: center;">${p.count}</td><td style="text-align: right;">$${(p.totalAmount / 100).toFixed(2)}</td></tr>`;
        });

        let monthlyAttendanceHtml = '';
        data.attendance.monthlyAttendanceTrend.forEach((m: any) => {
          monthlyAttendanceHtml += `<tr><td>${m.month}</td><td style="text-align: right;">${m.attendance}</td></tr>`;
        });

        let seasonalHtml = '';
        data.seasonalTrends.forEach((s: any) => {
          seasonalHtml += `<tr><td><b>${s.season}</b></td><td style="text-align: center;">${s.eventsCount}</td><td style="text-align: center;">${s.attendance}</td><td style="text-align: right;">$${(s.revenue / 100).toFixed(2)}</td></tr>`;
        });

        let aiRecList = '';
        data.predictiveInsights.resourceRecommendations.forEach((rec: string) => {
          aiRecList += `<li>${rec}</li>`;
        });

        htmlContent += `
          <h1 class="report-title">Organization-Wide Statistics</h1>
          
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px;">
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Players</div>
              <div style="font-size: 20px; font-weight: bold; color: #1e1b4b;">${data.participation.totalRegisteredPlayers}</div>
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px;">
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Revenue</div>
              <div style="font-size: 20px; font-weight: bold; color: #15803d;">$${(data.finance.totalRevenue / 100).toFixed(2)}</div>
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px;">
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Attendance</div>
              <div style="font-size: 20px; font-weight: bold; color: #1d4ed8;">${data.attendance.totalAttendance}</div>
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px;">
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Capacity Utilization</div>
              <div style="font-size: 20px; font-weight: bold; color: #b45309;">${data.attendance.averageCapacityUtilization}%</div>
            </div>
          </div>

          <h2 class="section-title">1. Participation & Demographics</h2>
          <h3>Sports Distribution</h3>
          <table>
            <thead>
              <tr><th>Sport</th><th style="text-align: center;">Events</th><th style="text-align: center;">Competitions</th><th style="text-align: right;">Est. Participants</th></tr>
            </thead>
            <tbody>${sportsDistHtml}</tbody>
          </table>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; margin-bottom: 25px;">
            <div>
              <h3>Monthly Growth Trend</h3>
              <table>
                <thead>
                  <tr><th>Month</th><th style="text-align: center;">New Players</th><th style="text-align: center;">New Teams</th><th style="text-align: right;">Total Players</th></tr>
                </thead>
                <tbody>${partGrowthHtml}</tbody>
              </table>
            </div>
            <div>
              <h3>Age Division Demographics</h3>
              <table>
                <thead>
                  <tr><th>Division</th><th style="text-align: center;">Players</th><th style="text-align: right;">Percentage</th></tr>
                </thead>
                <tbody>${ageGroupsHtml}</tbody>
              </table>
            </div>
          </div>

          <h2 class="section-title">2. Team Performance Leaderboard</h2>
          <table>
            <thead>
              <tr><th style="text-align: center;">Rank</th><th>Team</th><th style="text-align: center;">Played</th><th style="text-align: center;">Won</th><th style="text-align: center;">Drawn</th><th style="text-align: center;">Lost</th><th style="text-align: right;">Win Rate</th></tr>
            </thead>
            <tbody>${teamRankingsHtml}</tbody>
          </table>

          <h2 class="section-title" style="margin-top: 25px;">3. Financial Overview</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div>
              <h3>Monthly Billing Revenue</h3>
              <table>
                <thead>
                  <tr><th>Month</th><th style="text-align: center;">Invoices Count</th><th style="text-align: right;">Revenue</th></tr>
                </thead>
                <tbody>${monthlyRevenueHtml}</tbody>
              </table>
            </div>
            <div>
              <h3>Payment Methods Breakdown</h3>
              <table>
                <thead>
                  <tr><th>Method</th><th style="text-align: center;">Count</th><th style="text-align: right;">Revenue</th></tr>
                </thead>
                <tbody>${pmDistHtml}</tbody>
              </table>
            </div>
          </div>

          <h2 class="section-title">4. Estimated Event Attendance</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div>
              <h3>Monthly Projected Turnout</h3>
              <table>
                <thead>
                  <tr><th>Month</th><th style="text-align: right;">Turnout</th></tr>
                </thead>
                <tbody>${monthlyAttendanceHtml}</tbody>
              </table>
            </div>
            <div>
              <h3>Seasonal Activity Breakdown</h3>
              <table>
                <thead>
                  <tr><th>Season</th><th style="text-align: center;">Events</th><th style="text-align: center;">Attendance</th><th style="text-align: right;">Revenue</th></tr>
                </thead>
                <tbody>${seasonalHtml}</tbody>
              </table>
            </div>
          </div>

          <div style="border: 1px dashed #4f46e5; background-color: #faf5ff; padding: 20px; border-radius: 8px; margin-top: 25px; page-break-inside: avoid;">
            <div style="font-weight: bold; color: #4f46e5; margin-bottom: 10px;">🔮 AI-Generated Operational & Planning Insights</div>
            <p><b>Growth Forecast:</b> ${data.predictiveInsights.growthForecast}</p>
            <p><b>Budget Projection:</b> ${data.predictiveInsights.budgetProjection}</p>
            <p><b>Efficiency Opportunities:</b> ${data.predictiveInsights.efficiencyOpportunities}</p>
            <p><b>Strategic Resource Recommendations:</b></p>
            <ul>${aiRecList}</ul>
          </div>
        `;
      }
    }

    htmlContent += `
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  async downloadOrganizationStatsExcel() {
    const data = this.organizationStatsData();
    if (!data) return;
    this.isGeneratingAnalyticsExcel.set(true);
    try {
      const XLSX = (await import('xlsx-js-style')) as any;
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary KPI
      const summaryData = [
        ['Metric Category', 'Metric Name', 'Value'],
        ['Participation', 'Total Registered Teams', data.participation.totalRegisteredTeams],
        ['Participation', 'Total Registered Players', data.participation.totalRegisteredPlayers],
        ['Performance', 'Total Matches Played', data.performance.totalMatches],
        ['Performance', 'Average Score Per Match', data.performance.avgScorePerMatch],
        ['Finance', 'Total Paid Revenue', `$${(data.finance.totalRevenue / 100).toFixed(2)}`],
        [
          'Finance',
          'Outstanding Invoice Revenue',
          `$${(data.finance.outstandingRevenue / 100).toFixed(2)}`,
        ],
        [
          'Finance',
          'Average Invoice Value',
          `$${(data.finance.averageInvoiceValue / 100).toFixed(2)}`,
        ],
        ['Attendance', 'Total Attendance', data.attendance.totalAttendance],
        ['Attendance', 'Average Attendance Per Event', data.attendance.averageAttendance],
        [
          'Attendance',
          'Average Capacity Utilization',
          `${data.attendance.averageCapacityUtilization}%`,
        ],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

      // Sheet 2: Participation & Sports
      const partData: any[] = [
        ['Growth Trend By Month'],
        ['Month', 'New Players', 'New Teams', 'Total Players', 'Total Teams'],
      ];
      data.participation.growth.forEach((g: any) => {
        partData.push([g.month, g.newPlayers, g.newTeams, g.totalPlayers, g.totalTeams]);
      });
      partData.push([]);
      partData.push(
        ['Sports Distribution'],
        ['Sport', 'Events Count', 'Competitions Count', 'Est. Participants'],
      );
      data.participation.sportsDistribution.forEach((s: any) => {
        partData.push([s.sport, s.events, s.competitions, s.participants]);
      });
      partData.push([]);
      partData.push(['Age Group Demographics'], ['Age Division', 'Players Count', 'Percentage']);
      data.participation.ageGroups.forEach((a: any) => {
        partData.push([a.group, a.count, `${a.percentage}%`]);
      });
      const wsParticipation = XLSX.utils.aoa_to_sheet(partData);

      // Sheet 3: Performance Leaderboard
      const perfData: any[] = [
        ['Team Leaderboard (Top 5 Win Rate)'],
        ['Rank', 'Team Name', 'Matches Played', 'Won', 'Drawn', 'Lost', 'Win Rate (%)'],
      ];
      data.performance.teamRankings.forEach((r: any, idx: number) => {
        perfData.push([idx + 1, r.name, r.played, r.won, r.drawn, r.lost, `${r.winRate}%`]);
      });
      const wsPerformance = XLSX.utils.aoa_to_sheet(perfData);

      // Sheet 4: Finance Analytics
      const finData: any[] = [
        ['Monthly Billing & Invoice Revenue'],
        ['Month', 'Invoiced Amount', 'Invoices Count'],
      ];
      data.finance.monthlyRevenueTrend.forEach((m: any) => {
        finData.push([m.month, `$${(m.revenue / 100).toFixed(2)}`, m.invoicesCount]);
      });
      finData.push([]);
      finData.push(
        ['Payment Methods Breakdown'],
        ['Payment Method', 'Transactions Count', 'Total Paid Cents'],
      );
      data.finance.paymentMethodsDistribution.forEach((p: any) => {
        finData.push([p.method.toUpperCase(), p.count, `$${(p.totalAmount / 100).toFixed(2)}`]);
      });
      finData.push([]);
      finData.push(['Invoice Status Counts'], ['Status', 'Count']);
      data.finance.statusCounts.forEach((s: any) => {
        finData.push([s.status.toUpperCase(), s.count]);
      });
      const wsFinance = XLSX.utils.aoa_to_sheet(finData);

      // Sheet 5: Attendance Logs
      const attData: any[] = [['Monthly Estimated Turnout'], ['Month', 'Total Estimated Turnout']];
      data.attendance.monthlyAttendanceTrend.forEach((m: any) => {
        attData.push([m.month, m.attendance]);
      });
      attData.push([]);
      attData.push(
        ['Event Breakdown'],
        [
          'Event Name',
          'Spectators',
          'Participants',
          'Total Turnout',
          'Venue Capacity',
          'Utilization Rate (%)',
        ],
      );
      data.attendance.breakdown.forEach((b: any) => {
        attData.push([
          b.eventName,
          b.spectators,
          b.participants,
          b.total,
          b.capacity,
          `${b.utilization}%`,
        ]);
      });
      const wsAttendance = XLSX.utils.aoa_to_sheet(attData);

      // Sheet 6: Seasons & AI Insights
      const seaData: any[] = [
        ['Seasonal Operations Breakdown'],
        ['Season', 'Events Count', 'Attendance Total', 'Revenue Paid'],
      ];
      data.seasonalTrends.forEach((s: any) => {
        seaData.push([s.season, s.eventsCount, s.attendance, `$${(s.revenue / 100).toFixed(2)}`]);
      });
      seaData.push([]);
      seaData.push(['AI-Generated Predictive Planning Insights']);
      seaData.push(['Metric / Recommendation Area', 'Insights / Suggested Action']);
      seaData.push(['Growth Forecast', data.predictiveInsights.growthForecast]);
      seaData.push(['Budget Projection', data.predictiveInsights.budgetProjection]);
      seaData.push([
        'Operational Efficiency Opportunities',
        data.predictiveInsights.efficiencyOpportunities,
      ]);
      data.predictiveInsights.resourceRecommendations.forEach((rec: string, idx: number) => {
        seaData.push([`Resource Recommendation ${idx + 1}`, rec]);
      });
      const wsSeasons = XLSX.utils.aoa_to_sheet(seaData);

      const sheets = [
        { name: 'Summary Metrics', ws: wsSummary, isAoa: true },
        { name: 'Participation Details', ws: wsParticipation, isAoa: true },
        { name: 'Performance Details', ws: wsPerformance, isAoa: true },
        { name: 'Finance Details', ws: wsFinance, isAoa: true },
        { name: 'Attendance Details', ws: wsAttendance, isAoa: true },
        { name: 'Seasons & AI Planning', ws: wsSeasons, isAoa: true },
      ];

      for (const sheet of sheets) {
        const range = XLSX.utils.decode_range(sheet.ws['!ref'] || 'A1:A1');
        const cols: any[] = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          let maxLen = 12;
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cell = sheet.ws[XLSX.utils.encode_cell({ r: R, c: C })];
            if (cell && cell.v) {
              maxLen = Math.max(maxLen, cell.v.toString().length);
            }
          }
          cols.push({ wch: maxLen + 2 });
        }
        sheet.ws['!cols'] = cols;

        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = sheet.ws[address];
            if (!cell) continue;

            const val = cell.v ? cell.v.toString() : '';
            const isHeaderRow =
              R === 0 ||
              val.includes('Distribution') ||
              val.includes('Trend') ||
              val.includes('Demographics') ||
              val.includes('Leaderboard') ||
              val.includes('Breakdown') ||
              val.includes('Counts') ||
              val.includes('Insights') ||
              val.includes('Category') ||
              val === 'Metric Category' ||
              val === 'Month' ||
              val === 'Rank' ||
              val === 'Payment Method' ||
              val === 'Season' ||
              val === 'Metric / Recommendation Area';

            if (isHeaderRow) {
              cell.s = {
                fill: { fgColor: { rgb: R === 0 ? '1E1B4B' : '4F46E5' } },
                font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Segoe UI', size: 10 },
                alignment: { horizontal: 'left', vertical: 'center' },
              };
            } else {
              cell.s = {
                font: { name: 'Segoe UI', size: 10 },
                alignment: { vertical: 'center' },
              };
            }
          }
        }

        XLSX.utils.book_append_sheet(wb, sheet.ws, sheet.name);
      }

      XLSX.writeFile(wb, `${this.workspace()?.slug}_organization_wide_statistics.xlsx`);
    } catch (err) {
      console.error('Failed to generate organization stats Excel', err);
    } finally {
      this.isGeneratingAnalyticsExcel.set(false);
    }
  }

  async downloadVolunteerExcel() {
    const vols = this.volunteerReportsData();
    if (!vols || vols.length === 0) return;
    this.isGeneratingAnalyticsExcel.set(true);
    try {
      const XLSX = (await import('xlsx-js-style')) as any;
      const wb = XLSX.utils.book_new();

      // Sheet 1: Volunteer Roster
      const rosterHeaders = [
        'Username',
        'Status',
        'Skills',
        'Shifts Signed Up',
        'Shifts Completed',
        'Total Hours Logged',
        'Average Rating',
      ];
      const rosterRows = vols.map((v) => {
        const assignments = v.assignments || [];
        const completed = assignments.filter((a: any) => a.status === 'attended');
        const totalHours = completed.reduce(
          (sum: number, a: any) => sum + Number(a.serviceHours || 0),
          0,
        );
        const ratings = completed
          .filter((a: any) => a.rating !== null)
          .map((a: any) => a.rating as number);
        const avgRating =
          ratings.length > 0
            ? (ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length).toFixed(1)
            : 'N/A';

        return [
          v.user.username,
          v.status.toUpperCase(),
          v.skills.join(', '),
          assignments.length,
          completed.length,
          totalHours,
          avgRating,
        ];
      });

      const rosterData = [rosterHeaders, ...rosterRows];
      const wsRoster = XLSX.utils.aoa_to_sheet(rosterData);
      wsRoster['!cols'] = rosterHeaders.map(() => ({ wch: 18 }));

      // Style Roster Sheet
      const rosterRange = XLSX.utils.decode_range(wsRoster['!ref'] || 'A1:G1');
      for (let R = rosterRange.s.r; R <= rosterRange.e.r; ++R) {
        for (let C = rosterRange.s.c; C <= rosterRange.e.c; ++C) {
          const cell = wsRoster[XLSX.utils.encode_cell({ r: R, c: C })];
          if (!cell) continue;
          if (R === 0) {
            cell.s = {
              fill: { fgColor: { rgb: '1E1B4B' } },
              font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Segoe UI', size: 10 },
              alignment: { horizontal: 'left', vertical: 'center' },
            };
          } else {
            cell.s = {
              font: { name: 'Segoe UI', size: 10 },
              alignment: { vertical: 'center' },
            };
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, wsRoster, 'Volunteer Roster');

      // Sheet 2: Assignments Detail
      const detailHeaders = [
        'Shift Title',
        'Role',
        'VolunteerName',
        'Status',
        'Service Hours',
        'Rating',
        'Feedback',
        'Date',
      ];
      const detailRows: any[] = [];
      vols.forEach((v) => {
        const assignments = v.assignments || [];
        assignments.forEach((a: any) => {
          detailRows.push([
            a.shift?.title || 'N/A',
            a.shift?.role || 'N/A',
            v.user.username,
            a.status.toUpperCase(),
            a.serviceHours || 0,
            a.rating || 'N/A',
            a.feedback || '',
            a.shift?.startAt ? new Date(a.shift.startAt).toLocaleDateString() : 'N/A',
          ]);
        });
      });

      const detailData = [detailHeaders, ...detailRows];
      const wsDetails = XLSX.utils.aoa_to_sheet(detailData);
      wsDetails['!cols'] = detailHeaders.map(() => ({ wch: 18 }));

      // Style Details Sheet
      const detailsRange = XLSX.utils.decode_range(wsDetails['!ref'] || 'A1:H1');
      for (let R = detailsRange.s.r; R <= detailsRange.e.r; ++R) {
        for (let C = detailsRange.s.c; C <= detailsRange.e.c; ++C) {
          const cell = wsDetails[XLSX.utils.encode_cell({ r: R, c: C })];
          if (!cell) continue;
          if (R === 0) {
            cell.s = {
              fill: { fgColor: { rgb: '1E1B4B' } },
              font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Segoe UI', size: 10 },
              alignment: { horizontal: 'left', vertical: 'center' },
            };
          } else {
            cell.s = {
              font: { name: 'Segoe UI', size: 10 },
              alignment: { vertical: 'center' },
            };
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, wsDetails, 'Assignments Detail');

      XLSX.writeFile(wb, `${this.workspace()?.slug || 'workspace'}_volunteer_analytics.xlsx`);
    } catch (err) {
      console.error('Failed to generate volunteer Excel report', err);
    } finally {
      this.isGeneratingAnalyticsExcel.set(false);
    }
  }
}
