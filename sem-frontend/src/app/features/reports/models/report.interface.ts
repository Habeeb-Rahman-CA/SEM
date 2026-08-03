import { Volunteer } from '../../volunteers/services/volunteer.service';

export type ReportType =
  | 'workspace'
  | 'event'
  | 'competition'
  | 'team'
  | 'player'
  | 'event-dashboard'
  | 'trends'
  | 'historical'
  | 'organizer'
  | 'org-stats'
  | 'volunteer';

export type CompetitionTab = 'standings' | 'matches' | 'stats';

export interface VolunteerAssignment {
  id: string;
  shiftId: string;
  volunteerId: string;
  status: 'assigned' | 'attended' | 'absent' | 'cancelled';
  serviceHours: number;
  feedback: string | null;
  rating: number | null;
  shift?: {
    id?: string;
    title?: string;
    role?: string;
    startAt?: string;
  };
}

export type VolunteerReportRow = Volunteer & {
  assignments: VolunteerAssignment[];
};

export interface TeamStatsSummary {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  winRate: number;
}

export interface StandingRow {
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

export interface EventDashboardKpis {
  totalEvents: number;
  completedEvents: number;
  ongoingEvents: number;
  upcomingEvents: number;
  eventCompletionRate: number;
  totalMatches: number;
  completedMatches: number;
  liveMatches: number;
  scheduledMatches: number;
  matchCompletionRate: number;
  totalRegisteredTeams: number;
  activeTeamsCount: number;
  totalRegisteredPlayers: number;
  activePlayersCount: number;
  totalVenues: number;
}

export interface EventBreakdown {
  name: string;
  status: string;
  sport: string;
  startDate?: string;
  endDate?: string;
  teamsRegistered: number;
  competitionsCount: number;
  matchesCount: number;
  matchesCompleted: number;
  progress: number;
}

export interface EventDashboardData {
  kpis: EventDashboardKpis;
  eventBreakdowns: EventBreakdown[];
}

export interface GrowthTrendRow {
  month: string;
  newPlayers: number;
  newTeams: number;
  totalPlayers: number;
  totalTeams: number;
}

export interface SportsDataRow {
  sport: string;
  events: number;
  competitions: number;
  participantsEstimate: number;
}

export interface AgeGroupsRow {
  group: string;
  count: number;
  percentage: number;
}

export interface SeasonalDataRow {
  season: string;
  count: number;
}

export interface ParticipationTrendsData {
  growthTrend: GrowthTrendRow[];
  sportsData: SportsDataRow[];
  ageGroupsData: AgeGroupsRow[];
  seasonalData: SeasonalDataRow[];
}

export interface YearlyDataRow {
  year: number | string;
  eventsCount: number;
  completedEvents: number;
  teamsCount: number;
  playersEstimatedCount: number;
  matchesCount: number;
  avgScorePerMatch: number;
  avgDurationDays: number;
}

export interface BenchmarkRun {
  name: string;
  year: number | string;
  participants: number;
  matches: number;
  progress: number;
}

export interface BenchmarkSeries {
  tournamentName: string;
  runs: BenchmarkRun[];
}

export interface HistoricalComparisonData {
  yearlyData: YearlyDataRow[];
  benchmarking: BenchmarkSeries[];
}

export interface OrganizerProductivityRow {
  name: string;
  scoreUpdates: number;
  matchesCreated: number;
  totalActions: number;
}

export interface OrganizerBottlenecks {
  delayedMatchesCount: number;
  venueConflictsCount: number;
}

export interface AiRecommendation {
  bottlenecksIdentified: string[];
  recommendations: string[];
  predictedEfficiencyGain: string;
}

export interface OrganizerInsightsData {
  productivity: OrganizerProductivityRow[];
  bottlenecks: OrganizerBottlenecks;
  aiRecommendation: AiRecommendation;
}

export interface OrgSportsDistribution {
  sport: string;
  events: number;
  competitions: number;
  participants: number;
}

export interface OrgAgeGroup {
  group: string;
  count: number;
  percentage: number;
}

export interface OrgGrowthRow {
  month: string;
  newPlayers: number;
  newTeams: number;
  totalPlayers: number;
  totalTeams: number;
}

export interface OrgParticipation {
  totalRegisteredPlayers: number;
  totalRegisteredTeams: number;
  growth: OrgGrowthRow[];
  sportsDistribution: OrgSportsDistribution[];
  ageGroups: OrgAgeGroup[];
}

export interface OrgTeamRanking {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  winRate: number;
}

export interface OrgPerformance {
  totalMatches: number;
  avgScorePerMatch: number;
  teamRankings: OrgTeamRanking[];
}

export interface OrgMonthlyRevenue {
  month: string;
  invoicesCount: number;
  revenue: number;
}

export interface OrgPaymentMethod {
  method: string;
  count: number;
  totalAmount: number;
}

export interface OrgStatusCount {
  status: string;
  count: number;
}

export interface OrgFinance {
  totalRevenue: number;
  outstandingRevenue: number;
  averageInvoiceValue: number;
  monthlyRevenueTrend: OrgMonthlyRevenue[];
  paymentMethodsDistribution: OrgPaymentMethod[];
  statusCounts: OrgStatusCount[];
}

export interface OrgAttendanceMonth {
  month: string;
  attendance: number;
}

export interface OrgAttendanceBreakdownItem {
  eventId: string;
  eventName: string;
  spectators: number;
  participants: number;
  total: number;
  capacity: number;
  utilization: number;
}

export interface OrgAttendance {
  totalAttendance: number;
  averageAttendance: number;
  averageCapacityUtilization: number;
  monthlyAttendanceTrend: OrgAttendanceMonth[];
  breakdown: OrgAttendanceBreakdownItem[];
}

export interface OrgSeasonalTrend {
  season: string;
  eventsCount: number;
  attendance: number;
  revenue: number;
}

export interface OrgPredictiveInsights {
  growthForecast: string;
  budgetProjection: string;
  efficiencyOpportunities: string;
  resourceRecommendations: string[];
}

export interface OrganizationStatsData {
  participation: OrgParticipation;
  performance: OrgPerformance;
  finance: OrgFinance;
  attendance: OrgAttendance;
  seasonalTrends: OrgSeasonalTrend[];
  predictiveInsights: OrgPredictiveInsights;
}

export type AnalyticsReportData =
  | EventDashboardData
  | ParticipationTrendsData
  | HistoricalComparisonData
  | OrganizerInsightsData
  | OrganizationStatsData;
