import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  EventTemplateService,
  EventTemplate,
  CreateTemplatePayload,
  InstantiateTemplatePayload,
} from '../../../services/event-template.service';
import { UiService } from '../../../services/ui.service';
import { WorkspaceEvent, Sport } from '../../../services/workspace.service';
import { Workspace } from '../../../services/workspace.service';

type ModalView = 'list' | 'create' | 'edit' | 'instantiate' | 'save-from-event';

@Component({
  selector: 'app-event-templates-modal',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './event-templates-modal.html',
  styleUrl: './event-templates-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventTemplatesModalComponent implements OnInit {
  // ── Inputs / Outputs ──────────────────────────────────────────────────────
  workspace = input.required<Workspace | null>();
  sports = input<Sport[]>([]);
  events = input<WorkspaceEvent[]>([]);

  /** Emitted when the user instantiates a template (new event created) */
  eventCreated = output<WorkspaceEvent>();
  closed = output<void>();

  // ── Services ──────────────────────────────────────────────────────────────
  private templateService = inject(EventTemplateService);
  private uiService = inject(UiService);

  // ── State ─────────────────────────────────────────────────────────────────
  view = signal<ModalView>('list');
  templates = signal<EventTemplate[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);

  selectedTemplate = signal<EventTemplate | null>(null);
  searchQuery = signal('');

  filteredTemplates = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.templates();
    return this.templates().filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.sport && t.sport.toLowerCase().includes(q)),
    );
  });

  // ── Create / Edit form ────────────────────────────────────────────────────
  formName = signal('');
  formDescription = signal('');
  formLogoUrl = signal('');
  formSport = signal('');
  formVenue = signal('');
  formOrganizers = signal('');
  formRegistrationStatus = signal('open');
  formIsPublic = signal(false);

  // ── Instantiate form ──────────────────────────────────────────────────────
  instantiateName = signal('');
  instantiateStartDate = signal('');
  instantiateEndDate = signal('');

  // ── Save-from-event form ──────────────────────────────────────────────────
  saveFromEventId = signal('');
  saveFromEventTemplateName = signal('');

  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadTemplates();
  }

  close() {
    this.closed.emit();
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  loadTemplates() {
    const ws = this.workspace();
    if (!ws) return;
    this.isLoading.set(true);
    this.templateService.getTemplates(ws.id).subscribe({
      next: (list) => {
        this.templates.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load templates', err);
        this.isLoading.set(false);
      },
    });
  }

  // ── Navigation helpers ────────────────────────────────────────────────────

  openCreateView() {
    this.resetForm();
    this.view.set('create');
  }

  openEditView(template: EventTemplate) {
    this.selectedTemplate.set(template);
    this.formName.set(template.name);
    this.formDescription.set(template.description ?? '');
    this.formLogoUrl.set(template.logoUrl ?? '');
    this.formSport.set(template.sport ?? '');
    this.formVenue.set(template.venue ?? '');
    this.formOrganizers.set(template.organizers ?? '');
    this.formRegistrationStatus.set(template.defaultRegistrationStatus);
    this.formIsPublic.set(template.defaultIsPublic);
    this.view.set('edit');
  }

  openInstantiateView(template: EventTemplate) {
    this.selectedTemplate.set(template);
    this.instantiateName.set(`${template.name} (Copy)`);
    this.instantiateStartDate.set('');
    this.instantiateEndDate.set('');
    this.view.set('instantiate');
  }

  openSaveFromEventView() {
    this.saveFromEventId.set('');
    this.saveFromEventTemplateName.set('');
    this.view.set('save-from-event');
  }

  backToList() {
    this.view.set('list');
    this.selectedTemplate.set(null);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  saveTemplate() {
    const ws = this.workspace();
    if (!ws) return;
    const name = this.formName().trim();
    if (!name) {
      this.uiService.error('Template name is required.');
      return;
    }

    const payload: CreateTemplatePayload = {
      name,
      description: this.formDescription().trim() || undefined,
      logoUrl: this.formLogoUrl().trim() || undefined,
      sport: this.formSport().trim() || undefined,
      venue: this.formVenue().trim() || undefined,
      organizers: this.formOrganizers().trim() || undefined,
      defaultRegistrationStatus: this.formRegistrationStatus(),
      defaultIsPublic: this.formIsPublic(),
    };

    this.isSaving.set(true);
    const isEdit = this.view() === 'edit';
    const obs = isEdit
      ? this.templateService.updateTemplate(ws.id, this.selectedTemplate()!.id, payload)
      : this.templateService.createTemplate(ws.id, payload);

    obs.subscribe({
      next: (saved) => {
        if (isEdit) {
          this.templates.update((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
          this.uiService.success(`Template "${saved.name}" updated.`);
        } else {
          this.templates.update((prev) => [saved, ...prev]);
          this.uiService.success(`Template "${saved.name}" created.`);
        }
        this.isSaving.set(false);
        this.backToList();
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to save template.');
        this.isSaving.set(false);
      },
    });
  }

  async deleteTemplate(template: EventTemplate) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Template',
      message: `Delete template "${template.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.templateService.deleteTemplate(ws.id, template.id).subscribe({
      next: () => {
        this.templates.update((prev) => prev.filter((t) => t.id !== template.id));
        this.uiService.success(`Template "${template.name}" deleted.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete template.');
      },
    });
  }

  // ── Instantiate ───────────────────────────────────────────────────────────

  instantiate() {
    const ws = this.workspace();
    const template = this.selectedTemplate();
    if (!ws || !template) return;

    const name = this.instantiateName().trim();
    if (!name) {
      this.uiService.error('Event name is required.');
      return;
    }

    const payload: InstantiateTemplatePayload = {
      name,
      startDate: this.instantiateStartDate() || undefined,
      endDate: this.instantiateEndDate() || undefined,
    };

    this.isSaving.set(true);
    this.templateService.instantiateTemplate(ws.id, template.id, payload).subscribe({
      next: (newEvent) => {
        this.uiService.success(`Event "${newEvent.name}" created from template!`);
        this.isSaving.set(false);
        // Bump template use count in UI
        this.templates.update((prev) =>
          prev.map((t) => (t.id === template.id ? { ...t, useCount: t.useCount + 1 } : t)),
        );
        this.eventCreated.emit(newEvent);
        this.close();
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to create event.');
        this.isSaving.set(false);
      },
    });
  }

  // ── Save from event ───────────────────────────────────────────────────────

  saveFromEvent() {
    const ws = this.workspace();
    if (!ws) return;
    const eventId = this.saveFromEventId();
    const name = this.saveFromEventTemplateName().trim();
    if (!eventId) {
      this.uiService.error('Please select a source event.');
      return;
    }
    if (!name) {
      this.uiService.error('Template name is required.');
      return;
    }

    this.isSaving.set(true);
    this.templateService.createFromEvent(ws.id, eventId, name).subscribe({
      next: (saved) => {
        this.templates.update((prev) => [saved, ...prev]);
        this.uiService.success(`Template "${saved.name}" saved from event.`);
        this.isSaving.set(false);
        this.backToList();
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to save template.');
        this.isSaving.set(false);
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private resetForm() {
    this.formName.set('');
    this.formDescription.set('');
    this.formLogoUrl.set('');
    this.formSport.set('');
    this.formVenue.set('');
    this.formOrganizers.set('');
    this.formRegistrationStatus.set('open');
    this.formIsPublic.set(false);
  }

  templateCompetitionCount(template: EventTemplate): number {
    return template.competitionBlueprints?.length ?? 0;
  }

  showDatePicker(event: any) {
    if (event.target && typeof event.target.showPicker === 'function') {
      try {
        event.target.showPicker();
      } catch {}
    }
  }
}
