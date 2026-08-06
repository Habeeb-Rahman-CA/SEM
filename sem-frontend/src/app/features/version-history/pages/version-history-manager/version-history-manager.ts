import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FrontendVersionHistoryService,
  VersionRecord,
} from '../../services/version-history.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-version-history-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './version-history-manager.html',
})
export class VersionHistoryManagerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private versionService = inject(FrontendVersionHistoryService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  versions = signal<VersionRecord[]>([]);
  selectedVersion = signal<VersionRecord | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // New Version Modal State
  createVersionModalOpen = signal<boolean>(false);
  newSummaryInput = signal('');
  newAuthorInput = signal('');

  latestVersion = computed(() => {
    const list = this.versions();
    return list.length > 0 ? list[0] : null;
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
    this.versionService.listVersions(this.workspaceId()).subscribe({
      next: (list) => {
        this.versions.set(list);
        if (list.length > 0) {
          this.selectedVersion.set(list[0]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load version history');
        this.isLoading.set(false);
      },
    });
  }

  selectVersion(ver: VersionRecord) {
    this.selectedVersion.set(ver);
  }

  restoreVersion(ver: VersionRecord) {
    this.ui
      .confirm({
        title: `Restore Version ${ver.versionNumber}?`,
        message: `Are you sure you want to revert to Version ${ver.versionNumber}? A new version checkpoint will be created.`,
        confirmText: `Restore Version ${ver.versionNumber}`,
        type: 'warning',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.versionService
            .restoreVersion(this.workspaceId(), ver.entityId, ver.versionNumber)
            .subscribe({
              next: (res) => {
                this.ui.success(
                  `Successfully restored Version ${ver.versionNumber}! Created Version ${res.newCheckpoint.versionNumber}.`,
                );
                this.load();
              },
              error: (err) => {
                this.ui.error(err?.error?.message ?? 'Failed to restore version');
              },
            });
        }
      });
  }

  openCreateVersionModal() {
    this.createVersionModalOpen.set(true);
  }

  closeCreateVersionModal() {
    this.createVersionModalOpen.set(false);
  }

  submitNewVersion() {
    const summary = this.newSummaryInput().trim();
    if (!summary) {
      this.ui.error('Please enter a change summary for the new version snapshot.');
      return;
    }

    const payload = {
      entityType: 'event_rulebook' as const,
      entityId: 'rulebook-2026',
      changeSummary: summary,
      authorName: this.newAuthorInput().trim() || 'Workspace Admin',
      snapshotData: {
        title: 'Summer Championship 2026 Rulebook (Custom Checkpoint)',
        maxPlayersPerRoster: 24,
        matchDurationMinutes: 90,
        substitutionLimit: 7,
        overtimePolicy: 'Extra Time 15m then Penalty Shootout',
        varEnabled: true,
        prizePoolUSD: 75000,
        customNotes: summary,
      },
    };

    this.versionService.createVersion(this.workspaceId(), payload).subscribe({
      next: (created) => {
        this.ui.success(`Created Version ${created.versionNumber} snapshot!`);
        this.closeCreateVersionModal();
        this.newSummaryInput.set('');
        this.newAuthorInput.set('');
        this.load();
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to create version snapshot');
      },
    });
  }
}
