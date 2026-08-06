import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';

export type FieldType = 'text' | 'dropdown' | 'checkbox' | 'date' | 'file';
export type FormCategory = 'registration' | 'survey' | 'hr' | 'other';
export type FormPlacement =
  'public_portal' | 'player_dashboard' | 'post_match_survey' | 'direct_link';
export type FormStatus = 'published' | 'draft' | 'archived';

export interface FormFieldConfig {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface DynamicForm {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  category: FormCategory;
  placement: FormPlacement;
  status: FormStatus;
  publishedAt?: string;
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
          'Displayed on Public Event Registration Portal during player onboarding.',
        category: 'registration',
        placement: 'public_portal',
        status: 'published',
        publishedAt: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 7,
        ).toISOString(),
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
        title: 'Post-Match Volunteer & Pitch Survey',
        description:
          'Prompted automatically to volunteers and pitch coordinators after match completion.',
        category: 'survey',
        placement: 'post_match_survey',
        status: 'published',
        publishedAt: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 3,
        ).toISOString(),
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

  async getPublicForm(formId: string): Promise<DynamicForm> {
    for (const [, forms] of this.formsStore) {
      const found = forms.find((f) => f.id === formId);
      if (found) return found;
    }
    throw new NotFoundException(`Public form "${formId}" not found`);
  }

  async createForm(
    workspaceId: string,
    payload: {
      title: string;
      description: string;
      category: FormCategory;
      placement?: FormPlacement;
      status?: FormStatus;
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
      placement: payload.placement || 'public_portal',
      status: payload.status || 'published',
      publishedAt: new Date().toISOString(),
      fields: payload.fields,
      createdAt: new Date().toISOString(),
    };

    this.formsStore.set(workspaceId, [newForm, ...currentList]);
    return newForm;
  }

  async updateFormStatus(
    workspaceId: string,
    formId: string,
    status: FormStatus,
    userId?: string,
  ): Promise<DynamicForm> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    const list =
      this.formsStore.get(workspaceId) ||
      this.formsStore.get('default-ws') ||
      [];
    const index = list.findIndex((f) => f.id === formId);

    if (index === -1) throw new NotFoundException(`Form "${formId}" not found`);

    list[index].status = status;
    if (status === 'published' && !list[index].publishedAt) {
      list[index].publishedAt = new Date().toISOString();
    }

    this.formsStore.set(workspaceId, list);
    return list[index];
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
