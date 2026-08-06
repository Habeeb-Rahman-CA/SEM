import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type WidgetType = 'weather' | 'calendar' | 'activity' | 'statistics' | 'tasks' | 'charts';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: 'half' | 'full';
  order: number;
  visible: boolean;
  config?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class FrontendCustomDashboardService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private wsBase(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/custom-dashboard`;
  }

  getLayout(workspaceId: string): Observable<DashboardWidget[]> {
    return this.http.get<DashboardWidget[]>(this.wsBase(workspaceId), {
      headers: this.authHeaders,
    });
  }

  saveLayout(workspaceId: string, widgets: DashboardWidget[]): Observable<DashboardWidget[]> {
    return this.http.post<DashboardWidget[]>(
      this.wsBase(workspaceId),
      { widgets },
      { headers: this.authHeaders },
    );
  }

  resetLayout(workspaceId: string): Observable<DashboardWidget[]> {
    return this.http.post<DashboardWidget[]>(
      `${this.wsBase(workspaceId)}/reset`,
      {},
      { headers: this.authHeaders },
    );
  }

  getWidgetIcon(type: WidgetType): string {
    switch (type) {
      case 'weather':
        return 'fi fi-rr-cloud-sun';
      case 'calendar':
        return 'fi fi-rr-calendar';
      case 'activity':
        return 'fi fi-rr-time-past';
      case 'statistics':
        return 'fi fi-rr-stats';
      case 'tasks':
        return 'fi fi-rr-checkbox';
      case 'charts':
        return 'fi fi-rr-chart-histogram';
      default:
        return 'fi fi-rr-apps';
    }
  }

  getWidgetBadgeClass(type: WidgetType): string {
    switch (type) {
      case 'weather':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'calendar':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'activity':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'statistics':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      case 'tasks':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'charts':
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  }
}
