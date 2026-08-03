import {
  CompetitionStage,
  CompetitionTeam,
  Match,
} from '../../workspaces/services/workspace.service';
import { StandingRow, TeamStatsSummary } from '../models/report.interface';

export function getStandingsForStage(
  stage: CompetitionStage,
  matches: Match[],
  competitionTeams: CompetitionTeam[],
): StandingRow[] {
  const stageMatches = matches.filter((m) => m.stageId === stage.id);
  const winPts = stage.config?.winPoint ?? 3;
  const drawPts = stage.config?.drawPoint ?? 1;

  const statsMap = new Map<string, StandingRow>();

  for (const ct of competitionTeams) {
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

  for (const match of stageMatches) {
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

export function computeTeamStats(teamId: string, teamMatches: Match[]): TeamStatsSummary {
  let played = 0;
  let won = 0;
  let drawn = 0;
  let lost = 0;
  let gf = 0;
  let ga = 0;
  for (const m of teamMatches) {
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
}
