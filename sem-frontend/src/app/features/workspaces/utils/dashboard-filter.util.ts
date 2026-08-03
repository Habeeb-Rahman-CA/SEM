import type {
  DashboardCompetition,
  DashboardFiltered,
  DashboardMatch,
  DashboardOverviewResponse,
} from '../models/dashboard.interface';

function matchBelongsToWorkspace(m: DashboardMatch, workspaceId: string): boolean {
  return m.workspaceId === workspaceId || m.stage?.competition?.event?.workspaceId === workspaceId;
}

function competitionBelongsToWorkspace(c: DashboardCompetition, workspaceId: string): boolean {
  return c.event?.workspaceId === workspaceId || c.workspaceId === workspaceId;
}

export function filterDashboardForWorkspace(
  data: DashboardOverviewResponse | null | undefined,
  workspaceId: string,
): DashboardFiltered {
  const safe = data ?? {};
  return {
    live: (safe.liveMatches ?? []).filter((m) => matchBelongsToWorkspace(m, workspaceId)),
    upcoming: (safe.upcomingMatches ?? []).filter((m) => matchBelongsToWorkspace(m, workspaceId)),
    completed: (safe.completedMatches ?? []).filter((m) => matchBelongsToWorkspace(m, workspaceId)),
    runningCompetitions: (safe.runningCompetitions ?? []).filter((c) =>
      competitionBelongsToWorkspace(c, workspaceId),
    ),
    topScorers: safe.topScorers ?? [],
    topRatedPlayers: safe.topRatedPlayers ?? [],
  };
}
