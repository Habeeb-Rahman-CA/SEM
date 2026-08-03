import { WorkspaceEvent } from '../../workspaces/services/workspace.service';

export type EventView = 'active' | 'archived';
export type CompetitionTab = 'matches' | 'stats' | 'predictions';

export interface EventFilterCriteria {
  sport: string;
  organizer: string;
  workspaceIdFilter: string;
  status: string;
  venue: string;
  startDate: string;
  endDate: string;
  competitionName: string;
  sortBy: string;
  sortOrder: string;
}

export interface SavedEventFilter {
  name: string;
  filters: EventFilterCriteria;
}

export interface AdvancedSearchParams extends EventFilterCriteria {
  query: string;
}

export interface EventStandingRow {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | null;
  points: number;
  breakdown?: Array<{
    competitionId: string;
    competitionName: string;
    position: number;
    points: number;
  }>;
}

export interface TeamStatsRow {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export interface StageWinnerResult {
  winner?: string;
  runnerUp?: string;
}

export interface AttendanceWarning {
  level: 'danger' | 'warning' | 'info';
  message: string;
}

export interface AttendanceResourceEstimates {
  staffRequired?: number;
  securityGuards?: number;
  firstAidResponders?: number;
  concessionStands?: number;
}

export interface AttendanceForecast {
  forecastedSpectators: number;
  forecastedParticipants: number;
  venueCapacity: number;
  capacityUtilization: number;
  warning?: AttendanceWarning | null;
  resourceEstimates?: AttendanceResourceEstimates | null;
  trendReport?: { summary?: string } | null;
}

export interface LikelyWinner {
  rank: number;
  teamName: string;
  confidence: 'High' | 'Medium' | 'Low' | string;
  reasoning: string;
}

export interface QualificationProbability {
  teamId: string;
  teamName: string;
  probability: number;
  reasoning: string;
}

export interface ForecastedStanding {
  teamName: string;
  projectedRank: number;
  projectedPoints: number;
}

export interface PredictionsData {
  disclaimer?: string;
  confidenceScore?: number;
  likelyWinners?: LikelyWinner[];
  qualificationProbabilities?: QualificationProbability[];
  forecastedStandings?: ForecastedStanding[];
}

export interface EventCardActionEvent {
  event: WorkspaceEvent;
}
