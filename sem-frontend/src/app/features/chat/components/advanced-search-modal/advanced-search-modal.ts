import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SearchFilterState {
  keyword: string;
  senderId: string;
  scope: string; // 'all' or channel/DM ID
  contentType: 'all' | 'image' | 'file' | 'link' | 'mention' | 'poll' | 'announcement';
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-advanced-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './advanced-search-modal.html',
  styleUrls: ['./advanced-search-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedSearchModalComponent {
  @Input({ required: true }) messages: any[] = [];
  @Input() members: any[] = [];
  @Input() channels: any[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() jumpToMessage = new EventEmitter<any>();

  // Filter Signals
  keyword = signal<string>('');
  senderId = signal<string>('all');
  scope = signal<string>('all');
  contentType = signal<'all' | 'image' | 'file' | 'link' | 'mention' | 'poll' | 'announcement'>(
    'all',
  );
  startDate = signal<string>('');
  endDate = signal<string>('');

  contentTypeOptions: {
    value: 'all' | 'image' | 'file' | 'link' | 'mention' | 'poll' | 'announcement';
    label: string;
    icon: string;
  }[] = [
    { value: 'all', label: 'All Messages', icon: 'fi-rr-apps' },
    { value: 'image', label: 'Images', icon: 'fi-rr-picture' },
    { value: 'file', label: 'Files & Documents', icon: 'fi-rr-document' },
    { value: 'link', label: 'Links & URLs', icon: 'fi-rr-link' },
    { value: 'mention', label: 'Mentions (@)', icon: 'fi-rr-at' },
    { value: 'poll', label: 'Polls', icon: 'fi-rr-stats' },
    { value: 'announcement', label: 'Announcements', icon: 'fi-rr-bullhorn' },
  ];

  filteredResults = computed(() => {
    const kw = this.keyword().toLowerCase().trim();
    const sender = this.senderId();
    const sc = this.scope();
    const type = this.contentType();
    const start = this.startDate() ? new Date(this.startDate()).getTime() : null;
    const end = this.endDate() ? new Date(this.endDate()).getTime() + 86400000 : null; // include full end day

    return this.messages.filter((m) => {
      // 1. Keyword Filter
      if (kw) {
        const textContent = (m.content || '').toLowerCase();
        const pollQuestion = (m.poll?.question || '').toLowerCase();
        const annTitle = (m.announcement?.title || '').toLowerCase();
        const annContent = (m.announcement?.content || '').toLowerCase();
        const matchesText =
          textContent.includes(kw) ||
          pollQuestion.includes(kw) ||
          annTitle.includes(kw) ||
          annContent.includes(kw);
        if (!matchesText) return false;
      }

      // 2. Sender Filter
      if (sender !== 'all') {
        if (m.senderId !== sender) return false;
      }

      // 3. Scope Filter
      if (sc !== 'all') {
        if (m.groupChatId !== sc && m.conversationId !== sc) return false;
      }

      // 4. Content Type Filter
      if (type === 'image') {
        const hasImg =
          m.attachments?.some((att: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(att)) ||
          m.content?.includes('![') ||
          m.content?.includes('.jpg') ||
          m.content?.includes('.png');
        if (!hasImg) return false;
      } else if (type === 'file') {
        const hasFile =
          m.attachments?.some((att: string) => !/\.(png|jpe?g|gif|webp|svg)$/i.test(att)) ||
          m.content?.includes('📎') ||
          m.content?.includes('.pdf') ||
          m.content?.includes('.docx');
        if (!hasFile) return false;
      } else if (type === 'link') {
        const hasUrl = /https?:\/\/[^\s]+/i.test(m.content || '');
        if (!hasUrl) return false;
      } else if (type === 'mention') {
        const hasMention = /@\w+/i.test(m.content || '');
        if (!hasMention) return false;
      } else if (type === 'poll') {
        if (!m.poll) return false;
      } else if (type === 'announcement') {
        if (!m.announcement) return false;
      }

      // 5. Date Range Filter
      if (m.createdAt) {
        const mTime = new Date(m.createdAt).getTime();
        if (start && mTime < start) return false;
        if (end && mTime > end) return false;
      }

      return true;
    });
  });

  resetFilters() {
    this.keyword.set('');
    this.senderId.set('all');
    this.scope.set('all');
    this.contentType.set('all');
    this.startDate.set('');
    this.endDate.set('');
  }

  onJump(msg: any) {
    this.jumpToMessage.emit(msg);
    this.close.emit();
  }
}
