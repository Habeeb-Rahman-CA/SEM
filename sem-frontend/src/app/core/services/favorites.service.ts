import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';
import { UiService } from './ui.service';

export type FavoriteEntityType =
  'dashboard' | 'team' | 'event' | 'report' | 'competition' | 'form' | 'workflow' | 'custom';

export interface FavoriteItem {
  id: string;
  userId: string;
  workspaceId: string;
  entityType: FavoriteEntityType;
  entityId: string;
  title: string;
  subtitle?: string | null;
  url: string;
  icon: string;
  createdAt: string;
}

export interface ToggleFavoritePayload {
  entityType: FavoriteEntityType;
  entityId: string;
  title: string;
  subtitle?: string;
  url: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private ui = inject(UiService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  favorites = signal<FavoriteItem[]>([]);
  isLoading = signal<boolean>(false);
  activeWorkspaceId = signal<string | null>(null);

  favoritesCount = computed(() => this.favorites().length);

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadFavorites(workspaceId: string): Observable<FavoriteItem[]> {
    this.activeWorkspaceId.set(workspaceId);
    this.isLoading.set(true);
    return this.http
      .get<FavoriteItem[]>(`${this.apiUrl}/${workspaceId}/favorites`, {
        headers: this.headers,
      })
      .pipe(
        tap({
          next: (items) => {
            this.favorites.set(items);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
        }),
      );
  }

  isFavorite(entityType: FavoriteEntityType, entityId: string): boolean {
    return this.favorites().some((f) => f.entityType === entityType && f.entityId === entityId);
  }

  isUrlFavorite(url: string): boolean {
    return this.favorites().some((f) => f.url === url);
  }

  toggleFavorite(
    workspaceId: string,
    payload: ToggleFavoritePayload,
  ): Observable<{ isFavorite: boolean; favorite: FavoriteItem | null }> {
    return this.http
      .post<{ isFavorite: boolean; favorite: FavoriteItem | null }>(
        `${this.apiUrl}/${workspaceId}/favorites/toggle`,
        payload,
        { headers: this.headers },
      )
      .pipe(
        tap({
          next: (res) => {
            if (res.isFavorite && res.favorite) {
              this.favorites.update((prev) => [res.favorite!, ...prev]);
              this.ui.success(`Added "${payload.title}" to Favorites ⭐`);
            } else {
              this.favorites.update((prev) =>
                prev.filter(
                  (f) => !(f.entityType === payload.entityType && f.entityId === payload.entityId),
                ),
              );
              this.ui.info(`Removed "${payload.title}" from Favorites`);
            }
          },
        }),
      );
  }

  removeFavorite(workspaceId: string, id: string): Observable<void> {
    const fav = this.favorites().find((f) => f.id === id);
    return this.http
      .delete<void>(`${this.apiUrl}/${workspaceId}/favorites/${id}`, {
        headers: this.headers,
      })
      .pipe(
        tap({
          next: () => {
            this.favorites.update((prev) => prev.filter((f) => f.id !== id));
            if (fav) {
              this.ui.info(`Removed "${fav.title}" from Favorites`);
            }
          },
        }),
      );
  }
}
