import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ACTION_CATALOG,
  ActionMeta,
  ActionType,
  AutomationAction,
  AutomationRule,
  AutomationRun,
  AutomationService,
  AutomationSummary,
  TRIGGER_CATALOG,
  TriggerMeta,
  TriggerType,
} from '../services/automation.service';

type AutoTab = 'rules' | 'runs' | 'builder' | 'library';
type BuilderStep = 'trigger' | 'conditions' | 'actions' | 'review';

interface ConditionRow {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt';
  value: string;
}

@Component({
  selector: 'app-automation',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './automation.html',
})
export class AutomationComponent implements OnInit {
  workspaceId = input.required<string>();
  private service = inject(AutomationService);

  // ─── Data ────────────────────────────────────────────────────────────────
  summary = signal<AutomationSummary | null>(null);
  rules = signal<AutomationRule[]>([]);
  runs = signal<AutomationRun[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // ─── Tab & selection ─────────────────────────────────────────────────────
  currentTab = signal<AutoTab>('rules');
  selectedRuleId = signal<string | null>(null);
  runsFilterRuleId = signal<string>('');

  // ─── Old modal (edit only) ────────────────────────────────────────────────
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

  // ─── Visual Builder State ─────────────────────────────────────────────────
  builderStep = signal<BuilderStep>('trigger');
  builderRule = signal<{
    name: string;
    description: string;
    triggerType: TriggerType | null;
    cron: string;
    conditions: ConditionRow[];
    actions: AutomationAction[];
    status: 'active' | 'paused';
  }>({
    name: '',
    description: '',
    triggerType: null,
    cron: '',
    conditions: [],
    actions: [],
    status: 'active',
  });

  // ─── Catalogs ─────────────────────────────────────────────────────────────
  readonly triggerCatalog: TriggerMeta[] = TRIGGER_CATALOG;
  readonly actionCatalog: ActionMeta[] = ACTION_CATALOG;

  readonly triggerCategories = computed(() => {
    const cats = new Set(this.triggerCatalog.map((t) => t.category));
    return Array.from(cats);
  });

  readonly actionCategories = computed(() => {
    const cats = new Set(this.actionCatalog.map((a) => a.category));
    return Array.from(cats);
  });

  triggersInCategory(cat: string) {
    return this.triggerCatalog.filter((t) => t.category === cat);
  }

  actionsInCategory(cat: string) {
    return this.actionCatalog.filter((a) => a.category === cat);
  }

  selectedTriggerMeta = computed(() => {
    const t = this.builderRule().triggerType;
    return t ? (this.triggerCatalog.find((x) => x.type === t) ?? null) : null;
  });

  // ─── Computed ─────────────────────────────────────────────────────────────
  selectedRule = computed<AutomationRule | null>(() => {
    const id = this.selectedRuleId();
    if (!id) return null;
    return this.rules().find((r) => r.id === id) || null;
  });

  filteredRuns = computed(() => {
    const id = this.runsFilterRuleId();
    return id ? this.runs().filter((r) => r.ruleId === id) : this.runs();
  });

  builderSteps: { key: BuilderStep; label: string; icon: string }[] = [
    { key: 'trigger', label: 'Trigger', icon: 'fi-rr-bolt' },
    { key: 'conditions', label: 'Conditions', icon: 'fi-rr-filter' },
    { key: 'actions', label: 'Actions', icon: 'fi-rr-layers' },
    { key: 'review', label: 'Review & Save', icon: 'fi-rr-check-circle' },
  ];

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

  // ─── Visual Builder Navigation ────────────────────────────────────────────
  openBuilder() {
    this.builderRule.set({
      name: '',
      description: '',
      triggerType: null,
      cron: '',
      conditions: [],
      actions: [],
      status: 'active',
    });
    this.builderStep.set('trigger');
    this.currentTab.set('builder');
  }

  selectTrigger(type: TriggerType) {
    this.builderRule.set({ ...this.builderRule(), triggerType: type });
  }

  nextStep() {
    const steps: BuilderStep[] = ['trigger', 'conditions', 'actions', 'review'];
    const cur = this.builderStep();
    const idx = steps.indexOf(cur);
    if (idx < steps.length - 1) this.builderStep.set(steps[idx + 1]);
  }

  prevStep() {
    const steps: BuilderStep[] = ['trigger', 'conditions', 'actions', 'review'];
    const cur = this.builderStep();
    const idx = steps.indexOf(cur);
    if (idx > 0) this.builderStep.set(steps[idx - 1]);
  }

  isStepDone(step: BuilderStep): boolean {
    const steps: BuilderStep[] = ['trigger', 'conditions', 'actions', 'review'];
    return steps.indexOf(step) < steps.indexOf(this.builderStep());
  }

  canProceedFromTrigger() {
    return this.builderRule().triggerType !== null;
  }

  canProceedFromActions() {
    return this.builderRule().actions.length > 0 && this.builderRule().name.trim().length > 0;
  }

  // ─── Conditions ───────────────────────────────────────────────────────────
  addCondition() {
    const r = this.builderRule();
    this.builderRule.set({
      ...r,
      conditions: [...r.conditions, { field: '', operator: 'equals', value: '' }],
    });
  }

  updateCondition(idx: number, patch: Partial<ConditionRow>) {
    const r = this.builderRule();
    const conditions = r.conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    this.builderRule.set({ ...r, conditions });
  }

  removeCondition(idx: number) {
    const r = this.builderRule();
    this.builderRule.set({ ...r, conditions: r.conditions.filter((_, i) => i !== idx) });
  }

  // ─── Actions ─────────────────────────────────────────────────────────────
  addAction(meta: ActionMeta) {
    const r = this.builderRule();
    this.builderRule.set({
      ...r,
      actions: [...r.actions, { type: meta.type, config: { ...meta.configTemplate } }],
    });
  }

  removeAction(idx: number) {
    const r = this.builderRule();
    this.builderRule.set({ ...r, actions: r.actions.filter((_, i) => i !== idx) });
  }

  updateActionConfig(idx: number, json: string) {
    try {
      const parsed = JSON.parse(json);
      const r = this.builderRule();
      const actions = r.actions.map((a, i) => (i === idx ? { ...a, config: parsed } : a));
      this.builderRule.set({ ...r, actions });
    } catch {
      // ignore invalid JSON while typing
    }
  }

  toggleActionContinueOnError(idx: number) {
    const r = this.builderRule();
    const actions = r.actions.map((a, i) =>
      i === idx ? { ...a, continueOnError: !a.continueOnError } : a,
    );
    this.builderRule.set({ ...r, actions });
  }

  // ─── Save Builder Rule ────────────────────────────────────────────────────
  saveBuilderRule() {
    const r = this.builderRule();
    if (!r.triggerType || !r.name.trim() || r.actions.length === 0) return;

    const conditions: Record<string, any> = {};
    for (const c of r.conditions) {
      if (c.field && c.value) conditions[c.field] = c.value;
    }

    const payload: any = {
      name: r.name.trim(),
      description: r.description || null,
      triggerType: r.triggerType,
      actions: r.actions,
      conditions: Object.keys(conditions).length > 0 ? conditions : null,
      status: r.status,
    };
    if (r.triggerType === 'schedule' && r.cron) {
      payload.triggerConfig = { cron: r.cron };
    }

    this.service.createRule(this.workspaceId(), payload).subscribe({
      next: (rule) => {
        this.loadAll();
        this.selectedRuleId.set(rule.id);
        this.currentTab.set('rules');
      },
      error: (err) => alert(err?.error?.message || 'Failed to save rule'),
    });
  }

  // ─── Old Modal (for editing) ───────────────────────────────────────────────
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
      this.isRuleModalOpen.set(true);
    }
  }

  closeRuleModal() {
    this.isRuleModalOpen.set(false);
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
    } catch {
      alert('Invalid JSON in actions field.');
      return;
    }
    const payload: any = {
      name: form.name,
      description: form.description || null,
      actions,
      status: form.status,
    };
    if (form.triggerType === 'schedule') payload.triggerConfig = { cron: form.cron };

    if (id) {
      this.service.updateRule(wsId, id, payload).subscribe({
        next: () => {
          this.closeRuleModal();
          this.loadAll();
        },
        error: (err) => alert(err?.error?.message || 'Failed to update'),
      });
    }
  }

  // ─── Rule Actions ─────────────────────────────────────────────────────────
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

  // ─── Helpers ──────────────────────────────────────────────────────────────
  statusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
      case 'success':
        return 'badge-success';
      case 'paused':
      case 'skipped':
        return 'badge-neutral';
      case 'failed':
      case 'error':
        return 'badge-danger';
      case 'partial':
        return 'badge-warning';
      case 'running':
        return 'badge-info';
      default:
        return 'badge-neutral';
    }
  }

  triggerMeta(t: TriggerType): TriggerMeta {
    return (
      this.triggerCatalog.find((x) => x.type === t) ?? {
        type: t,
        label: t.replace(/_/g, ' '),
        icon: 'fi-rr-bolt',
        category: '',
        description: '',
      }
    );
  }

  actionMeta(t: ActionType): ActionMeta {
    return (
      this.actionCatalog.find((x) => x.type === t) ?? {
        type: t,
        label: t.replace(/_/g, ' '),
        icon: 'fi-rr-layers',
        category: '',
        description: '',
        configTemplate: {},
      }
    );
  }

  selectRule(id: string) {
    this.selectedRuleId.set(id);
  }

  configJson(action: AutomationAction): string {
    return JSON.stringify(action.config, null, 2);
  }
}
