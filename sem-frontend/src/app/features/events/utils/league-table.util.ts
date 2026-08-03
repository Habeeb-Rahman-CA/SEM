import { CompetitionStage, Match, Team } from '../../workspaces/services/workspace.service';
import { StageWinnerResult, TeamStatsRow } from '../models/event.interface';

const EMPTY_STATS = (
  teamId: string,
  teamName: string,
  teamLogoUrl?: string | null,
): TeamStatsRow => ({
  teamId,
  teamName,
  teamLogoUrl,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  gf: 0,
  ga: 0,
  gd: 0,
  pts: 0,
});

const isGroupRound = (round?: string | null): boolean => {
  if (!round) return true;
  const r = round.toLowerCase();
  return r.includes('group') || r.includes('stage');
};

export function computeLeagueTable(
  stage: CompetitionStage | null,
  matches: Match[],
  teams: Team[],
  selectedGroup: string,
): TeamStatsRow[] {
  if (!stage) return [];
  if (
    stage.type !== 'league' &&
    stage.type !== 'group' &&
    stage.type !== 'group_knockout' &&
    stage.type !== 'swiss'
  ) {
    return [];
  }

  const isMultipleGroups =
    stage.type === 'group_knockout' && stage.config?.groupKnockoutSubtype === 'multiple_groups';

  const groupTeamIds = new Set<string>();
  if (isMultipleGroups) {
    for (const m of matches) {
      if (m.config?.round === selectedGroup) {
        if (m.homeTeamId) groupTeamIds.add(m.homeTeamId);
        if (m.awayTeamId) groupTeamIds.add(m.awayTeamId);
      }
    }
  }

  const statsMap = new Map<string, TeamStatsRow>();

  for (const t of teams) {
    if (isMultipleGroups && !groupTeamIds.has(t.id)) continue;
    statsMap.set(t.id, EMPTY_STATS(t.id, t.name, t.logoUrl));
  }

  const winPts = stage.config?.winPoint ?? 3;
  const drawPts = stage.config?.drawPoint ?? 1;

  for (const match of matches) {
    if (match.config?.isBye) {
      const teamId = match.homeTeamId;
      if (teamId) {
        if (!statsMap.has(teamId) && match.homeTeam) {
          statsMap.set(teamId, EMPTY_STATS(teamId, match.homeTeam.name, match.homeTeam.logoUrl));
        }
        const stats = statsMap.get(teamId);
        if (stats) {
          stats.played++;
          stats.won++;
          stats.gf += 1;
          stats.gd += 1;
          stats.pts += winPts;
        }
      }
      continue;
    }

    if (stage.type === 'group_knockout' && !isGroupRound(match.config?.round)) continue;
    if (isMultipleGroups && match.config?.round !== selectedGroup) continue;
    if (match.status !== 'completed') continue;
    if (!match.homeTeamId || !match.awayTeamId) continue;

    if (!statsMap.has(match.homeTeamId) && match.homeTeam) {
      statsMap.set(
        match.homeTeamId,
        EMPTY_STATS(match.homeTeamId, match.homeTeam.name, match.homeTeam.logoUrl),
      );
    }
    if (!statsMap.has(match.awayTeamId) && match.awayTeam) {
      statsMap.set(
        match.awayTeamId,
        EMPTY_STATS(match.awayTeamId, match.awayTeam.name, match.awayTeam.logoUrl),
      );
    }

    const hStats = statsMap.get(match.homeTeamId);
    const aStats = statsMap.get(match.awayTeamId);
    if (!hStats || !aStats) continue;

    hStats.played++;
    aStats.played++;

    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;

    hStats.gf += homeScore;
    hStats.ga += awayScore;
    aStats.gf += awayScore;
    aStats.ga += homeScore;

    if (homeScore > awayScore) {
      hStats.won++;
      hStats.pts += winPts;
      aStats.lost++;
    } else if (homeScore < awayScore) {
      aStats.won++;
      aStats.pts += winPts;
      hStats.lost++;
    } else {
      hStats.drawn++;
      hStats.pts += drawPts;
      aStats.drawn++;
      aStats.pts += drawPts;
    }

    hStats.gd = hStats.gf - hStats.ga;
    aStats.gd = aStats.gf - aStats.ga;
  }

  if (stage.type === 'swiss') {
    return sortSwissTable(stage, matches, statsMap, winPts, drawPts);
  }

  return Array.from(statsMap.values()).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
}

