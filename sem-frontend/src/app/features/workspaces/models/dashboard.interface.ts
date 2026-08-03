export interface DashboardMatch {
  id: string;
  status: 'scheduled' | 'live' | 'completed' | string;
  workspaceId?: string;
  eventId?: string;
  competitionId?: string;
  stageId?: string;
  stage?: {
    competitionId?: string;
    competition?: {
      eventId?: string;
      event?: { workspaceId?: string };
    };
  };
  [key: string]: unknown;
}

export interface DashboardCompetition {
  id: string;
  name?: string;
  workspaceId?: string;
  event?: { workspaceId?: string };
  [key: string]: unknown;
}

export interface DashboardScorer {
  playerId: string;
  playerName: string;
  teamName: string;
  goals?: number;
  runs?: number;
  [key: string]: unknown;
}

export interface DashboardRatedPlayer {
  playerId: string;
  playerName: string;
  teamName: string;
  avgRating: number;
  [key: string]: unknown;
}

export interface DashboardOverviewResponse {
  liveMatches?: DashboardMatch[];
  upcomingMatches?: DashboardMatch[];
  completedMatches?: DashboardMatch[];
  runningCompetitions?: DashboardCompetition[];
  topScorers?: DashboardScorer[];
  topRatedPlayers?: DashboardRatedPlayer[];
}

export interface DashboardFiltered {
  live: DashboardMatch[];
  upcoming: DashboardMatch[];
  completed: DashboardMatch[];
  runningCompetitions: DashboardCompetition[];
  topScorers: DashboardScorer[];
  topRatedPlayers: DashboardRatedPlayer[];
}

export interface DeepLinkParams {
  eventId?: string;
  competitionId?: string;
  stageId?: string;
  matchId?: string;
}
