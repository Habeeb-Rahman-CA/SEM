import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offline-banner.html',
})
export class OfflineBannerComponent {
  syncService = inject(OfflineSyncService);

  triggerSync() {
    this.syncService.syncPendingOperations().subscribe();
  }

  openInspector() {
    this.syncService.openQueueInspector();
  }
}