function sortSwissTable(
  stage: CompetitionStage,
  matches: Match[],
  statsMap: Map<string, TeamStatsRow>,
  winPts: number,
  drawPts: number,
): TeamStatsRow[] {
  const teamIds = Array.from(statsMap.keys());
  const tieBreakScores = new Map<
    string,
    { buchholz: number; median_buchholz: number; sonneborn_berger: number; cumulative: number }
  >();

  const completed = matches.filter((m) => m.status === 'completed');
  completed.sort((a, b) => (a.config?.swissRound ?? 0) - (b.config?.swissRound ?? 0));
  const maxRound = Math.max(...completed.map((m) => m.config?.swissRound ?? 0), 1);

  const running = new Map<string, number>();
  const opponentsMap = new Map<string, string[]>();
  const resultsMap = new Map<string, { opponentId: string; outcome: 'win' | 'draw' | 'loss' }[]>();
  const roundPointsMap = new Map<string, number[]>();

  for (const t of teamIds) {
    running.set(t, 0);
    opponentsMap.set(t, []);
    resultsMap.set(t, []);
    roundPointsMap.set(t, []);
  }

  for (let r = 1; r <= maxRound; r++) {
    const roundMatches = completed.filter((m) => m.config?.swissRound === r);
    for (const m of roundMatches) {
      if (m.config?.isBye) {
        if (m.homeTeamId && running.has(m.homeTeamId)) {
          running.set(m.homeTeamId, running.get(m.homeTeamId)! + winPts);
        }
        continue;
      }
      if (!m.homeTeamId || !m.awayTeamId) continue;
      opponentsMap.get(m.homeTeamId)?.push(m.awayTeamId);
      opponentsMap.get(m.awayTeamId)?.push(m.homeTeamId);
      const hs = m.homeScore ?? 0;
      const as = m.awayScore ?? 0;
      if (hs > as) {
        resultsMap.get(m.homeTeamId)?.push({ opponentId: m.awayTeamId, outcome: 'win' });
        resultsMap.get(m.awayTeamId)?.push({ opponentId: m.homeTeamId, outcome: 'loss' });
        running.set(m.homeTeamId, running.get(m.homeTeamId)! + winPts);
      } else if (as > hs) {
        resultsMap.get(m.awayTeamId)?.push({ opponentId: m.homeTeamId, outcome: 'win' });
        resultsMap.get(m.homeTeamId)?.push({ opponentId: m.awayTeamId, outcome: 'loss' });
        running.set(m.awayTeamId, running.get(m.awayTeamId)! + winPts);
      } else {
        resultsMap.get(m.homeTeamId)?.push({ opponentId: m.awayTeamId, outcome: 'draw' });
        resultsMap.get(m.awayTeamId)?.push({ opponentId: m.homeTeamId, outcome: 'draw' });
        running.set(m.homeTeamId, running.get(m.homeTeamId)! + drawPts);
        running.set(m.awayTeamId, running.get(m.awayTeamId)! + drawPts);
      }
    }
    for (const t of teamIds) {
      roundPointsMap.get(t)?.push(running.get(t)!);
    }
  }

  for (const t of teamIds) {
    const opps = opponentsMap.get(t) || [];
    let buchholz = 0;
    const oppPts: number[] = [];
    for (const o of opps) {
      const p = statsMap.get(o)?.pts ?? 0;
      buchholz += p;
      oppPts.push(p);
    }
    let median_buchholz = buchholz;
    if (oppPts.length >= 3) {
      oppPts.sort((a, b) => a - b);
      median_buchholz = oppPts.slice(1, -1).reduce((s, v) => s + v, 0);
    }
    let sonneborn_berger = 0;
    for (const res of resultsMap.get(t) || []) {
      const p = statsMap.get(res.opponentId)?.pts ?? 0;
      if (res.outcome === 'win') sonneborn_berger += p;
      else if (res.outcome === 'draw') sonneborn_berger += p * 0.5;
    }
    const cumulative = (roundPointsMap.get(t) || []).reduce((s, v) => s + v, 0);
    tieBreakScores.set(t, { buchholz, median_buchholz, sonneborn_berger, cumulative });
  }

  const tieBreaks = stage.config?.tieBreaks || ['buchholz', 'sonneborn_berger', 'cumulative'];

  return Array.from(statsMap.values()).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const tbA = tieBreakScores.get(a.teamId)!;
    const tbB = tieBreakScores.get(b.teamId)!;
    for (const rule of tieBreaks) {
      if (rule === 'buchholz' && tbB.buchholz !== tbA.buchholz) return tbB.buchholz - tbA.buchholz;
      if (rule === 'median_buchholz' && tbB.median_buchholz !== tbA.median_buchholz)
        return tbB.median_buchholz - tbA.median_buchholz;
      if (rule === 'sonneborn_berger' && tbB.sonneborn_berger !== tbA.sonneborn_berger)
        return tbB.sonneborn_berger - tbA.sonneborn_berger;
      if (rule === 'cumulative' && tbB.cumulative !== tbA.cumulative)
        return tbB.cumulative - tbA.cumulative;
      if (rule === 'gd' && b.gd !== a.gd) return b.gd - a.gd;
      if (rule === 'gf' && b.gf !== a.gf) return b.gf - a.gf;
    }
    if (!tieBreaks.includes('gd') && b.gd !== a.gd) return b.gd - a.gd;
    if (!tieBreaks.includes('gf') && b.gf !== a.gf) return b.gf - a.gf;
    return 0;
  });
}

