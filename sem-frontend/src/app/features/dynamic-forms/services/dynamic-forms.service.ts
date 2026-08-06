import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type FieldType = 'text' | 'dropdown' | 'checkbox' | 'date' | 'file';
export type FormCategory = 'registration' | 'survey' | 'hr' | 'other';

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

@Injectable({ providedIn: 'root' })
export class FrontendDynamicFormsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private wsBase(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/dynamic-forms`;
  }

  listForms(workspaceId: string): Observable<DynamicForm[]> {
    return this.http.get<DynamicForm[]>(this.wsBase(workspaceId), {
      headers: this.authHeaders,
    });
  }

  createForm(
    workspaceId: string,
    payload: {
      title: string;
      description: string;
      category: FormCategory;
      fields: FormFieldConfig[];
    },
  ): Observable<DynamicForm> {
    return this.http.post<DynamicForm>(this.wsBase(workspaceId), payload, {
      headers: this.authHeaders,
    });
  }

  listSubmissions(workspaceId: string, formId: string): Observable<FormSubmission[]> {
    return this.http.get<FormSubmission[]>(`${this.wsBase(workspaceId)}/${formId}/submissions`, {
      headers: this.authHeaders,
    });
  }

  submitForm(
    workspaceId: string,
    formId: string,
    formData: Record<string, any>,
  ): Observable<FormSubmission> {
    return this.http.post<FormSubmission>(
      `${this.wsBase(workspaceId)}/${formId}/submit`,
      { data: formData },
      { headers: this.authHeaders },
    );
  }

  getFieldIcon(type: FieldType): string {
    switch (type) {
      case 'text':
        return 'fi fi-rr-edit';
      case 'dropdown':
        return 'fi fi-rr-caret-down';
      case 'checkbox':
        return 'fi fi-rr-checkbox';
      case 'date':
        return 'fi fi-rr-calendar';
      case 'file':
        return 'fi fi-rr-file-upload';
      default:
        return 'fi fi-rr-form';
    }
  }

  getCategoryBadgeClass(category: FormCategory): string {
    switch (category) {
      case 'registration':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'survey':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'hr':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  }
}
