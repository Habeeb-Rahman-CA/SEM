import { Component, signal, inject, OnInit, output } from '@angular/core';
import { WorkspaceService, SystemMetrics } from '../../services/workspace.service';

@Component({
  selector: 'app-system-health',
  standalone: true,
  templateUrl: './system-health.html',
})
export class SystemHealthComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);

  systemMetrics = signal<SystemMetrics | null>(null);
  isLoadingMetrics = signal(false);

  // Output to update uptime/status in the parent dashboard summary if needed
  metricsLoaded = output<string>();

  ngOnInit() {
    this.loadSystemMetrics();
  }

  loadSystemMetrics() {
    this.isLoadingMetrics.set(true);
    this.workspaceService.getSystemMetrics().subscribe({
      next: (metrics) => {
        this.systemMetrics.set(metrics);
        this.isLoadingMetrics.set(false);
        if (metrics.uptimeFormatted) {
          this.metricsLoaded.emit(metrics.uptimeFormatted);
        }
      },
      error: (err) => {
        console.error('Failed to load system metrics', err);
        this.isLoadingMetrics.set(false);
      },
    });
  }
}
