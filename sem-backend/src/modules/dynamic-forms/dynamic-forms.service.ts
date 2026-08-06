import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';

export type FieldType = 'text' | 'dropdown' | 'checkbox' | 'date' | 'file';
export type FormCategory = 'registration' | 'survey' | 'hr' | 'other';

export interface FormFieldConfig {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for dropdown
}

export interface DynamicForm {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  category: FormCategory;
  fields: FormFieldConfig[];
  createdAt: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  workspaceId: string;
  submittedAt: string;
  data: Record<string, any>;
}

@Injectable()
export class DynamicFormsService {
  private formsStore: Map<string, DynamicForm[]> = new Map();
  private submissionsStore: Map<string, FormSubmission[]> = new Map();

  constructor(private readonly workspacesService: WorkspacesService) {
    this.seedInitialForms();
  }

  private seedInitialForms() {
    const defaultForms: DynamicForm[] = [
      {
        id: 'form-101',
        workspaceId: 'default-ws',
        title: 'Player & Team Registration Form 2026',
        description:
          'No-code form for registering new tournament players and team staff.',
        category: 'registration',
        fields: [
          {
            id: 'field-1',
            label: 'Full Name',
            type: 'text',
            placeholder: 'e.g. John Doe',
            required: true,
          },
          {
            id: 'field-2',
            label: 'Preferred Playing Position',
            type: 'dropdown',
            placeholder: 'Select Position',
            required: true,
            options: [
              'Forward / Striker',
              'Midfielder',
              'Defender',
              'Goalkeeper',
            ],
          },
          {
            id: 'field-3',
            label: 'Date of Birth',
            type: 'date',
            required: true,
          },
          {
            id: 'field-4',
            label: 'Medical Waiver Agreement',
            type: 'checkbox',
            required: true,
          },
          {
            id: 'field-5',
            label: 'ID / Passport Document',
            type: 'file',
            required: false,
          },
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      },
      {
        id: 'form-102',
        workspaceId: 'default-ws',
        title: 'Post-Match Volunteer Survey',
        description:
          'Feedback survey for tournament volunteers and pitch coordinators.',
        category: 'survey',
        fields: [
          {
            id: 'field-201',
            label: 'Volunteer Full Name',
            type: 'text',
            placeholder: 'Enter name',
            required: true,
          },
          {
            id: 'field-202',
            label: 'Assigned Stadium Pitch',
            type: 'dropdown',
            required: true,
            options: [
              'Main Stadium Pitch 1',
              'Auxiliary Pitch 2',
              'Practice Pitch 3',
            ],
          },
          {
            id: 'field-203',
            label: 'Shift Date',
            type: 'date',
            required: true,
          },
          {
            id: 'field-204',
            label: 'Would you volunteer again?',
            type: 'checkbox',
            required: false,
          },
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      },
    ];

    this.formsStore.set('default-ws', defaultForms);

    // Initial mock submissions
    this.submissionsStore.set('form-101', [
      {
        id: 'sub-1',
        formId: 'form-101',
        workspaceId: 'default-ws',
        submittedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        data: {
          'field-1': 'Marcus Rashford',
          'field-2': 'Forward / Striker',
          'field-3': '1997-10-31',
          'field-4': true,
          'field-5': 'passport_rashford.pdf',
        },
      },
    ]);
  }

  async listForms(
    workspaceId: string,
    userId?: string,
  ): Promise<DynamicForm[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    return (
      this.formsStore.get(workspaceId) ||
      this.formsStore.get('default-ws') ||
      []
    );
  }

  async createForm(
    workspaceId: string,
    payload: {
      title: string;
      description: string;
      category: FormCategory;
      fields: FormFieldConfig[];
    },
    userId?: string,
  ): Promise<DynamicForm> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const currentList = this.formsStore.get(workspaceId) || [];
    const newForm: DynamicForm = {
      id: `form-${Date.now()}`,
      workspaceId,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      fields: payload.fields,
      createdAt: new Date().toISOString(),
    };

    this.formsStore.set(workspaceId, [newForm, ...currentList]);
    return newForm;
  }

  async submitForm(
    workspaceId: string,
    formId: string,
    formData: Record<string, any>,
    userId?: string,
  ): Promise<FormSubmission> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const forms =
      this.formsStore.get(workspaceId) ||
      this.formsStore.get('default-ws') ||
      [];
    const form = forms.find((f) => f.id === formId);
    if (!form) throw new NotFoundException(`Form "${formId}" not found`);

    const currentSubmissions = this.submissionsStore.get(formId) || [];
    const submission: FormSubmission = {
      id: `sub-${Date.now()}`,
      formId,
      workspaceId,
      submittedAt: new Date().toISOString(),
      data: formData,
    };

    this.submissionsStore.set(formId, [submission, ...currentSubmissions]);
    return submission;
  }

  async listSubmissions(
    workspaceId: string,
    formId: string,
    userId?: string,
  ): Promise<FormSubmission[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    return this.submissionsStore.get(formId) || [];
  }
}
