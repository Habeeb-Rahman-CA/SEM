export interface MatchContextIds {
  eventId: string | null;
  competitionId: string | null;
  stageId: string | null;
}

export interface MatchLike {
  eventId?: string | null;
  competitionId?: string | null;
  stageId?: string | null;
  stage?: {
    competitionId?: string | null;
    competition?: { eventId?: string | null };
  } | null;
}

/**
 * Matches can carry their event/competition ids either flat or nested under
 * `stage.competition`. Normalize both shapes into a single tuple.
 */
export function extractMatchIds(match: MatchLike | null | undefined): MatchContextIds {
  if (!match) return { eventId: null, competitionId: null, stageId: null };
  return {
    eventId: match.stage?.competition?.eventId ?? match.eventId ?? null,
    competitionId: match.stage?.competitionId ?? match.competitionId ?? null,
    stageId: match.stageId ?? null,
  };
}

export function hasFullMatchContext(
  ctx: MatchContextIds & { workspaceId: string | null },
): ctx is Required<MatchContextIds> & { workspaceId: string } {
  return !!ctx.workspaceId && !!ctx.eventId && !!ctx.competitionId && !!ctx.stageId;
}
