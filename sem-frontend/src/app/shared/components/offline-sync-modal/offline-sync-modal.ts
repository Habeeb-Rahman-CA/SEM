import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';

@Component({
  selector: 'app-offline-sync-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offline-sync-modal.html',
})
export class OfflineSyncModalComponent {
  syncService = inject(OfflineSyncService);

  activeTab = signal<'queue' | 'history'>('queue');
  selectedItem = signal<any | null>(null);

  close() {
    this.syncService.closeQueueInspector();
  }

  triggerSync() {
    this.syncService.syncPendingOperations().subscribe();
  }

  removeItem(id: string) {
    this.syncService.removeItem(id);
    if (this.selectedItem()?.id === id) {
      this.selectedItem.set(null);
    }
  }

  clearQueue() {
    this.syncService.clearAll();
    this.selectedItem.set(null);
  }

  selectItem(item: any) {
    this.selectedItem.set(item);
  }
}
