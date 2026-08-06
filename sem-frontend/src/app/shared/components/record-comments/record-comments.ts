import { Component, input, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RecordCommentsService,
  RecordComment,
} from '../../../core/services/record-comments.service';
import { AvatarComponent } from '../avatar/avatar';
import { ButtonComponent } from '../button/button';

@Component({
  selector: 'app-record-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, AvatarComponent, ButtonComponent],
  templateUrl: './record-comments.html',
})
export class RecordCommentsComponent {
  entityType = input.required<string>(); // e.g. 'team', 'player', 'file', 'form'
  entityId = input.required<string>();
  title = input<string>('Discussion Thread');

  private commentsService = inject(RecordCommentsService);

  newCommentText = signal('');
  isSubmitting = signal(false);

  // Mention Autocomplete state
  showMentionDropdown = signal(false);
  mentionQuery = signal('');
  availableUsers = ['John', 'Sarah', 'CoachDave', 'RefAlex', 'Admin', 'Alex', 'Michael'];

  filteredMentionUsers = computed(() => {
    const q = this.mentionQuery().toLowerCase();
    if (!q) return this.availableUsers;
    return this.availableUsers.filter((u) => u.toLowerCase().includes(q));
  });

  comments = computed<RecordComment[]>(() => {
    return this.commentsService.getComments(this.entityType(), this.entityId());
  });

  onInputText(val: string) {
    this.newCommentText.set(val);

    // Detect if cursor is typing @
    const lastWord = val.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      this.mentionQuery.set(lastWord.slice(1));
      this.showMentionDropdown.set(true);
    } else {
      this.showMentionDropdown.set(false);
    }
  }

  insertMention(username: string) {
    const current = this.newCommentText();
    const words = current.split(/\s+/);
    words.pop(); // Remove partial @mention
    words.push(`@${username}`);
    this.newCommentText.set(words.join(' ') + ' ');
    this.showMentionDropdown.set(false);
  }

  onSubmitComment() {
    const text = this.newCommentText().trim();
    if (!text) return;

    this.isSubmitting.set(true);
    this.commentsService.addComment(this.entityType(), this.entityId(), text);
    this.newCommentText.set('');
    this.showMentionDropdown.set(false);
    this.isSubmitting.set(false);
  }

  onToggleLike(commentId: string) {
    this.commentsService.toggleLike(this.entityType(), this.entityId(), commentId);
  }

  onDeleteComment(commentId: string) {
    this.commentsService.deleteComment(this.entityType(), this.entityId(), commentId);
  }

  formatCommentText(text: string): string {
    // Escape HTML & highlight @mentions with glowing badge
    return text.replace(
      /@([a-zA-Z0-9_-]+)/g,
      '<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30">@$1</span>',
    );
  }
}
