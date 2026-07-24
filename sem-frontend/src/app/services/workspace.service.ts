import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

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
import { Venue } from './venue.service';
export type { Venue };
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

export interface AuditLog {
  id: string;
  action: string;
  category: string;
  entityType?: string;
  entityId?: string;
  performedById?: string;
  performedByName?: string;
  ipAddress?: string;
  status: string;
  details?: string;
  createdAt: string;
}

export interface SystemMetrics {
  status: string;
  uptime: number;
  uptimeFormatted: string;
  environment: string;
  nodeVersion: string;
  platform: string;
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    heapUsagePercent: string;
  };
  counts: {
    users: number;
    workspaces: number;
    competitions: number;
    matches: number;
    sports: number;
    auditLogs: number;
  };
}

export interface SystemConfigMap {
  maintenance_mode: string;
  allow_registrations: string;
  announcement_text: string;
  announcement_level: string;
  max_workspaces_per_user: string;
  [key: string]: string;
}


export interface Team {
  id: string;
  name: string;
  code: string;
  description: string | null;
  logoUrl: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
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
  teams?: Team[];
}

export interface Sport {
  id: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PointsConfigEntry {
  position: number;
  label: string;
  points: number;
}

export interface Competition {
  id: string;
  name: string;
  eventId: string;
  sportId: string;
  sport?: Sport;
  status: string; // 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  pointsConfig: PointsConfigEntry[] | null;
  createdAt: string;
  updatedAt: string;
  stages?: any[];
}

export interface CompetitionStage {
  id: string;
  name: string;
  type: 'league' | 'group' | 'knockout' | 'group_knockout';
  sequence: number;
  competitionId: string;
  config: {
    winPoint?: number;
    drawPoint?: number;
    twoLegged?: boolean;
    groupsCount?: number;
    advancingCount?: number;
    gamesPerTeam?: number;
    legs?: number;
    groupKnockoutSubtype?: 'single_group' | 'multiple_groups';
    advancingType?: 'winner' | 'winner_and_runner';
    singleGroupAdvancing?: number;
    venueId?: string;
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
  venueId?: string | null;
  venue?: Venue | null;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'live' | 'completed';
  config: {
    timerDuration?: number;
    overs?: number;
    setsToWin?: number;
    matchType?: string;
    round?: string;
    leg?: number;
  };
  liveData: any;
  createdAt: string;
  updatedAt: string;
  mvp?: {
    playerId: string;
    playerName: string;
    teamName: string;
    rating: number;
  };
}

export interface CompetitionTeam {
  id: string;
  competitionId: string;
  teamId: string;
  team: Team;
  createdAt: string;
}

export interface MatchPlayer {
  id: string;
  matchId: string;
  playerId: string;
  player?: Player;
  teamId: string;
  team?: Team;
  isPlaying: boolean;
  isGoalkeeper?: boolean;
  /** Per-match player rating (5.0–10.0, null = not yet rated) */
  rating?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardPlayer {
  playerId: string;
  playerName: string;
  teamName: string;
}

export interface RatedPlayerStats extends LeaderboardPlayer {
  avgRating: number;
  appearances: number;
}

export interface MvpPlayerStats extends LeaderboardPlayer {
  mvps: number;
}

export interface FootballScorerStats extends LeaderboardPlayer {
  goals: number;
}

export interface FootballAssistStats extends LeaderboardPlayer {
  assists: number;
}

export interface FootballCardStats extends LeaderboardPlayer {
  cards: number;
}

export interface CricketRunsStats extends LeaderboardPlayer {
  runs: number;
  innings: number;
}

export interface CricketWicketsStats extends LeaderboardPlayer {
  wickets: number;
  innings: number;
}

export interface BadmintonRallyStats extends LeaderboardPlayer {
  ralliesWon: number;
}

export interface CompetitionStats {
  sportCode: string;
  topRated: RatedPlayerStats[];
  mostMvps?: MvpPlayerStats[];
  topScorers?: FootballScorerStats[];
  topAssists?: FootballAssistStats[];
  mostYellowCards?: FootballCardStats[];
  mostRedCards?: FootballCardStats[];
  topRuns?: CricketRunsStats[];
  topWickets?: CricketWicketsStats[];
  topRalliesWon?: BadmintonRallyStats[];
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: { id: string; username: string; avatarUrl?: string | null };
  status?: string;
  workspace?: Workspace;
}

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  type: string;
  workspaceId: string | null;
  icon: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
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
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAll(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(this.apiUrl, { headers: this.headers });
  }

