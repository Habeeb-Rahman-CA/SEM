import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type FilterCategory = 'events' | 'matches' | 'registrations' | 'payments' | 'teams';

export interface SavedFilterItem {
  id: string;
  workspaceId: string;
  name: string;
  targetCategory: FilterCategory;
  icon: string;
  color: string;
  isPreset: boolean;
  isDefault?: boolean;
  criteria: Record<string, any>;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FrontendSavedFilterService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private wsBase(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/saved-filters`;
  }

  list(workspaceId: string): Observable<SavedFilterItem[]> {
    return this.http.get<SavedFilterItem[]>(this.wsBase(workspaceId), {
      headers: this.authHeaders,
    });
  }

  create(
    workspaceId: string,
    payload: {
      name: string;
      targetCategory: FilterCategory;
      icon?: string;
      color?: string;
      isDefault?: boolean;
      criteria: Record<string, any>;
    },
  ): Observable<SavedFilterItem> {
    return this.http.post<SavedFilterItem>(this.wsBase(workspaceId), payload, {
      headers: this.authHeaders,
    });
  }

  delete(workspaceId: string, filterId: string): Observable<{ success: boolean; id: string }> {
    return this.http.delete<{ success: boolean; id: string }>(
      `${this.wsBase(workspaceId)}/${filterId}`,
      { headers: this.authHeaders },
    );
  }

  getBadgeClass(color: string): string {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'amber':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'rose':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'blue':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'violet':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  }
}
