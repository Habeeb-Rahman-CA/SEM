import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface VenueSlot {
  venueId: string;
  priority: number;
}

export interface FixtureTemplate {
  id: string;
  name: string;
  description: string | null;
  defaultKickoffTime: string | null;
  matchIntervalDays: number;
  matchesPerDay: number;
  gapBetweenMatchesMinutes: number;
  venueSlots: VenueSlot[] | null;
  venueStrategy: string;
  useCount: number;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFixtureTemplatePayload {
  name: string;
  description?: string;
  defaultKickoffTime?: string;
  matchIntervalDays?: number;
  matchesPerDay?: number;
  gapBetweenMatchesMinutes?: number;
  venueSlots?: VenueSlot[];
  venueStrategy?: string;
}

@Injectable({ providedIn: 'root' })
export class FixtureTemplateService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private baseUrl(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/fixture-templates`;
  }

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getTemplates(workspaceId: string): Observable<FixtureTemplate[]> {
    return this.http.get<FixtureTemplate[]>(this.baseUrl(workspaceId), {
      headers: this.headers,
    });
  }

  getTemplate(workspaceId: string, templateId: string): Observable<FixtureTemplate> {
    return this.http.get<FixtureTemplate>(`${this.baseUrl(workspaceId)}/${templateId}`, {
      headers: this.headers,
    });
  }

  createTemplate(
    workspaceId: string,
    payload: CreateFixtureTemplatePayload,
  ): Observable<FixtureTemplate> {
    return this.http.post<FixtureTemplate>(this.baseUrl(workspaceId), payload, {
      headers: this.headers,
    });
  }

  updateTemplate(
    workspaceId: string,
    templateId: string,
    payload: Partial<CreateFixtureTemplatePayload>,
  ): Observable<FixtureTemplate> {
    return this.http.patch<FixtureTemplate>(`${this.baseUrl(workspaceId)}/${templateId}`, payload, {
      headers: this.headers,
    });
  }

  deleteTemplate(workspaceId: string, templateId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl(workspaceId)}/${templateId}`, {
      headers: this.headers,
    });
  }
}
