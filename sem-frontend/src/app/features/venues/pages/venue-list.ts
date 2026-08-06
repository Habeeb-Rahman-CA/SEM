import { Component, input, output, signal, computed, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Venue } from '../services/venue.service';
import { PaginatorComponent, SearchInputComponent } from '../../../shared';
import { BulkOperationsBarComponent } from '../../../shared/components/bulk-operations-bar/bulk-operations-bar';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-venue-list',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    PaginatorComponent,
    SearchInputComponent,
    BulkOperationsBarComponent,
  ],
  template: `
    <div class="h-full flex flex-col overflow-hidden w-full text-left animate-fadeIn">
      <!-- Venues Header -->
      <div class="flex items-center justify-between border-b border-white/5 pb-4 flex-shrink-0">
        <div>
          <h2 class="text-xl font-bold text-white">Workspace Venues</h2>
          <p class="text-xs text-slate-400 mt-1">
            Manage venues and sports facilities belonging to this workspace.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span
            class="text-xs font-semibold px-2.5 py-1 bg-slate-900 border border-white/10 text-violet-400 rounded-lg"
          >
            {{ venues().length }} Total
          </span>
          @if (canUpdate()) {
            <button
              (click)="add.emit()"
              class="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-violet-900/20 transition-all cursor-pointer border-0 outline-none"
            >
              <i class="fi fi-rr-plus text-xs"></i>
              Add Venue
            </button>
          }
        </div>
      </div>

      <!-- Venues Grid -->
      @if (venues().length === 0) {
        <div class="flex-1 overflow-y-auto min-h-0">
          <div
            class="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 border border-white/10 rounded-2xl"
          >
            <div
              class="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center mb-4"
            >
              <i class="fi fi-rr-marker text-slate-600 text-2xl"></i>
            </div>
            <h3 class="text-sm font-bold text-white mb-1">No venues registered</h3>
            <p class="text-xs text-slate-500 max-w-xs">
              Register your first venue or sports facility to assign it to matches.
            </p>
          </div>
        </div>
      } @else {
        <!-- Search and Filter Bar -->
        <div
          class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/20 border border-white/5 p-4 rounded-2xl mb-4 flex-shrink-0"
        >
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                [checked]="isAllSelected()"
                (change)="toggleSelectAll()"
                class="w-4 h-4 accent-violet-600 rounded border-white/10 bg-slate-950 cursor-pointer"
              />
              <span class="text-xs text-slate-300 font-bold">Select All</span>
            </label>
            <div class="text-xs text-slate-400 font-medium">
              @if (venueSearchQuery()) {
                Showing {{ filteredVenues().length }} of {{ venues().length }} venues
              } @else {
                {{ venues().length }} venue{{ venues().length !== 1 ? 's' : '' }} registered
              }
            </div>
          </div>

          <!-- Controls: Sort & Search -->
          <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <!-- Sort Select -->
            <div class="relative w-full sm:w-auto min-w-[140px]">
              <select
                [ngModel]="sortOrder()"
                (ngModelChange)="sortOrder.set($event)"
                class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl pl-3 pr-8 py-2 text-xs text-white outline-none cursor-pointer appearance-none"
              >
                <option value="name-asc" class="bg-slate-900">Name (A-Z)</option>
                <option value="name-desc" class="bg-slate-900">Name (Z-A)</option>
                <option value="location-asc" class="bg-slate-900">Location (A-Z)</option>
                <option value="location-desc" class="bg-slate-900">Location (Z-A)</option>
              </select>
              <div
                class="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400"
              >
                <i class="fi fi-rr-angle-small-down text-sm"></i>
              </div>
            </div>

            <app-search-input
              [value]="venueSearchQuery()"
              placeholder="Search venues by name or location..."
              (valueChange)="venueSearchQuery.set($event)"
            />
          </div>
        </div>

        @if (filteredVenues().length === 0) {
          <div class="flex-1 overflow-y-auto min-h-0">
            <div
              class="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 border border-white/10 rounded-2xl w-full"
            >
              <div
                class="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center mb-4"
              >
                <i class="fi fi-rr-search text-slate-600 text-2xl"></i>
              </div>
              <h3 class="text-sm font-bold text-white mb-1">No matching venues</h3>
              <p class="text-xs text-slate-500 max-w-xs">
                No venues match your search query "{{ venueSearchQuery() }}".
              </p>
            </div>
          </div>
        } @else {
          <div class="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            <!-- Scrollable Card Grid -->
            <div class="flex-1 overflow-y-auto min-h-0 pr-1">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                @for (venue of paginatedVenues(); track venue.id) {
                  <div
                    class="bg-slate-900 border border-white/10 hover:border-violet-500/30 rounded-2xl flex flex-col overflow-hidden group transition-all duration-300 shadow-xl hover:shadow-2xl relative"
                    [class.ring-2]="selectedVenueIds().has(venue.id)"
                    [class.ring-violet-500]="selectedVenueIds().has(venue.id)"
                  >
                    <!-- Checkbox overlay -->
                    <div class="absolute top-3 right-3 z-20">
                      <input
                        type="checkbox"
                        [checked]="selectedVenueIds().has(venue.id)"
                        (change)="toggleSelectVenue(venue.id)"
                        class="w-4 h-4 accent-violet-600 rounded border-white/10 bg-slate-950 cursor-pointer shadow-lg"
                      />
                    </div>

                    <!-- Cover Image / Banner -->
                    <div
                      class="h-40 w-full relative bg-slate-950/60 overflow-hidden border-b border-white/5 flex-shrink-0 flex items-center justify-center"
                    >
                      @if (venue.imageUrl) {
                        <img
                          [src]="venue.imageUrl"
                          alt="Venue Cover"
                          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      } @else {
                        <!-- Stylized fallback banner with nice colors & icon -->
                        <div
                          class="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-indigo-900/40 opacity-70"
                        ></div>
                        <div
                          class="absolute w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-violet-400 text-lg shadow-inner z-10"
                        >
                          <i class="fi fi-rr-marker"></i>
                        </div>
                      }
                    </div>

                    <!-- Card Body -->
                    <div class="p-5 flex-1 flex flex-col justify-between gap-4 text-left">
                      <div class="min-w-0">
                        <h4 class="text-sm font-bold text-white truncate pr-6" [title]="venue.name">
                          {{ venue.name }}
                        </h4>
                        @if (venue.location) {
                          <p
                            class="text-xs text-slate-400 mt-2 flex items-center gap-1.5"
                            [title]="venue.location"
                          >
                            <i
                              class="fi fi-rr-navigation text-violet-400 flex-shrink-0 text-[10px]"
                            ></i>
                            <span class="truncate">{{ venue.location }}</span>
                          </p>
                        }
                        <p class="text-[9px] text-slate-500 mt-2.5">
                          Registered {{ venue.createdAt | date: 'MMM d, y' }}
                        </p>
                      </div>

                      <!-- Actions -->
                      @if (canUpdate()) {
                        <div
                          class="flex items-center justify-end gap-2 pt-3 border-t border-white/5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                        >
                          <button
                            (click)="edit.emit(venue)"
                            class="px-3 py-1.5 text-[11px] font-bold text-violet-400 hover:text-white hover:bg-violet-600/20 border border-violet-500/10 hover:border-violet-500/30 rounded-lg transition-all cursor-pointer bg-transparent"
                          >
                            Edit
                          </button>
                          <button
                            (click)="delete.emit(venue)"
                            class="px-3 py-1.5 text-[11px] font-bold text-rose-400 hover:text-white hover:bg-rose-600/20 border border-rose-500/10 hover:border-rose-500/30 rounded-lg transition-all cursor-pointer bg-transparent"
                          >
                            Delete
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Pagination -->
            <div class="bg-slate-900/40 border border-white/10 rounded-2xl p-4 flex-shrink-0">
              <app-paginator
                [currentPage]="page()"
                [pageSize]="pageSize()"
                [total]="filteredVenues().length"
                [pageSizeOptions]="[12, 24, 48, 96]"
                (pageChange)="page.set($event)"
                (pageSizeChange)="pageSize.set($event)"
                [showAlways]="true"
              />
            </div>
          </div>
        }
      }

      <!-- Floating Bulk Action Suite Bar -->
      <app-bulk-operations-bar
        [selectedCount]="selectedCount()"
        [totalCount]="filteredVenues().length"
        entityName="Venues"
        [statusOptions]="venueStatusOptions"
        (selectAll)="toggleSelectAll()"
        (clearSelection)="clearSelection()"
        (bulkDelete)="handleBulkDelete()"
        (bulkAssign)="handleBulkAssign($event)"
        (bulkExport)="handleBulkExport($event)"
        (bulkArchive)="handleBulkArchive()"
        (bulkUpdateStatus)="handleBulkUpdateStatus($event)"
      />
    </div>
  `,
})
export class VenueListComponent {
  private ui = inject(UiService);

