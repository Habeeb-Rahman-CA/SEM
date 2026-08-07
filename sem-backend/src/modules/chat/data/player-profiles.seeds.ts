export interface PlayerProfileSeed {
  jerseyNumber: number;
  position: string;
  teamName: string;
  rating: number;
  matchesPlayed: number;
  runsOrGoals: number;
  wicketsOrAssists: number;
  attendanceRate: number;
}

export const DEFAULT_PLAYER_PROFILE_SEED: PlayerProfileSeed = {
  jerseyNumber: 10,
  position: 'All-Rounder / Forward',
  teamName: 'Royal Strikers FC',
  rating: 9.4,
  matchesPlayed: 48,
  runsOrGoals: 1240,
  wicketsOrAssists: 34,
  attendanceRate: 98,
};
