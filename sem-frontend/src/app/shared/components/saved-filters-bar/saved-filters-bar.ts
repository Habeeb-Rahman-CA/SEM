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

  selectPreset(preset: FilterPreset) {
    this.applyPreset.emit(preset);
    this.ui.info(`Applied filter preset "${preset.name}"`);
  }

  deletePreset(id: string) {
    this.filtersService.deletePreset(id);
    this.ui.info('Filter preset deleted');
  }
}
