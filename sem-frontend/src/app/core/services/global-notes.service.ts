import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';

export type NoteEntityType =
  'player' | 'team' | 'asset' | 'event' | 'venue' | 'report' | 'competition' | 'form' | 'custom';

export interface GlobalNoteItem {
  id: string;
  userId: string;
  author: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  workspaceId: string;
  entityType: NoteEntityType;
  entityId: string;
  content: string;
  isPinned: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotePayload {
  entityType: NoteEntityType;
  entityId: string;
  content: string;
  isPinned?: boolean;
  color?: string;
}

export interface UpdateNotePayload {
  content?: string;
  isPinned?: boolean;
  color?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GlobalNotesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/workspaces`;

  notes = signal<GlobalNoteItem[]>([]);
  isLoading = signal<boolean>(false);

  private get headers(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadNotes(
    workspaceId: string,
    entityType?: NoteEntityType,
    entityId?: string,
  ): Observable<GlobalNoteItem[]> {
    this.isLoading.set(true);
    let params = '';
    if (entityType && entityId) {
      params = `?entityType=${entityType}&entityId=${entityId}`;
    }

    return this.http
      .get<GlobalNoteItem[]>(`${this.apiUrl}/${workspaceId}/notes${params}`, {
        headers: this.headers,
      })
      .pipe(
        tap({
          next: (items) => {
            this.notes.set(items);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
        }),
      );
  }

  createNote(workspaceId: string, payload: CreateNotePayload): Observable<GlobalNoteItem> {
    return this.http
      .post<GlobalNoteItem>(`${this.apiUrl}/${workspaceId}/notes`, payload, {
        headers: this.headers,
      })
      .pipe(
        tap({
          next: (saved) => {
            this.notes.update((prev) => [saved, ...prev]);
          },
        }),
      );
  }

  updateNote(
    workspaceId: string,
    noteId: string,
    payload: UpdateNotePayload,
  ): Observable<GlobalNoteItem> {
    return this.http
      .patch<GlobalNoteItem>(`${this.apiUrl}/${workspaceId}/notes/${noteId}`, payload, {
        headers: this.headers,
      })
      .pipe(
        tap({
          next: (updated) => {
            this.notes.update((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          },
        }),
      );
  }

  deleteNote(workspaceId: string, noteId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${workspaceId}/notes/${noteId}`, {
        headers: this.headers,
      })
      .pipe(
        tap({
          next: () => {
            this.notes.update((prev) => prev.filter((n) => n.id !== noteId));
          },
        }),
      );
  }
}
