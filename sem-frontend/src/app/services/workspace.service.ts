import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  workspaceId: string | null;
  permissions?: Permission[];
}

export interface Team {
  id: string;
  name: string;
  code: string;
  description: string | null;
  logoUrl: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  jerseyNumber: string | null;
  teamId: string;
  team: Team;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceEvent {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string; // 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  logoUrl?: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sport {
  id: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Competition {
  id: string;
  name: string;
  eventId: string;
  sportId: string;
  sport?: Sport;
  status: string; // 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionStage {
  id: string;
  name: string;
  type: 'group' | 'knockout' | 'group_knockout';
  sequence: number;
  competitionId: string;
  config: {
    winPoint?: number;
    drawPoint?: number;
    twoLegged?: boolean;
    groupsCount?: number;
    advancingCount?: number;
    gamesPerTeam?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: string;
  stageId: string;
  homeTeamId: string | null;
  homeTeam?: Team | null;
  awayTeamId: string | null;
  awayTeam?: Team | null;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'live' | 'completed';
  config: {
    timerDuration?: number;
    overs?: number;
    setsToWin?: number;
  };
  liveData: any;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionTeam {
  id: string;
  competitionId: string;
  teamId: string;
  team: Team;
  createdAt: string;
}


export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: { id: string; username: string; avatarUrl?: string | null };
}

export interface CreateWorkspacePayload {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string | null;
}

export interface UpdateWorkspacePayload {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = 'http://localhost:3001/api/workspaces';

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAll(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(this.apiUrl, { headers: this.headers });
  }

  getOne(id: string): Observable<Workspace> {
    return this.http.get<Workspace>(`${this.apiUrl}/${id}`, { headers: this.headers });
  }

  create(payload: CreateWorkspacePayload): Observable<Workspace> {
    return this.http.post<Workspace>(this.apiUrl, payload, { headers: this.headers });
  }

  update(id: string, payload: UpdateWorkspacePayload): Observable<Workspace> {
    return this.http.patch<Workspace>(`${this.apiUrl}/${id}`, payload, { headers: this.headers });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.headers });
  }

  getMembers(workspaceId: string): Observable<WorkspaceMember[]> {
    return this.http.get<WorkspaceMember[]>(`${this.apiUrl}/${workspaceId}/members`, {
      headers: this.headers,
    });
  }

  inviteMember(workspaceId: string, username: string, role: string): Observable<WorkspaceMember> {
    return this.http.post<WorkspaceMember>(
      `${this.apiUrl}/${workspaceId}/members`,
      { username, role },
      { headers: this.headers },
    );
  }

  joinWorkspace(workspaceId: string): Observable<WorkspaceMember> {
    return this.http.post<WorkspaceMember>(
      `${this.apiUrl}/${workspaceId}/join`,
      {},
      { headers: this.headers }
    );
  }

  updateMemberRole(workspaceId: string, userId: string, role: string): Observable<WorkspaceMember> {
    return this.http.patch<WorkspaceMember>(
      `${this.apiUrl}/${workspaceId}/members/${userId}`,
      { role },
      { headers: this.headers },
    );
  }

  removeMember(workspaceId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/members/${userId}`, {
      headers: this.headers,
    });
  }

  // ─── Roles ────────────────────────────────────────────────────────────────

  getRoles(workspaceId: string): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/${workspaceId}/roles`, {
      headers: this.headers,
    });
  }

  createRole(workspaceId: string, name: string, description?: string): Observable<Role> {
    return this.http.post<Role>(
      `${this.apiUrl}/${workspaceId}/roles`,
      { name, description },
      { headers: this.headers },
    );
  }

