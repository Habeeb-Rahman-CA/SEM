export interface MatchFixtureSeed {
  sportType: string;
  title: string;
  teamA: string;
  teamB: string;
  scoreA: string;
  scoreB: string;
  venue: string;
  matchTime: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED';
  refereeName: string;
}

export const DEFAULT_MATCH_FIXTURE_SEED: MatchFixtureSeed = {
  sportType: 'Cricket',
  title: 'Premier League - Quarter Final #2',
  teamA: 'Royal Strikers',
  teamB: 'Thunderbolts XI',
  scoreA: '184/6 (20.0)',
  scoreB: '142/8 (16.4)',
  venue: 'National Sports Complex, Pitch #1',
  matchTime: 'Today, 4:00 PM IST',
  status: 'LIVE',
  refereeName: 'David Warner',
};
