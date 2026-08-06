import { Component, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SavedFiltersService, FilterPreset } from '../../../core/services/saved-filters.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-saved-filters-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './saved-filters-bar.html',
})
export class SavedFiltersBarComponent {
  filtersService = inject(SavedFiltersService);
  ui = inject(UiService);

  scope = input<string>('players');
  currentQuery = input<string>('');
  currentFilters = input<Record<string, any>>({});

  applyPreset = output<FilterPreset>();

  showSaveModal = signal<boolean>(false);
  presetName = signal('');

  openSaveModal() {
    this.presetName.set('');
    this.showSaveModal.set(true);
  }

  closeSaveModal() {
    this.showSaveModal.set(false);
  }

  saveCurrentFilter() {
    const name = this.presetName().trim();
    if (!name) return;

    this.filtersService.savePreset(this.scope(), name, this.currentQuery(), this.currentFilters());
    this.ui.success(`Saved filter preset "${name}"`);
    this.closeSaveModal();
  }

  shareCurrentFilterLink() {
    const params = new URLSearchParams();
    const query = this.currentQuery().trim();
    if (query) {
      params.set('q', query);
    }

    const filters = this.currentFilters();
    if (filters) {
      Object.keys(filters).forEach((k) => {
        if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
          params.set(k, String(filters[k]));
        }
      });
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const shareableUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

    navigator.clipboard.writeText(shareableUrl).then(
      () => {
        this.ui.success('Shareable filter URL copied to clipboard!');
      },
      (err) => {
        console.error('Failed to copy shareable filter link', err);
        this.ui.error('Failed to copy shareable URL');
      },
    );
  }

  selectPreset(preset: FilterPreset) {
    this.applyPreset.emit(preset);
    this.ui.info(`Applied filter preset "${preset.name}"`);
  }

  deletePreset(id: string) {
    this.filtersService.deletePreset(id);
    this.ui.info('Filter preset deleted');
  }
}