export function isStageCompleted(
  stage: CompetitionStage | null,
  matches: Match[],
  selectedGroup: string,
  teamsCount: number,
): boolean {
  if (!stage) return false;
  if (matches.length === 0) return false;

  if (stage.type === 'league' || stage.type === 'knockout') {
    return matches.every((m) => m.status === 'completed');
  }
  if (stage.type === 'group' || stage.type === 'group_knockout') {
    const isMultiple =
      stage.type === 'group_knockout' && stage.config?.groupKnockoutSubtype === 'multiple_groups';
    const target = isMultiple
      ? matches.filter((m) => m.config?.round === selectedGroup)
      : matches.filter((m) => isGroupRound(m.config?.round));
    if (target.length === 0) return false;
    return target.every((m) => m.status === 'completed');
  }
  if (stage.type === 'swiss') {
    const maxRounds = stage.config?.roundsCount || Math.ceil(Math.log2(teamsCount || 2));
    const maxMatchRound = Math.max(...matches.map((m) => m.config?.swissRound ?? 0), 0);
    return maxMatchRound >= maxRounds && matches.every((m) => m.status === 'completed');
  }
  return false;
}

export function availableGroups(stage: CompetitionStage | null): string[] {
  if (!stage) return [];
  if (stage.type === 'group_knockout' && stage.config?.groupKnockoutSubtype === 'multiple_groups') {
    const count = stage.config?.groupsCount ?? 2;
    return Array.from({ length: count }, (_, i) => `Group ${String.fromCharCode(65 + i)}`);
  }
  return [];
}

const KNOCKOUT_ORDER = [
  'round of 32',
  'round of 16',
  'round of 8',
  'quarter-final',
  'semi-final',
  'final',
  'third place match',
  '3rd place match',
];

