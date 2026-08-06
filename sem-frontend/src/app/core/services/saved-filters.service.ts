import { Injectable, signal } from '@angular/core';

export interface FilterPreset {
  id: string;
  scope: string; // e.g. 'players', 'teams', 'events', 'venues'
  name: string;
  query: string;
  filters: Record<string, any>;
  icon?: string;
  createdAt: number;
}

const SAVED_FILTERS_STORAGE_KEY = 'taisen_saved_filter_presets_v1';

@Injectable({
  providedIn: 'root',
})
export class SavedFiltersService {
  presets = signal<FilterPreset[]>(this.loadPresets());

  private loadPresets(): FilterPreset[] {
    try {
      const raw = localStorage.getItem(SAVED_FILTERS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    // Default curated presets
    return [
      {
        id: 'p-1',
        scope: 'players',
        name: 'Active Football Players',
        query: 'Football',
        filters: { position: 'Midfielder' },
        icon: 'fi fi-rr-running',
        createdAt: Date.now(),
      },
      {
        id: 'p-2',
        scope: 'events',
        name: 'Live Tournaments',
        query: '',
        filters: { status: 'live' },
        icon: 'fi fi-rr-trophy',
        createdAt: Date.now(),
      },
      {
        id: 'p-3',
        scope: 'venues',
        name: 'High Capacity (1000+)',
        query: '',
        filters: { minCapacity: 1000 },
        icon: 'fi fi-rr-marker',
        createdAt: Date.now(),
      },
    ];
  }

  savePreset(
    scope: string,
    name: string,
    query: string,
    filters: Record<string, any>,
    icon?: string,
  ) {
    const newPreset: FilterPreset = {
      id: crypto.randomUUID(),
      scope,
      name,
      query,
      filters,
      icon: icon || 'fi fi-rr-filter',
      createdAt: Date.now(),
    };

    const updated = [newPreset, ...this.presets()];
    this.presets.set(updated);
    this.persist(updated);
  }

  deletePreset(presetId: string) {
    const updated = this.presets().filter((p) => p.id !== presetId);
    this.presets.set(updated);
    this.persist(updated);
  }

  getPresetsForScope(scope: string): FilterPreset[] {
    return this.presets().filter((p) => p.scope === scope);
  }

  private persist(list: FilterPreset[]) {
    try {
      localStorage.setItem(SAVED_FILTERS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }
}
