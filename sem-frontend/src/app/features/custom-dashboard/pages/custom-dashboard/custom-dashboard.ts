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
import {
  DashboardWidget,
  FrontendCustomDashboardService,
  WidgetType,
} from '../../services/custom-dashboard.service';
import { UiService } from '../../../../core/services/ui.service';

export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  dueDate: string;
}

@Component({
  selector: 'app-custom-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './custom-dashboard.html',
})
export class CustomDashboardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dashboardService = inject(FrontendCustomDashboardService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  widgets = signal<DashboardWidget[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  isEditMode = signal<boolean>(false);

  // Add Widget Modal
  addWidgetModalOpen = signal<boolean>(false);

  // Interactive Widget Data Mock States
  tasksList = signal<TaskItem[]>([
    {
      id: 't1',
      title: 'Verify medical waivers for Eagles FC roster',
      done: true,
      dueDate: 'Today',
    },
    {
      id: 't2',
      title: 'Confirm pitch 3 floodlight booking for evening match',
      done: false,
      dueDate: 'Tomorrow',
    },
    {
      id: 't3',
      title: 'Issue digital certificates for championship finalists',
      done: false,
      dueDate: 'Aug 8',
    },
    { id: 't4', title: 'Review Q3 sponsor analytics report', done: true, dueDate: 'Done' },
  ]);

  newTaskInput = signal('');

  visibleWidgets = computed(() => {
    return this.widgets()
      .filter((w) => w.visible)
      .sort((a, b) => a.order - b.order);
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
    this.dashboardService.getLayout(this.workspaceId()).subscribe({
      next: (list) => {
        this.widgets.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load custom dashboard');
        this.isLoading.set(false);
      },
    });
  }

  toggleEditMode() {
    this.isEditMode.update((v) => !v);
  }

  moveWidgetUp(index: number) {
    if (index === 0) return;
    const list = [...this.visibleWidgets()];
    const temp = list[index].order;
    list[index].order = list[index - 1].order;
    list[index - 1].order = temp;

    this.widgets.set(list);
    this.autoSaveLayout();
  }

  moveWidgetDown(index: number) {
    const list = [...this.visibleWidgets()];
    if (index === list.length - 1) return;
    const temp = list[index].order;
    list[index].order = list[index + 1].order;
    list[index + 1].order = temp;

    this.widgets.set(list);
    this.autoSaveLayout();
  }

  toggleWidgetSize(widget: DashboardWidget) {
    const updated = this.widgets().map((w) =>
      w.id === widget.id ? { ...w, size: (w.size === 'half' ? 'full' : 'half') as any } : w,
    );
    this.widgets.set(updated);
    this.autoSaveLayout();
  }

  removeWidget(widget: DashboardWidget) {
    const updated = this.widgets().map((w) => (w.id === widget.id ? { ...w, visible: false } : w));
    this.widgets.set(updated);
    this.ui.info(`Removed widget "${widget.title}" from dashboard.`);
    this.autoSaveLayout();
  }

  openAddWidgetModal() {
    this.addWidgetModalOpen.set(true);
  }

  closeAddWidgetModal() {
    this.addWidgetModalOpen.set(false);
  }

  addWidgetType(type: WidgetType, title: string, size: 'half' | 'full') {
    const current = this.widgets();
    const existing = current.find((w) => w.type === type);

    if (existing) {
      const updated = current.map((w) => (w.id === existing.id ? { ...w, visible: true } : w));
      this.widgets.set(updated);
    } else {
      const newWidget: DashboardWidget = {
        id: `widget-${type}-${Date.now()}`,
        type,
        title,
        size,
        order: current.length + 1,
        visible: true,
      };
      this.widgets.set([...current, newWidget]);
    }

    this.ui.success(`Added "${title}" widget to your dashboard!`);
    this.closeAddWidgetModal();
    this.autoSaveLayout();
  }

  resetDashboard() {
    this.ui
      .confirm({
        title: 'Reset Dashboard Layout?',
        message: 'Reset your custom dashboard layout to default recommended widget arrangement?',
        confirmText: 'Reset Layout',
        type: 'warning',
      })
      .then((confirmed) => {
        if (confirmed) {
          this.dashboardService.resetLayout(this.workspaceId()).subscribe({
            next: (list) => {
              this.widgets.set(list);
              this.ui.success('Reset custom dashboard layout!');
            },
            error: (err) => {
              this.ui.error(err?.error?.message ?? 'Failed to reset layout');
            },
          });
        }
      });
  }

  autoSaveLayout() {
    this.dashboardService.saveLayout(this.workspaceId(), this.widgets()).subscribe({
      next: () => {},
      error: () => {},
    });
  }

  // Task Widget Interactions
  toggleTask(task: TaskItem) {
    this.tasksList.update((list) =>
      list.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)),
    );
  }

  addTask() {
    const title = this.newTaskInput().trim();
    if (!title) return;

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title,
      done: false,
      dueDate: 'Today',
    };
    this.tasksList.update((list) => [...list, newTask]);
    this.newTaskInput.set('');
    this.ui.success('Task added to checklist!');
  }

  widgetIcon(type: WidgetType): string {
    return this.dashboardService.getWidgetIcon(type);
  }

  widgetBadge(type: WidgetType): string {
    return this.dashboardService.getWidgetBadgeClass(type);
  }
}
