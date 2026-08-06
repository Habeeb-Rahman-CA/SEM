import {
  Component,
  input,
  model,
  inject,
  effect,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  GlobalNotesService,
  GlobalNoteItem,
  NoteEntityType,
} from '../../../core/services/global-notes.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-global-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './global-notes.html',
})
export class GlobalNotesComponent {
  notesService = inject(GlobalNotesService);
  private ui = inject(UiService);

  isOpen = model<boolean>(false);
  workspaceId = input.required<string>();
  entityType = input.required<NoteEntityType>();
  entityId = input.required<string>();
  entityTitle = input<string>('Record');

  newNoteContent = signal<string>('');
  selectedColor = signal<string>('amber');
  editingNoteId = signal<string | null>(null);
  editingContent = signal<string>('');

  colors = [
    { name: 'amber', bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
    { name: 'violet', bg: 'bg-violet-500/10 border-violet-500/30 text-violet-300' },
    { name: 'emerald', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
    { name: 'rose', bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300' },
    { name: 'sky', bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300' },
  ];

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const wsId = this.workspaceId();
      const type = this.entityType();
      const id = this.entityId();

      if (open && wsId && type && id) {
        this.notesService.loadNotes(wsId, type, id).subscribe();
      }
    });
  }

  close() {
    this.isOpen.set(false);
  }

  addNote() {
    const content = this.newNoteContent().trim();
    if (!content) return;

    this.notesService
      .createNote(this.workspaceId(), {
        entityType: this.entityType(),
        entityId: this.entityId(),
        content,
        color: this.selectedColor(),
      })
      .subscribe({
        next: () => {
          this.newNoteContent.set('');
          this.ui.success('Note attached successfully.');
        },
        error: (err) => {
          console.error('Failed to add note', err);
          this.ui.error('Failed to add note.');
        },
      });
  }

  togglePin(note: GlobalNoteItem) {
    this.notesService
      .updateNote(this.workspaceId(), note.id, {
        isPinned: !note.isPinned,
      })
      .subscribe();
  }

  startEditing(note: GlobalNoteItem) {
    this.editingNoteId.set(note.id);
    this.editingContent.set(note.content);
  }

  cancelEditing() {
    this.editingNoteId.set(null);
    this.editingContent.set('');
  }

  saveEdit(note: GlobalNoteItem) {
    const content = this.editingContent().trim();
    if (!content) return;

    this.notesService.updateNote(this.workspaceId(), note.id, { content }).subscribe({
      next: () => {
        this.cancelEditing();
        this.ui.success('Note updated.');
      },
    });
  }

  deleteNote(noteId: string) {
    this.notesService.deleteNote(this.workspaceId(), noteId).subscribe({
      next: () => this.ui.info('Note removed.'),
    });
  }
}
