import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ActionType,
  AutomationAction,
  AutomationRule,
  AutomationRun,
  AutomationService,
  AutomationSummary,
  TriggerType,
} from '../services/automation.service';

type AutoTab = 'rules' | 'runs' | 'library';

@Component({
  selector: 'app-automation',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './automation.html',
})
export class AutomationComponent implements OnInit {
  workspaceId = input.required<string>();

  private service = inject(AutomationService);

  summary = signal<AutomationSummary | null>(null);
  rules = signal<AutomationRule[]>([]);
  runs = signal<AutomationRun[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  currentTab = signal<AutoTab>('rules');
  selectedRuleId = signal<string | null>(null);
  runsFilterRuleId = signal<string>('');

  isRuleModalOpen = signal(false);
  editingRuleId = signal<string | null>(null);
  ruleForm = signal({
    name: '',
    description: '',
    triggerType: 'manual' as TriggerType,
    cron: '',
    status: 'active' as 'active' | 'paused',
    actionsJson: '[]',
  });

  allTriggers: TriggerType[] = [
    'manual',
    'schedule',
    'event_created',
    'event_started',
    'event_ended',
    'competition_started',
    'competition_ended',
    'match_completed',
  ];

  actionCatalog: {
    type: ActionType;
    label: string;
    description: string;
    template: any;
  }[] = [
    {
      type: 'send_notification',
      label: 'Send notification',
      description: 'Push an in-app notification to selected users.',
      template: {
        title: 'Automation update',
        message: 'A scheduled task just ran.',
        userIds: [],
      },
    },
    {
      type: 'generate_fixtures',
      label: 'Generate fixtures',
      description: 'Create matches for a competition using a fixture template.',
      template: {
        eventId: '',
        competitionId: '',
        fixtureTemplateId: null,
      },
    },
    {
      type: 'allocate_referees',
      label: 'Allocate referees',
      description: 'Auto-assign referees to unassigned matches.',
      template: { competitionId: '', strategy: 'round_robin' },
    },
    {
      type: 'reserve_equipment',
      label: 'Reserve equipment',
      description: 'Create equipment bookings for an event window.',
      template: {
        equipmentIds: [],
        eventId: '',
        startAt: '',
        endAt: '',
        notes: 'Auto-reserved',
      },
    },
    {
      type: 'issue_certificates',
      label: 'Issue certificates',
      description: 'Queue certificate generation for participants/winners of an event.',
      template: { eventId: '', template: 'default' },
    },
    {
      type: 'generate_report',
      label: 'Generate report',
      description: 'Compile a summary report for an event.',
      template: { eventId: '', reportType: 'summary', format: 'pdf' },
    },
    {
      type: 'archive_event',
      label: 'Archive event',
      description: 'Mark an event as archived once completed.',
      template: { eventId: '' },
    },
  ];

  selectedRule = computed<AutomationRule | null>(() => {
    const id = this.selectedRuleId();
    if (!id) return null;
    return this.rules().find((r) => r.id === id) || null;
  });

  filteredRuns = computed(() => {
    const id = this.runsFilterRuleId();
    return id ? this.runs().filter((r) => r.ruleId === id) : this.runs();
  });

  constructor() {
    effect(
      () => {
        const wsId = this.workspaceId();
        if (wsId) this.loadAll();
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    const wsId = this.workspaceId();
    if (!wsId) return;
    this.isLoading.set(true);
    this.error.set(null);

    this.service.getSummary(wsId).subscribe({
      next: (s) => this.summary.set(s),
      error: (err) => console.error('Failed to load summary', err),
    });

    this.service.getRules(wsId).subscribe({
      next: (list) => {
        this.rules.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load rules');
        this.isLoading.set(false);
      },
    });

    this.service.getRuns(wsId, { limit: 100 }).subscribe({
      next: (list) => this.runs.set(list),
    });
  }

  // ─── Rule Modal ──────────────────────────────────────────────────────

  openRuleModal(rule?: AutomationRule) {
    if (rule) {
      this.editingRuleId.set(rule.id);
      this.ruleForm.set({
        name: rule.name,
        description: rule.description || '',
        triggerType: rule.triggerType,
        cron: rule.triggerConfig?.['cron'] || '',
        status: rule.status === 'error' ? 'active' : rule.status,
        actionsJson: JSON.stringify(rule.actions || [], null, 2),
      });
    } else {
      this.editingRuleId.set(null);
      this.ruleForm.set({
        name: '',
        description: '',
        triggerType: 'manual',
        cron: '0 9 * * *',
        status: 'active',
        actionsJson: JSON.stringify(
          [
            {
              type: 'send_notification',
              config: this.actionCatalog[0].template,
            },
          ],
          null,
          2,
        ),
      });
    }
    this.isRuleModalOpen.set(true);
  }

  closeRuleModal() {
    this.isRuleModalOpen.set(false);
  }

  appendActionTemplate(a: (typeof this.actionCatalog)[number]) {
    let current: AutomationAction[] = [];
    try {
      current = JSON.parse(this.ruleForm().actionsJson || '[]');
      if (!Array.isArray(current)) current = [];
    } catch {
      current = [];
    }
    current.push({ type: a.type, config: a.template });
    this.ruleForm.set({
      ...this.ruleForm(),
      actionsJson: JSON.stringify(current, null, 2),
    });
  }

  saveRule() {
    const form = this.ruleForm();
    const wsId = this.workspaceId();
    const id = this.editingRuleId();

    let actions: AutomationAction[];
    try {
      actions = JSON.parse(form.actionsJson);
      if (!Array.isArray(actions) || actions.length === 0) {
        alert('Actions must be a non-empty JSON array.');
        return;
      }
    } catch (e) {
      alert('Invalid JSON in actions field.');
      return;
    }

    const payload: any = {
      name: form.name,
      description: form.description || null,
      actions,
      status: form.status,
    };
    if (form.triggerType === 'schedule') {
      payload.triggerConfig = { cron: form.cron };
    }
    if (!id) {
      payload.triggerType = form.triggerType;
    }

    const req = id
      ? this.service.updateRule(wsId, id, payload)
      : this.service.createRule(wsId, payload);

    req.subscribe({
      next: (r) => {
        this.closeRuleModal();
        this.loadAll();
        this.selectedRuleId.set(r.id);
      },
      error: (err) => alert(err?.error?.message || 'Failed to save rule'),
    });
  }

  pauseRule(rule: AutomationRule) {
    this.service
      .updateRule(this.workspaceId(), rule.id, {
        status: rule.status === 'active' ? 'paused' : 'active',
      })
      .subscribe({
        next: () => this.loadAll(),
        error: (err) => alert(err?.error?.message || 'Failed to update'),
      });
  }

  runRule(rule: AutomationRule) {
    this.service.runRule(this.workspaceId(), rule.id, {}).subscribe({
      next: () => this.loadAll(),
      error: (err) => alert(err?.error?.message || 'Rule run failed'),
    });
  }

  deleteRule(rule: AutomationRule) {
    if (!confirm(`Delete automation rule "${rule.name}"?`)) return;
    this.service.deleteRule(this.workspaceId(), rule.id).subscribe({
      next: () => {
        if (this.selectedRuleId() === rule.id) this.selectedRuleId.set(null);
        this.loadAll();
      },
      error: (err) => alert(err?.error?.message || 'Failed to delete'),
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
      case 'success':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'paused':
      case 'skipped':
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
      case 'failed':
      case 'error':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'partial':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'running':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  }

  triggerLabel(t: TriggerType): string {
    return t.replace(/_/g, ' ');
  }

  selectRule(id: string) {
    this.selectedRuleId.set(id);
  }

  actionTypeLabel(type: string): string {
    const found = this.actionCatalog.find((a) => a.type === type);
    return found?.label || type;
  }
}
