import { Injectable, signal } from '@angular/core';

export interface DashboardWidgetConfig {
  id: string;
  title: string;
  type:
    | 'live_matches'
    | 'top_scorers'
    | 'recent_activity'
    | 'quick_actions'
    | 'background_jobs'
    | 'storage_inspector';
  enabled: boolean;
  order: number;
  width: 'full' | 'half' | 'third';
  icon: string;
}

const DASHBOARD_CONFIG_STORAGE_KEY = 'taisen_custom_dashboard_layout_v1';

@Injectable({
  providedIn: 'root',
})
export class CustomDashboardService {
  widgets = signal<DashboardWidgetConfig[]>(this.loadWidgetConfig());

  private loadWidgetConfig(): DashboardWidgetConfig[] {
    try {
      const raw = localStorage.getItem(DASHBOARD_CONFIG_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    return [
      {
        id: 'w-1',
        title: 'Live Matches & Console',
        type: 'live_matches',
        enabled: true,
        order: 1,
        width: 'full',
        icon: 'fi fi-rr-play-alt',
      },
      {
        id: 'w-2',
        title: 'Top Scorers & Leaderboard',
        type: 'top_scorers',
        enabled: true,
        order: 2,
        width: 'half',
        icon: 'fi fi-rr-trophy',
      },
      {
        id: 'w-3',
        title: 'Quick Actions & Shortcuts',
        type: 'quick_actions',
        enabled: true,
        order: 3,
        width: 'half',
        icon: 'fi fi-rr-bolt',
      },
      {
        id: 'w-4',
        title: 'Recent Activity & Notifications',
        type: 'recent_activity',
        enabled: true,
        order: 4,
        width: 'half',
        icon: 'fi fi-rr-clock',
      },
      {
        id: 'w-5',
        title: 'Background Jobs & Data Pipeline',
        type: 'background_jobs',
        enabled: true,
        order: 5,
        width: 'half',
        icon: 'fi fi-rr-disk',
      },
    ];
  }

  toggleWidget(widgetId: string) {
    const updated = this.widgets().map((w) =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w,
    );
    this.widgets.set(updated);
    this.persist(updated);
  }

  reorderWidgets(reordered: DashboardWidgetConfig[]) {
    this.widgets.set(reordered);
    this.persist(reordered);
  }

  resetToDefault() {
    localStorage.removeItem(DASHBOARD_CONFIG_STORAGE_KEY);
    this.widgets.set(this.loadWidgetConfig());
  }

  private persist(list: DashboardWidgetConfig[]) {
    try {
      localStorage.setItem(DASHBOARD_CONFIG_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }
}
