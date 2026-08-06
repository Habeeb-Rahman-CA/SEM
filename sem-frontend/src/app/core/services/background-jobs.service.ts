import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, interval, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UiService } from './ui.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';

export type JobType = 'export' | 'email' | 'import' | 'report';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface JobResult {
  downloadUrl?: string;
  totalRecords?: number;
  successCount?: number;
  errorCount?: number;
  summary?: string;
  fileSizeBytes?: number;
}

export interface BackgroundJob {
  id: string;
  workspaceId: string;
  type: JobType;
  title: string;
  status: JobStatus;
  progress: number;
  stage: string;
  payload: any;
  result?: JobResult;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BackgroundJobsService {
  private http = inject(HttpClient);
  private ui = inject(UiService);
  private authService = inject(AuthService);

  // Reactive signals
  jobs = signal<BackgroundJob[]>([]);
  showJobsDrawer = signal<boolean>(false);

  runningCount = computed(
    () => this.jobs().filter((j) => j.status === 'processing' || j.status === 'pending').length,
  );
  completedJobs = computed(() => this.jobs().filter((j) => j.status === 'completed'));

  private pollSub?: Subscription;
  private lastKnownCompleted = new Set<string>();

  constructor() {
    this.startPollingIfActive();
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  fetchJobs(workspaceId: string = 'default-ws'): Observable<{ jobs: BackgroundJob[] }> {
    const url = `${environment.apiUrl}/workspaces/${workspaceId}/background-jobs`;
    return this.http.get<{ jobs: BackgroundJob[] }>(url, { headers: this.getHeaders() }).pipe(
      tap((res) => {
        const fetched = res.jobs || [];

        // Check for freshly completed jobs to show toasts
        for (const job of fetched) {
          if (job.status === 'completed' && !this.lastKnownCompleted.has(job.id)) {
            this.lastKnownCompleted.add(job.id);
            this.ui.success(`🎉 Background Job Finished: "${job.title}"`);
          }
        }

        this.jobs.set(fetched);
        this.startPollingIfActive(workspaceId);
      }),
      catchError(() => of({ jobs: [] })),
    );
  }

  dispatchJob(
    workspaceId: string,
    type: JobType,
    title: string,
    payload?: any,
  ): Observable<{ job: BackgroundJob; message: string }> {
    const url = `${environment.apiUrl}/workspaces/${workspaceId}/background-jobs/trigger`;
    const dto = { type, title, payload };

    this.ui.info(`🚀 Background job queued: "${title}". Processing in background...`);

    return this.http
      .post<{ job: BackgroundJob; message: string }>(url, dto, { headers: this.getHeaders() })
      .pipe(
        tap((res) => {
          if (res.job) {
            const list = [res.job, ...this.jobs()];
            this.jobs.set(list);
            this.startPollingIfActive(workspaceId);
          }
        }),
      );
  }

  triggerJob(
    workspaceId: string,
    type: JobType,
    title: string,
    payload?: any,
  ): Observable<{ job: BackgroundJob; message: string }> {
    return this.dispatchJob(workspaceId, type, title, payload);
  }

  cancelJob(workspaceId: string, jobId: string): Observable<any> {
    const url = `${environment.apiUrl}/workspaces/${workspaceId}/background-jobs/${jobId}`;
    return this.http.delete(url, { headers: this.getHeaders() }).pipe(
      tap(() => {
        this.fetchJobs(workspaceId).subscribe();
        this.ui.warning('Job cancelled.');
      }),
    );
  }

  downloadJobArtifact(workspaceId: string, jobId: string) {
    const url = `${environment.apiUrl}/workspaces/${workspaceId}/background-jobs/${jobId}/download`;
    window.open(url, '_blank');
  }

  openDrawer() {
    this.showJobsDrawer.set(true);
  }

  closeDrawer() {
    this.showJobsDrawer.set(false);
  }

  private startPollingIfActive(workspaceId: string = 'default-ws') {
    if (this.pollSub && !this.pollSub.closed) return;

    if (this.runningCount() > 0) {
      this.pollSub = interval(2500).subscribe(() => {
        this.fetchJobs(workspaceId).subscribe();
        if (this.runningCount() === 0 && this.pollSub) {
          this.pollSub.unsubscribe();
        }
      });
    }
  }
}
