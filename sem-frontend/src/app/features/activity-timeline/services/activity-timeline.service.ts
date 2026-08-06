import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type ActivityAction =
  'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'published' | 'scored';

export type ActivityCategory =
  | 'team'
  | 'match'
  | 'venue'
  | 'registration'
  | 'certificate'
  | 'sponsor'
  | 'equipment'
  | 'transfer'
  | 'roster';

export interface ActivityLogEntry {
  id: string;
  workspaceId: string;
  timestamp: string;
  formattedTime: string;
  relativeTime: string;
  actorName: string;
  actorAvatar?: string;
  actorRole?: string;
  action: ActivityAction;
  entityType: ActivityCategory;
  entityName: string;
  entityId?: string;
  details?: string;
  severity: 'info' | 'warning' | 'critical';
}

@Injectable({ providedIn: 'root' })
export class FrontendActivityTimelineService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private wsBase(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/activity-timeline`;
  }

  list(
    workspaceId: string,
    query?: { category?: string; action?: string; search?: string },
  ): Observable<ActivityLogEntry[]> {
    const params: Record<string, string> = {};
    if (query?.category && query.category !== 'all') params['category'] = query.category;
    if (query?.action && query.action !== 'all') params['action'] = query.action;
    if (query?.search) params['search'] = query.search;

    return this.http.get<ActivityLogEntry[]>(this.wsBase(workspaceId), {
      headers: this.authHeaders,
      params,
    });
  }

  record(
    workspaceId: string,
    entry: {
      actorName: string;
      actorRole?: string;
      action: ActivityAction;
      entityType: ActivityCategory;
      entityName: string;
      details?: string;
    },
  ): Observable<ActivityLogEntry> {
    return this.http.post<ActivityLogEntry>(this.wsBase(workspaceId), entry, {
      headers: this.authHeaders,
    });
  }

  getActionBadgeClass(action: ActivityAction): string {
    switch (action) {
      case 'created':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'updated':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'deleted':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'approved':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'published':
      case 'scored':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  }

  getActionIcon(action: ActivityAction): string {
    switch (action) {
      case 'created':
        return 'fi fi-rr-plus';
      case 'updated':
        return 'fi fi-rr-edit';
      case 'deleted':
        return 'fi fi-rr-trash';
      case 'approved':
        return 'fi fi-rr-check';
      case 'published':
        return 'fi fi-rr-paper-plane';
      case 'scored':
        return 'fi fi-sr-trophy';
      default:
        return 'fi fi-rr-time-past';
    }
  }

  getCategoryIcon(cat: ActivityCategory): string {
    switch (cat) {
      case 'team':
        return 'fi fi-rr-users-alt';
      case 'match':
        return 'fi fi-rr-football';
      case 'venue':
        return 'fi fi-rr-marker';
      case 'registration':
        return 'fi fi-rr-id-badge';
      case 'certificate':
        return 'fi fi-sr-diploma';
      case 'sponsor':
        return 'fi fi-rr-bullseye-pointer';
      default:
        return 'fi fi-rr-box';
    }
  }
}
