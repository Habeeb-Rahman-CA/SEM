import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  Competition,
  CompetitionStage,
  CompetitionStats,
  CompetitionTeam,
  Match,
  Player,
  Role,
  Sport,
  Team,
  Venue,
  Workspace,
  WorkspaceEvent,
  WorkspaceMember,
  WorkspaceService,
} from '../../workspaces/services/workspace.service';
import { CompetitionService } from '../../competitions/services/competition.service';
import { AnalyticsService } from '../services/analytics.service';
import { VolunteerService } from '../../volunteers/services/volunteer.service';
import {
  EventDashboardData,
  HistoricalComparisonData,
  OrganizationStatsData,
  OrganizerInsightsData,
  ParticipationTrendsData,
  ReportType,
  VolunteerReportRow,
} from '../models/report.interface';
import { ReportCsvService } from '../services/report-csv.service';
import { ReportExcelService } from '../services/report-excel.service';
import { ReportPrintService } from '../services/report-print.service';
import { computeTeamStats } from '../utils/standings.util';
import { WorkspaceReportPanel } from '../components/panels/workspace-report-panel';
import { EventReportPanel } from '../components/panels/event-report-panel';
import { CompetitionReportPanel } from '../components/panels/competition-report-panel';
import { TeamReportPanel } from '../components/panels/team-report-panel';
import { PlayerReportPanel } from '../components/panels/player-report-panel';
import { VolunteerReportPanel } from '../components/panels/volunteer-report-panel';
import { EventDashboardPanel } from '../components/panels/event-dashboard-panel';
import { TrendsPanel } from '../components/panels/trends-panel';
import { HistoricalPanel } from '../components/panels/historical-panel';
import { OrganizerPanel } from '../components/panels/organizer-panel';
import { OrgStatsPanel } from '../components/panels/org-stats-panel';

@Component({
  selector: 'app-workspace-reports',
  standalone: true,
  imports: [
    FormsModule,
    WorkspaceReportPanel,
    EventReportPanel,
    CompetitionReportPanel,
    TeamReportPanel,
    PlayerReportPanel,
    VolunteerReportPanel,
    EventDashboardPanel,
    TrendsPanel,
    HistoricalPanel,
    OrganizerPanel,
    OrgStatsPanel,
  ],
  templateUrl: './reports.html',
})
export class WorkspaceReportsComponent {
  private competitionService = inject(CompetitionService);
  private workspaceService = inject(WorkspaceService);
  private analyticsService = inject(AnalyticsService);
  private volunteerService = inject(VolunteerService);
  private excelService = inject(ReportExcelService);
  private csvService = inject(ReportCsvService);
  private printService = inject(ReportPrintService);

  workspace = input.required<Workspace | null>();
  teams = input.required<Team[]>();
  players = input.required<Player[]>();
  events = input.required<WorkspaceEvent[]>();
  venues = input.required<Venue[]>();
  members = input.required<WorkspaceMember[]>();
  roles = input.required<Role[]>();

  reportType = signal<ReportType>('workspace');
  selectedSport = signal<string>('');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  selectedTeamId = signal<string>('');
  selectedPlayerId = signal<string>('');
  selectedEventId = signal<string>('');
  selectedCompetitionId = signal<string>('');

  sports = signal<Sport[]>([]);
  competitions = signal<Competition[]>([]);
  stages = signal<CompetitionStage[]>([]);
  matches = signal<Match[]>([]);
  competitionStats = signal<CompetitionStats | null>(null);
  competitionTeams = signal<CompetitionTeam[]>([]);

  isLoadingDetails = signal<boolean>(false);
  isLoadingCompetitions = signal<boolean>(false);
  isLoadingAnalytics = signal<boolean>(false);

  eventReportsData = signal<EventDashboardData | null>(null);
  participationTrendsData = signal<ParticipationTrendsData | null>(null);
  historicalComparisonsData = signal<HistoricalComparisonData | null>(null);
  organizerInsightsData = signal<OrganizerInsightsData | null>(null);
  organizationStatsData = signal<OrganizationStatsData | null>(null);
  volunteerReportsData = signal<VolunteerReportRow[]>([]);

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

  teamMatches = computed(() =>
    this.matches().filter(
      (m) => m.homeTeamId === this.selectedTeamId() || m.awayTeamId === this.selectedTeamId(),
    ),
  );
  teamRoster = computed(() => this.players().filter((p) => p.teamId === this.selectedTeamId()));
  teamStats = computed(() => computeTeamStats(this.selectedTeamId(), this.teamMatches()));

  ngOnInit() {
    this.loadSports();
  }

  loadSports() {
    this.workspaceService.getSports().subscribe({
      next: (list) => this.sports.set(list),
      error: (err) => console.error('Failed to load sports', err),
    });
  }

