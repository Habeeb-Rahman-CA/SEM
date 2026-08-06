import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  DynamicForm,
  FieldType,
  FormCategory,
  FormFieldConfig,
  FormPlacement,
  FormStatus,
  FormSubmission,
  FrontendDynamicFormsService,
} from '../../services/dynamic-forms.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-dynamic-forms-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dynamic-forms-manager.html',
})
export class DynamicFormsManagerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private formsService = inject(FrontendDynamicFormsService);
  private ui = inject(UiService);

  workspaceId = signal<string>('');
  forms = signal<DynamicForm[]>([]);
  selectedForm = signal<DynamicForm | null>(null);
  submissions = signal<FormSubmission[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Active View Tab: 'preview' | 'placement' | 'responses'
  activeView = signal<'preview' | 'placement' | 'responses'>('preview');

  // Interactive Form Preview Model Data
  previewFormData = signal<Record<string, any>>({});

  // Builder Modal State
  builderModalOpen = signal<boolean>(false);
  newFormTitle = signal('');
  newFormDescription = signal('');
  newFormCategory = signal<FormCategory>('registration');
  newFormPlacement = signal<FormPlacement>('public_portal');
  builderFields = signal<FormFieldConfig[]>([
    { id: 'f-1', label: 'Full Name', type: 'text', placeholder: 'Enter full name', required: true },
    {
      id: 'f-2',
      label: 'Registration Category',
      type: 'dropdown',
      required: true,
      options: ['Player', 'Official', 'Staff'],
    },
  ]);

  // Field Add Inputs
  newFieldLabel = signal('');
  newFieldType = signal<FieldType>('text');
  newFieldPlaceholder = signal('');
  newFieldRequired = signal(false);
  newFieldOptionsRaw = signal('');

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
    this.formsService.listForms(this.workspaceId()).subscribe({
      next: (list) => {
        this.forms.set(list);
        if (list.length > 0) {
          this.selectForm(list[0]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load dynamic forms');
        this.isLoading.set(false);
      },
    });
  }

  selectForm(form: DynamicForm) {
    this.selectedForm.set(form);
    this.previewFormData.set({});
    this.loadSubmissions(form.id);
  }

  loadSubmissions(formId: string) {
    this.formsService.listSubmissions(this.workspaceId(), formId).subscribe({
      next: (list) => this.submissions.set(list),
      error: () => this.submissions.set([]),
    });
  }

  togglePublishStatus(form: DynamicForm) {
    const nextStatus: FormStatus = form.status === 'published' ? 'draft' : 'published';
    this.formsService.updateFormStatus(this.workspaceId(), form.id, nextStatus).subscribe({
      next: (updated) => {
        this.forms.update((list) => list.map((f) => (f.id === updated.id ? updated : f)));
        this.selectedForm.set(updated);
        this.ui.success(
          nextStatus === 'published'
            ? `Published "${form.title}" live across assigned portals!`
            : `Unpublished "${form.title}" back to draft status.`,
        );
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to update form status');
      },
    });
  }

  copyShareableLink(form: DynamicForm) {
    const link = `${window.location.origin}/public/forms/${form.id}`;
    navigator.clipboard.writeText(link);
    this.ui.success('Copied public shareable link to clipboard!');
  }

  copyEmbedCode(form: DynamicForm) {
    const embed = `<iframe src="${window.location.origin}/public/forms/${form.id}" width="100%" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embed);
    this.ui.success('Copied HTML embed snippet to clipboard!');
  }

  // Builder actions
  addFieldToBuilder() {
    const label = this.newFieldLabel().trim();
    if (!label) {
      this.ui.error('Please specify a field label.');
      return;
    }

    const type = this.newFieldType();
    const options =
      type === 'dropdown'
        ? this.newFieldOptionsRaw()
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const newField: FormFieldConfig = {
      id: `field-${Date.now()}`,
      label,
      type,
      placeholder: this.newFieldPlaceholder().trim() || undefined,
      required: this.newFieldRequired(),
      options,
    };

    this.builderFields.update((list) => [...list, newField]);
    this.newFieldLabel.set('');
    this.newFieldPlaceholder.set('');
    this.newFieldRequired.set(false);
    this.newFieldOptionsRaw.set('');
    this.ui.success(`Added "${label}" field to form builder.`);
  }

  removeFieldFromBuilder(fieldId: string) {
    this.builderFields.update((list) => list.filter((f) => f.id !== fieldId));
  }

  openBuilderModal() {
    this.builderModalOpen.set(true);
  }

  closeBuilderModal() {
    this.builderModalOpen.set(false);
  }

  saveCustomForm() {
    const title = this.newFormTitle().trim();
    if (!title) {
      this.ui.error('Please enter a form title.');
      return;
    }

    if (this.builderFields().length === 0) {
      this.ui.error('Please add at least 1 field to your form.');
      return;
    }

    const payload = {
      title,
      description: this.newFormDescription().trim() || 'Custom workspace dynamic form.',
      category: this.newFormCategory(),
      placement: this.newFormPlacement(),
      status: 'published' as const,
      fields: this.builderFields(),
    };

    this.formsService.createForm(this.workspaceId(), payload).subscribe({
      next: (created) => {
        this.ui.success(
          `Created dynamic form "${created.title}" and published to ${this.placementLabel(created.placement)}!`,
        );
        this.closeBuilderModal();
        this.newFormTitle.set('');
        this.newFormDescription.set('');
        this.load();
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to create form');
      },
    });
  }

  submitPreviewForm() {
    const form = this.selectedForm();
    if (!form) return;

    this.formsService.submitForm(this.workspaceId(), form.id, this.previewFormData()).subscribe({
      next: (sub) => {
        this.ui.success(`Form submitted successfully! Response ID: ${sub.id}`);
        this.previewFormData.set({});
        this.loadSubmissions(form.id);
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to submit form');
      },
    });
  }

  updatePreviewField(fieldId: string, value: any) {
    this.previewFormData.update((d) => ({ ...d, [fieldId]: value }));
  }

  fieldIcon(type: FieldType): string {
    return this.formsService.getFieldIcon(type);
  }

  categoryBadge(cat: FormCategory): string {
    return this.formsService.getCategoryBadgeClass(cat);
  }

  placementLabel(p: FormPlacement): string {
    return this.formsService.getPlacementLabel(p);
  }

  placementIcon(p: FormPlacement): string {
    return this.formsService.getPlacementIcon(p);
  }
}
