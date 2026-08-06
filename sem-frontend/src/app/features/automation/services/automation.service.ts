import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type TriggerType =
  | 'manual'
  | 'schedule'
  | 'payment_completed'
  | 'payment_failed'
  | 'form_submitted'
  | 'workflow_approved'
  | 'workflow_rejected'
  | 'event_created'
  | 'event_started'
  | 'event_ended'
  | 'competition_started'
  | 'competition_ended'
  | 'match_completed'
  | 'transfer_requested'
  | 'equipment_booking_requested'
  | 'accreditation_granted';

export type ActionType =
  | 'send_notification'
  | 'generate_invoice'
  | 'send_email'
  | 'notify_admin'
  | 'send_webhook'
  | 'generate_fixtures'
  | 'allocate_referees'
  | 'reserve_equipment'
  | 'issue_certificates'
  | 'generate_report'
  | 'auto_grant_accreditation'
  | 'trigger_workflow_stage'
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

export interface TriggerMeta {
  type: TriggerType;
  label: string;
  icon: string;
  category: string;
  description: string;
}

export interface ActionMeta {
  type: ActionType;
  label: string;
  icon: string;
  category: string;
  description: string;
  configTemplate: Record<string, any>;
}

export const TRIGGER_CATALOG: TriggerMeta[] = [
  {
    type: 'manual',
    label: 'Manual / On Demand',
    icon: 'fi-rr-hand',
    category: 'General',
    description: 'Triggered manually from the UI or API.',
  },
  {
    type: 'schedule',
    label: 'Scheduled (Cron)',
    icon: 'fi-rr-clock',
    category: 'General',
    description: 'Fires on a cron schedule. Set cron expression in config.',
  },
  {
    type: 'payment_completed',
    label: 'Payment Completed',
    icon: 'fi-rr-credit-card',
    category: 'Finance',
    description: 'Fires when a payment is successfully processed.',
  },
  {
    type: 'payment_failed',
    label: 'Payment Failed',
    icon: 'fi-rr-ban',
    category: 'Finance',
    description: 'Fires when a payment attempt fails.',
  },
  {
    type: 'form_submitted',
    label: 'Form Submitted',
    icon: 'fi-rr-document',
    category: 'Forms',
    description: 'Fires when a dynamic form is submitted.',
  },
  {
    type: 'workflow_approved',
    label: 'Workflow Approved',
    icon: 'fi-rr-check',
    category: 'Workflow',
    description: 'Fires when a workflow item reaches the Approved stage.',
  },
  {
    type: 'workflow_rejected',
    label: 'Workflow Rejected',
    icon: 'fi-rr-cross-circle',
    category: 'Workflow',
    description: 'Fires when a workflow item is rejected.',
  },
  {
    type: 'event_created',
    label: 'Event Created',
    icon: 'fi-rr-calendar-plus',
    category: 'Events',
    description: 'Fires when a new event is created.',
  },
  {
    type: 'event_started',
    label: 'Event Started',
    icon: 'fi-rr-play',
    category: 'Events',
    description: 'Fires when an event transitions to started.',
  },
  {
    type: 'event_ended',
    label: 'Event Ended',
    icon: 'fi-rr-flag-checkered',
    category: 'Events',
    description: 'Fires when an event ends or is completed.',
  },
  {
    type: 'competition_started',
    label: 'Competition Started',
    icon: 'fi-rr-trophy',
    category: 'Competitions',
    description: 'Fires when a competition goes live.',
  },
  {
    type: 'competition_ended',
    label: 'Competition Ended',
    icon: 'fi-rr-medal',
    category: 'Competitions',
    description: 'Fires when a competition concludes.',
  },
  {
    type: 'match_completed',
    label: 'Match Completed',
    icon: 'fi-rr-whistle',
    category: 'Competitions',
    description: 'Fires when a match result is recorded.',
  },
  {
    type: 'transfer_requested',
    label: 'Transfer Requested',
    icon: 'fi-rr-arrows-repeat',
    category: 'Players',
    description: 'Fires when a player transfer request is submitted.',
  },
  {
    type: 'equipment_booking_requested',
    label: 'Equipment Booking Requested',
    icon: 'fi-rr-box-alt',
    category: 'Equipment',
    description: 'Fires when new equipment booking is requested.',
  },
  {
    type: 'accreditation_granted',
    label: 'Accreditation Granted',
    icon: 'fi-rr-id-badge',
    category: 'Accreditation',
    description: 'Fires when accreditation is granted to a user.',
  },
];

