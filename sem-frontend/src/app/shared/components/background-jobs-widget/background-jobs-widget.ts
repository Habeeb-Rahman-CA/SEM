import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackgroundJobsService, JobType } from '../../../core/services/background-jobs.service';

@Component({
  selector: 'app-background-jobs-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './background-jobs-widget.html',
})
export class BackgroundJobsWidgetComponent implements OnInit {
  jobsService = inject(BackgroundJobsService);

  ngOnInit() {
    this.jobsService.fetchJobs().subscribe();
  }

  toggleDrawer() {
    if (this.jobsService.showJobsDrawer()) {
      this.jobsService.closeDrawer();
    } else {
      this.jobsService.openDrawer();
    }
  }

  triggerQuickJob(type: JobType) {
    let title = '';
    let payload = {};

    switch (type) {
      case 'export':
        title = 'Export 1,850 Workspace Players & Rosters (CSV)';
        payload = { format: 'csv', entity: 'players' };
        break;
      case 'email':
        title = 'Batch Season Pass Notification Email Dispatch';
        payload = { recipients: 'all_teams' };
        break;
      case 'import':
        title = 'Bulk Import CSV Player Data Ingestion';
        payload = { source: 'rosters_2026.csv' };
        break;
      case 'report':
        title = 'Generate Executive Financial & Tournament Analytics PDF';
        payload = { type: 'financial_roi' };
        break;
    }

    this.jobsService.dispatchJob('default-ws', type, title, payload).subscribe();
  }

  download(jobId: string) {
    this.jobsService.downloadJobArtifact('default-ws', jobId);
  }

  cancel(jobId: string) {
    this.jobsService.cancelJob('default-ws', jobId).subscribe();
  }

  getJobIcon(type: JobType): string {
    switch (type) {
      case 'export':
        return 'fi fi-rr-file-export';
      case 'email':
        return 'fi fi-rr-envelope';
      case 'import':
        return 'fi fi-rr-file-import';
      case 'report':
        return 'fi fi-rr-chart-histogram';
      default:
        return 'fi fi-rr-time-fast';
    }
  }
}
