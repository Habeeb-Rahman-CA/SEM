import { Injectable, signal, inject } from '@angular/core';
import { UiService } from './ui.service';

export interface RecordComment {
  id: string;
  entityType: string; // e.g., 'team', 'player', 'file', 'form', 'certificate'
  entityId: string;
  text: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
  mentions?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class RecordCommentsService {
  private ui = inject(UiService);

  private commentsSignal = signal<Record<string, RecordComment[]>>({});

  constructor() {
    this.loadFromStorage();
  }

  private getStorageKey(entityType: string, entityId: string): string {
    return `${entityType}_${entityId}`;
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem('sem_record_comments');
      if (data) {
        this.commentsSignal.set(JSON.parse(data));
      }
    } catch (e) {
      console.error('Failed to load record comments from storage', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('sem_record_comments', JSON.stringify(this.commentsSignal()));
    } catch (e) {
      console.error('Failed to save record comments to storage', e);
    }
  }

  getComments(entityType: string, entityId: string): RecordComment[] {
    const key = this.getStorageKey(entityType, entityId);
    return this.commentsSignal()[key] || [];
  }

  addComment(
    entityType: string,
    entityId: string,
    text: string,
    authorName = 'Current User',
    authorAvatar?: string,
  ): RecordComment {
    const key = this.getStorageKey(entityType, entityId);

    // Extract @mentions from text
    const mentionMatches = text.match(/@([a-zA-Z0-9_-]+)/g);
    const mentions = mentionMatches ? Array.from(new Set(mentionMatches)) : [];

    const newComment: RecordComment = {
      id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      entityType,
      entityId,
      text: text.trim(),
      authorName,
      authorAvatar,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      isLiked: false,
      mentions,
    };

    const currentMap = { ...this.commentsSignal() };
    const list = currentMap[key] || [];
    currentMap[key] = [newComment, ...list];

    this.commentsSignal.set(currentMap);
    this.saveToStorage();

    // Trigger Notification for @mentions
    if (mentions.length > 0) {
      mentions.forEach((userHandle) => {
        this.ui.info(
          `Mention notification sent to ${userHandle}: "${authorName}" tagged them on this record.`,
        );
      });
    }

    return newComment;
  }

  deleteComment(entityType: string, entityId: string, commentId: string) {
    const key = this.getStorageKey(entityType, entityId);
    const currentMap = { ...this.commentsSignal() };
    const list = currentMap[key] || [];
    currentMap[key] = list.filter((c) => c.id !== commentId);

    this.commentsSignal.set(currentMap);
    this.saveToStorage();
  }

  toggleLike(entityType: string, entityId: string, commentId: string) {
    const key = this.getStorageKey(entityType, entityId);
    const currentMap = { ...this.commentsSignal() };
    const list = currentMap[key] || [];

    currentMap[key] = list.map((c) => {
      if (c.id === commentId) {
        const isLiked = !c.isLiked;
        return {
          ...c,
          isLiked,
          likesCount: isLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1),
        };
      }
      return c;
    });

    this.commentsSignal.set(currentMap);
    this.saveToStorage();
  }
}