export const ACTION_CATALOG: ActionMeta[] = [
  {
    type: 'send_notification',
    label: 'Send In-App Notification',
    icon: 'fi-rr-bell',
    category: 'Notify',
    description: 'Push an in-app notification to a list of users.',
    configTemplate: { title: 'Automated Notification', message: 'An event occurred.', userIds: [] },
  },
  {
    type: 'send_email',
    label: 'Send Email',
    icon: 'fi-rr-envelope',
    category: 'Notify',
    description: 'Dispatch an email to a target address using a template.',
    configTemplate: {
      to: 'user@example.com',
      subject: 'Notification',
      template: 'default_notification',
    },
  },
  {
    type: 'notify_admin',
    label: 'Notify Admin Team',
    icon: 'fi-rr-shield-check',
    category: 'Notify',
    description: 'Send a high-priority alert to workspace administrators.',
    configTemplate: { title: 'Admin Alert', message: 'Action required.' },
  },
  {
    type: 'send_webhook',
    label: 'Send Webhook (HTTP)',
    icon: 'fi-rr-share',
    category: 'Integrations',
    description: 'POST data to any external URL (Slack, Discord, custom APIs, etc).',
    configTemplate: {
      url: 'https://hooks.example.com/webhook',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { event: '{{triggerType}}' },
    },
  },
  {
    type: 'generate_invoice',
    label: 'Generate Invoice',
    icon: 'fi-rr-receipt',
    category: 'Finance',
    description: 'Create an automated invoice record linked to a payment.',
    configTemplate: { paymentAmount: 100.0, currency: 'USD', customerEmail: '' },
  },
  {
    type: 'generate_fixtures',
    label: 'Generate Fixtures',
    icon: 'fi-rr-calendar',
    category: 'Competitions',
    description: 'Auto-generate competition fixtures using a fixture template.',
    configTemplate: { eventId: '', competitionId: '', fixtureTemplateId: null },
  },
  {
    type: 'allocate_referees',
    label: 'Allocate Referees',
    icon: 'fi-rr-whistle',
    category: 'Competitions',
    description: 'Auto-assign referees to unassigned matches.',
    configTemplate: { competitionId: '', strategy: 'round_robin' },
  },
  {
    type: 'reserve_equipment',
    label: 'Reserve Equipment',
    icon: 'fi-rr-box-alt',
    category: 'Equipment',
    description: 'Create equipment bookings for a time window.',
    configTemplate: {
      equipmentIds: [],
      eventId: '',
      startAt: '',
      endAt: '',
      notes: 'Auto-reserved',
    },
  },
  {
    type: 'issue_certificates',
    label: 'Issue Certificates',
    icon: 'fi-rr-diploma',
    category: 'Certificates',
    description: 'Queue certificate generation for event participants or winners.',
    configTemplate: { eventId: '', template: 'default' },
  },
  {
    type: 'generate_report',
    label: 'Generate Report',
    icon: 'fi-rr-chart-histogram',
    category: 'Reports',
    description: 'Compile and queue a report for an event or workspace.',
    configTemplate: { eventId: '', reportType: 'summary', format: 'pdf' },
  },
  {
    type: 'auto_grant_accreditation',
    label: 'Auto-Grant Accreditation',
    icon: 'fi-rr-id-badge',
    category: 'Accreditation',
    description: 'Automatically grant an accreditation role to a list of users.',
    configTemplate: { userIds: [], role: 'participant', eventId: '' },
  },
  {
    type: 'trigger_workflow_stage',
    label: 'Advance Workflow Stage',
    icon: 'fi-rr-workflow',
    category: 'Workflow',
    description: 'Move a workflow item to a specific pipeline stage.',
    configTemplate: { workflowItemId: '', targetStage: 'review' },
  },
  {
    type: 'archive_event',
    label: 'Archive Event',
    icon: 'fi-rr-archive',
    category: 'Events',
    description: 'Mark an event as archived.',
    configTemplate: { eventId: '' },
  },
];

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
