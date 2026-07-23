import { Component, input, signal, inject, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
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
  CompetitionStats
} from '../../../services/workspace.service';
import { CompetitionService } from '../../../services/competition.service';

@Component({
  selector: 'app-workspace-reports',
  standalone: true,
  imports: [NgClass, FormsModule],
  templateUrl: './reports.html',
})
export class WorkspaceReportsComponent {
  private competitionService = inject(CompetitionService);

  workspace = input.required<Workspace | null>();
  teams = input.required<Team[]>();
  players = input.required<Player[]>();
  events = input.required<WorkspaceEvent[]>();
  venues = input.required<Venue[]>();
  members = input.required<WorkspaceMember[]>();
  roles = input.required<Role[]>();

  // State
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

  onEventChange(eventId: string) {
    this.selectedEventId.set(eventId);
    this.selectedCompetitionId.set('');
    this.competitions.set([]);
    this.stages.set([]);
    this.matches.set([]);
    this.competitionStats.set(null);
    this.competitionTeams = [];

    const wsId = this.workspace()?.id;
    if (!wsId || !eventId) return;

    this.isLoadingCompetitions.set(true);
    this.competitionService.getCompetitions(wsId, eventId).subscribe({
      next: (comps) => {
        this.competitions.set(comps);
        this.isLoadingCompetitions.set(false);
      },
      error: (err) => {
        console.error('Failed to load competitions', err);
        this.isLoadingCompetitions.set(false);
      }
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
      stats: this.competitionService.getCompetitionStats(wsId, eventId, competitionId)
    }).subscribe({
      next: (res) => {
        this.stages.set(res.stages);
        this.competitionTeams = res.teams;
        this.competitionStats.set(res.stats);
        
        if (res.stages.length > 0) {
          const matchRequests = res.stages.map(s => 
            this.competitionService.getMatches(wsId, eventId, competitionId, s.id)
          );
          forkJoin(matchRequests).subscribe({
            next: (matchesArrays) => {
              this.matches.set(matchesArrays.flat());
              this.isLoadingDetails.set(false);
            },
            error: (err) => {
              console.error('Failed to load matches', err);
              this.isLoadingDetails.set(false);
            }
          });
        } else {
          this.matches.set([]);
          this.isLoadingDetails.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to load competition details', err);
        this.isLoadingDetails.set(false);
      }
    });
  }

  getStandingsForStage(stage: CompetitionStage): any[] {
    const matchesList = this.matches().filter(m => m.stageId === stage.id);
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
        pts: 0
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
      const XLSX = await import('xlsx-js-style') as any;
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
        ['Total Collaborators', this.members().length]
      ];
      const wsInfo = XLSX.utils.aoa_to_sheet(wsInfoData);
      
      // Sheet 2: Teams
      const teamsData = this.teams().map(t => ({
        'Team Name': t.name,
        'Code': t.code,
        'Description': t.description || '',
        'Created Date': new Date(t.createdAt).toLocaleDateString()
      }));
      const wsTeams = XLSX.utils.json_to_sheet(teamsData);

      // Sheet 3: Players
      const playersData = this.players().map(p => ({
        'Username': p.user.username,
        'Jersey Number': p.jerseyNumber || 'N/A',
        'Team Name': p.team?.name || 'N/A',
        'Registered Date': new Date(p.createdAt).toLocaleDateString()
      }));
      const wsPlayers = XLSX.utils.json_to_sheet(playersData);

      // Sheet 4: Venues
      const venuesData = this.venues().map(v => ({
        'Venue Name': v.name,
        'Location': v.location || '',
        'Created Date': new Date(v.createdAt).toLocaleDateString()
      }));
      const wsVenues = XLSX.utils.json_to_sheet(venuesData);

      // Sheet 5: Events
      const eventsData = this.events().map(e => ({
        'Event Name': e.name,
        'Status': e.status,
        'Start Date': e.startDate ? new Date(e.startDate).toLocaleDateString() : 'N/A',
        'End Date': e.endDate ? new Date(e.endDate).toLocaleDateString() : 'N/A',
        'Description': e.description || ''
      }));
      const wsEvents = XLSX.utils.json_to_sheet(eventsData);

      const sheets = [
        { name: 'Summary', ws: wsInfo, isAoa: true },
        { name: 'Teams', ws: wsTeams },
        { name: 'Players', ws: wsPlayers },
        { name: 'Venues', ws: wsVenues },
        { name: 'Events', ws: wsEvents }
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
                alignment: { horizontal: 'left', vertical: 'center' }
              };
            } else {
              sheet.ws[address].s = {
                font: { name: 'Segoe UI', size: 10 },
                alignment: { vertical: 'center' }
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
      const XLSX = await import('xlsx-js-style') as any;
      const wb = XLSX.utils.book_new();

      const playersList = this.players();
      const playersData = playersList.map(p => {
        const member = this.members().find(m => m.userId === p.userId);
        return {
          'Username': p.user.username,
          'Jersey Number': p.jerseyNumber || 'N/A',
          'Team Name': p.team?.name || 'N/A',
          'Workspace Role': member?.role?.name || 'Viewer',
          'Registered At': new Date(p.createdAt).toLocaleDateString()
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
            alignment: { horizontal: 'left', vertical: 'center' }
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
    const comp = this.competitions().find(c => c.id === this.selectedCompetitionId());
    if (!comp) return;

    this.isGeneratingCompExcel.set(true);

    try {
      const XLSX = await import('xlsx-js-style') as any;
      const wb = XLSX.utils.book_new();

      // Sheet 1: Standings
      const standingsData: any[] = [];
      const leagueStages = this.stages().filter(s => s.type === 'league' || s.type === 'group' || s.type === 'group_knockout');
      
      if (leagueStages.length > 0) {
        for (const stage of leagueStages) {
          standingsData.push([`Stage: ${stage.name}`]);
          standingsData.push(['Rank', 'Team Name', 'Played', 'Won', 'Drawn', 'Lost', 'GF', 'GA', 'GD', 'Points']);
          
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
              row.pts
            ]);
          });
          standingsData.push([]);
        }
      } else {
        standingsData.push(['No league/group standings available for this format.']);
      }
      const wsStandings = XLSX.utils.aoa_to_sheet(standingsData);

      // Sheet 2: Matches
      const matchesData = this.matches().map(m => ({
        'Stage': this.stages().find(s => s.id === m.stageId)?.name || 'N/A',
        'Round/Leg': m.config?.round ? `${m.config.round} ${m.config.leg ? '(Leg ' + m.config.leg + ')' : ''}` : 'N/A',
        'Home Team': m.homeTeam?.name || 'TBD',
        'Home Score': m.status === 'completed' ? m.homeScore : '-',
        'Away Score': m.status === 'completed' ? m.awayScore : '-',
        'Away Team': m.awayTeam?.name || 'TBD',
        'Status': m.status.toUpperCase(),
        'Venue': m.venue?.name || 'N/A'
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
        { name: 'Player Stats', ws: wsStats, isStats: true }
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
            const isHeaderRow = (!sheet.isStandings && !sheet.isStats && R === 0) || 
                                (sheet.isStandings && (val === 'Rank' || val.startsWith('Stage:'))) ||
                                (sheet.isStats && (val === 'Rank' || val.endsWith('PLAYERS') || val.endsWith('MVPS') || val.endsWith('SCORERS')));

            if (isHeaderRow) {
              cell.s = {
                fill: { fgColor: { rgb: val.includes(':') || val.endsWith('S') ? '1E1B4B' : '5B21B6' } },
                font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Segoe UI', size: 10 },
                alignment: { horizontal: 'left', vertical: 'center' }
              };
            } else {
              cell.s = {
                font: { name: 'Segoe UI', size: 10 },
                alignment: { vertical: 'center' }
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

  printOfficialReport() {
    const ws = this.workspace();
    const event = this.events().find(e => e.id === this.selectedEventId());
    const comp = this.competitions().find(c => c.id === this.selectedCompetitionId());
    const stats = this.competitionStats();
    if (!ws || !event || !comp) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate the print preview.');
      return;
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tournament Report - ${comp.name}</title>
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

    const leagueStages = this.stages().filter(s => s.type === 'league' || s.type === 'group' || s.type === 'group_knockout');
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
          if (idx === 0) medalIcon = '<i class="fi fi-rr-medal text-amber-400" style="color:#d97706; margin-right:3px;"></i> ';
          else if (idx === 1) medalIcon = '<i class="fi fi-rr-medal text-slate-300" style="color:#475569; margin-right:3px;"></i> ';
          else if (idx === 2) medalIcon = '<i class="fi fi-rr-medal text-amber-600" style="color:#b45309; margin-right:3px;"></i> ';

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
      this.matches().forEach(m => {
        const stageName = this.stages().find(s => s.id === m.stageId)?.name || 'N/A';
        const roundName = m.config?.round ? `${m.config.round} ${m.config.leg ? '(Leg ' + m.config.leg + ')' : ''}` : 'N/A';
        
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
      htmlContent += `<h2 class="section-title"><i class="fi fi-rr-chart-pie"></i> Tournament Statistics & Awards</h2>`;
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

      if (comp.sport?.code === 'football' && stats.topScorers && stats.topScorers.length > 0) {
        htmlContent += `
          <div>
            <h3 style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px;"><i class="fi fi-rr-football"></i> Top Scorers</h3>
            <table>
              <thead>
                <tr>
                  <th class="rank">#</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th style="text-align: center;">Goals</th>
                </tr>
              </thead>
              <tbody>
        `;
        stats.topScorers.slice(0, 5).forEach((p, idx) => {
          htmlContent += `
            <tr>
              <td class="rank">${idx + 1}</td>
              <td style="font-weight: 600;">${p.playerName}</td>
              <td>${p.teamName}</td>
              <td style="text-align: center; font-weight: 700; color: #16a34a;">${p.goals}</td>
            </tr>
          `;
        });
        htmlContent += `</tbody></table></div>`;
      } else if (comp.sport?.code === 'cricket' && stats.topRuns && stats.topRuns.length > 0) {
        htmlContent += `
          <div>
            <h3 style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px;"><i class="fi fi-rr-bowling"></i> Top Run Scorers</h3>
            <table>
              <thead>
                <tr>
                  <th class="rank">#</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th style="text-align: center;">Runs</th>
                </tr>
              </thead>
              <tbody>
        `;
        stats.topRuns.slice(0, 5).forEach((p, idx) => {
          htmlContent += `
            <tr>
              <td class="rank">${idx + 1}</td>
              <td style="font-weight: 600;">${p.playerName}</td>
              <td>${p.teamName}</td>
              <td style="text-align: center; font-weight: 700; color: #16a34a;">${p.runs}</td>
            </tr>
          `;
        });
        htmlContent += `</tbody></table></div>`;
      }

      htmlContent += `</div>`;
    }

    htmlContent += `
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
