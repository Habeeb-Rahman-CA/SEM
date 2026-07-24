import { Component, signal, inject, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { WorkspaceService, AuditLog } from '../../services/workspace.service';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './audit-logs.html',
})
export class AuditLogsComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  private uiService = inject(UiService);

  auditLogs = signal<AuditLog[]>([]);
  isLoadingAuditLogs = signal(false);
  selectedAuditCategory = signal<string>('');

  // Output to notify parent when log count changes
  logsChanged = output<number>();

  ngOnInit() {
    this.loadAuditLogs();
  }

  loadAuditLogs() {
    this.isLoadingAuditLogs.set(true);
    const cat = this.selectedAuditCategory() || undefined;
    this.workspaceService.getAuditLogs(cat).subscribe({
      next: (logs) => {
        this.auditLogs.set(logs);
        this.isLoadingAuditLogs.set(false);
        this.logsChanged.emit(logs.length);
      },
      error: (err) => {
        console.error('Failed to load audit logs', err);
        this.isLoadingAuditLogs.set(false);
      },
    });
  }

  async onClearAuditLogs() {
    const confirmed = await this.uiService.confirm({
      title: 'Clear Audit Logs',
      message: 'Are you sure you want to clear all recorded audit logs? This action cannot be undone.',
      confirmText: 'Clear Logs',
      type: 'danger',
    });
    if (!confirmed) return;

    this.workspaceService.clearAuditLogs().subscribe({
      next: () => {
        this.auditLogs.set([]);
        this.uiService.success('Audit logs cleared successfully.');
        this.logsChanged.emit(0);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to clear audit logs.');
      },
    });
  }
}
