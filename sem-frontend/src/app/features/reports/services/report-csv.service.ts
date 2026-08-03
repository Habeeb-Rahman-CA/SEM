import { Injectable } from '@angular/core';
import {
  Competition,
  CompetitionStats,
  CompetitionStage,
  CompetitionTeam,
  Match,
  Player,
  Team,
  Workspace,
  WorkspaceEvent,
  WorkspaceMember,
} from '../../workspaces/services/workspace.service';
import {
  EventDashboardData,
  HistoricalComparisonData,
  OrganizerInsightsData,
  ParticipationTrendsData,
  ReportType,
} from '../models/report.interface';
import { getStandingsForStage } from '../utils/standings.util';

export interface CsvExportContext {
  reportType: ReportType;
  workspace: Workspace | null;
  teams: Team[];
  players: Player[];
  events: WorkspaceEvent[];
  members: WorkspaceMember[];
  competitions: Competition[];
  stages: CompetitionStage[];
  matches: Match[];
  competitionTeams: CompetitionTeam[];
  competitionStats: CompetitionStats | null;
  selectedEventId: string;
  selectedCompetitionId: string;
  selectedTeamId: string;
  selectedPlayerId: string;
  eventReportsData: EventDashboardData | null;
  participationTrendsData: ParticipationTrendsData | null;
  historicalComparisonsData: HistoricalComparisonData | null;
  organizerInsightsData: OrganizerInsightsData | null;
}

@Injectable({ providedIn: 'root' })
export class ReportCsvService {
  export(ctx: CsvExportContext): void {
    const type = ctx.reportType;
    if (type === 'workspace') this.exportWorkspace(ctx);
    else if (type === 'event') this.exportEvent(ctx);
    else if (type === 'competition') this.exportCompetition(ctx);
    else if (type === 'team') this.exportTeam(ctx);
    else if (type === 'player') this.exportPlayer(ctx);
    else if (type === 'event-dashboard') this.exportEventDashboard(ctx);
    else if (type === 'trends') this.exportTrends(ctx);
    else if (type === 'historical') this.exportHistorical(ctx);
    else if (type === 'organizer') this.exportOrganizer(ctx);
  }

  private exportWorkspace(ctx: CsvExportContext) {
    const headers = ['Team Name', 'Code', 'Description', 'Created Date'];
    const rows = ctx.teams.map((t) => [
      t.name,
      t.code,
      t.description || '',
      new Date(t.createdAt).toLocaleDateString(),
    ]);
    this.download(`${ctx.workspace?.slug}_workspace_teams.csv`, headers, rows);
  }

  private exportEvent(ctx: CsvExportContext) {
    const event = ctx.events.find((e) => e.id === ctx.selectedEventId);
    if (!event) return;
    const headers = ['Category Name', 'Sport', 'Status', 'Created Date'];
    const rows = ctx.competitions.map((c) => [
      c.name,
      c.sport?.name || 'N/A',
      c.status.toUpperCase(),
      new Date(c.createdAt).toLocaleDateString(),
    ]);
    this.download(`${event.name.replace(/\s+/g, '_')}_competitions.csv`, headers, rows);
  }

  private exportCompetition(ctx: CsvExportContext) {
    const comp = ctx.competitions.find((c) => c.id === ctx.selectedCompetitionId);
    if (!comp) return;

    const leagueStages = ctx.stages.filter(
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
        const standings = getStandingsForStage(stage, ctx.matches, ctx.competitionTeams);
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
      this.download(`${comp.name.replace(/\s+/g, '_')}_standings.csv`, headers, rows);
    } else {
      const headers = ['Stage', 'Home Team', 'Home Score', 'Away Score', 'Away Team', 'Status'];
      const rows = ctx.matches.map((m) => [
        ctx.stages.find((s) => s.id === m.stageId)?.name || 'N/A',
        m.homeTeam?.name || 'TBD',
        m.status === 'completed' ? m.homeScore : '-',
        m.status === 'completed' ? m.awayScore : '-',
        m.awayTeam?.name || 'TBD',
        m.status.toUpperCase(),
      ]);
      this.download(`${comp.name.replace(/\s+/g, '_')}_fixtures.csv`, headers, rows);
    }
  }

  private exportTeam(ctx: CsvExportContext) {
    const team = ctx.teams.find((t) => t.id === ctx.selectedTeamId);
    if (!team) return;
    const roster = ctx.players.filter((p) => p.teamId === ctx.selectedTeamId);
    const headers = ['Player Username', 'Jersey Number', 'Registered Date'];
    const rows = roster.map((p) => [
      p.user.username,
      p.jerseyNumber || 'N/A',
      new Date(p.createdAt).toLocaleDateString(),
    ]);
    this.download(`${team.name.replace(/\s+/g, '_')}_roster.csv`, headers, rows);
  }

  private exportPlayer(ctx: CsvExportContext) {
    const player = ctx.players.find((p) => p.id === ctx.selectedPlayerId);
    if (!player) return;
    const member = ctx.members.find((m) => m.userId === player.userId);
    const stats = ctx.competitionStats;
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
    this.download(`${player.user.username}_profile.csv`, headers, rows);
  }

  private exportEventDashboard(ctx: CsvExportContext) {
    const data = ctx.eventReportsData;
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
    const rows = data.eventBreakdowns.map((eb) => [
      eb.name,
      eb.status,
      eb.sport,
      eb.teamsRegistered,
      eb.competitionsCount,
      eb.matchesCount,
      eb.matchesCompleted,
      eb.progress,
    ]);
    this.download(`${ctx.workspace?.slug}_event_reports_summary.csv`, headers, rows);
  }

  private exportTrends(ctx: CsvExportContext) {
    const data = ctx.participationTrendsData;
    if (!data) return;
    const headers = ['Month', 'New Players', 'New Teams', 'Total Players', 'Total Teams'];
    const rows = data.growthTrend.map((gt) => [
      gt.month,
      gt.newPlayers,
      gt.newTeams,
      gt.totalPlayers,
      gt.totalTeams,
    ]);
    this.download(`${ctx.workspace?.slug}_participation_trends.csv`, headers, rows);
  }

  private exportHistorical(ctx: CsvExportContext) {
    const data = ctx.historicalComparisonsData;
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
    const rows = data.yearlyData.map((yd) => [
      yd.year,
      yd.eventsCount,
      yd.completedEvents,
      yd.teamsCount,
      yd.playersEstimatedCount,
      yd.matchesCount,
      yd.avgScorePerMatch,
      yd.avgDurationDays,
    ]);
    this.download(`${ctx.workspace?.slug}_historical_comparisons.csv`, headers, rows);
  }

  private exportOrganizer(ctx: CsvExportContext) {
    const data = ctx.organizerInsightsData;
    if (!data) return;
    const headers = ['Organizer Name', 'Score Updates', 'Matches Created', 'Total Actions'];
    const rows = data.productivity.map((p) => [
      p.name,
      p.scoreUpdates,
      p.matchesCreated,
      p.totalActions,
    ]);
    this.download(`${ctx.workspace?.slug}_organizer_productivity.csv`, headers, rows);
  }

  private download(filename: string, headers: string[], rows: any[][]): void {
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
}
