import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ActivityAction,
  ActivityCategory,
  ActivityLogEntry,
  FrontendActivityTimelineService,
} from '../../services/activity-timeline.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-activity-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-timeline.html',
})
export class ActivityTimelineComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private activityService = inject(FrontendActivityTimelineService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  logs = signal<ActivityLogEntry[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  searchQuery = signal('');
  categoryFilter = signal<ActivityCategory | 'all'>('all');
  actionFilter = signal<ActivityAction | 'all'>('all');

  filteredLogs = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.categoryFilter();
    const act = this.actionFilter();

    return this.logs().filter((l) => {
      if (
        q &&
        !l.actorName.toLowerCase().includes(q) &&
        !l.entityName.toLowerCase().includes(q) &&
        !(l.details ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
      if (cat !== 'all' && l.entityType !== cat) return false;
      if (act !== 'all' && l.action !== act) return false;
      return true;
    });
  });

  counts = computed(() => {
    const list = this.logs();
    return {
      total: list.length,
      created: list.filter((l) => l.action === 'created').length,
      updated: list.filter((l) => l.action === 'updated').length,
      deleted: list.filter((l) => l.action === 'deleted').length,
      approved: list.filter((l) => l.action === 'approved').length,
    };
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.workspaceId.set(id);
      if (id) this.load();
    });
  }

  load() {
    this.isLoading.set(true);
    this.error.set(null);
    this.activityService.list(this.workspaceId()).subscribe({
      next: (data) => {
        this.logs.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load activity logs');
        this.isLoading.set(false);
      },
    });
  }

  exportAuditCSV() {
    const logs = this.filteredLogs();
    if (logs.length === 0) {
      this.ui.info('No activity logs to export');
      return;
    }

    const headers = [
      'Timestamp',
      'Time',
      'Actor',
      'Role',
      'Action',
      'Category',
      'Entity',
      'Details',
    ];
    const rows = logs.map((l) => [
      l.timestamp,
      l.formattedTime,
      `"${l.actorName}"`,
      `"${l.actorRole || ''}"`,
      l.action,
      l.entityType,
      `"${l.entityName}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `activity-audit-log-${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.ui.success('Global Activity Audit Log exported to CSV!');
  }

  actionBadge(action: ActivityAction): string {
    return this.activityService.getActionBadgeClass(action);
  }

  actionIcon(action: ActivityAction): string {
    return this.activityService.getActionIcon(action);
  }

  categoryIcon(cat: ActivityCategory): string {
    return this.activityService.getCategoryIcon(cat);
  }
}
