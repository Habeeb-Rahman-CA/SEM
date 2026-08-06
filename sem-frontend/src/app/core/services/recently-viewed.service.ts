import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';

export type RecentEntityType =
  'player' | 'event' | 'report' | 'invoice' | 'team' | 'venue' | 'form' | 'competition' | 'custom';

export interface RecentlyViewedItem {
  id: string;
  userId: string;
  workspaceId: string;
  entityType: RecentEntityType;
  entityId: string;
  title: string;
  subtitle?: string | null;
  url: string;
  icon: string;
  viewedAt: string;
}

export interface RecordViewPayload {
  entityType: RecentEntityType;
  entityId: string;
  title: string;
  subtitle?: string;
  url: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RecentlyViewedService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  recentItems = signal<RecentlyViewedItem[]>([]);
  isLoading = signal<boolean>(false);

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadRecentlyViewed(workspaceId: string): Observable<RecentlyViewedItem[]> {
    this.isLoading.set(true);
    return this.http
      .get<RecentlyViewedItem[]>(`${this.apiUrl}/${workspaceId}/recently-viewed`, {
        headers: this.headers,
      })
      .pipe(
        tap({
          next: (items) => {
            this.recentItems.set(items);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
        }),
      );
  }

  recordView(workspaceId: string, payload: RecordViewPayload): Observable<RecentlyViewedItem> {
    return this.http
      .post<RecentlyViewedItem>(`${this.apiUrl}/${workspaceId}/recently-viewed`, payload, {
        headers: this.headers,
      })
      .pipe(
        tap({
          next: (saved) => {
            this.recentItems.update((prev) => {
              const filtered = prev.filter(
                (item) =>
                  !(item.entityType === saved.entityType && item.entityId === saved.entityId),
              );
              return [saved, ...filtered].slice(0, 15);
            });
          },
        }),
      );
  }

  clearHistory(workspaceId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${workspaceId}/recently-viewed`, {
        headers: this.headers,
      })
      .pipe(
        tap({
          next: () => this.recentItems.set([]),
        }),
      );
  }
}
