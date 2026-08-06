import { Injectable, signal, computed, inject } from '@angular/core';
import { UiService } from './ui.service';
import { ActivityFeedService } from './activity-feed.service';

export interface TrashItem {
  id: string;
  entityType: 'team' | 'player' | 'workspace' | 'certificate' | 'form' | 'document' | 'match';
  entityId: string;
  workspaceId?: string | null;
  title: string;
  subtitle: string;
  deletedAt: string;
  deletedBy: string;
  data: any; // Full entity snapshot for 100% accurate restoration
}

@Injectable({
  providedIn: 'root',
})
export class RecycleBinService {
  private ui = inject(UiService);
  private activityFeed = inject(ActivityFeedService);

  private trashListSignal = signal<TrashItem[]>([]);
  isOpen = signal<boolean>(false);
  currentWorkspaceId = signal<string | null>(null);

  // Compute workspace-isolated trash items
  trashItems = computed(() => {
    const all = this.trashListSignal();
    const wsId = this.currentWorkspaceId();
    if (!wsId) return all; // Global fallback if no active workspace selected
    return all.filter((item) => !item.workspaceId || item.workspaceId === wsId);
  });

  trashCount = computed(() => this.trashItems().length);

  constructor() {
    this.loadFromStorage();
  }

  setWorkspaceContext(workspaceId: string | null) {
    this.currentWorkspaceId.set(workspaceId);
  }

  private loadFromStorage() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('sem_recycle_bin');
      if (saved) {
        try {
          this.trashListSignal.set(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse recycle bin storage', e);
        }
      }
    }
  }

  private saveToStorage(items: TrashItem[]) {
    this.trashListSignal.set(items);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sem_recycle_bin', JSON.stringify(items));
    }
  }

  openRecycleBin(workspaceId?: string) {
    if (workspaceId) {
      this.currentWorkspaceId.set(workspaceId);
    }
    this.isOpen.set(true);
  }

  closeRecycleBin() {
    this.isOpen.set(false);
  }

  toggleRecycleBin() {
    this.isOpen.update((v) => !v);
  }

  // Soft Delete record and add to Recycle Bin with Workspace Isolation
  moveToTrash(
    entityType: TrashItem['entityType'],
    entityId: string,
    title: string,
    subtitle: string,
    data: any,
    workspaceId?: string | null,
  ): TrashItem {
    const wsId = workspaceId ?? this.currentWorkspaceId();
    const item: TrashItem = {
      id: 'trash_' + Math.random().toString(36).substring(2, 9),
      entityType,
      entityId,
      workspaceId: wsId,
      title,
      subtitle,
      deletedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      deletedBy: 'Current Admin User',
      data,
    };

    const updated = [item, ...this.trashListSignal()];
    this.saveToStorage(updated);

    this.activityFeed.logActivity(
      entityType === 'team' || entityType === 'player' ? 'team' : 'file',
      `Moved ${title} to Recycle Bin`,
      `Record ID #${entityId} soft-deleted from workspace ${wsId || 'global'}.`,
      'Current Admin User',
    );

    this.ui.showUndo(
      `Moved "${title}" to Recycle Bin`,
      () => {
        this.restoreItem(item.id);
      },
      8000,
    );

    return item;
  }

  // Restore item from Recycle Bin
  restoreItem(trashId: string): TrashItem | null {
    const current = this.trashListSignal();
    const item = current.find((i) => i.id === trashId);
    if (!item) return null;

    const filtered = current.filter((i) => i.id !== trashId);
    this.saveToStorage(filtered);

    this.activityFeed.logActivity(
      'milestone',
      `Restored ${item.title} from Recycle Bin`,
      `Record ID #${item.entityId} fully restored to system.`,
      'Current Admin User',
    );

    this.ui.success(`Restored "${item.title}" successfully!`);
    return item;
  }

  // Permanently delete item
  permanentlyDelete(trashId: string) {
    const current = this.trashListSignal();
    const item = current.find((i) => i.id === trashId);
    const filtered = current.filter((i) => i.id !== trashId);
    this.saveToStorage(filtered);

    if (item) {
      this.ui.info(`Permanently deleted "${item.title}"`);
    }
  }

  // Empty Recycle Bin for current active workspace
  emptyTrash() {
    const wsId = this.currentWorkspaceId();
    if (!wsId) {
      this.saveToStorage([]);
    } else {
      const current = this.trashListSignal();
      const filtered = current.filter((i) => i.workspaceId && i.workspaceId !== wsId);
      this.saveToStorage(filtered);
    }
    this.ui.info('Recycle Bin emptied for current workspace');
  }
}
