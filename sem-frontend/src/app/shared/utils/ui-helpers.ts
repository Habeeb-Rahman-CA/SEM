/**
 * Returns the CSS class string for the badge associated with a given sport code.
 */
export function getSportBadgeClass(sportCode?: string): string {
  switch (sportCode?.toLowerCase()) {
    case 'football': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'cricket': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'badminton': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    default: return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
  }
}

/**
 * Returns the Flaticon icon class string associated with a given sport code.
 */
export function getSportIconClass(sportCode?: string): string {
  switch (sportCode?.toLowerCase()) {
    case 'football': return 'fi fi-rr-football';
    case 'cricket': return 'fi fi-rr-bowling';
    case 'badminton': return 'fi fi-rr-trophy';
    default: return 'fi fi-rr-trophy';
  }
}

/**
 * Formats match status details including elapsed time, overs, sets, etc.
 */
export function formatMatchStatusDetail(match: any): string {
  if (!match) return '';
  if (match.status !== 'live') return 'Scheduled';
  const sport = match.stage?.competition?.sport?.code || 'football';
  const live = match.liveData || {};

  if (sport === 'football') {
    const half = live.currentHalf === 1 ? '1st Half' : live.currentHalf === 2 ? '2nd Half' : live.currentHalf === 3 ? 'ET 1' : live.currentHalf === 4 ? 'ET 2' : 'Live';
    const mins = Math.floor((live.elapsedSeconds || 0) / 60);
    return `${half} ${mins}'`;
  }
  if (sport === 'cricket') {
    const overs = live.currentOvers || '0.0';
    const wkt = live.wickets || 0;
    return `Overs: ${overs} (${wkt} wkts)`;
  }
  if (sport === 'badminton') {
    return live.matchStatus || 'Game in Progress';
  }
  return 'LIVE';
}

/**
 * Returns the CSS class string for a role badge based on its slug.
 */
export function roleBadgeClass(slug: string): string {
  const map: Record<string, string> = {
    owner:               'bg-violet-500/20 text-violet-300 border-violet-500/30',
    administrator:       'bg-blue-500/20 text-blue-300 border-blue-500/30',
    event_manager:       'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    competition_manager: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    referee:             'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    statistician:        'bg-orange-500/20 text-orange-300 border-orange-500/30',
    media_team:          'bg-pink-500/20 text-pink-300 border-pink-500/30',
    viewer:              'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };
  return map[slug] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
}
