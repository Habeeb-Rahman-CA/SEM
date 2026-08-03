import {
  Competition,
  CompetitionStage,
  CompetitionStats,
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
  StandingRow,
  TeamStatsSummary,
} from '../models/report.interface';

export const REPORT_STYLES = `
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
`;

const PRINT_BUTTONS_HTML = `
  <div class="print-btn-container">
    <button class="btn" onclick="window.print();"><i class="fi fi-rr-print"></i> Print / Save PDF</button>
    <button class="btn btn-secondary" onclick="window.close();">Close Window</button>
  </div>
`;

export function wrapPrintDocument(title: string, bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/2.1.0/uicons-regular-rounded/css/uicons-regular-rounded.css">
      <style>${REPORT_STYLES}</style>
    </head>
    <body>
      ${PRINT_BUTTONS_HTML}
      ${bodyHtml}
    </body>
    </html>
  `;
}

const today = () => new Date().toLocaleDateString();
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '-');

export function buildWorkspaceReportHtml(
  ws: Workspace,
  teams: Team[],
  players: Player[],
  events: WorkspaceEvent[],
  venues: Venue[],
): string {
  return `
    <div class="header-container">
      <div>
        <h1 class="title">Official Workspace Summary</h1>
        <p class="subtitle">${ws.name} (/${ws.slug})</p>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 800; font-size: 14px; color: #4f46e5;">SEM Analytics</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Report Generated: ${today()}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">Total Teams</span><span class="meta-value">${teams.length}</span></div>
      <div class="meta-item"><span class="meta-label">Total Players</span><span class="meta-value">${players.length}</span></div>
      <div class="meta-item"><span class="meta-label">Total Events</span><span class="meta-value">${events.length}</span></div>
      <div class="meta-item"><span class="meta-label">Total Venues</span><span class="meta-value">${venues.length}</span></div>
    </div>

    <h2 class="section-title"><i class="fi fi-rr-users"></i> Registered Teams</h2>
    <table>
      <thead>
        <tr><th>Team Name</th><th>Code</th><th>Description</th><th>Created Date</th></tr>
      </thead>
      <tbody>
        ${teams
          .map(
            (t) =>
              `<tr><td><b>${t.name}</b></td><td>${t.code}</td><td>${t.description || '-'}</td><td>${fmtDate(t.createdAt)}</td></tr>`,
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
        ${events
          .map(
            (e) =>
              `<tr><td><b>${e.name}</b></td><td>${e.status.toUpperCase()}</td><td>${fmtDate(e.startDate)} to ${fmtDate(e.endDate)}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

export function buildEventReportHtml(
  ws: Workspace,
  event: WorkspaceEvent,
  competitions: Competition[],
  matches: Match[],
  stages: CompetitionStage[],
): string {
  return `
    <div class="header-container">
      <div>
        <h1 class="title">Official Event Report</h1>
        <p class="subtitle">${event.name}</p>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 800; font-size: 14px; color: #4f46e5;">${ws.name}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Report Generated: ${today()}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">Sport Category</span><span class="meta-value">${event.sport || 'General'}</span></div>
      <div class="meta-item"><span class="meta-label">Dates</span><span class="meta-value">${fmtDate(event.startDate)} to ${fmtDate(event.endDate)}</span></div>
      <div class="meta-item"><span class="meta-label">Organizers</span><span class="meta-value">${event.organizers || 'N/A'}</span></div>
      <div class="meta-item"><span class="meta-label">Status</span><span class="meta-value" style="text-transform: capitalize;">${event.status}</span></div>
    </div>

    <h2 class="section-title">Competitions & Categories</h2>
    <table>
      <thead>
        <tr><th>Category Name</th><th>Sport</th><th>Status</th><th>Total Matches</th></tr>
      </thead>
      <tbody>
        ${competitions
          .map(
            (c) =>
              `<tr><td><b>${c.name}</b></td><td>${c.sport?.name || '-'}</td><td>${c.status.toUpperCase()}</td><td>${matches.filter((m) => stages.find((s) => s.id === m.stageId)?.competitionId === c.id).length}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

export function buildCompetitionReportHtml(
  ws: Workspace,
  event: WorkspaceEvent,
  comp: Competition,
  stages: CompetitionStage[],
  matches: Match[],
  standingsPerStage: (stage: CompetitionStage) => StandingRow[],
  stats: CompetitionStats | null,
): string {
  let html = `
    <div class="header-container">
      <div>
        <h1 class="title">Official Tournament Report</h1>
        <p class="subtitle">${event.name} &middot; ${comp.name}</p>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 800; font-size: 14px; color: #4f46e5;">${ws.name}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Report Generated: ${today()}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">Workspace</span><span class="meta-value">${ws.name} (/${ws.slug})</span></div>
      <div class="meta-item"><span class="meta-label">Event / Sports Festival</span><span class="meta-value">${event.name}</span></div>
      <div class="meta-item"><span class="meta-label">Competition Category</span><span class="meta-value">${comp.name} (${comp.sport?.name || 'General'})</span></div>
      <div class="meta-item"><span class="meta-label">Status</span><span class="meta-value" style="text-transform: capitalize;">${comp.status}</span></div>
    </div>
  `;

  const leagueStages = stages.filter(
    (s) => s.type === 'league' || s.type === 'group' || s.type === 'group_knockout',
  );
  if (leagueStages.length > 0) {
    html += `<h2 class="section-title"><i class="fi fi-rr-trophy"></i> Competition Standings</h2>`;
    for (const stage of leagueStages) {
      html += `
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
      const standings = standingsPerStage(stage);
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

        html += `
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
      html += `</tbody></table>`;
    }
  }

  if (matches.length > 0) {
    html += `<h2 class="section-title"><i class="fi fi-rr-calendar"></i> Fixtures & Match Results</h2>`;
    matches.forEach((m) => {
      const stageName = stages.find((s) => s.id === m.stageId)?.name || 'N/A';
      const roundName = m.config?.round
        ? `${m.config.round} ${m.config.leg ? '(Leg ' + m.config.leg + ')' : ''}`
        : 'N/A';
      let scoreDisplay = 'VS';
      if (m.status === 'completed') scoreDisplay = `${m.homeScore} - ${m.awayScore}`;
      else if (m.status === 'live') scoreDisplay = `${m.homeScore} - ${m.awayScore} (LIVE)`;

      html += `
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
    html += `<h2 class="section-title"><i class="fi fi-rr-chart-pie"></i> Tournament Statistics</h2>`;
    html += `<div class="leaderboards-grid">`;
    html += `
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
      html += `
        <tr>
          <td class="rank">${idx + 1}</td>
          <td style="font-weight: 600;">${p.playerName}</td>
          <td>${p.teamName}</td>
          <td style="text-align: center; font-weight: 700; color:#4f46e5;">${p.avgRating.toFixed(2)}</td>
        </tr>
      `;
    });
    html += `</tbody></table></div>`;

    if (stats.mostMvps && stats.mostMvps.length > 0) {
      html += `
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
        html += `
          <tr>
            <td class="rank">${idx + 1}</td>
            <td style="font-weight: 600;">${p.playerName}</td>
            <td>${p.teamName}</td>
            <td style="text-align: center; font-weight: 700; color:#4f46e5;">${p.mvps}</td>
          </tr>
        `;
      });
      html += `</tbody></table></div>`;
    }
    html += `</div>`;
  }

  return html;
}

export function buildTeamReportHtml(
  ws: Workspace,
  team: Team,
  stats: TeamStatsSummary,
  roster: Player[],
): string {
  return `
    <div class="header-container">
      <div>
        <h1 class="title">Team Performance Report</h1>
        <p class="subtitle">${team.name} (${team.code})</p>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 800; font-size: 14px; color: #4f46e5;">${ws.name}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Report Generated: ${today()}</div>
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
        ${roster
          .map(
            (p) =>
              `<tr><td><b>${p.user.username}</b></td><td>${p.jerseyNumber || '-'}</td><td>${fmtDate(p.createdAt)}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

export function buildPlayerReportHtml(
  ws: Workspace,
  player: Player,
  member: WorkspaceMember | undefined,
  stats: CompetitionStats | null,
): string {
  const ratedStats = stats?.topRated.find((r) => r.playerId === player.id);
  const mvpStats = stats?.mostMvps?.find((m) => m.playerId === player.id);

  return `
    <div class="header-container">
      <div>
        <h1 class="title">Player Performance Report</h1>
        <p class="subtitle">${player.user.username}</p>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 800; font-size: 14px; color: #4f46e5;">${ws.name}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Report Generated: ${today()}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">Jersey Number</span><span class="meta-value">${player.jerseyNumber || 'N/A'}</span></div>
      <div class="meta-item"><span class="meta-label">Current Team</span><span class="meta-value">${player.team?.name || 'N/A'}</span></div>
      <div class="meta-item"><span class="meta-label">Workspace Role</span><span class="meta-value">${member?.role?.name || 'Viewer'}</span></div>
      <div class="meta-item"><span class="meta-label">Registered Date</span><span class="meta-value">${fmtDate(player.createdAt)}</span></div>
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
}

export function buildEventDashboardReportHtml(data: EventDashboardData): string {
  let rowsHtml = '';
  data.eventBreakdowns.forEach((eb) => {
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
  return `
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
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

export function buildTrendsReportHtml(data: ParticipationTrendsData): string {
  let sportsHtml = '';
  data.sportsData.forEach((sd) => {
    sportsHtml += `<tr><td><b>${sd.sport}</b></td><td style="text-align: center;">${sd.events}</td><td style="text-align: center;">${sd.competitions}</td><td style="text-align: right;">${sd.participantsEstimate}</td></tr>`;
  });
  let ageHtml = '';
  data.ageGroupsData.forEach((ad) => {
    ageHtml += `<tr><td><b>${ad.group}</b></td><td style="text-align: center;">${ad.count}</td><td style="text-align: right;">${ad.percentage}%</td></tr>`;
  });
  return `
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

export function buildHistoricalReportHtml(data: HistoricalComparisonData): string {
  let yearlyHtml = '';
  data.yearlyData.forEach((yd) => {
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
  return `
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

export function buildOrganizerReportHtml(data: OrganizerInsightsData): string {
  let prodHtml = '';
  data.productivity.forEach((p) => {
    prodHtml += `<tr><td><b>${p.name}</b></td><td style="text-align: center;">${p.scoreUpdates}</td><td style="text-align: center;">${p.matchesCreated}</td><td style="text-align: right;">${p.totalActions}</td></tr>`;
  });
  const aiRecs = data.aiRecommendation.recommendations.map((rec) => `<li>${rec}</li>`).join('');
  const aiBottles = data.aiRecommendation.bottlenecksIdentified
    .map((bi) => `<li>${bi}</li>`)
    .join('');

  return `
    <h1 class="report-title">Organizer Insights Hub</h1>
    <h2 class="section-title">Organizer Activity & Productivity</h2>
    <table>
      <thead>
        <tr><th>Name</th><th style="text-align: center;">Score Updates</th><th style="text-align: center;">Matches Created</th><th style="text-align: right;">Total Actions</th></tr>
      </thead>
      <tbody>${prodHtml}</tbody>
    </table>

    <div style="border: 1px dashed #4f46e5; background-color: #faf5ff; padding: 20px; border-radius: 8px; margin-top: 25px;">
      <div style="font-weight: bold; color: #4f46e5; margin-bottom: 10px;">AI-Generated Recommendations</div>
      <p><b>Identified Bottlenecks:</b></p>
      <ul>${aiBottles}</ul>
      <p><b>Suggested Actions:</b></p>
      <ul>${aiRecs}</ul>
      <p><b>Forecasted Impact:</b> ${data.aiRecommendation.predictedEfficiencyGain}</p>
    </div>
  `;
}

export function buildOrgStatsReportHtml(data: OrganizationStatsData): string {
  const partGrowthHtml = data.participation.growth
    .map(
      (g) =>
        `<tr><td>${g.month}</td><td style="text-align: center;">${g.newPlayers}</td><td style="text-align: center;">${g.newTeams}</td><td style="text-align: right;">${g.totalPlayers}</td><td style="text-align: right;">${g.totalTeams}</td></tr>`,
    )
    .join('');
  const sportsDistHtml = data.participation.sportsDistribution
    .map(
      (s) =>
        `<tr><td><b>${s.sport}</b></td><td style="text-align: center;">${s.events}</td><td style="text-align: center;">${s.competitions}</td><td style="text-align: right;">${s.participants}</td></tr>`,
    )
    .join('');
  const ageGroupsHtml = data.participation.ageGroups
    .map(
      (a) =>
        `<tr><td>${a.group}</td><td style="text-align: center;">${a.count}</td><td style="text-align: right;">${a.percentage}%</td></tr>`,
    )
    .join('');
  const teamRankingsHtml = data.performance.teamRankings
    .map(
      (r, idx) =>
        `<tr><td style="text-align: center;">${idx + 1}</td><td><b>${r.name}</b></td><td style="text-align: center;">${r.played}</td><td style="text-align: center;">${r.won}</td><td style="text-align: center;">${r.drawn}</td><td style="text-align: center;">${r.lost}</td><td style="text-align: right;">${r.winRate}%</td></tr>`,
    )
    .join('');
  const monthlyRevenueHtml = data.finance.monthlyRevenueTrend
    .map(
      (m) =>
        `<tr><td>${m.month}</td><td style="text-align: center;">${m.invoicesCount}</td><td style="text-align: right;">$${(m.revenue / 100).toFixed(2)}</td></tr>`,
    )
    .join('');
  const pmDistHtml = data.finance.paymentMethodsDistribution
    .map(
      (p) =>
        `<tr><td>${p.method.toUpperCase()}</td><td style="text-align: center;">${p.count}</td><td style="text-align: right;">$${(p.totalAmount / 100).toFixed(2)}</td></tr>`,
    )
    .join('');
  const monthlyAttendanceHtml = data.attendance.monthlyAttendanceTrend
    .map((m) => `<tr><td>${m.month}</td><td style="text-align: right;">${m.attendance}</td></tr>`)
    .join('');
  const seasonalHtml = data.seasonalTrends
    .map(
      (s) =>
        `<tr><td><b>${s.season}</b></td><td style="text-align: center;">${s.eventsCount}</td><td style="text-align: center;">${s.attendance}</td><td style="text-align: right;">$${(s.revenue / 100).toFixed(2)}</td></tr>`,
    )
    .join('');
  const aiRecList = data.predictiveInsights.resourceRecommendations
    .map((rec) => `<li>${rec}</li>`)
    .join('');

  return `
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
      <div style="font-weight: bold; color: #4f46e5; margin-bottom: 10px;">AI-Generated Operational & Planning Insights</div>
      <p><b>Growth Forecast:</b> ${data.predictiveInsights.growthForecast}</p>
      <p><b>Budget Projection:</b> ${data.predictiveInsights.budgetProjection}</p>
      <p><b>Efficiency Opportunities:</b> ${data.predictiveInsights.efficiencyOpportunities}</p>
      <p><b>Strategic Resource Recommendations:</b></p>
      <ul>${aiRecList}</ul>
    </div>
  `;
}
