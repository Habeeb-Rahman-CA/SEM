import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { environment } from '../../../../environments/environment';
import { WorkspaceEvent } from '../../workspaces/services/workspace.service';

export interface TemplateStageBlueprint {
  name: string;
  type: string;
  sequence: number;
  config: Record<string, any>;
}

export interface TemplateCompetitionBlueprint {
  name: string;
  sportId: string;
  pointsConfig: Array<{ position: number; label: string; points: number }> | null;
  stages: TemplateStageBlueprint[];
}

export interface EventTemplate {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  sport: string | null;
  venue: string | null;
  organizers: string | null;
  defaultRegistrationStatus: string;
  defaultIsPublic: boolean;
  competitionBlueprints: TemplateCompetitionBlueprint[] | null;
  useCount: number;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  logoUrl?: string;
  sport?: string;
  venue?: string;
  organizers?: string;
  defaultRegistrationStatus?: string;
  defaultIsPublic?: boolean;
  competitionBlueprints?: TemplateCompetitionBlueprint[];
}

export interface InstantiateTemplatePayload {
  name: string;
  startDate?: string;
  endDate?: string;
}

@Injectable({ providedIn: 'root' })
export class EventTemplateService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private baseUrl(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/event-templates`;
  }

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getTemplates(workspaceId: string): Observable<EventTemplate[]> {
    return this.http.get<EventTemplate[]>(this.baseUrl(workspaceId), {
      headers: this.headers,
    });
  }

  getTemplate(workspaceId: string, templateId: string): Observable<EventTemplate> {
    return this.http.get<EventTemplate>(`${this.baseUrl(workspaceId)}/${templateId}`, {
      headers: this.headers,
    });
  }

  createTemplate(workspaceId: string, payload: CreateTemplatePayload): Observable<EventTemplate> {
    return this.http.post<EventTemplate>(this.baseUrl(workspaceId), payload, {
      headers: this.headers,
    });
  }

  createFromEvent(workspaceId: string, eventId: string, name: string): Observable<EventTemplate> {
    return this.http.post<EventTemplate>(
      `${this.baseUrl(workspaceId)}/from-event/${eventId}`,
      { name },
      { headers: this.headers },
    );
  }

  updateTemplate(
    workspaceId: string,
    templateId: string,
    payload: Partial<CreateTemplatePayload>,
  ): Observable<EventTemplate> {
    return this.http.patch<EventTemplate>(`${this.baseUrl(workspaceId)}/${templateId}`, payload, {
      headers: this.headers,
    });
  }

  deleteTemplate(workspaceId: string, templateId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl(workspaceId)}/${templateId}`, {
      headers: this.headers,
    });
  }

  instantiateTemplate(
    workspaceId: string,
    templateId: string,
    payload: InstantiateTemplatePayload,
  ): Observable<WorkspaceEvent> {
    return this.http.post<WorkspaceEvent>(
      `${this.baseUrl(workspaceId)}/${templateId}/instantiate`,
      payload,
      { headers: this.headers },
    );
  }
}