  removeRole(workspaceId: string, roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/roles/${roleId}`, {
      headers: this.headers,
    });
  }

  // ─── Global System Roles ──────────────────────────────────────────────────

  getGlobalRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`http://localhost:3001/api/system-settings/roles`, {
      headers: this.headers,
    });
  }

  createGlobalRole(name: string, description?: string): Observable<Role> {
    return this.http.post<Role>(
      `http://localhost:3001/api/system-settings/roles`,
      { name, description },
      { headers: this.headers },
    );
  }

  removeGlobalRole(roleId: string): Observable<void> {
    return this.http.delete<void>(`http://localhost:3001/api/system-settings/roles/${roleId}`, {
      headers: this.headers,
    });
  }

  getGlobalPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`http://localhost:3001/api/system-settings/permissions`, {
      headers: this.headers,
    });
  }

  updateRolePermissions(roleId: string, permissionIds: string[]): Observable<Role> {
    return this.http.post<Role>(
      `http://localhost:3001/api/system-settings/roles/${roleId}/permissions`,
      { permissionIds },
      { headers: this.headers }
    );
  }

  // ─── Teams ────────────────────────────────────────────────────────────────

  getTeams(workspaceId: string): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.apiUrl}/${workspaceId}/teams`, {
      headers: this.headers,
    });
  }

  createTeam(workspaceId: string, name: string, code: string, description?: string, logoUrl?: string): Observable<Team> {
    return this.http.post<Team>(
      `${this.apiUrl}/${workspaceId}/teams`,
      { name, code, description, logoUrl },
      { headers: this.headers },
    );
  }

  updateTeam(workspaceId: string, teamId: string, name?: string, code?: string, description?: string, logoUrl?: string): Observable<Team> {
    return this.http.patch<Team>(
      `${this.apiUrl}/${workspaceId}/teams/${teamId}`,
      { name, code, description, logoUrl },
      { headers: this.headers },
    );
  }

  removeTeam(workspaceId: string, teamId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/teams/${teamId}`, {
      headers: this.headers,
    });
  }

  // ─── Players ──────────────────────────────────────────────────────────────

  getPlayers(workspaceId: string): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.apiUrl}/${workspaceId}/players`, {
      headers: this.headers,
    });
  }

  createPlayer(
    workspaceId: string,
    payload: { userId: string; jerseyNumber?: string; teamId: string }
  ): Observable<Player> {
    return this.http.post<Player>(
      `${this.apiUrl}/${workspaceId}/players`,
      payload,
      { headers: this.headers }
    );
  }

  updatePlayer(
    workspaceId: string,
    playerId: string,
    payload: { jerseyNumber?: string; teamId?: string }
  ): Observable<Player> {
    return this.http.patch<Player>(
      `${this.apiUrl}/${workspaceId}/players/${playerId}`,
      payload,
      { headers: this.headers }
    );
  }

  removePlayer(workspaceId: string, playerId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/players/${playerId}`, {
      headers: this.headers,
    });
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  getEvents(workspaceId: string): Observable<WorkspaceEvent[]> {
    return this.http.get<WorkspaceEvent[]>(`${this.apiUrl}/${workspaceId}/events`, {
      headers: this.headers,
    });
  }

  createEvent(
    workspaceId: string,
    payload: { name: string; description?: string; startDate?: string; endDate?: string; status?: string; logoUrl?: string }
  ): Observable<WorkspaceEvent> {
    return this.http.post<WorkspaceEvent>(
      `${this.apiUrl}/${workspaceId}/events`,
      payload,
      { headers: this.headers }
    );
  }

  updateEvent(
    workspaceId: string,
    eventId: string,
    payload: { name?: string; description?: string; startDate?: string | null; endDate?: string | null; status?: string; logoUrl?: string }
  ): Observable<WorkspaceEvent> {
    return this.http.patch<WorkspaceEvent>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}`,
      payload,
      { headers: this.headers }
    );
  }

  removeEvent(workspaceId: string, eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/events/${eventId}`, {
      headers: this.headers,
    });
  }

  // ─── Competitions ─────────────────────────────────────────────────────────

  getSports(): Observable<Sport[]> {
    return this.http.get<Sport[]>(`${this.apiUrl}/sports`, {
      headers: this.headers,
    });
  }

  getCompetitions(workspaceId: string, eventId: string): Observable<Competition[]> {
    return this.http.get<Competition[]>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions`,
      { headers: this.headers }
    );
  }

  createCompetition(
    workspaceId: string,
    eventId: string,
    payload: { name: string; sportId: string; status?: string }
  ): Observable<Competition> {
    return this.http.post<Competition>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions`,
      payload,
      { headers: this.headers }
    );
  }

  updateCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    payload: { name?: string; sportId?: string; status?: string }
  ): Observable<Competition> {
    return this.http.patch<Competition>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}`,
      payload,
      { headers: this.headers }
    );
  }

  removeCompetition(workspaceId: string, eventId: string, competitionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}`,
      { headers: this.headers }
    );
  }

  // ─── Competition Stages ───────────────────────────────────────────────────

  // ─── Competition Teams (Participants) ─────────────────────────────────────

  getCompetitionTeams(workspaceId: string, eventId: string, competitionId: string): Observable<CompetitionTeam[]> {
    return this.http.get<CompetitionTeam[]>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/teams`,
      { headers: this.headers }
    );
  }

  addTeamToCompetition(workspaceId: string, eventId: string, competitionId: string, teamId: string): Observable<CompetitionTeam> {
    return this.http.post<CompetitionTeam>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/teams`,
      { teamId },
      { headers: this.headers }
    );
  }

  removeTeamFromCompetition(workspaceId: string, eventId: string, competitionId: string, teamId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/teams/${teamId}`,
      { headers: this.headers }
    );
  }

  generateFixtures(workspaceId: string, eventId: string, competitionId: string): Observable<{ stagesGenerated: number; matchesCreated: number }> {
    return this.http.post<{ stagesGenerated: number; matchesCreated: number }>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/generate-fixtures`,
      {},
      { headers: this.headers }
    );
  }

  getStages(workspaceId: string, eventId: string, competitionId: string): Observable<CompetitionStage[]> {
    return this.http.get<CompetitionStage[]>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages`,
      { headers: this.headers }
    );
  }

  createStage(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    payload: { name: string; type: string; sequence?: number; config?: any }
  ): Observable<CompetitionStage> {
    return this.http.post<CompetitionStage>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages`,
      payload,
      { headers: this.headers }
    );
  }

  updateStage(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    payload: { name?: string; type?: string; sequence?: number; config?: any }
  ): Observable<CompetitionStage> {
    return this.http.patch<CompetitionStage>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}`,
      payload,
      { headers: this.headers }
    );
  }

  removeStage(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}`,
      { headers: this.headers }
    );
  }

  // ─── Matches ──────────────────────────────────────────────────────────────

  getMatches(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string
  ): Observable<Match[]> {
    return this.http.get<Match[]>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`,
      { headers: this.headers }
    );
  }

  createMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    payload: { homeTeamId: string; awayTeamId: string; config?: any }
  ): Observable<Match> {
    return this.http.post<Match>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches`,
      payload,
      { headers: this.headers }
    );
  }

  updateMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string,
    payload: { homeTeamId?: string; awayTeamId?: string; homeScore?: number; awayScore?: number; status?: string; config?: any; liveData?: any }
  ): Observable<Match> {
    return this.http.patch<Match>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${matchId}`,
      payload,
      { headers: this.headers }
    );
  }

  removeMatch(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    stageId: string,
    matchId: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/events/${eventId}/competitions/${competitionId}/stages/${stageId}/matches/${matchId}`,
      { headers: this.headers }
    );
  }

  uploadImage(file: File, type: 'workspace' | 'team' | 'user' | 'event'): Observable<{ url: string; publicId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; publicId: string }>(
      `http://localhost:3001/api/upload?type=${type}`,
      formData,
      { headers: this.headers }
    );
  }
}
