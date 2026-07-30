import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export interface Venue {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  imageUrl?: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class VenueService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getVenues(workspaceId: string): Observable<Venue[]> {
    return this.http.get<Venue[]>(`${this.apiUrl}/${workspaceId}/venues`, {
      headers: this.headers,
    });
  }

  createVenue(
    workspaceId: string,
    payload: {
      name: string;
      location?: string | null;
      capacity?: number | null;
      imageUrl?: string | null;
    },
  ): Observable<Venue> {
    return this.http.post<Venue>(`${this.apiUrl}/${workspaceId}/venues`, payload, {
      headers: this.headers,
    });
  }

  updateVenue(
    workspaceId: string,
    venueId: string,
    payload: {
      name?: string;
      location?: string | null;
      capacity?: number | null;
      imageUrl?: string | null;
    },
  ): Observable<Venue> {
    return this.http.patch<Venue>(`${this.apiUrl}/${workspaceId}/venues/${venueId}`, payload, {
      headers: this.headers,
    });
  }

  removeVenue(workspaceId: string, venueId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/venues/${venueId}`, {
      headers: this.headers,
    });
  }
}
