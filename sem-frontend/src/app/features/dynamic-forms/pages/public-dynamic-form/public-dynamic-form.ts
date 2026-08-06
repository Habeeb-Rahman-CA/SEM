import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  DynamicForm,
  FieldType,
  FrontendDynamicFormsService,
} from '../../services/dynamic-forms.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-public-dynamic-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-dynamic-form.html',
})
export class PublicDynamicFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private formsService = inject(FrontendDynamicFormsService);
  private ui = inject(UiService);

  formId = signal<string>('');
  form = signal<DynamicForm | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  submittedSuccess = signal<boolean>(false);
  submissionId = signal<string>('');

  formData = signal<Record<string, any>>({});

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('formId') ?? '';
      this.formId.set(id);
      if (id) this.loadForm();
    });
  }

  loadForm() {
    this.isLoading.set(true);
    this.error.set(null);
    this.formsService.getPublicForm(this.formId()).subscribe({
      next: (f) => {
        this.form.set(f);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Form not found or unavailable');
        this.isLoading.set(false);
      },
    });
  }

  updateField(fieldId: string, value: any) {
    this.formData.update((d) => ({ ...d, [fieldId]: value }));
  }

  submitForm() {
    const f = this.form();
    if (!f) return;

    // Basic validation
    for (const field of f.fields) {
      if (field.required && !this.formData()[field.id]) {
        this.ui.error(`Please complete the required field: "${field.label}"`);
        return;
      }
    }

    this.formsService.submitPublicForm(f.id, this.formData()).subscribe({
      next: (res) => {
        this.submissionId.set(res.id);
        this.submittedSuccess.set(true);
        this.ui.success('Form response submitted successfully!');
      },
      error: (err) => {
        this.ui.error(err?.error?.message ?? 'Failed to submit form');
      },
    });
  }

  fieldIcon(type: FieldType): string {
    return this.formsService.getFieldIcon(type);
  }
}