  onEventChange(eventId: string) {
    this.selectedEventId.set(eventId);
    this.selectedCompetitionId.set('');
    this.competitions.set([]);
    this.stages.set([]);
    this.matches.set([]);
    this.competitionStats.set(null);
    this.competitionTeams.set([]);

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
    this.competitionTeams.set([]);

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
        this.competitionTeams.set(res.teams);
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

  selectReportType(type: ReportType) {
    this.reportType.set(type);
    const wsId = this.workspace()?.id;
    if (!wsId) return;

    if (type === 'event-dashboard') {
      this.isLoadingAnalytics.set(true);
      this.analyticsService.getEventReports(wsId).subscribe({
        next: (data) => {
          this.eventReportsData.set(data as EventDashboardData);
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
          this.participationTrendsData.set(data as ParticipationTrendsData);
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
          this.historicalComparisonsData.set(data as HistoricalComparisonData);
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
          this.organizerInsightsData.set(data as OrganizerInsightsData);
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
          this.organizationStatsData.set(data as OrganizationStatsData);
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
          this.volunteerReportsData.set(data as unknown as VolunteerReportRow[]);
          this.isLoadingAnalytics.set(false);
        },
        error: (err) => {
          console.error('Failed to load volunteer reports', err);
          this.isLoadingAnalytics.set(false);
        },
      });
    }
  }

  downloadCSV() {
    this.csvService.export({
      reportType: this.reportType(),
      workspace: this.workspace(),
      teams: this.teams(),
      players: this.players(),
      events: this.events(),
      members: this.members(),
      competitions: this.competitions(),
      stages: this.stages(),
      matches: this.matches(),
      competitionTeams: this.competitionTeams(),
      competitionStats: this.competitionStats(),
      selectedEventId: this.selectedEventId(),
      selectedCompetitionId: this.selectedCompetitionId(),
      selectedTeamId: this.selectedTeamId(),
      selectedPlayerId: this.selectedPlayerId(),
      eventReportsData: this.eventReportsData(),
      participationTrendsData: this.participationTrendsData(),
      historicalComparisonsData: this.historicalComparisonsData(),
      organizerInsightsData: this.organizerInsightsData(),
    });
  }

  printOfficialReport() {
    this.printService.printReport({
      reportType: this.reportType(),
      workspace: this.workspace(),
      teams: this.teams(),
      players: this.players(),
      events: this.events(),
      venues: this.venues(),
      members: this.members(),
      competitions: this.competitions(),
      stages: this.stages(),
      matches: this.matches(),
      competitionTeams: this.competitionTeams(),
      competitionStats: this.competitionStats(),
      teamStats: this.teamStats(),
      teamRoster: this.teamRoster(),
      selectedEventId: this.selectedEventId(),
      selectedCompetitionId: this.selectedCompetitionId(),
      selectedTeamId: this.selectedTeamId(),
      selectedPlayerId: this.selectedPlayerId(),
      eventReportsData: this.eventReportsData(),
      participationTrendsData: this.participationTrendsData(),
      historicalComparisonsData: this.historicalComparisonsData(),
      organizerInsightsData: this.organizerInsightsData(),
      organizationStatsData: this.organizationStatsData(),
    });
  }

  downloadExcelReport() {
    const type = this.reportType();
    if (type === 'workspace')
      this.runExcel(this.isGeneratingWorkspaceReport, () =>
        this.excelService.downloadWorkspace(
          this.workspace(),
          this.teams(),
          this.players(),
          this.events(),
          this.venues(),
          this.members(),
        ),
      );
    else if (type === 'event')
      this.runExcel(this.isGeneratingEventExcel, () =>
        this.excelService.downloadEvent(
          this.events(),
          this.selectedEventId(),
          this.competitions(),
          this.matches(),
          this.stages(),
        ),
      );
    else if (type === 'competition')
      this.runExcel(this.isGeneratingCompExcel, () =>
        this.excelService.downloadCompetition(
          this.competitions(),
          this.selectedCompetitionId(),
          this.stages(),
          this.matches(),
          this.competitionTeams(),
          this.competitionStats(),
        ),
      );
    else if (type === 'team')
      this.runExcel(this.isGeneratingTeamExcel, () =>
        this.excelService.downloadTeam(
          this.teams(),
          this.selectedTeamId(),
          this.teamStats(),
          this.teamRoster(),
          this.teamMatches(),
          this.competitions(),
          this.stages(),
        ),
      );
    else if (type === 'player')
      this.runExcel(this.isGeneratingPlayerReport, () =>
        this.excelService.downloadPlayer(
          this.players(),
          this.selectedPlayerId(),
          this.members(),
          this.competitionStats(),
        ),
      );
    else if (type === 'event-dashboard')
      this.runExcel(this.isGeneratingAnalyticsExcel, () =>
        this.excelService.downloadEventDashboard(this.workspace(), this.eventReportsData()),
      );
    else if (type === 'trends')
      this.runExcel(this.isGeneratingAnalyticsExcel, () =>
        this.excelService.downloadParticipationTrends(
          this.workspace(),
          this.participationTrendsData(),
        ),
      );
    else if (type === 'historical')
      this.runExcel(this.isGeneratingAnalyticsExcel, () =>
        this.excelService.downloadHistoricalComparisons(
          this.workspace(),
          this.historicalComparisonsData(),
        ),
      );
    else if (type === 'organizer')
      this.runExcel(this.isGeneratingAnalyticsExcel, () =>
        this.excelService.downloadOrganizerInsights(this.workspace(), this.organizerInsightsData()),
      );
    else if (type === 'org-stats')
      this.runExcel(this.isGeneratingAnalyticsExcel, () =>
        this.excelService.downloadOrganizationStats(this.workspace(), this.organizationStatsData()),
      );
    else if (type === 'volunteer')
      this.runExcel(this.isGeneratingAnalyticsExcel, () =>
        this.excelService.downloadVolunteer(this.workspace(), this.volunteerReportsData()),
      );
  }

  private async runExcel(
    flag: { set: (v: boolean) => void },
    op: () => Promise<void>,
  ): Promise<void> {
    flag.set(true);
    try {
      await op();
    } catch (err) {
      console.error('Excel export failed', err);
    } finally {
      flag.set(false);
    }
  }
}