export function knockoutRoundNames(matches: Match[], stage: CompetitionStage | null): string[] {
  if (!stage) return [];
  const set = new Set<string>();
  for (const m of matches) {
    const round = m.config?.round;
    if (!round) continue;
    if (stage.type === 'group_knockout' && isGroupRound(round)) continue;
    set.add(round);
  }
  return Array.from(set).sort((a, b) => {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    const ia = KNOCKOUT_ORDER.findIndex((o) => al.includes(o));
    const ib = KNOCKOUT_ORDER.findIndex((o) => bl.includes(o));
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

export function matchesForRound(matches: Match[], roundName: string): Match[] {
  return matches.filter(
    (m) => m.config?.round === roundName && (m.config?.leg === undefined || m.config?.leg === 1),
  );
}

export function competitionWinnerAndRunnerUp(comp: { stages?: any[] }): StageWinnerResult | null {
  if (!comp.stages || comp.stages.length === 0) return null;
  const sorted = [...comp.stages].sort((a, b) => a.sequence - b.sequence);
  const last = sorted[sorted.length - 1];
  if (!last.matches || last.matches.length === 0) return null;
  const allCompleted = last.matches.every((m: any) => m.status === 'completed');
  if (!allCompleted) return null;

  if (last.type === 'knockout' || last.type === 'group_knockout') {
    const finalMatch = last.matches.find((m: any) => m.config?.round === 'Final');
    if (finalMatch && finalMatch.status === 'completed') {
      const hs = finalMatch.homeScore ?? 0;
      const as = finalMatch.awayScore ?? 0;
      if (hs > as) {
        return {
          winner: finalMatch.homeTeam?.name || 'Home Team',
          runnerUp: finalMatch.awayTeam?.name || 'Away Team',
        };
      } else if (as > hs) {
        return {
          winner: finalMatch.awayTeam?.name || 'Away Team',
          runnerUp: finalMatch.homeTeam?.name || 'Home Team',
        };
      }
    }
  } else if (last.type === 'league' || last.type === 'group') {
    const winPts = last.config?.winPoint ?? 3;
    const drawPts = last.config?.drawPoint ?? 1;
    const statsMap = new Map<
      string,
      { teamName: string; pts: number; gd: number; gf: number; ga: number }
    >();

    for (const m of last.matches) {
      if (!m.homeTeamId || !m.awayTeamId) continue;
      if (m.status !== 'completed') continue;
      if (!statsMap.has(m.homeTeamId) && m.homeTeam) {
        statsMap.set(m.homeTeamId, { teamName: m.homeTeam.name, pts: 0, gd: 0, gf: 0, ga: 0 });
      }
      if (!statsMap.has(m.awayTeamId) && m.awayTeam) {
        statsMap.set(m.awayTeamId, { teamName: m.awayTeam.name, pts: 0, gd: 0, gf: 0, ga: 0 });
      }
      const h = statsMap.get(m.homeTeamId);
      const a = statsMap.get(m.awayTeamId);
      if (!h || !a) continue;
      const hs = m.homeScore ?? 0;
      const as = m.awayScore ?? 0;
      h.gf += hs;
      h.ga += as;
      a.gf += as;
      a.ga += hs;
      if (hs > as) h.pts += winPts;
      else if (as > hs) a.pts += winPts;
      else {
        h.pts += drawPts;
        a.pts += drawPts;
      }
      h.gd = h.gf - h.ga;
      a.gd = a.gf - a.ga;
    }
    const table = Array.from(statsMap.values()).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
    if (table.length > 0) {
      return { winner: table[0].teamName, runnerUp: table[1]?.teamName };
    }
  }
  return null;
}

export function stageWinnerAndRunnerUp(
  stage: CompetitionStage | null,
  matches: Match[],
  leagueTable: TeamStatsRow[],
): StageWinnerResult | null {
  if (!stage) return null;
  if (matches.length === 0) return null;
  const allCompleted = matches.every((m) => m.status === 'completed');
  if (!allCompleted) return null;

  if (stage.type === 'knockout' || stage.type === 'group_knockout') {
    const finalMatch = matches.find((m) => m.config?.round === 'Final');
    if (finalMatch && finalMatch.status === 'completed') {
      const hs = finalMatch.homeScore ?? 0;
      const as = finalMatch.awayScore ?? 0;
      if (hs > as) {
        return {
          winner: finalMatch.homeTeam?.name || 'Home Team',
          runnerUp: finalMatch.awayTeam?.name || 'Away Team',
        };
      } else if (as > hs) {
        return {
          winner: finalMatch.awayTeam?.name || 'Away Team',
          runnerUp: finalMatch.homeTeam?.name || 'Home Team',
        };
      }
    }
  } else if (stage.type === 'league' || stage.type === 'group') {
    if (leagueTable.length > 0) {
      return { winner: leagueTable[0].teamName, runnerUp: leagueTable[1]?.teamName };
    }
  }
  return null;
}
