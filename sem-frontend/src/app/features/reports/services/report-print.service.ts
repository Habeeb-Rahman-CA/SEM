import { Injectable } from '@angular/core';
import {
  Competition,
  CompetitionStage,
  CompetitionStats,
  CompetitionTeam,
  Match,
  Player,
  Team,
  Venue,
  Workspace,
  WorkspaceEvent,
  WorkspaceMember,
} from '../../workspaces/services/workspace.service';
import {
  EventDashboardData,
  HistoricalComparisonData,
  OrganizationStatsData,
  OrganizerInsightsData,
  ParticipationTrendsData,
  ReportType,
  TeamStatsSummary,
} from '../models/report.interface';
import { getStandingsForStage } from '../utils/standings.util';
import {
  buildCompetitionReportHtml,
  buildEventDashboardReportHtml,
  buildEventReportHtml,
  buildHistoricalReportHtml,
  buildOrganizerReportHtml,
  buildOrgStatsReportHtml,
  buildPlayerReportHtml,
  buildTeamReportHtml,
  buildTrendsReportHtml,
  buildWorkspaceReportHtml,
  wrapPrintDocument,
} from './report-print-templates';

export interface PrintReportContext {
  reportType: ReportType;
  workspace: Workspace | null;
  teams: Team[];
  players: Player[];
  events: WorkspaceEvent[];
  venues: Venue[];
  members: WorkspaceMember[];
  competitions: Competition[];
  stages: CompetitionStage[];
  matches: Match[];
  competitionTeams: CompetitionTeam[];
  competitionStats: CompetitionStats | null;
  teamStats: TeamStatsSummary;
  teamRoster: Player[];
  selectedEventId: string;
  selectedCompetitionId: string;
  selectedTeamId: string;
  selectedPlayerId: string;
  eventReportsData: EventDashboardData | null;
  participationTrendsData: ParticipationTrendsData | null;
  historicalComparisonsData: HistoricalComparisonData | null;
  organizerInsightsData: OrganizerInsightsData | null;
  organizationStatsData: OrganizationStatsData | null;
}

@Injectable({ providedIn: 'root' })
export class ReportPrintService {
  printReport(ctx: PrintReportContext): void {
    const ws = ctx.workspace;
    if (!ws) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate the print preview.');
      return;
    }

    const title = this.buildTitle(ctx);
    const body = this.buildBody(ctx);
    if (body === null) return;

    const html = wrapPrintDocument(title, body);
    printWindow.document.write(html);
    printWindow.document.close();
  }

  private buildTitle(ctx: PrintReportContext): string {
    const ws = ctx.workspace!;
    const type = ctx.reportType;
    if (type === 'workspace') return `Workspace Summary - ${ws.name}`;
    if (type === 'event') {
      const ev = ctx.events.find((e) => e.id === ctx.selectedEventId);
      return ev ? `Event Report - ${ev.name}` : `Report - ${ws.name}`;
    }
    if (type === 'competition') {
      const comp = ctx.competitions.find((c) => c.id === ctx.selectedCompetitionId);
      return comp ? `Tournament Report - ${comp.name}` : `Report - ${ws.name}`;
    }
    if (type === 'team') {
      const team = ctx.teams.find((t) => t.id === ctx.selectedTeamId);
      return team ? `Team Performance - ${team.name}` : `Report - ${ws.name}`;
    }
    if (type === 'player') {
      const player = ctx.players.find((p) => p.id === ctx.selectedPlayerId);
      return player ? `Player Performance - ${player.user.username}` : `Report - ${ws.name}`;
    }
    if (type === 'event-dashboard') return `Event Reports Summary - ${ws.name}`;
    if (type === 'trends') return `Participation Trends - ${ws.name}`;
    if (type === 'historical') return `Historical comparisons - ${ws.name}`;
    if (type === 'organizer') return `Organizer Insights - ${ws.name}`;
    return `Report - ${ws.name}`;
  }

  private buildBody(ctx: PrintReportContext): string | null {
    const ws = ctx.workspace!;
    const type = ctx.reportType;

    if (type === 'workspace') {
      return buildWorkspaceReportHtml(ws, ctx.teams, ctx.players, ctx.events, ctx.venues);
    }
    if (type === 'event') {
      const ev = ctx.events.find((e) => e.id === ctx.selectedEventId);
      if (!ev) return null;
      return buildEventReportHtml(ws, ev, ctx.competitions, ctx.matches, ctx.stages);
    }
    if (type === 'competition') {
      const ev = ctx.events.find((e) => e.id === ctx.selectedEventId);
      const comp = ctx.competitions.find((c) => c.id === ctx.selectedCompetitionId);
      if (!ev || !comp) return null;
      const standingsFn = (stage: CompetitionStage) =>
        getStandingsForStage(stage, ctx.matches, ctx.competitionTeams);
      return buildCompetitionReportHtml(
        ws,
        ev,
        comp,
        ctx.stages,
        ctx.matches,
        standingsFn,
        ctx.competitionStats,
      );
    }
    if (type === 'team') {
      const team = ctx.teams.find((t) => t.id === ctx.selectedTeamId);
      if (!team) return null;
      return buildTeamReportHtml(ws, team, ctx.teamStats, ctx.teamRoster);
    }
    if (type === 'player') {
      const player = ctx.players.find((p) => p.id === ctx.selectedPlayerId);
      if (!player) return null;
      const member = ctx.members.find((m) => m.userId === player.userId);
      return buildPlayerReportHtml(ws, player, member, ctx.competitionStats);
    }
    if (type === 'event-dashboard' && ctx.eventReportsData) {
      return buildEventDashboardReportHtml(ctx.eventReportsData);
    }
    if (type === 'trends' && ctx.participationTrendsData) {
      return buildTrendsReportHtml(ctx.participationTrendsData);
    }
    if (type === 'historical' && ctx.historicalComparisonsData) {
      return buildHistoricalReportHtml(ctx.historicalComparisonsData);
    }
    if (type === 'organizer' && ctx.organizerInsightsData) {
      return buildOrganizerReportHtml(ctx.organizerInsightsData);
    }
    if (type === 'org-stats' && ctx.organizationStatsData) {
      return buildOrgStatsReportHtml(ctx.organizationStatsData);
    }
    return '';
  }
}
