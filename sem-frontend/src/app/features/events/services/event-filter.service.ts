import { Injectable } from '@angular/core';
import { WorkspaceEvent } from '../../workspaces/services/workspace.service';
import { EventFilterCriteria, SavedEventFilter } from '../models/event.interface';

const STORAGE_KEY = 'sem_saved_event_filters';

@Injectable({ providedIn: 'root' })
export class EventFilterService {
  emptyCriteria(): EventFilterCriteria {
    return {
      sport: '',
      organizer: '',
      workspaceIdFilter: '',
      status: '',
      venue: '',
      startDate: '',
      endDate: '',
      competitionName: '',
      sortBy: 'name',
      sortOrder: 'ASC',
    };
  }

  loadSavedFilters(): SavedEventFilter[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SavedEventFilter[];
    } catch {
      return [];
    }
  }

  persistSavedFilters(filters: SavedEventFilter[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }

  quickFilter(events: WorkspaceEvent[], query: string): WorkspaceEvent[] {
    const q = query.toLowerCase().trim();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.status.toLowerCase().includes(q) ||
        (e.description ? e.description.toLowerCase().includes(q) : false),
    );
  }
}
