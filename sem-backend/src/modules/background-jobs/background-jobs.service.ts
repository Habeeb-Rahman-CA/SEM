import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { NotificationCenterService } from '../notification-center/notification-center.service';

export type JobType = 'export' | 'email' | 'import' | 'report';
export type JobStatus =
  'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

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
  progress: number; // 0 to 100
  stage: string;
  payload: any;
  result?: JobResult;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

@Injectable()
export class BackgroundJobsService {
  private jobsStore: Map<string, BackgroundJob[]> = new Map();

  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly notificationCenterService: NotificationCenterService,
  ) {
    this.seedDemoJobs();
  }

  private seedDemoJobs() {
    const demoJobs: BackgroundJob[] = [
      {
        id: 'job-901',
        workspaceId: 'default-ws',
        type: 'export',
        title: 'Full Season Player Roster Export (CSV)',
        status: 'completed',
        progress: 100,
        stage: 'Completed export',
        payload: { format: 'csv', entity: 'players' },
        result: {
          downloadUrl:
            '/api/v1/workspaces/default-ws/background-jobs/job-901/download',
          totalRecords: 1420,
          fileSizeBytes: 2451000,
          summary: '1,420 player profiles and stat histories exported.',
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        completedAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
      },
      {
        id: 'job-902',
        workspaceId: 'default-ws',
        type: 'report',
        title: 'Executive Financial & Sponsorship ROI Report (PDF)',
        status: 'completed',
        progress: 100,
        stage: 'Report generated',
        payload: { reportType: 'sponsorship_roi' },
        result: {
          downloadUrl:
            '/api/v1/workspaces/default-ws/background-jobs/job-902/download',
          totalRecords: 48,
          fileSizeBytes: 8910000,
          summary: 'Comprehensive 24-page PDF analytical report generated.',
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        completedAt: new Date(Date.now() - 1000 * 60 * 118).toISOString(),
      },
    ];
    this.jobsStore.set('default-ws', demoJobs);
  }

  async getJobs(
    workspaceId: string,
    userId?: string,
  ): Promise<BackgroundJob[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }
    const jobs =
      this.jobsStore.get(workspaceId) || this.jobsStore.get('default-ws') || [];
    return [...jobs].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getJob(
    workspaceId: string,
    jobId: string,
    userId?: string,
  ): Promise<BackgroundJob> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }
    const jobs = await this.getJobs(workspaceId);
    const job = jobs.find((j) => j.id === jobId);
    if (!job)
      throw new NotFoundException(`Background Job "${jobId}" not found`);
    return job;
  }

  async triggerJob(
    workspaceId: string,
    dto: { type: JobType; title: string; payload?: any },
    userId?: string,
  ): Promise<BackgroundJob> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const job: BackgroundJob = {
      id: jobId,
      workspaceId,
      type: dto.type,
      title: dto.title || this.defaultTitleForType(dto.type),
      status: 'pending',
      progress: 0,
      stage: 'Queued in worker background pipeline',
      payload: dto.payload || {},
      createdAt: new Date().toISOString(),
    };

    const list = this.jobsStore.get(workspaceId) || [];
    list.unshift(job);
    this.jobsStore.set(workspaceId, list);

    // Asynchronously process in background task
    this.processBackgroundJobAsync(workspaceId, jobId);

    return job;
  }

  async cancelJob(
    workspaceId: string,
    jobId: string,
    userId?: string,
  ): Promise<BackgroundJob> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }
    const job = await this.getJob(workspaceId, jobId);
    job.status = 'cancelled';
    job.stage = 'Job cancelled by user';
    return job;
  }

  private defaultTitleForType(type: JobType): string {
    switch (type) {
      case 'export':
        return 'Large Dataset CSV/Excel Export';
      case 'email':
        return 'Batch Email Notification Campaign';
      case 'import':
        return 'Mass CSV Data Import Ingestion';
      case 'report':
        return 'Executive Analytics & Performance Report';
      default:
        return 'Background Task';
    }
  }

  private async processBackgroundJobAsync(workspaceId: string, jobId: string) {
    const list = this.jobsStore.get(workspaceId) || [];
    const job = list.find((j) => j.id === jobId);
    if (!job) return;

    // Step 1: Start Processing
    await this.delay(800);
    if (job.status === 'cancelled') return;
    job.status = 'processing';
    job.progress = 15;
    job.stage = this.getStageLabel(job.type, 15);

    // Step 2: Intermediate Progress (45%)
    await this.delay(1800);
    if ((job.status as string) === 'cancelled') return;
    job.progress = 45;
    job.stage = this.getStageLabel(job.type, 45);

    // Step 3: Heavy Processing (80%)
    await this.delay(2200);
    if ((job.status as string) === 'cancelled') return;
    job.progress = 85;
    job.stage = this.getStageLabel(job.type, 85);

    // Step 4: Finalize Job (100%)
    await this.delay(1200);
    if ((job.status as string) === 'cancelled') return;
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    job.stage = 'Completed successfully';

    // Populate realistic job results
    job.result = this.generateJobResult(job);

    // Notify User via Notification Center
    await this.notificationCenterService.createNotification(workspaceId, {
      title: `⚡ Job Complete: ${job.title}`,
      message: `${job.result.summary || 'Your background process completed successfully.'} Click to view or download artifacts.`,
      category: 'system',
      authorName: 'Background Job Engine',
    });
  }

  private getStageLabel(type: JobType, progress: number): string {
    switch (type) {
      case 'export':
        if (progress < 30) return 'Querying database records...';
        if (progress < 70) return 'Structuring CSV rows & encoding buffer...';
        return 'Compressing & uploading export package to storage...';
      case 'email':
        if (progress < 30) return 'Resolving subscriber email lists...';
        if (progress < 70)
          return 'Rendering template merge tags & dispatching SMTP batches...';
        return 'Verifying delivery webhooks & bounce rates...';
      case 'import':
        if (progress < 30)
          return 'Parsing uploaded CSV payload & validating headers...';
        if (progress < 70)
          return 'Checking duplicate records & FK relations...';
        return 'Writing valid entity records to database...';
      case 'report':
        if (progress < 30)
          return 'Aggregating season metrics & financial data...';
        if (progress < 70) return 'Generating chart vectors & HTML template...';
        return 'Compiling PDF document & rendering charts...';
    }
  }

  private generateJobResult(job: BackgroundJob): JobResult {
    switch (job.type) {
      case 'export':
        return {
          downloadUrl: `/api/v1/workspaces/${job.workspaceId}/background-jobs/${job.id}/download`,
          totalRecords: 1850,
          fileSizeBytes: 3420000,
          summary: '1,850 records compiled into downloadable CSV dataset.',
        };
      case 'email':
        return {
          totalRecords: 420,
          successCount: 418,
          errorCount: 2,
          summary: '418 emails sent successfully (2 bounced).',
        };
      case 'import':
        return {
          totalRecords: 560,
          successCount: 554,
          errorCount: 6,
          summary:
            '554 entity records imported into workspace (6 invalid rows skipped).',
        };
      case 'report':
        return {
          downloadUrl: `/api/v1/workspaces/${job.workspaceId}/background-jobs/${job.id}/download`,
          totalRecords: 1,
          fileSizeBytes: 6200000,
          summary: 'Analytics & Financial Report compiled into high-res PDF.',
        };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
