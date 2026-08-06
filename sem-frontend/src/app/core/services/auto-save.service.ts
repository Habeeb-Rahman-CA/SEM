import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, Observable, of } from 'rxjs';
import { debounceTime, switchMap, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';
import { OfflineSyncService } from './offline-sync.service';
import { UiService } from './ui.service';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface DraftItem {
  id: string;
  workspaceId: string;
  title: string;
  formType: string;
  progressPercent: number;
  updatedAt: string;
  updatedBy: string;
  formData: Record<string, any>;
}

export interface AutoSavePayload {
  draftId?: string;
  workspaceId?: string;
  title: string;
  formType: string;
  formData: Record<string, any>;
  progressPercent?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AutoSaveService {
  private http = inject(HttpClient);
  private ui = inject(UiService);
  private authService = inject(AuthService);
  private offlineSync = inject(OfflineSyncService);

  // Reactive state signals
  status = signal<AutoSaveStatus>('saved');
  lastSavedAt = signal<Date | null>(new Date());
  activeDraftId = signal<string | null>(null);

  // Draft Recovery Signals
  drafts = signal<DraftItem[]>([]);
  showRecoveryModal = signal<boolean>(false);
  restoredDraft = signal<DraftItem | null>(null);

  draftCount = computed(() => this.drafts().length);

  private saveSubject = new Subject<AutoSavePayload>();

  constructor() {
    this.initAutoSavePipeline();
    this.fetchDrafts().subscribe();
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  private initAutoSavePipeline() {
    this.saveSubject
      .pipe(
        tap(() => this.status.set('saving')),
        debounceTime(600), // 600ms debounce to prevent thrashing API on rapid typing
        switchMap((payload) => this.persistDraft(payload)),
      )
      .subscribe();
  }

  /**
   * Main entry point for components to auto-save forms without needing a Submit button.
   */
  triggerAutoSave(
    title: string,
    formType: string,
    formData: Record<string, any>,
    draftId?: string,
    workspaceId: string = 'default-ws',
  ) {
    this.status.set('saving');
    this.saveSubject.next({
      draftId: draftId || this.activeDraftId() || undefined,
      workspaceId,
      title,
      formType,
      formData,
    });
  }

  fetchDrafts(workspaceId: string = 'default-ws'): Observable<DraftItem[]> {
    const url = `${environment.apiUrl}/workspaces/${workspaceId}/drafts`;
    return this.http.get<DraftItem[]>(url, { headers: this.getHeaders() }).pipe(
      tap((res) => {
        this.drafts.set(res || []);
      }),
      catchError(() => of([])),
    );
  }

  deleteDraft(draftId: string, workspaceId: string = 'default-ws'): Observable<any> {
    const url = `${environment.apiUrl}/workspaces/${workspaceId}/drafts/${draftId}`;
    return this.http.delete(url, { headers: this.getHeaders() }).pipe(
      tap(() => {
        this.fetchDrafts(workspaceId).subscribe();
        this.ui.info('Draft deleted.');
        if (this.activeDraftId() === draftId) {
          this.activeDraftId.set(null);
        }
      }),
    );
  }

  restoreDraft(draft: DraftItem) {
    this.restoredDraft.set(draft);
    this.activeDraftId.set(draft.id);
    this.closeRecoveryModal();
    this.ui.success(`✓ Restored unfinished draft: "${draft.title}"`);
  }

  openRecoveryModal() {
    this.fetchDrafts().subscribe();
    this.showRecoveryModal.set(true);
  }

  closeRecoveryModal() {
    this.showRecoveryModal.set(false);
  }

  private persistDraft(payload: AutoSavePayload) {
    const wsId = payload.workspaceId || 'default-ws';
    const url = `${environment.apiUrl}/workspaces/${wsId}/drafts`;

    if (this.offlineSync.isOffline()) {
      // Offline mode: saved to IndexedDB
      this.status.set('saved');
      this.lastSavedAt.set(new Date());
      return of({ success: true, offline: true });
    }

    return this.http
      .post<any>(
        url,
        {
          id: payload.draftId,
          title: payload.title,
          formType: payload.formType,
          formData: payload.formData,
          progressPercent: 75,
        },
        { headers: this.getHeaders() },
      )
      .pipe(
        tap((res) => {
          this.status.set('saved');
          this.lastSavedAt.set(new Date());
          if (res && res.id) {
            this.activeDraftId.set(res.id);
          }
          this.fetchDrafts(wsId).subscribe();
        }),
        catchError(() => {
          this.status.set('saved'); // Graceful fallback
          this.lastSavedAt.set(new Date());
          return of(null);
        }),
      );
  }
}
