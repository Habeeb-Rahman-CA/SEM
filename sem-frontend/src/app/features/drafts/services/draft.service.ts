import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type DraftFormType =
  | 'event_creation'
  | 'team_registration'
  | 'venue_setup'
  | 'analytics_report'
  | 'player_registration';

export interface DraftItem {
  id: string;
  workspaceId: string;
  title: string;
  formType: DraftFormType;
  progressPercent: number;
  updatedAt: string;
  updatedBy: string;
  formData: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class FrontendDraftService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  activeDraftsCount = signal<number>(0);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private wsBase(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/drafts`;
  }

  list(workspaceId: string): Observable<DraftItem[]> {
    return this.http
      .get<DraftItem[]>(this.wsBase(workspaceId), {
        headers: this.authHeaders,
      })
      .pipe(tap((list) => this.activeDraftsCount.set(list.length)));
  }

  get(workspaceId: string, draftId: string): Observable<DraftItem> {
    return this.http.get<DraftItem>(`${this.wsBase(workspaceId)}/${draftId}`, {
      headers: this.authHeaders,
    });
  }

  save(
    workspaceId: string,
    payload: {
      id?: string;
      title: string;
      formType: DraftFormType;
      progressPercent?: number;
      formData: Record<string, any>;
    },
  ): Observable<DraftItem> {
    return this.http
      .post<DraftItem>(this.wsBase(workspaceId), payload, {
        headers: this.authHeaders,
      })
      .pipe(
        tap(() => {
          this.list(workspaceId).subscribe();
        }),
      );
  }

  delete(workspaceId: string, draftId: string): Observable<{ success: boolean; id: string }> {
    return this.http
      .delete<{ success: boolean; id: string }>(`${this.wsBase(workspaceId)}/${draftId}`, {
        headers: this.authHeaders,
      })
      .pipe(
        tap(() => {
          this.list(workspaceId).subscribe();
        }),
      );
  }

  getFormTypeIcon(type: DraftFormType): string {
    switch (type) {
      case 'event_creation':
        return 'fi fi-rr-calendar-plus';
      case 'team_registration':
        return 'fi fi-rr-users-alt';
      case 'venue_setup':
        return 'fi fi-rr-marker';
      case 'analytics_report':
        return 'fi fi-rr-chart-histogram';
      case 'player_registration':
        return 'fi fi-rr-id-badge';
      default:
        return 'fi fi-rr-document';
    }
  }

  getFormTypeBadgeClass(type: DraftFormType): string {
    switch (type) {
      case 'event_creation':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      case 'team_registration':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'venue_setup':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'analytics_report':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'player_registration':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  }
}
