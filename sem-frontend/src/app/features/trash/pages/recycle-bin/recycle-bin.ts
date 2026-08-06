import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FrontendTrashService, TrashedItem, TrashedItemType } from '../../services/trash.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-recycle-bin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recycle-bin.html',
})
export class RecycleBinComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private trashService = inject(FrontendTrashService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  items = signal<TrashedItem[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  searchQuery = signal('');
  typeFilter = signal<TrashedItemType | 'all'>('all');

  filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const type = this.typeFilter();

    return this.items().filter((item) => {
      if (
        q &&
        !item.itemName.toLowerCase().includes(q) &&
        !item.deletedBy.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (type !== 'all' && item.itemType !== type) return false;
      return true;
    });
  });

  counts = computed(() => {
    const list = this.items();
    return {
      total: list.length,
      teams: list.filter((i) => i.itemType === 'team').length,
      players: list.filter((i) => i.itemType === 'player').length,
      events: list.filter((i) => i.itemType === 'event').length,
      venues: list.filter((i) => i.itemType === 'venue').length,
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
    this.trashService.list(this.workspaceId()).subscribe({
      next: (list) => {
        this.items.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load Recycle Bin items');
        this.isLoading.set(false);
      },
    });
  }

  restoreItem(item: TrashedItem) {
    this.trashService.restore(this.workspaceId(), item.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((i) => i.id !== item.id));
        this.ui.success(`Restored "${item.itemName}" back to workspace!`);
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to restore item');
      },
    });
  }

  purgeItem(item: TrashedItem) {
    this.ui
      .confirm({
        title: 'Permanently Delete Item?',
        message: `Are you sure you want to permanently delete "${item.itemName}"? This action cannot be undone.`,
        confirmText: 'Delete Permanently',
        type: 'danger',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.trashService.purge(this.workspaceId(), item.id).subscribe({
            next: () => {
              this.items.update((list) => list.filter((i) => i.id !== item.id));
              this.ui.success(`Permanently deleted "${item.itemName}".`);
            },
            error: (err) => {
              this.ui.error(err?.error?.message ?? 'Failed to purge item');
            },
          });
        }
      });
  }

  emptyTrash() {
    if (this.items().length === 0) {
      this.ui.info('Recycle bin is already empty.');
      return;
    }

    this.ui
      .confirm({
        title: 'Empty Entire Recycle Bin?',
        message:
          'This will permanently delete all soft-deleted items in this workspace. This action CANNOT be undone.',
        confirmText: 'Empty Trash Now',
        type: 'danger',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.trashService.empty(this.workspaceId()).subscribe({
            next: (res) => {
              this.items.set([]);
              this.ui.success(`Purged ${res.purgedCount} items permanently.`);
            },
            error: (err) => {
              this.ui.error(err?.error?.message ?? 'Failed to empty recycle bin');
            },
          });
        }
      });
  }

  itemIcon(type: TrashedItemType): string {
    return this.trashService.getItemIcon(type);
  }

  itemBadge(type: TrashedItemType): string {
    return this.trashService.getItemBadgeClass(type);
  }
}
