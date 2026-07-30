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
import {
  EventTemplateService,
  EventTemplate,
  CreateTemplatePayload,
  InstantiateTemplatePayload,
} from '../../../services/event-template.service';
import {
  CompetitionTemplateService,
  CompetitionTemplate,
} from '../../../services/competition-template.service';
import {
  FixtureTemplateService,
  FixtureTemplate,
} from '../../../services/fixture-template.service';
import { UiService } from '../../../services/ui.service';
import { WorkspaceEvent, Sport, Competition } from '../../../services/workspace.service';
import { Workspace } from '../../../services/workspace.service';
import { CompetitionService } from '../../../services/competition.service';

type ModalView =
  | 'list'
  | 'create'
  | 'edit'
  | 'instantiate'
  | 'save-from-event'
  | 'create-fixture'
  | 'edit-fixture'
  | 'edit-competition'
  | 'save-from-competition';

@Component({
  selector: 'app-event-templates-modal',
  standalone: true,
  imports: [FormsModule],
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
  private competitionTemplateService = inject(CompetitionTemplateService);
  private fixtureTemplateService = inject(FixtureTemplateService);
  private competitionService = inject(CompetitionService);
  private uiService = inject(UiService);

  // ── State ─────────────────────────────────────────────────────────────────
  view = signal<ModalView>('list');
  templateTab = signal<'event' | 'competition' | 'fixture'>('event');

  templates = signal<EventTemplate[]>([]);
  competitionTemplates = signal<CompetitionTemplate[]>([]);
  fixtureTemplates = signal<FixtureTemplate[]>([]);

  isLoading = signal(false);
  isSaving = signal(false);

  selectedTemplate = signal<EventTemplate | null>(null);
  selectedCompetitionTemplate = signal<CompetitionTemplate | null>(null);
  selectedFixtureTemplate = signal<FixtureTemplate | null>(null);

  searchQuery = signal('');

  // ── Event Template Form ───────────────────────────────────────────────────
  formName = signal('');
  formDescription = signal('');
  formLogoUrl = signal('');
  formSport = signal('');
  formVenue = signal('');
  formOrganizers = signal('');
  formRegistrationStatus = signal('open');
  formIsPublic = signal(false);

  // ── Instantiate Form ──────────────────────────────────────────────────────
  instantiateName = signal('');
  instantiateStartDate = signal('');
  instantiateEndDate = signal('');

  // ── Save-from-event Form ──────────────────────────────────────────────────
  saveFromEventId = signal('');
  saveFromEventTemplateName = signal('');

  // ── Save-from-competition Form ────────────────────────────────────────────
  saveFromCompetitionEventId = signal('');
  saveFromCompetitionId = signal('');
  saveFromCompetitionTemplateName = signal('');
  saveFromCompetitionCompetitions = signal<Competition[]>([]);

  // ── Competition Template Edit Form ────────────────────────────────────────
  compFormName = signal('');
  compFormDescription = signal('');

  // ── Fixture Template Form ─────────────────────────────────────────────────
  fixFormName = signal('');
  fixFormDescription = signal('');
  fixFormDefaultKickoffTime = signal('15:00');
  fixFormMatchIntervalDays = signal(1);
  fixFormMatchesPerDay = signal(2);
  fixFormGapBetweenMatchesMinutes = signal(120);
  fixFormVenueStrategy = signal('rotate_venues');

  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadTemplates();
  }

  close() {
    this.closed.emit();
  }

  // ── Tab selection ─────────────────────────────────────────────────────────

  setTab(tab: 'event' | 'competition' | 'fixture') {
    this.templateTab.set(tab);
    this.searchQuery.set('');
    this.view.set('list');
    this.loadTemplates();
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  loadTemplates() {
    const ws = this.workspace();
    if (!ws) return;
    this.isLoading.set(true);

    const tab = this.templateTab();
    if (tab === 'event') {
      this.templateService.getTemplates(ws.id).subscribe({
        next: (list) => {
          this.templates.set(list || []);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load templates', err);
          this.isLoading.set(false);
        },
      });
    } else if (tab === 'competition') {
      this.competitionTemplateService.getTemplates(ws.id).subscribe({
        next: (list) => {
          this.competitionTemplates.set(list || []);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load competition templates', err);
          this.isLoading.set(false);
        },
      });
    } else {
      this.fixtureTemplateService.getTemplates(ws.id).subscribe({
        next: (list) => {
          this.fixtureTemplates.set(list || []);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load fixture templates', err);
          this.isLoading.set(false);
        },
      });
    }
  }

  // ── Navigation helpers ────────────────────────────────────────────────────

  openCreateView() {
    if (this.templateTab() === 'event') {
      this.resetEventForm();
      this.view.set('create');
    } else if (this.templateTab() === 'fixture') {
      this.resetFixtureForm();
      this.view.set('create-fixture');
    }
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

  openEditCompetitionView(template: CompetitionTemplate) {
    this.selectedCompetitionTemplate.set(template);
    this.compFormName.set(template.name);
    this.compFormDescription.set(template.description ?? '');
    this.view.set('edit-competition');
  }

  openEditFixtureView(template: FixtureTemplate) {
    this.selectedFixtureTemplate.set(template);
    this.fixFormName.set(template.name);
    this.fixFormDescription.set(template.description ?? '');
    this.fixFormDefaultKickoffTime.set(template.defaultKickoffTime ?? '15:00');
    this.fixFormMatchIntervalDays.set(template.matchIntervalDays ?? 1);
    this.fixFormMatchesPerDay.set(template.matchesPerDay ?? 1);
    this.fixFormGapBetweenMatchesMinutes.set(template.gapBetweenMatchesMinutes ?? 120);
    this.fixFormVenueStrategy.set(template.venueStrategy ?? 'rotate_venues');
    this.view.set('edit-fixture');
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

  openSaveFromCompetitionView() {
    const ws = this.workspace();
    if (!ws) return;
    this.saveFromCompetitionEventId.set('');
    this.saveFromCompetitionId.set('');
    this.saveFromCompetitionTemplateName.set('');
    this.saveFromCompetitionCompetitions.set([]);
    this.view.set('save-from-competition');
  }

  onSaveFromCompetitionEventChange(eventId: string) {
    const ws = this.workspace();
    if (!ws || !eventId) {
      this.saveFromCompetitionCompetitions.set([]);
      return;
    }
    this.competitionService.getCompetitions(ws.id, eventId).subscribe({
      next: (list: Competition[]) => {
        this.saveFromCompetitionCompetitions.set(list || []);
      },
      error: (err: any) => {
        console.error('Failed to load event competitions', err);
        this.saveFromCompetitionCompetitions.set([]);
      },
    });
  }

  backToList() {
    this.view.set('list');
    this.selectedTemplate.set(null);
    this.selectedCompetitionTemplate.set(null);
    this.selectedFixtureTemplate.set(null);
  }

  // ── Event Template CRUD ───────────────────────────────────────────────────

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

  // ── Competition Template CRUD ─────────────────────────────────────────────

  saveCompetitionTemplate() {
    const ws = this.workspace();
    if (!ws) return;
    const name = this.compFormName().trim();
    if (!name) {
      this.uiService.error('Blueprint name is required.');
      return;
    }

    this.isSaving.set(true);
    const target = this.selectedCompetitionTemplate()!;
    this.competitionTemplateService
      .updateTemplate(ws.id, target.id, {
        name,
        description: this.compFormDescription().trim() || undefined,
      })
      .subscribe({
        next: (saved) => {
          this.competitionTemplates.update((prev) =>
            prev.map((t) => (t.id === saved.id ? saved : t)),
          );
          this.uiService.success(`Competition blueprint "${saved.name}" updated.`);
          this.isSaving.set(false);
          this.backToList();
        },
        error: (err) => {
          this.uiService.error(err.error?.message ?? 'Failed to update competition blueprint.');
          this.isSaving.set(false);
        },
      });
  }

  async deleteCompetitionTemplate(template: CompetitionTemplate) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Blueprint',
      message: `Delete competition blueprint "${template.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.competitionTemplateService.deleteTemplate(ws.id, template.id).subscribe({
      next: () => {
        this.competitionTemplates.update((prev) => prev.filter((t) => t.id !== template.id));
        this.uiService.success(`Competition blueprint "${template.name}" deleted.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete competition blueprint.');
      },
    });
  }

  saveFromCompetition() {
    const ws = this.workspace();
    if (!ws) return;
    const eventId = this.saveFromCompetitionEventId();
    const compId = this.saveFromCompetitionId();
    const name = this.saveFromCompetitionTemplateName().trim();

    if (!eventId || !compId) {
      this.uiService.error('Please select an event and competition.');
      return;
    }
    if (!name) {
      this.uiService.error('Blueprint name is required.');
      return;
    }

    this.isSaving.set(true);
    this.competitionTemplateService.createFromCompetition(ws.id, eventId, compId, name).subscribe({
      next: (saved) => {
        this.competitionTemplates.update((prev) => [saved, ...prev]);
        this.uiService.success(`Competition blueprint "${saved.name}" saved.`);
        this.isSaving.set(false);
        this.backToList();
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to save competition blueprint.');
        this.isSaving.set(false);
      },
    });
  }

  // ── Fixture Template CRUD ─────────────────────────────────────────────────

  saveFixtureTemplate() {
    const ws = this.workspace();
    if (!ws) return;
    const name = this.fixFormName().trim();
    if (!name) {
      this.uiService.error('Template name is required.');
      return;
    }

    const payload = {
      name,
      description: this.fixFormDescription().trim() || undefined,
      defaultKickoffTime: this.fixFormDefaultKickoffTime().trim() || undefined,
      matchIntervalDays: Number(this.fixFormMatchIntervalDays()),
      matchesPerDay: Number(this.fixFormMatchesPerDay()),
      gapBetweenMatchesMinutes: Number(this.fixFormGapBetweenMatchesMinutes()),
      venueStrategy: this.fixFormVenueStrategy(),
    };

    this.isSaving.set(true);
    const isEdit = this.view() === 'edit-fixture';
    const obs = isEdit
      ? this.fixtureTemplateService.updateTemplate(
          ws.id,
          this.selectedFixtureTemplate()!.id,
          payload,
        )
      : this.fixtureTemplateService.createTemplate(ws.id, payload);

    obs.subscribe({
      next: (saved) => {
        if (isEdit) {
          this.fixtureTemplates.update((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
          this.uiService.success(`Scheduling template "${saved.name}" updated.`);
        } else {
          this.fixtureTemplates.update((prev) => [saved, ...prev]);
          this.uiService.success(`Scheduling template "${saved.name}" created.`);
        }
        this.isSaving.set(false);
        this.backToList();
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to save scheduling template.');
        this.isSaving.set(false);
      },
    });
  }

  async deleteFixtureTemplate(template: FixtureTemplate) {
    const ws = this.workspace();
    if (!ws) return;
    const confirmed = await this.uiService.confirm({
      title: 'Delete Template',
      message: `Delete scheduling template "${template.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!confirmed) return;

    this.fixtureTemplateService.deleteTemplate(ws.id, template.id).subscribe({
      next: () => {
        this.fixtureTemplates.update((prev) => prev.filter((t) => t.id !== template.id));
        this.uiService.success(`Scheduling template "${template.name}" deleted.`);
      },
      error: (err) => {
        this.uiService.error(err.error?.message ?? 'Failed to delete scheduling template.');
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

  private resetEventForm() {
    this.formName.set('');
    this.formDescription.set('');
    this.formLogoUrl.set('');
    this.formSport.set('');
    this.formVenue.set('');
    this.formOrganizers.set('');
    this.formRegistrationStatus.set('open');
    this.formIsPublic.set(false);
  }

  private resetFixtureForm() {
    this.fixFormName.set('');
    this.fixFormDescription.set('');
    this.fixFormDefaultKickoffTime.set('15:00');
    this.fixFormMatchIntervalDays.set(1);
    this.fixFormMatchesPerDay.set(2);
    this.fixFormGapBetweenMatchesMinutes.set(120);
    this.fixFormVenueStrategy.set('rotate_venues');
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
