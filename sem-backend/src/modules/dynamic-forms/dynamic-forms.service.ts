import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  DynamicFormEntity,
  FieldType,
  FormCategory,
  FormFieldConfig,
  FormPlacement,
  FormStatus,
} from './entities/dynamic-form.entity';
import { FormSubmissionEntity } from './entities/form-submission.entity';

export type {
  FieldType,
  FormCategory,
  FormFieldConfig,
  FormPlacement,
  FormStatus,
};

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
export class DynamicFormsService implements OnModuleInit {
  private inMemoryForms: Map<string, DynamicForm[]> = new Map();
  private inMemorySubmissions: Map<string, FormSubmission[]> = new Map();

  constructor(
    @InjectRepository(DynamicFormEntity)
    private readonly formsRepo: Repository<DynamicFormEntity>,
    @InjectRepository(FormSubmissionEntity)
    private readonly submissionsRepo: Repository<FormSubmissionEntity>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async onModuleInit() {
    await this.seedInitialForms();
  }

  private async seedInitialForms() {
    try {
      const count = await this.formsRepo.count();
      if (count === 0) {
        const form1 = this.formsRepo.create({
          workspaceId: 'default-ws',
          title: 'Player & Team Registration Form 2026',
          description:
            'Displayed on Public Event Registration Portal during player onboarding.',
          category: 'registration',
          placement: 'public_portal',
          status: 'published',
          publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
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
        });

        const form2 = this.formsRepo.create({
          workspaceId: 'default-ws',
          title: 'Post-Match Volunteer & Pitch Survey',
          description:
            'Prompted automatically to volunteers and pitch coordinators after match completion.',
          category: 'survey',
          placement: 'post_match_survey',
          status: 'published',
          publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
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
        });

        const saved1 = await this.formsRepo.save(form1);
        await this.formsRepo.save(form2);

        await this.submissionsRepo.save(
          this.submissionsRepo.create({
            formId: saved1.id,
            workspaceId: 'default-ws',
            data: {
              'field-1': 'Marcus Rashford',
              'field-2': 'Forward / Striker',
              'field-3': '1997-10-31',
              'field-4': true,
              'field-5': 'passport_rashford.pdf',
            },
          }),
        );
      }
    } catch {
      // In-memory fallback if database table is initializing
    }
  }

  async listForms(
    workspaceId: string,
    userId?: string,
  ): Promise<DynamicForm[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }
    try {
      const entities = await this.formsRepo.find({
        where: [{ workspaceId }, { workspaceId: 'default-ws' }],
        order: { createdAt: 'DESC' },
      });
      return entities.map((e) => this.mapFormEntity(e));
    } catch {
      return (
        this.inMemoryForms.get(workspaceId) ||
        this.inMemoryForms.get('default-ws') ||
        []
      );
    }
  }

  async getPublicForm(formId: string): Promise<DynamicForm> {
    try {
      const entity = await this.formsRepo.findOne({ where: { id: formId } });
      if (entity) return this.mapFormEntity(entity);
    } catch {
      // Fallback check memory
    }
    for (const [, forms] of this.inMemoryForms) {
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

    try {
      const newEntity = this.formsRepo.create({
        workspaceId,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        placement: payload.placement || 'public_portal',
        status: payload.status || 'published',
        publishedAt: new Date(),
        fields: payload.fields,
      });

      const saved = await this.formsRepo.save(newEntity);
      return this.mapFormEntity(saved);
    } catch {
      const currentList = this.inMemoryForms.get(workspaceId) || [];
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
      this.inMemoryForms.set(workspaceId, [newForm, ...currentList]);
      return newForm;
    }
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

    try {
      const entity = await this.formsRepo.findOne({ where: { id: formId } });
      if (entity) {
        entity.status = status;
        if (status === 'published' && !entity.publishedAt) {
          entity.publishedAt = new Date();
        }
        const updated = await this.formsRepo.save(entity);
        return this.mapFormEntity(updated);
      }
    } catch {
      // Memory fallback
    }

    const list =
      this.inMemoryForms.get(workspaceId) ||
      this.inMemoryForms.get('default-ws') ||
      [];
    const index = list.findIndex((f) => f.id === formId);
    if (index === -1) throw new NotFoundException(`Form "${formId}" not found`);

    list[index].status = status;
    if (status === 'published' && !list[index].publishedAt) {
      list[index].publishedAt = new Date().toISOString();
    }
    this.inMemoryForms.set(workspaceId, list);
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

    try {
      const newSub = this.submissionsRepo.create({
        formId,
        workspaceId,
        data: formData,
      });

      const saved = await this.submissionsRepo.save(newSub);
      return {
        id: saved.id,
        formId: saved.formId,
        workspaceId: saved.workspaceId,
        submittedAt: saved.submittedAt
          ? saved.submittedAt.toISOString()
          : new Date().toISOString(),
        data: saved.data,
      };
    } catch {
      const currentSubmissions = this.inMemorySubmissions.get(formId) || [];
      const submission: FormSubmission = {
        id: `sub-${Date.now()}`,
        formId,
        workspaceId,
        submittedAt: new Date().toISOString(),
        data: formData,
      };
      this.inMemorySubmissions.set(formId, [submission, ...currentSubmissions]);
      return submission;
    }
  }

  async listSubmissions(
    workspaceId: string,
    formId: string,
    userId?: string,
  ): Promise<FormSubmission[]> {
    if (userId) {
      await this.workspacesService.ensureMember(workspaceId, userId);
    }

    try {
      const entities = await this.submissionsRepo.find({
        where: { formId },
        order: { submittedAt: 'DESC' },
      });
      return entities.map((s) => ({
        id: s.id,
        formId: s.formId,
        workspaceId: s.workspaceId,
        submittedAt: s.submittedAt
          ? s.submittedAt.toISOString()
          : new Date().toISOString(),
        data: s.data,
      }));
    } catch {
      return this.inMemorySubmissions.get(formId) || [];
    }
  }

  private mapFormEntity(e: DynamicFormEntity): DynamicForm {
    return {
      id: e.id,
      workspaceId: e.workspaceId,
      title: e.title,
      description: e.description,
      category: e.category,
      placement: e.placement,
      status: e.status,
      publishedAt: e.publishedAt ? e.publishedAt.toISOString() : undefined,
      fields: e.fields || [],
      createdAt: e.createdAt
        ? e.createdAt.toISOString()
        : new Date().toISOString(),
    };
  }
}