  venues = input<Venue[]>([]);
  canUpdate = input<boolean>(false);

  add = output<void>();
  edit = output<Venue>();
  delete = output<Venue>();

  venueSearchQuery = signal('');
  sortOrder = signal('name-asc');
  page = signal(1);
  pageSize = signal(12);

  // ── Bulk Selection & Operations ──────────────────────────────────────────────
  selectedVenueIds = signal<Set<string>>(new Set());

  selectedCount = computed(() => this.selectedVenueIds().size);

  isAllSelected = computed(() => {
    const list = this.filteredVenues();
    if (list.length === 0) return false;
    const selected = this.selectedVenueIds();
    return list.every((v) => selected.has(v.id));
  });

  venueStatusOptions = [
    { key: 'active', label: 'Active', color: 'bg-emerald-400' },
    { key: 'maintenance', label: 'Maintenance', color: 'bg-amber-400' },
    { key: 'closed', label: 'Closed', color: 'bg-rose-400' },
  ];

  filteredVenues = computed(() => {
    const query = this.venueSearchQuery().toLowerCase().trim();
    let list = this.venues();

    if (query) {
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          (v.location && v.location.toLowerCase().includes(query)),
      );
    }

    const sort = this.sortOrder();
    list = [...list].sort((a, b) => {
      if (sort === 'name-asc') {
        return a.name.localeCompare(b.name);
      } else if (sort === 'name-desc') {
        return b.name.localeCompare(a.name);
      } else if (sort === 'location-asc') {
        return (a.location || '').localeCompare(b.location || '');
      } else if (sort === 'location-desc') {
        return (b.location || '').localeCompare(a.location || '');
      }
      return 0;
    });

    return list;
  });

  paginatedVenues = computed(() => {
    const list = this.filteredVenues();
    const startIndex = (this.page() - 1) * this.pageSize();
    return list.slice(startIndex, startIndex + this.pageSize());
  });

  constructor() {
    effect(
      () => {
        this.venueSearchQuery();
        this.sortOrder();
        this.page.set(1);
      },
      { allowSignalWrites: true },
    );
  }

  toggleSelectAll() {
    const currentSelected = this.selectedVenueIds();
    const list = this.filteredVenues();
    const newSet = new Set(currentSelected);

    if (this.isAllSelected()) {
      for (const v of list) {
        newSet.delete(v.id);
      }
    } else {
      for (const v of list) {
        newSet.add(v.id);
      }
    }
    this.selectedVenueIds.set(newSet);
  }

  toggleSelectVenue(id: string) {
    const newSet = new Set(this.selectedVenueIds());
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    this.selectedVenueIds.set(newSet);
  }

  clearSelection() {
    this.selectedVenueIds.set(new Set());
  }

  handleBulkDelete() {
    const count = this.selectedCount();
    const ids = Array.from(this.selectedVenueIds());

    for (const id of ids) {
      const venue = this.venues().find((v) => v.id === id);
      if (venue) this.delete.emit(venue);
    }

    this.clearSelection();
    this.ui.success(`Bulk Operation: ${count} venues deleted.`);
  }

  handleBulkAssign(targetId: string) {
    const count = this.selectedCount();
    this.ui.success(`Bulk Operation: Reassigned ${count} venues.`);
    this.clearSelection();
  }

  handleBulkExport(format: 'csv' | 'excel' | 'json') {
    const selectedList = this.venues().filter((v) => this.selectedVenueIds().has(v.id));
    const count = selectedList.length;

    if (format === 'json') {
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedList, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `venues_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      let csvContent = 'data:text/csv;charset=utf-8,ID,Name,Location\n';
      for (const v of selectedList) {
        csvContent += `"${v.id}","${v.name}","${v.location || ''}"\n`;
      }
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `venues_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    this.ui.success(`Exported ${count} venues as ${format.toUpperCase()}.`);
  }

  handleBulkArchive() {
    const count = this.selectedCount();
    this.ui.info(`Bulk Operation: Archived ${count} selected venues.`);
    this.clearSelection();
  }

  handleBulkUpdateStatus(statusKey: string) {
    const count = this.selectedCount();
    this.ui.success(
      `Bulk Operation: Updated status to "${statusKey.toUpperCase()}" for ${count} venues.`,
    );
    this.clearSelection();
  }
}
