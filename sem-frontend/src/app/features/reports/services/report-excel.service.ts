import { Injectable } from '@angular/core';
import {
  Competition,
  CompetitionStats,
  CompetitionStage,
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
  TeamStatsSummary,
  VolunteerReportRow,
} from '../models/report.interface';
import { getStandingsForStage } from '../utils/standings.util';
import {
  applyAoaLabeledSheet,
  applyBrandedSheet,
  applyCustomStyledSheet,
  BRAND_DARK_INDIGO,
  BRAND_EMERALD,
  BRAND_INDIGO,
  BRAND_PURPLE,
} from '../utils/xlsx-style.util';

async function loadXlsx(): Promise<any> {
  return (await import('xlsx-js-style')) as any;
}

@Injectable({ providedIn: 'root' })
export class ReportExcelService {
  async downloadWorkspace(
    workspace: Workspace | null,
    teams: Team[],
    players: Player[],
    events: WorkspaceEvent[],
    venues: Venue[],
    members: WorkspaceMember[],
  ): Promise<void> {
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();

    const wsInfoData = [
      ['Workspace Name', workspace?.name],
      ['Slug', workspace?.slug],
      ['Description', workspace?.description || 'N/A'],
      ['Created At', workspace?.createdAt],
      ['Total Teams', teams.length],
      ['Total Players', players.length],
      ['Total Events', events.length],
      ['Total Venues', venues.length],
      ['Total Collaborators', members.length],
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(wsInfoData);

    const teamsData = teams.map((t) => ({
      'Team Name': t.name,
      Code: t.code,
      Description: t.description || '',
      'Created Date': new Date(t.createdAt).toLocaleDateString(),
    }));
    const wsTeams = XLSX.utils.json_to_sheet(teamsData);

    const playersData = players.map((p) => ({
      Username: p.user.username,
      'Jersey Number': p.jerseyNumber || 'N/A',
      'Team Name': p.team?.name || 'N/A',
      'Registered Date': new Date(p.createdAt).toLocaleDateString(),
    }));
    const wsPlayers = XLSX.utils.json_to_sheet(playersData);

    const venuesData = venues.map((v) => ({
      'Venue Name': v.name,
      Location: v.location || '',
      'Created Date': new Date(v.createdAt).toLocaleDateString(),
    }));
    const wsVenues = XLSX.utils.json_to_sheet(venuesData);

    const eventsData = events.map((e) => ({
      'Event Name': e.name,
      Status: e.status,
      'Start Date': e.startDate ? new Date(e.startDate).toLocaleDateString() : 'N/A',
      'End Date': e.endDate ? new Date(e.endDate).toLocaleDateString() : 'N/A',
      Description: e.description || '',
    }));
    const wsEvents = XLSX.utils.json_to_sheet(eventsData);

    applyAoaLabeledSheet(wsInfo, XLSX);
    applyBrandedSheet(wsTeams, XLSX);
    applyBrandedSheet(wsPlayers, XLSX);
    applyBrandedSheet(wsVenues, XLSX);
    applyBrandedSheet(wsEvents, XLSX);

    XLSX.utils.book_append_sheet(wb, wsInfo, 'Summary');
    XLSX.utils.book_append_sheet(wb, wsTeams, 'Teams');
    XLSX.utils.book_append_sheet(wb, wsPlayers, 'Players');
    XLSX.utils.book_append_sheet(wb, wsVenues, 'Venues');
    XLSX.utils.book_append_sheet(wb, wsEvents, 'Events');

    XLSX.writeFile(wb, `${workspace?.slug}_workspace_report.xlsx`);
  }

  async downloadPlayerRoster(
    workspace: Workspace | null,
    players: Player[],
    members: WorkspaceMember[],
  ): Promise<void> {
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();

    const playersData = players.map((p) => {
      const member = members.find((m) => m.userId === p.userId);
      return {
        Username: p.user.username,
        'Jersey Number': p.jerseyNumber || 'N/A',
        'Team Name': p.team?.name || 'N/A',
        'Workspace Role': member?.role?.name || 'Viewer',
        'Registered At': new Date(p.createdAt).toLocaleDateString(),
      };
    });

    const wsPlayers = XLSX.utils.json_to_sheet(playersData);
    applyBrandedSheet(wsPlayers, XLSX);

    XLSX.utils.book_append_sheet(wb, wsPlayers, 'Player Roster');
    XLSX.writeFile(wb, `${workspace?.slug}_player_report.xlsx`);
  }

  async downloadCompetition(
    competitions: Competition[],
    selectedCompetitionId: string,
    stages: CompetitionStage[],
    matches: Match[],
    competitionTeams: CompetitionTeam[],
    competitionStats: CompetitionStats | null,
  ): Promise<void> {
    const comp = competitions.find((c) => c.id === selectedCompetitionId);
    if (!comp) return;

    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();

    // Standings
    const standingsData: any[] = [];
    const leagueStages = stages.filter(
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
        const standings = getStandingsForStage(stage, matches, competitionTeams);
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

    // Matches
    const matchesData = matches.map((m) => ({
      Stage: stages.find((s) => s.id === m.stageId)?.name || 'N/A',
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

    // Statistics
    const statsData: any[] = [];
    if (competitionStats) {
      statsData.push(['TOP RATED PLAYERS']);
      statsData.push(['Rank', 'Player Name', 'Team Name', 'Matches', 'Average Rating']);
      competitionStats.topRated.forEach((p, idx) => {
        statsData.push([idx + 1, p.playerName, p.teamName, p.appearances, p.avgRating]);
      });
      statsData.push([]);

      if (competitionStats.mostMvps && competitionStats.mostMvps.length > 0) {
        statsData.push(['MOST MVPS']);
        statsData.push(['Rank', 'Player Name', 'Team Name', 'MVPs Won']);
        competitionStats.mostMvps.forEach((p, idx) => {
          statsData.push([idx + 1, p.playerName, p.teamName, p.mvps]);
        });
        statsData.push([]);
      }

      if (competitionStats.sportCode === 'football' && competitionStats.topScorers) {
        statsData.push(['TOP GOAL SCORERS']);
        statsData.push(['Rank', 'Player Name', 'Team Name', 'Goals']);
        competitionStats.topScorers.forEach((p, idx) => {
          statsData.push([idx + 1, p.playerName, p.teamName, p.goals]);
        });
        statsData.push([]);
      } else if (competitionStats.sportCode === 'cricket' && competitionStats.topRuns) {
        statsData.push(['TOP RUN SCORERS']);
        statsData.push(['Rank', 'Player Name', 'Team Name', 'Innings', 'Runs']);
        competitionStats.topRuns.forEach((p, idx) => {
          statsData.push([idx + 1, p.playerName, p.teamName, p.innings, p.runs]);
        });
        statsData.push([]);
      }
    } else {
      statsData.push(['No statistics available.']);
    }
    const wsStats = XLSX.utils.aoa_to_sheet(statsData);

    // Style: Matches sheet gets standard header
    applyBrandedSheet(wsMatches, XLSX);

    // Standings: sub-section headers "Stage:..." use dark, "Rank" row uses purple
    applyCustomStyledSheet(
      wsStandings,
      XLSX,
      (val) => val === 'Rank',
      { fillColor: BRAND_PURPLE },
      { fillColor: BRAND_DARK_INDIGO },
      (val) => val.startsWith('Stage:'),
    );

    // Stats: "Rank" purple, section titles ("... PLAYERS", "... MVPS", "... SCORERS") dark
    applyCustomStyledSheet(
      wsStats,
      XLSX,
      (val) => val === 'Rank',
      { fillColor: BRAND_PURPLE },
      { fillColor: BRAND_DARK_INDIGO },
      (val) => val.endsWith('PLAYERS') || val.endsWith('MVPS') || val.endsWith('SCORERS'),
    );

    XLSX.utils.book_append_sheet(wb, wsStandings, 'Standings');
    XLSX.utils.book_append_sheet(wb, wsMatches, 'Matches');
    XLSX.utils.book_append_sheet(wb, wsStats, 'Player Stats');

    XLSX.writeFile(wb, `${comp.name.replace(/\s+/g, '_')}_standings.xlsx`);
  }

  async downloadEvent(
    events: WorkspaceEvent[],
    selectedEventId: string,
    competitions: Competition[],
    matches: Match[],
    stages: CompetitionStage[] = [],
  ): Promise<void> {
    const event = events.find((e) => e.id === selectedEventId);
    if (!event) return;

    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();

    const wsSummaryData = [
      ['Event Name', event.name],
      ['Sport Category', event.sport || 'N/A'],
      ['Status', event.status.toUpperCase()],
      ['Start Date', event.startDate ? new Date(event.startDate).toLocaleDateString() : 'N/A'],
      ['End Date', event.endDate ? new Date(event.endDate).toLocaleDateString() : 'N/A'],
      ['Description', event.description || 'N/A'],
      ['Total Competitions', competitions.length],
      ['Total Matches', matches.length],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryData);

    const compsData = competitions.map((c) => ({
      'Category Name': c.name,
      Sport: c.sport?.name || 'N/A',
      Status: c.status.toUpperCase(),
      'Created Date': new Date(c.createdAt).toLocaleDateString(),
    }));
    const wsComps = XLSX.utils.json_to_sheet(compsData);

    const matchesData = matches.map((m) => ({
      Competition:
        competitions.find((c) => c.id === m.stageId)?.name ||
        stages.find((s) => s.id === m.stageId)?.name ||
        'N/A',
      'Home Team': m.homeTeam?.name || 'TBD',
      'Home Score': m.status === 'completed' ? m.homeScore : '-',
      'Away Score': m.status === 'completed' ? m.awayScore : '-',
      'Away Team': m.awayTeam?.name || 'TBD',
      Status: m.status.toUpperCase(),
      Venue: m.venue?.name || 'N/A',
    }));
    const wsMatches = XLSX.utils.json_to_sheet(matchesData);

    applyAoaLabeledSheet(wsSummary, XLSX, { fillColor: BRAND_INDIGO });
    applyBrandedSheet(wsComps, XLSX, { fillColor: BRAND_INDIGO });
    applyBrandedSheet(wsMatches, XLSX, { fillColor: BRAND_INDIGO });

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    XLSX.utils.book_append_sheet(wb, wsComps, 'Competitions');
    XLSX.utils.book_append_sheet(wb, wsMatches, 'Matches');

    XLSX.writeFile(wb, `${event.name.replace(/\s+/g, '_')}_event_report.xlsx`);
  }

  async downloadTeam(
    teams: Team[],
    selectedTeamId: string,
    teamStats: TeamStatsSummary,
    teamRoster: Player[],
    teamMatches: Match[],
    competitions: Competition[],
    stages: CompetitionStage[],
  ): Promise<void> {
    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team) return;

    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();

    const wsSummaryData = [
      ['Team Name', team.name],
      ['Team Code', team.code],
      ['Description', team.description || 'N/A'],
      ['Created Date', new Date(team.createdAt).toLocaleDateString()],
      [],
      ['PERFORMANCE METRICS'],
      ['Matches Played', teamStats.played],
      ['Matches Won', teamStats.won],
      ['Matches Drawn', teamStats.drawn],
      ['Matches Lost', teamStats.lost],
      ['Goals/Runs Scored (GF)', teamStats.gf],
      ['Goals/Runs Conceded (GA)', teamStats.ga],
      ['Goal/Run Difference (GD)', teamStats.gd],
      ['Win Percentage', `${teamStats.winRate.toFixed(1)}%`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryData);

    const rosterData = teamRoster.map((p) => ({
      'Player Username': p.user.username,
      'Jersey Number': p.jerseyNumber || 'N/A',
      'Registered Date': new Date(p.createdAt).toLocaleDateString(),
    }));
    const wsRoster = XLSX.utils.json_to_sheet(rosterData);

    const matchesData = teamMatches.map((m) => {
      const isHome = m.homeTeamId === team.id;
      const opponent = isHome ? m.awayTeam?.name : m.homeTeam?.name;
      const compName =
        competitions.find((c) => c.id === m.stageId)?.name ||
        stages.find((s) => s.id === m.stageId)?.name ||
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

    // Summary: indigo header for row 0 / col 0, dark for PERFORMANCE METRICS
    applyCustomStyledSheet(
      wsSummary,
      XLSX,
      (_val, R, C) => R === 0 || C === 0,
      { fillColor: BRAND_INDIGO },
      { fillColor: BRAND_DARK_INDIGO },
      (val) => val === 'PERFORMANCE METRICS',
    );
    applyBrandedSheet(wsRoster, XLSX, { fillColor: BRAND_INDIGO });
    applyBrandedSheet(wsMatches, XLSX, { fillColor: BRAND_INDIGO });

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    XLSX.utils.book_append_sheet(wb, wsRoster, 'Roster');
    XLSX.utils.book_append_sheet(wb, wsMatches, 'Match History');

    XLSX.writeFile(wb, `${team.name.replace(/\s+/g, '_')}_team_report.xlsx`);
  }

  async downloadPlayer(
    players: Player[],
    selectedPlayerId: string,
    members: WorkspaceMember[],
    competitionStats: CompetitionStats | null,
  ): Promise<void> {
    const player = players.find((p) => p.id === selectedPlayerId);
    if (!player) return;

    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();

    const member = members.find((m) => m.userId === player.userId);
    const stats = competitionStats;

    const ratedStats = stats?.topRated.find((r) => r.playerId === player.id);
    const mvpStats = stats?.mostMvps?.find((m) => m.playerId === player.id);
    const goalStats = stats?.topScorers?.find((s) => s.playerId === player.id);
    const runStats = stats?.topRuns?.find((r) => r.playerId === player.id);
    const assistStats = stats?.topAssists?.find((a) => a.playerId === player.id);
    const wicketStats = stats?.topWickets?.find((w) => w.playerId === player.id);

    const wsSummaryData: any[][] = [
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

    applyCustomStyledSheet(
      wsSummary,
      XLSX,
      (_val, R, C) => R === 0 || C === 0,
      { fillColor: BRAND_EMERALD },
      { fillColor: BRAND_DARK_INDIGO },
      (val) => val === 'COMPETITION PERFORMANCE',
    );

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Player Profile');
    XLSX.writeFile(wb, `${player.user.username}_player_report.xlsx`);
  }

  async downloadEventDashboard(
    workspace: Workspace | null,
    data: EventDashboardData | null,
  ): Promise<void> {
    if (!data) return;
    const XLSX = await loadXlsx();
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

    const breakdowns = data.eventBreakdowns.map((eb) => ({
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

    XLSX.writeFile(wb, `${workspace?.slug}_event_reports_dashboard.xlsx`);
  }

  async downloadParticipationTrends(
    workspace: Workspace | null,
    data: ParticipationTrendsData | null,
  ): Promise<void> {
    if (!data) return;
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();

    const growth = data.growthTrend.map((gt) => ({
      Month: gt.month,
      'New Players': gt.newPlayers,
      'New Teams': gt.newTeams,
      'Total Cumulative Players': gt.totalPlayers,
      'Total Cumulative Teams': gt.totalTeams,
    }));
    const wsGrowth = XLSX.utils.json_to_sheet(growth);
    XLSX.utils.book_append_sheet(wb, wsGrowth, 'Growth Trend');

    const sports = data.sportsData.map((sd) => ({
      Sport: sd.sport,
      Events: sd.events,
      Competitions: sd.competitions,
      'Participants (Estimate)': sd.participantsEstimate,
    }));
    const wsSports = XLSX.utils.json_to_sheet(sports);
    XLSX.utils.book_append_sheet(wb, wsSports, 'Sports Distribution');

    const age = data.ageGroupsData.map((ad) => ({
      'Age Group': ad.group,
      Count: ad.count,
      'Percentage (%)': ad.percentage,
    }));
    const wsAge = XLSX.utils.json_to_sheet(age);
    XLSX.utils.book_append_sheet(wb, wsAge, 'Age Demographics');

    const seasonal = data.seasonalData.map((sd) => ({
      Season: sd.season,
      'Events Scheduled': sd.count,
    }));
    const wsSeasonal = XLSX.utils.json_to_sheet(seasonal);
    XLSX.utils.book_append_sheet(wb, wsSeasonal, 'Seasonal Patterns');

    XLSX.writeFile(wb, `${workspace?.slug}_participation_trends.xlsx`);
  }

  async downloadHistoricalComparisons(
    workspace: Workspace | null,
    data: HistoricalComparisonData | null,
  ): Promise<void> {
    if (!data) return;
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();

    const yearly = data.yearlyData.map((yd) => ({
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
    data.benchmarking.forEach((bench) => {
      bench.runs.forEach((run) => {
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

    XLSX.writeFile(wb, `${workspace?.slug}_historical_comparisons.xlsx`);
  }

  async downloadOrganizerInsights(
    workspace: Workspace | null,
    data: OrganizerInsightsData | null,
  ): Promise<void> {
    if (!data) return;
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();

    const productivity = data.productivity.map((p) => ({
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

    const ai: any[] = [
      ['AI Operational Recommendations'],
      ['Bottlenecks Identified'],
      ...data.aiRecommendation.bottlenecksIdentified.map((bi) => [` - ${bi}`]),
      [],
      ['Actionable Recommendations'],
      ...data.aiRecommendation.recommendations.map((rec) => [` - ${rec}`]),
      [],
      ['Predicted Efficiency Gain', data.aiRecommendation.predictedEfficiencyGain],
    ];
    const wsAi = XLSX.utils.aoa_to_sheet(ai);
    XLSX.utils.book_append_sheet(wb, wsAi, 'AI Suggestions');

    XLSX.writeFile(wb, `${workspace?.slug}_organizer_insights.xlsx`);
  }

  async downloadOrganizationStats(
    workspace: Workspace | null,
    data: OrganizationStatsData | null,
  ): Promise<void> {
    if (!data) return;
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();

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

    const partData: any[] = [
      ['Growth Trend By Month'],
      ['Month', 'New Players', 'New Teams', 'Total Players', 'Total Teams'],
    ];
    data.participation.growth.forEach((g) => {
      partData.push([g.month, g.newPlayers, g.newTeams, g.totalPlayers, g.totalTeams]);
    });
    partData.push([]);
    partData.push(
      ['Sports Distribution'],
      ['Sport', 'Events Count', 'Competitions Count', 'Est. Participants'],
    );
    data.participation.sportsDistribution.forEach((s) => {
      partData.push([s.sport, s.events, s.competitions, s.participants]);
    });
    partData.push([]);
    partData.push(['Age Group Demographics'], ['Age Division', 'Players Count', 'Percentage']);
    data.participation.ageGroups.forEach((a) => {
      partData.push([a.group, a.count, `${a.percentage}%`]);
    });
    const wsParticipation = XLSX.utils.aoa_to_sheet(partData);

    const perfData: any[] = [
      ['Team Leaderboard (Top 5 Win Rate)'],
      ['Rank', 'Team Name', 'Matches Played', 'Won', 'Drawn', 'Lost', 'Win Rate (%)'],
    ];
    data.performance.teamRankings.forEach((r, idx) => {
      perfData.push([idx + 1, r.name, r.played, r.won, r.drawn, r.lost, `${r.winRate}%`]);
    });
    const wsPerformance = XLSX.utils.aoa_to_sheet(perfData);

    const finData: any[] = [
      ['Monthly Billing & Invoice Revenue'],
      ['Month', 'Invoiced Amount', 'Invoices Count'],
    ];
    data.finance.monthlyRevenueTrend.forEach((m) => {
      finData.push([m.month, `$${(m.revenue / 100).toFixed(2)}`, m.invoicesCount]);
    });
    finData.push([]);
    finData.push(
      ['Payment Methods Breakdown'],
      ['Payment Method', 'Transactions Count', 'Total Paid Cents'],
    );
    data.finance.paymentMethodsDistribution.forEach((p) => {
      finData.push([p.method.toUpperCase(), p.count, `$${(p.totalAmount / 100).toFixed(2)}`]);
    });
    finData.push([]);
    finData.push(['Invoice Status Counts'], ['Status', 'Count']);
    data.finance.statusCounts.forEach((s) => {
      finData.push([s.status.toUpperCase(), s.count]);
    });
    const wsFinance = XLSX.utils.aoa_to_sheet(finData);

    const attData: any[] = [['Monthly Estimated Turnout'], ['Month', 'Total Estimated Turnout']];
    data.attendance.monthlyAttendanceTrend.forEach((m) => {
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
    data.attendance.breakdown.forEach((b) => {
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

    const seaData: any[] = [
      ['Seasonal Operations Breakdown'],
      ['Season', 'Events Count', 'Attendance Total', 'Revenue Paid'],
    ];
    data.seasonalTrends.forEach((s) => {
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
    data.predictiveInsights.resourceRecommendations.forEach((rec, idx) => {
      seaData.push([`Resource Recommendation ${idx + 1}`, rec]);
    });
    const wsSeasons = XLSX.utils.aoa_to_sheet(seaData);

    const isSectionHeader = (val: string) =>
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

    const sheets = [
      { name: 'Summary Metrics', ws: wsSummary },
      { name: 'Participation Details', ws: wsParticipation },
      { name: 'Performance Details', ws: wsPerformance },
      { name: 'Finance Details', ws: wsFinance },
      { name: 'Attendance Details', ws: wsAttendance },
      { name: 'Seasons & AI Planning', ws: wsSeasons },
    ];

    for (const sheet of sheets) {
      applyCustomStyledSheet(
        sheet.ws,
        XLSX,
        (val, R) => R === 0 || isSectionHeader(val),
        { fillColor: BRAND_INDIGO },
        { fillColor: BRAND_DARK_INDIGO },
        (_val, R) => R === 0,
      );
      XLSX.utils.book_append_sheet(wb, sheet.ws, sheet.name);
    }

    XLSX.writeFile(wb, `${workspace?.slug}_organization_wide_statistics.xlsx`);
  }

  async downloadVolunteer(workspace: Workspace | null, vols: VolunteerReportRow[]): Promise<void> {
    if (!vols || vols.length === 0) return;
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();

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
      const completed = assignments.filter((a) => a.status === 'attended');
      const totalHours = completed.reduce((sum, a) => sum + Number(a.serviceHours || 0), 0);
      const ratings = completed.filter((a) => a.rating !== null).map((a) => a.rating as number);
      const avgRating =
        ratings.length > 0
          ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
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
    applyCustomStyledSheet(
      wsRoster,
      XLSX,
      (_val, R) => R === 0,
      { fillColor: BRAND_DARK_INDIGO },
      undefined,
      undefined,
      { skipAutosize: true },
    );
    XLSX.utils.book_append_sheet(wb, wsRoster, 'Volunteer Roster');

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
      assignments.forEach((a) => {
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
    applyCustomStyledSheet(
      wsDetails,
      XLSX,
      (_val, R) => R === 0,
      { fillColor: BRAND_DARK_INDIGO },
      undefined,
      undefined,
      { skipAutosize: true },
    );
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Assignments Detail');

    XLSX.writeFile(wb, `${workspace?.slug || 'workspace'}_volunteer_analytics.xlsx`);
  }
}
