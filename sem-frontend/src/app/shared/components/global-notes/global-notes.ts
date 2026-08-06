import {
  Component,
  input,
  model,
  inject,
  effect,
  signal,
  computed,
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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
  private sanitizer = inject(DomSanitizer);

  isOpen = model<boolean>(false);
  workspaceId = input.required<string>();
  entityType = input.required<NoteEntityType>();
  entityId = input.required<string>();
  entityTitle = input<string>('Record');

  newNoteContent = signal<string>('');
  selectedColor = signal<string>('amber');
  editingNoteId = signal<string | null>(null);
  editingContent = signal<string>('');

  // ── Mention Autocomplete State ─────────────────────────────────────────────
  mentionQuery = signal<string>('');
  showMentionDropdown = signal<boolean>(false);

  suggestedMembers = [
    { username: 'John', name: 'John Doe', role: 'Coach' },
    { username: 'Sarah', name: 'Sarah Connor', role: 'Referee' },
    { username: 'Admin', name: 'System Admin', role: 'Owner' },
    { username: 'Alex', name: 'Alex Smith', role: 'Analyst' },
    { username: 'Manager', name: 'Team Manager', role: 'Admin' },
  ];

  filteredSuggestions = computed(() => {
    const q = this.mentionQuery().toLowerCase();
    if (!q) return this.suggestedMembers;
    return this.suggestedMembers.filter(
      (m) => m.username.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    );
  });

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

  onInputText(val: string) {
    this.newNoteContent.set(val);
    const lastWord = val.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      this.mentionQuery.set(lastWord.slice(1));
      this.showMentionDropdown.set(true);
    } else {
      this.showMentionDropdown.set(false);
    }
  }

  insertMention(username: string) {
    const current = this.newNoteContent();
    const words = current.split(/\s+/);
    words.pop(); // Remove partial @mention
    const updated = [...words, `@${username} `].join(' ').trimStart();
    this.newNoteContent.set(updated);
    this.showMentionDropdown.set(false);
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
          this.showMentionDropdown.set(false);
          this.ui.success('Note attached successfully with @mentions.');
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

  renderFormattedContent(content: string): SafeHtml {
    if (!content) return '';
    const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const formatted = escaped.replace(
      /@([a-zA-Z0-9_\-\.]+)/g,
      '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30 text-[11px]"><i class="fi fi-rr-at text-[10px]"></i>$1</span>',
    );
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
}
