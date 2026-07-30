import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface CompetitionTemplateStage {
  name: string;
  type: string;
  sequence: number;
  config: Record<string, any>;
}

export interface CompetitionTemplate {
  id: string;
  name: string;
  description: string | null;
  sportId: string | null;
  pointsConfig: Array<{ position: number; label: string; points: number }> | null;
  stageBlueprints: CompetitionTemplateStage[] | null;
  useCount: number;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompetitionTemplatePayload {
  name: string;
  description?: string;
  sportId?: string;
  pointsConfig?: Array<{ position: number; label: string; points: number }>;
  stageBlueprints?: CompetitionTemplateStage[];
}

@Injectable({ providedIn: 'root' })
export class CompetitionTemplateService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private baseUrl(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/competition-templates`;
  }

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getTemplates(workspaceId: string): Observable<CompetitionTemplate[]> {
    return this.http.get<CompetitionTemplate[]>(this.baseUrl(workspaceId), {
      headers: this.headers,
    });
  }

  getTemplate(workspaceId: string, templateId: string): Observable<CompetitionTemplate> {
    return this.http.get<CompetitionTemplate>(`${this.baseUrl(workspaceId)}/${templateId}`, {
      headers: this.headers,
    });
  }

  createTemplate(
    workspaceId: string,
    payload: CreateCompetitionTemplatePayload,
  ): Observable<CompetitionTemplate> {
    return this.http.post<CompetitionTemplate>(this.baseUrl(workspaceId), payload, {
      headers: this.headers,
    });
  }

  createFromCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    name: string,
  ): Observable<CompetitionTemplate> {
    return this.http.post<CompetitionTemplate>(
      `${this.baseUrl(workspaceId)}/from-competition/${eventId}/${competitionId}`,
      { name },
      { headers: this.headers },
    );
  }

  updateTemplate(
    workspaceId: string,
    templateId: string,
    payload: Partial<CreateCompetitionTemplatePayload>,
  ): Observable<CompetitionTemplate> {
    return this.http.patch<CompetitionTemplate>(
      `${this.baseUrl(workspaceId)}/${templateId}`,
      payload,
      {
        headers: this.headers,
      },
    );
  }

  deleteTemplate(workspaceId: string, templateId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl(workspaceId)}/${templateId}`, {
      headers: this.headers,
    });
  }

  applyToCompetition(
    workspaceId: string,
    templateId: string,
    eventId: string,
    competitionId: string,
  ): Observable<{ competitionId: string; stagesCreated: number }> {
    return this.http.post<{ competitionId: string; stagesCreated: number }>(
      `${this.baseUrl(workspaceId)}/${templateId}/apply/${eventId}/${competitionId}`,
      {},
      { headers: this.headers },
    );
  }
}
