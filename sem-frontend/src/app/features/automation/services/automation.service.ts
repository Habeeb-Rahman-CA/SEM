import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type TriggerType =
  | 'manual'
  | 'schedule'
  | 'event_created'
  | 'event_started'
  | 'event_ended'
  | 'competition_started'
  | 'competition_ended'
  | 'match_completed';

export type ActionType =
  | 'send_notification'
  | 'generate_fixtures'
  | 'allocate_referees'
  | 'reserve_equipment'
  | 'issue_certificates'
  | 'generate_report'
  | 'archive_event';

export type RuleStatus = 'active' | 'paused' | 'error';
export type RunStatus = 'running' | 'success' | 'partial' | 'failed' | 'skipped';

export interface AutomationAction {
  type: ActionType;
  config: Record<string, any>;
  continueOnError?: boolean;
}

export interface ActionResult {
  actionType: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  data?: any;
}

export interface AutomationRule {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  triggerType: TriggerType;
  triggerConfig: Record<string, any> | null;
  conditions: Record<string, any> | null;
  actions: AutomationAction[];
  status: RuleStatus;
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'partial' | 'failed' | null;
  runCount: number;
  createdBy?: { id: string; username: string } | null;
  runs?: AutomationRun[];
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRun {
  id: string;
  workspaceId: string;
  ruleId: string;
  triggerType: TriggerType;
  triggeredById: string | null;
  startedAt: string;
  finishedAt: string | null;
  status: RunStatus;
  actionResults: ActionResult[] | null;
  errorMessage: string | null;
  triggerContext: Record<string, any> | null;
  rule?: AutomationRule;
  triggeredBy?: { id: string; username: string } | null;
  createdAt: string;
}

export interface AutomationSummary {
  totalRules: number;
  activeRules: number;
  pausedRules: number;
  totalRuns: number;
  recentRuns: number;
  failedRunsToday: number;
  scheduledRules: number;
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AutomationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getSummary(workspaceId: string): Observable<AutomationSummary> {
    return this.http.get<AutomationSummary>(`${this.apiUrl}/${workspaceId}/automation/summary`, {
      headers: this.headers,
    });
  }

  getRules(workspaceId: string): Observable<AutomationRule[]> {
    return this.http.get<AutomationRule[]>(`${this.apiUrl}/${workspaceId}/automation/rules`, {
      headers: this.headers,
    });
  }

  getRuleById(workspaceId: string, id: string): Observable<AutomationRule> {
    return this.http.get<AutomationRule>(`${this.apiUrl}/${workspaceId}/automation/rules/${id}`, {
      headers: this.headers,
    });
  }

  createRule(
    workspaceId: string,
    payload: Partial<AutomationRule> & {
      name: string;
      triggerType: TriggerType;
      actions: AutomationAction[];
    },
  ): Observable<AutomationRule> {
    return this.http.post<AutomationRule>(
      `${this.apiUrl}/${workspaceId}/automation/rules`,
      payload,
      { headers: this.headers },
    );
  }

  updateRule(
    workspaceId: string,
    id: string,
    payload: Partial<AutomationRule>,
  ): Observable<AutomationRule> {
    return this.http.patch<AutomationRule>(
      `${this.apiUrl}/${workspaceId}/automation/rules/${id}`,
      payload,
      { headers: this.headers },
    );
  }

  deleteRule(workspaceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${workspaceId}/automation/rules/${id}`, {
      headers: this.headers,
    });
  }

  runRule(
    workspaceId: string,
    id: string,
    context: Record<string, any> = {},
  ): Observable<AutomationRun> {
    return this.http.post<AutomationRun>(
      `${this.apiUrl}/${workspaceId}/automation/rules/${id}/run`,
      { context },
      { headers: this.headers },
    );
  }

  getRuns(
    workspaceId: string,
    filter: { ruleId?: string; limit?: number } = {},
  ): Observable<AutomationRun[]> {
    let params = new HttpParams();
    if (filter.ruleId) params = params.set('ruleId', filter.ruleId);
    if (filter.limit) params = params.set('limit', String(filter.limit));
    return this.http.get<AutomationRun[]>(`${this.apiUrl}/${workspaceId}/automation/runs`, {
      headers: this.headers,
      params,
    });
  }
}