  getDashboardOverview(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/overview`, { headers: this.headers });
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

  bulkImportMembers(workspaceId: string, payload: { members: { username: string; role?: string }[]; password: string }): Observable<{ success: any[]; failed: any[] }> {
    return this.http.post<{ success: any[]; failed: any[] }>(
      `${this.apiUrl}/${workspaceId}/members/bulk`,
      payload,
      { headers: this.headers }
    );
  }

  joinWorkspace(workspaceId: string): Observable<WorkspaceMember> {
    return this.http.post<WorkspaceMember>(
      `${this.apiUrl}/${workspaceId}/join`,
      {},
      { headers: this.headers }
    );
  }

  getPendingInvitations(): Observable<WorkspaceMember[]> {
    return this.http.get<WorkspaceMember[]>(`${this.apiUrl}/invitations/pending`, {
      headers: this.headers,
    });
  }

  acceptInvitation(workspaceId: string): Observable<WorkspaceMember> {
    return this.http.post<WorkspaceMember>(
      `${this.apiUrl}/invitations/${workspaceId}/accept`,
      {},
      { headers: this.headers },
    );
  }

  rejectInvitation(workspaceId: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/invitations/${workspaceId}/reject`,
      {},
      { headers: this.headers },
    );
  }

  getNotifications(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.apiUrl}/notifications`, {
      headers: this.headers,
    });
  }

  markNotificationsRead(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/notifications/read`, {}, {
      headers: this.headers,
    });
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
    return this.http.get<Role[]>(`${environment.apiUrl}/system-settings/roles`, {
      headers: this.headers,
    });
  }

  createGlobalRole(name: string, description?: string): Observable<Role> {
    return this.http.post<Role>(
      `${environment.apiUrl}/system-settings/roles`,
      { name, description },
      { headers: this.headers },
    );
  }

  updateGlobalRole(roleId: string, name?: string, description?: string): Observable<Role> {
    return this.http.patch<Role>(
      `${environment.apiUrl}/system-settings/roles/${roleId}`,
      { name, description },
      { headers: this.headers },
    );
  }

  removeGlobalRole(roleId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/system-settings/roles/${roleId}`, {
      headers: this.headers,
    });
  }

  getGlobalPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${environment.apiUrl}/system-settings/permissions`, {
      headers: this.headers,
    });
  }

  createPermission(name: string, slug: string, description?: string): Observable<Permission> {
    return this.http.post<Permission>(
      `${environment.apiUrl}/system-settings/permissions`,
      { name, slug, description },
      { headers: this.headers },
    );
  }

  updatePermission(permissionId: string, name?: string, slug?: string, description?: string): Observable<Permission> {
    return this.http.patch<Permission>(
      `${environment.apiUrl}/system-settings/permissions/${permissionId}`,
      { name, slug, description },
      { headers: this.headers },
    );
  }

  deletePermission(permissionId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/system-settings/permissions/${permissionId}`, {
      headers: this.headers,
    });
  }

  updateRolePermissions(roleId: string, permissionIds: string[]): Observable<Role> {
    return this.http.post<Role>(
      `${environment.apiUrl}/system-settings/roles/${roleId}/permissions`,
      { permissionIds },
      { headers: this.headers }
    );
  }

  // ─── Sports Master Data CRUD ─────────────────────────────────────────────

  createSport(name: string, code: string, description?: string): Observable<Sport> {
    return this.http.post<Sport>(
      `${environment.apiUrl}/system-settings/sports`,
      { name, code, description },
      { headers: this.headers },
    );
  }

  updateSport(sportId: string, name?: string, code?: string, description?: string): Observable<Sport> {
    return this.http.patch<Sport>(
      `${environment.apiUrl}/system-settings/sports/${sportId}`,
      { name, code, description },
      { headers: this.headers },
    );
  }

  deleteSport(sportId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/system-settings/sports/${sportId}`, {
      headers: this.headers,
    });
  }

  // ─── System Audit Logs & Monitoring ────────────────────────────────────────

  getAuditLogs(category?: string, limit: number = 100): Observable<AuditLog[]> {
    let params = `?limit=${limit}`;
    if (category) params += `&category=${category}`;
    return this.http.get<AuditLog[]>(`${environment.apiUrl}/system-settings/audit-logs${params}`, {
      headers: this.headers,
    });
  }

  clearAuditLogs(): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/system-settings/audit-logs`, {
      headers: this.headers,
    });
  }

  getSystemMetrics(): Observable<SystemMetrics> {
    return this.http.get<SystemMetrics>(`${environment.apiUrl}/system-settings/monitoring`, {
      headers: this.headers,
    });
  }

  getSystemConfigs(): Observable<SystemConfigMap> {
    return this.http.get<SystemConfigMap>(`${environment.apiUrl}/system-settings/config`, {
      headers: this.headers,
    });
  }

  updateSystemConfig(key: string, value: string): Observable<SystemConfigMap> {
    return this.http.patch<SystemConfigMap>(
      `${environment.apiUrl}/system-settings/config`,
      { key, value },
      { headers: this.headers },
    );
  }







  // ─── Events (Moved to EventService) ───

  // ─── Competitions ─────────────────────────────────────────────────────────

  getSports(): Observable<Sport[]> {
    return this.http.get<Sport[]>(`${this.apiUrl}/sports`, {
      headers: this.headers,
    });
  }


  uploadImage(file: File, type: 'workspace' | 'team' | 'user' | 'event' | 'venue'): Observable<{ url: string; publicId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; publicId: string }>(
      `${environment.apiUrl}/upload?type=${type}`,
      formData,
      { headers: this.headers }
    );
  }

  // ─── Workspace Files Management ──────────────────────────────────────────

  getFiles(workspaceId: string): Observable<WorkspaceFile[]> {
    return this.http.get<WorkspaceFile[]>(`${this.apiUrl}/${workspaceId}/files`, {
      headers: this.headers,
    });
  }

  uploadWorkspaceFile(workspaceId: string, file: File, compress: boolean = false, quality: number = 0.8): Observable<WorkspaceFile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<WorkspaceFile>(
      `${this.apiUrl}/${workspaceId}/files?compress=${compress}&quality=${quality}`,
      formData,
      { headers: this.headers }
    );
  }

  uploadWorkspaceFileVersion(workspaceId: string, fileId: string, file: File, compress: boolean = false, quality: number = 0.8): Observable<WorkspaceFile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<WorkspaceFile>(
      `${this.apiUrl}/${workspaceId}/files/${fileId}/version?compress=${compress}&quality=${quality}`,
      formData,
      { headers: this.headers }
    );
  }

  getFileVersions(workspaceId: string, fileId: string): Observable<WorkspaceFileVersion[]> {
    return this.http.get<WorkspaceFileVersion[]>(
      `${this.apiUrl}/${workspaceId}/files/${fileId}/versions`,
      { headers: this.headers }
    );
  }

  renameWorkspaceFile(workspaceId: string, fileId: string, name: string): Observable<WorkspaceFile> {
    return this.http.patch<WorkspaceFile>(
      `${this.apiUrl}/${workspaceId}/files/${fileId}`,
      { name },
      { headers: this.headers }
    );
  }

  deleteWorkspaceFile(workspaceId: string, fileId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${workspaceId}/files/${fileId}`,
      { headers: this.headers }
    );
  }
}

export interface WorkspaceFile {
  id: string;
  workspaceId: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  publicId: string | null;
  currentVersion: number;
  virusScanStatus: string;
  virusScanDetails: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
}

export interface WorkspaceFileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  url: string;
  publicId: string | null;
  size: number;
  virusScanStatus: string;
  virusScanDetails: string | null;
  createdAt: string;
  createdBy: string | null;
}

