import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type TrashedItemType =
  'team' | 'player' | 'event' | 'venue' | 'sponsor' | 'ad' | 'certificate';

export interface TrashedItem {
  id: string;
  workspaceId: string;
  itemType: TrashedItemType;
  itemId: string;
  itemName: string;
  deletedAt: string;
  deletedBy: string;
  expiresAt: string;
  itemData: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class FrontendTrashService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private wsBase(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/trash`;
  }

  list(workspaceId: string): Observable<TrashedItem[]> {
    return this.http.get<TrashedItem[]>(this.wsBase(workspaceId), {
      headers: this.authHeaders,
    });
  }

  moveToTrash(
    workspaceId: string,
    payload: {
      itemType: TrashedItemType;
      itemId: string;
      itemName: string;
      deletedBy?: string;
      itemData?: Record<string, any>;
    },
  ): Observable<TrashedItem> {
    return this.http.post<TrashedItem>(`${this.wsBase(workspaceId)}/move`, payload, {
      headers: this.authHeaders,
    });
  }

  restore(workspaceId: string, trashId: string): Observable<TrashedItem> {
    return this.http.post<TrashedItem>(
      `${this.wsBase(workspaceId)}/${trashId}/restore`,
      {},
      { headers: this.authHeaders },
    );
  }

  purge(workspaceId: string, trashId: string): Observable<{ success: boolean; id: string }> {
    return this.http.delete<{ success: boolean; id: string }>(
      `${this.wsBase(workspaceId)}/${trashId}/permanent`,
      { headers: this.authHeaders },
    );
  }

  empty(workspaceId: string): Observable<{ success: boolean; purgedCount: number }> {
    return this.http.delete<{ success: boolean; purgedCount: number }>(
      `${this.wsBase(workspaceId)}/empty`,
      { headers: this.authHeaders },
    );
  }

  getItemIcon(type: TrashedItemType): string {
    switch (type) {
      case 'team':
        return 'fi fi-rr-users-alt';
      case 'player':
        return 'fi fi-rr-user';
      case 'event':
        return 'fi fi-rr-calendar';
      case 'venue':
        return 'fi fi-rr-marker';
      case 'sponsor':
        return 'fi fi-rr-bullseye-pointer';
      case 'certificate':
        return 'fi fi-sr-diploma';
      default:
        return 'fi fi-rr-box';
    }
  }

  getItemBadgeClass(type: TrashedItemType): string {
    switch (type) {
      case 'team':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'player':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'event':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      case 'venue':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'sponsor':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  }
}
