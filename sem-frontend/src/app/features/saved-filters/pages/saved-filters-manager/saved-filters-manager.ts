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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FilterCategory,
  FrontendSavedFilterService,
  SavedFilterItem,
} from '../../services/saved-filter.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-saved-filters-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './saved-filters-manager.html',
})
export class SavedFiltersManagerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private filterService = inject(FrontendSavedFilterService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  filters = signal<SavedFilterItem[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // New Custom Filter Modal
  createModalOpen = signal<boolean>(false);
  newFilterName = signal<string>('');
  newFilterCategory = signal<FilterCategory>('events');
  newFilterIcon = signal<string>('fi fi-rr-filter');
  newFilterColor = signal<string>('violet');
  newFilterParamKey = signal<string>('status');
  newFilterParamVal = signal<string>('active');

  searchQuery = signal('');
  categoryFilter = signal<FilterCategory | 'all'>('all');

  filteredFilters = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.categoryFilter();

    return this.filters().filter((f) => {
      if (q && !f.name.toLowerCase().includes(q)) {
        return false;
      }
      if (cat !== 'all' && f.targetCategory !== cat) return false;
      return true;
    });
  });

  counts = computed(() => {
    const list = this.filters();
    return {
      total: list.length,
      presets: list.filter((f) => f.isPreset).length,
      custom: list.filter((f) => !f.isPreset).length,
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
    this.filterService.list(this.workspaceId()).subscribe({
      next: (list) => {
        this.filters.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load saved filters');
        this.isLoading.set(false);
      },
    });
  }

  applyFilter(filter: SavedFilterItem) {
    this.ui.success(`1-Click Filter Applied: "${filter.name}"!`);

    // Navigate to respective feature section with filter state
    switch (filter.targetCategory) {
      case 'events':
        this.router.navigate(['/events'], { queryParams: filter.criteria });
        break;
      case 'matches':
        this.router.navigate(['/live'], { queryParams: filter.criteria });
        break;
      case 'registrations':
        this.router.navigate(['/workspaces', this.workspaceId()], { queryParams: filter.criteria });
        break;
      case 'payments':
        this.router.navigate(['/workspaces', this.workspaceId(), 'finance'], {
          queryParams: filter.criteria,
        });
        break;
      default:
        this.router.navigate(['/workspaces', this.workspaceId()]);
        break;
    }
  }

  openCreateModal() {
    this.newFilterName.set('');
    this.createModalOpen.set(true);
  }

  closeCreateModal() {
    this.createModalOpen.set(false);
  }

  saveCustomFilter() {
    const name = this.newFilterName().trim();
    if (!name) {
      this.ui.warning('Please enter a name for your custom filter.');
      return;
    }

    const criteria: Record<string, any> = {};
    if (this.newFilterParamKey().trim()) {
      criteria[this.newFilterParamKey().trim()] = this.newFilterParamVal().trim();
    }

    this.filterService
      .create(this.workspaceId(), {
        name,
        targetCategory: this.newFilterCategory(),
        icon: this.newFilterIcon(),
        color: this.newFilterColor(),
        criteria,
      })
      .subscribe({
        next: (newFilter) => {
          this.filters.update((list) => [...list, newFilter]);
          this.ui.success(`Custom filter "${name}" saved successfully!`);
          this.closeCreateModal();
        },
        error: (err) => {
          this.ui.error(err?.error?.message ?? 'Failed to save filter');
        },
      });
  }

  deleteFilter(filter: SavedFilterItem) {
    if (filter.isPreset) {
      this.ui.warning('System preset filters cannot be deleted.');
      return;
    }

    this.ui
      .confirm({
        title: 'Delete Custom Filter?',
        message: `Are you sure you want to delete custom filter "${filter.name}"?`,
        confirmText: 'Delete Filter',
        type: 'danger',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.filterService.delete(this.workspaceId(), filter.id).subscribe({
            next: () => {
              this.filters.update((list) => list.filter((f) => f.id !== filter.id));
              this.ui.info(`Deleted custom filter "${filter.name}".`);
            },
            error: (err) => {
              this.ui.error(err?.error?.message ?? 'Failed to delete filter');
            },
          });
        }
      });
  }

  badgeClass(color: string): string {
    return this.filterService.getBadgeClass(color);
  }
}
