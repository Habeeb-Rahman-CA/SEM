import { Injectable } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';

export type WidgetType =
  'weather' | 'calendar' | 'activity' | 'statistics' | 'tasks' | 'charts';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: 'half' | 'full';
  order: number;
  visible: boolean;
  config?: Record<string, any>;
}

@Injectable()
export class CustomDashboardService {
  private userLayouts: Map<string, DashboardWidget[]> = new Map();

  constructor(private readonly workspacesService: WorkspacesService) {
    this.seedDefaultLayout();
  }

  private seedDefaultLayout() {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'widget-stats',
        type: 'statistics',
        title: 'Platform Overview & Live Metrics',
        size: 'full',
        order: 1,
        visible: true,
      },
      {
        id: 'widget-weather',
        type: 'weather',
        title: 'Stadium & Pitch Weather Forecast',
        size: 'half',
        order: 2,
        visible: true,
      },
      {
        id: 'widget-calendar',
        type: 'calendar',
        title: 'Upcoming Match Schedule & Calendar',
        size: 'half',
        order: 3,
        visible: true,
      },
      {
        id: 'widget-activity',
        type: 'activity',
        title: 'Recent Activity Stream',
        size: 'half',
        order: 4,
        visible: true,
      },
      {
        id: 'widget-tasks',
        type: 'tasks',
        title: 'Organizer Task Checklist',
        size: 'half',
        order: 5,
        visible: true,
      },
      {
        id: 'widget-charts',
        type: 'charts',
        title: 'Registration & Performance Analytics',
        size: 'full',
        order: 6,
        visible: true,
      },
    ];

    this.userLayouts.set('default-ws', defaultWidgets);
  }

  async getDashboardLayout(
    workspaceId: string,
    userId?: string,
  ): Promise<DashboardWidget[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }
    return (
      this.userLayouts.get(workspaceId) ||
      this.userLayouts.get('default-ws') ||
      []
    );
  }

  async saveDashboardLayout(
    workspaceId: string,
    widgets: DashboardWidget[],
    userId?: string,
  ): Promise<DashboardWidget[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }
    this.userLayouts.set(workspaceId, widgets);
    return widgets;
  }

  async resetDashboardLayout(
    workspaceId: string,
    userId?: string,
  ): Promise<DashboardWidget[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }
    this.seedDefaultLayout();
    const defaultWidgets = this.userLayouts.get('default-ws') || [];
    this.userLayouts.set(workspaceId, defaultWidgets);
    return defaultWidgets;
  }
}
