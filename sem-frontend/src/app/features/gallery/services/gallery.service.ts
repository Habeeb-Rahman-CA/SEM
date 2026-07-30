import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export interface GalleryPhoto {
  id: string;
  eventId: string;
  competitionId: string | null;
  matchId: string | null;
  url: string;
  publicId: string | null;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  listPhotos(
    workspaceId: string,
    eventId: string,
    filters: { competitionId?: string; matchId?: string } = {},
  ): Observable<GalleryPhoto[]> {
    const params: Record<string, string> = {};
    if (filters.competitionId) params['competitionId'] = filters.competitionId;
    if (filters.matchId) params['matchId'] = filters.matchId;
    return this.http.get<GalleryPhoto[]>(
      `${environment.apiUrl}/workspaces/${workspaceId}/events/${eventId}/gallery/photos`,
      { headers: this.authHeaders, params },
    );
  }

  uploadPhoto(
    workspaceId: string,
    eventId: string,
    file: File,
    meta: { competitionId?: string; matchId?: string; caption?: string } = {},
  ): Observable<GalleryPhoto> {
    const formData = new FormData();
    formData.append('file', file);
    if (meta.competitionId) formData.append('competitionId', meta.competitionId);
    if (meta.matchId) formData.append('matchId', meta.matchId);
    if (meta.caption) formData.append('caption', meta.caption);

    return this.http.post<GalleryPhoto>(
      `${environment.apiUrl}/workspaces/${workspaceId}/events/${eventId}/gallery/photos`,
      formData,
      { headers: this.authHeaders },
    );
  }

  updatePhoto(
    workspaceId: string,
    eventId: string,
    photoId: string,
    payload: {
      competitionId?: string | null;
      matchId?: string | null;
      caption?: string | null;
    },
  ): Observable<GalleryPhoto> {
    return this.http.patch<GalleryPhoto>(
      `${environment.apiUrl}/workspaces/${workspaceId}/events/${eventId}/gallery/photos/${photoId}`,
      payload,
      { headers: this.authHeaders },
    );
  }

  removePhoto(workspaceId: string, eventId: string, photoId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/workspaces/${workspaceId}/events/${eventId}/gallery/photos/${photoId}`,
      { headers: this.authHeaders },
    );
  }

  listPublicPhotos(
    eventId: string,
    filters: { competitionId?: string; matchId?: string } = {},
  ): Observable<GalleryPhoto[]> {
    const params: Record<string, string> = {};
    if (filters.competitionId) params['competitionId'] = filters.competitionId;
    if (filters.matchId) params['matchId'] = filters.matchId;
    return this.http.get<GalleryPhoto[]>(
      `${environment.apiUrl}/public/events/${eventId}/gallery/photos`,
      { params },
    );
  }

  /**
   * Insert Cloudinary transformations into a URL to serve an optimized
   * variant. Falls back to the original URL if it's not a Cloudinary URL.
   *
   * Example:
   *   in : https://res.cloudinary.com/x/image/upload/v1/sem/events/gallery/abc.jpg
   *   out: https://res.cloudinary.com/x/image/upload/f_auto,q_auto,w_400/v1/sem/events/gallery/abc.jpg
   */
  optimize(url: string | null | undefined, opts: { width?: number } = {}): string {
    if (!url) return '';
    if (!url.includes('/image/upload/')) return url;
    const parts = ['f_auto', 'q_auto'];
    if (opts.width) parts.push(`w_${opts.width}`);
    const transform = parts.join(',');
    return url.replace('/image/upload/', `/image/upload/${transform}/`);
  }
}
