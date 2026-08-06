import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type WorkflowStage = 'draft' | 'review' | 'approve' | 'publish';
export type WorkflowStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'published';
export type WorkflowModuleType =
  'events' | 'registrations' | 'sponsorships' | 'equipment' | 'rules';

export interface WorkflowTransitionLog {
  fromStage: WorkflowStage;
  toStage: WorkflowStage;
  action: 'submit' | 'approve' | 'reject' | 'publish';
  actorName: string;
  comment?: string;
  timestamp: string;
}

export interface WorkflowItem {
  id: string;
  workspaceId: string;
  module: WorkflowModuleType;
  itemName: string;
  itemRefId: string;
  currentStage: WorkflowStage;
  status: WorkflowStatus;
  authorName: string;
  reviewerName: string;
  approverName: string;
  comments?: string;
  history: WorkflowTransitionLog[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FrontendWorkflowBuilderService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private wsBase(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/workflows`;
  }

  listWorkflows(workspaceId: string): Observable<WorkflowItem[]> {
    return this.http.get<WorkflowItem[]>(this.wsBase(workspaceId), {
      headers: this.authHeaders,
    });
  }

  createWorkflow(
    workspaceId: string,
    payload: {
      module: WorkflowModuleType;
      itemName: string;
      itemRefId: string;
      authorName?: string;
      reviewerName?: string;
      approverName?: string;
    },
  ): Observable<WorkflowItem> {
    return this.http.post<WorkflowItem>(this.wsBase(workspaceId), payload, {
      headers: this.authHeaders,
    });
  }

  transitionWorkflow(
    workspaceId: string,
    id: string,
    action: 'submit' | 'approve' | 'reject' | 'publish',
    actorName?: string,
    comment?: string,
  ): Observable<WorkflowItem> {
    return this.http.post<WorkflowItem>(
      `${this.wsBase(workspaceId)}/${id}/transition`,
      { action, actorName, comment },
      { headers: this.authHeaders },
    );
  }

  getModuleBadgeClass(mod: WorkflowModuleType): string {
    switch (mod) {
      case 'events':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'registrations':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'sponsorships':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'equipment':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  }

  getStageBadgeClass(stage: WorkflowStage, status: WorkflowStatus): string {
    if (status === 'rejected') return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    switch (stage) {
      case 'draft':
        return 'bg-slate-800 text-slate-300 border-white/10';
      case 'review':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'approve':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'publish':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-white/10';
    }
  }
}
