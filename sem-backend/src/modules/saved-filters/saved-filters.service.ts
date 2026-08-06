import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';

export type FilterCategory =
  'events' | 'matches' | 'registrations' | 'payments' | 'teams';

export interface SavedFilterItem {
  id: string;
  workspaceId: string;
  name: string;
  targetCategory: FilterCategory;
  icon: string;
  color: string;
  isPreset: boolean;
  isDefault?: boolean;
  criteria: Record<string, any>;
  createdAt: string;
}

@Injectable()
export class SavedFiltersService {
  private filtersStore: Map<string, SavedFilterItem[]> = new Map();

  constructor(private readonly workspacesService: WorkspacesService) {
    this.seedPresetFilters();
  }

  private seedPresetFilters() {
    const defaultPresets: SavedFilterItem[] = [
      {
        id: 'filter-preset-101',
        workspaceId: 'default-ws',
        name: 'My Upcoming Events',
        targetCategory: 'events',
        icon: 'fi fi-rr-calendar',
        color: 'emerald',
        isPreset: true,
        isDefault: true,
        criteria: {
          status: 'upcoming',
          dateRange: 'next_30_days',
          assignedToMe: true,
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'filter-preset-102',
        workspaceId: 'default-ws',
        name: "Today's Matches",
        targetCategory: 'matches',
        icon: 'fi fi-sr-play-alt',
        color: 'amber',
        isPreset: true,
        criteria: { date: 'today', includeLive: true },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'filter-preset-103',
        workspaceId: 'default-ws',
        name: 'Pending Approvals',
        targetCategory: 'registrations',
        icon: 'fi fi-rr-time-fast',
        color: 'rose',
        isPreset: true,
        criteria: { status: 'pending', requiresWaiverCheck: true },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'filter-preset-104',
        workspaceId: 'default-ws',
        name: 'Completed Payments',
        targetCategory: 'payments',
        icon: 'fi fi-rr-credit-card',
        color: 'blue',
        isPreset: true,
        criteria: { paymentStatus: 'completed', minAmount: 0 },
        createdAt: new Date().toISOString(),
      },
    ];

    this.filtersStore.set('default-ws', defaultPresets);
  }

  async listFilters(
    workspaceId: string,
    userId?: string,
  ): Promise<SavedFilterItem[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }
    return (
      this.filtersStore.get(workspaceId) ||
      this.filtersStore.get('default-ws') ||
      []
    );
  }

  async createFilter(
    workspaceId: string,
    payload: {
      name: string;
      targetCategory: FilterCategory;
      icon?: string;
      color?: string;
      isDefault?: boolean;
      criteria: Record<string, any>;
    },
    userId?: string,
  ): Promise<SavedFilterItem> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const newFilter: SavedFilterItem = {
      id: `filter-custom-${Date.now()}`,
      workspaceId,
      name: payload.name,
      targetCategory: payload.targetCategory,
      icon: payload.icon || 'fi fi-rr-filter',
      color: payload.color || 'violet',
      isPreset: false,
      isDefault: payload.isDefault || false,
      criteria: payload.criteria,
      createdAt: new Date().toISOString(),
    };

    const currentList = this.filtersStore.get(workspaceId) || [];
    this.filtersStore.set(workspaceId, [...currentList, newFilter]);
    return newFilter;
  }

  async deleteFilter(
    workspaceId: string,
    filterId: string,
    userId?: string,
  ): Promise<{ success: boolean; id: string }> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.filtersStore.get(workspaceId) ||
      this.filtersStore.get('default-ws') ||
      [];
    const target = list.find((f) => f.id === filterId);

    if (target?.isPreset) {
      throw new Error('System preset filters cannot be deleted.');
    }

    const updated = list.filter((f) => f.id !== filterId);
    this.filtersStore.set(workspaceId, updated);

    return { success: true, id: filterId };
  }
}
