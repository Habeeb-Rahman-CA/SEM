import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Match } from '../../../../workspaces/services/workspace.service';
import { CompetitionService } from '../../../services/competition.service';

export interface ConsoleMatchContext {
  workspaceId: string;
  eventId: string;
  competitionId: string;
  stageId: string;
  matchId: string;
}

export type MatchPatch = {
  homeTeamId?: string;
  awayTeamId?: string;
  venueId?: string | null;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  config?: any;
  liveData?: any;
  scheduledAt?: string | null;
};

/**
 * Thin helper around CompetitionService.updateMatch that centralises the
 * repetitive `.updateMatch(...).subscribe({ next: (u) => emit(u) })` pattern
 * seen throughout every live console.
 */
@Injectable()
export class ConsoleMatchService {
  private competitionService = inject(CompetitionService);

  patch(ctx: ConsoleMatchContext, payload: MatchPatch): Observable<Match> {
    return this.competitionService.updateMatch(
      ctx.workspaceId,
      ctx.eventId,
      ctx.competitionId,
      ctx.stageId,
      ctx.matchId,
      payload,
    );
  }
}
