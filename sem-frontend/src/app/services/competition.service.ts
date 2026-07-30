import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import {
  Sport,
  Competition,
  CompetitionStage,
  CompetitionTeam,
  Match,
  MatchPlayer,
  CompetitionStats,
} from './workspace.service';

@Injectable({ providedIn: 'root' })
export class CompetitionService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ─── Sports ───────────────────────────────────────────────────────────────

  getSports(): Observable<Sport[]> {
    return this.http.get<Sport[]>(`${this.apiUrl}/sports`, {
      headers: this.headers,
    });
  }

  // ─── Competitions ─────────────────────────────────────────────────────────

  getCompetitions(workspaceId: string, eventId: string): Observable<Competition[]> {
    return this.http.get<Competition[]>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions`,
      { headers: this.headers },
    );
  }

  createCompetition(
    workspaceId: string,
    eventId: string,
    payload: { name: string; sportId: string; status?: string; pointsConfig?: any[] | null },
  ): Observable<Competition> {
    return this.http.post<Competition>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions`,
      payload,
      { headers: this.headers },
    );
  }

  updateCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    payload: { name?: string; sportId?: string; status?: string; pointsConfig?: any[] | null },
  ): Observable<Competition> {
    return this.http.patch<Competition>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}`,
      payload,
      { headers: this.headers },
    );
  }

  removeCompetition(workspaceId: string, eventId: string, competitionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}`,
      { headers: this.headers },
    );
  }

  // ─── Competition Teams (Participants) ─────────────────────────────────────

  getCompetitionTeams(
    workspaceId: string,
    eventId: string,
    competitionId: string,
  ): Observable<CompetitionTeam[]> {
    return this.http.get<CompetitionTeam[]>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/teams`,
      { headers: this.headers },
    );
  }

  addTeamToCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    teamId: string,
  ): Observable<CompetitionTeam> {
    return this.http.post<CompetitionTeam>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/teams`,
      { teamId },
      { headers: this.headers },
    );
  }

  removeTeamFromCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    teamId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/teams/${teamId}`,
      { headers: this.headers },
    );
  }

  generateFixtures(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    fixtureTemplateId?: string,
  ): Observable<{ stagesGenerated: number; matchesCreated: number }> {
    return this.http.post<{ stagesGenerated: number; matchesCreated: number }>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/generate-fixtures`,
      { fixtureTemplateId },
      { headers: this.headers },
    );
  }

  // ─── Competition Stages ───────────────────────────────────────────────────

  getStages(
    workspaceId: string,
    eventId: string,
    competitionId: string,
  ): Observable<CompetitionStage[]> {
    return this.http.get<CompetitionStage[]>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages`,
      { headers: this.headers },
    );
  }

  createStage(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    payload: { name: string; type: string; sequence?: number; config?: any },
  ): Observable<CompetitionStage> {
    return this.http.post<CompetitionStage>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages`,
      payload,
      { headers: this.headers },
    );
  }

  updateStage(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    payload: { name?: string; type?: string; sequence?: number; config?: any },
  ): Observable<CompetitionStage> {
    return this.http.patch<CompetitionStage>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}`,
      payload,
      { headers: this.headers },
    );
  }

  removeStage(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}`,
      { headers: this.headers },
    );
  }

  resetStagesAndFixtures(
    workspaceId: string,
    eventId: string,
    competitionId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/reset-fixtures`,
      { headers: this.headers },
    );
  }

  getQualificationPreview(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
  ): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/qualification-preview`,
      { headers: this.headers },
    );
  }

  publishQualification(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/publish-qualification`,
      {},
      { headers: this.headers },
    );
  }

  // ─── Matches ──────────────────────────────────────────────────────────────

  getMatches(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
  ): Observable<Match[]> {
    return this.http.get<Match[]>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`,
      { headers: this.headers },
    );
  }

  createMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    payload: { homeTeamId: string; awayTeamId: string; venueId?: string | null; config?: any },
  ): Observable<Match> {
    return this.http.post<Match>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`,
      payload,
      { headers: this.headers },
    );
  }

  updateMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    payload: {
      homeTeamId?: string;
      awayTeamId?: string;
      venueId?: string | null;
      homeScore?: number;
      awayScore?: number;
      status?: string;
      config?: any;
      liveData?: any;
      scheduledAt?: string | null;
    },
  ): Observable<Match> {
    return this.http.patch<Match>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${matchId}`,
      payload,
      { headers: this.headers },
    );
  }

  removeMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${matchId}`,
      { headers: this.headers },
    );
  }

  acquireMatchLock(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
  ): Observable<{ success: boolean; lockedBy?: string; expiresAt?: number }> {
    return this.http.post<{ success: boolean; lockedBy?: string; expiresAt?: number }>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${matchId}/lock`,
      {},
      { headers: this.headers },
    );
  }

  releaseMatchLock(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
  ): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${matchId}/unlock`,
      {},
      { headers: this.headers },
    );
  }

  // ─── Lineups ──────────────────────────────────────────────────────────────

  getMatchLineup(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
  ): Observable<MatchPlayer[]> {
    return this.http.get<MatchPlayer[]>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${matchId}/lineup`,
      { headers: this.headers },
    );
  }

  saveMatchLineup(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    lineups: { playerId: string; isPlaying: boolean; teamId: string; isGoalkeeper?: boolean }[],
  ): Observable<MatchPlayer[]> {
    return this.http.post<MatchPlayer[]>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${matchId}/lineup`,
      { lineups },
      { headers: this.headers },
    );
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  getCompetitionStats(
    workspaceId: string,
    eventId: string,
    competitionId: string,
  ): Observable<CompetitionStats> {
    return this.http.get<CompetitionStats>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stats`,
      { headers: this.headers },
    );
  }
}
