import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface MentionSuggestion {
  id: string;
  name: string;
  type: 'user' | 'role' | 'channel' | 'group';
  detail?: string;
  icon: string;
  insertText: string;
}

@Component({
  selector: 'app-chat-rich-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-rich-message-input.html',
  styleUrls: ['./chat-rich-message-input.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatRichMessageInputComponent {
  @Input() placeholder: string = 'Type a rich message...';
  @Input() disabled: boolean = false;
  @Input() isSending: boolean = false;
  @Input() members: any[] = [];
  @Input() channels: any[] = [];

  @Output() sendMessage = new EventEmitter<{ content: string; attachments?: string[] }>();
  @Output() typing = new EventEmitter<void>();

  @ViewChild('textareaRef') textareaRef!: ElementRef<HTMLTextAreaElement>;

  content = signal<string>('');

  // Pickers state
  showEmojiPicker = signal<boolean>(false);
  showGifPicker = signal<boolean>(false);
  showStickerPicker = signal<boolean>(false);
  activeEmojiCategory = signal<string>('sports');

  // Mention Autocomplete state
  showMentionPicker = signal<boolean>(false);
  mentionQuery = signal<string>('');
  mentionCursorIndex = signal<number>(0);
  selectedMentionIndex = signal<number>(0);

  // Group Mention Presets
  groupMentions: MentionSuggestion[] = [
    {
      id: 'everyone',
      name: 'everyone',
      type: 'group',
      detail: 'Notify all members in workspace',
      icon: 'fi fi-rr-users-alt text-amber-400',
      insertText: '@everyone',
    },
    {
      id: 'admins',
      name: 'admins',
      type: 'group',
      detail: 'Notify workspace administrators',
      icon: 'fi fi-rr-shield-check text-violet-400',
      insertText: '@admins',
    },
    {
      id: 'referees',
      name: 'referees',
      type: 'group',
      detail: 'Notify referee & officiating team',
      icon: 'fi fi-rr-whistle text-cyan-400',
      insertText: '@referees',
    },
    {
      id: 'volunteers',
      name: 'volunteers',
      type: 'group',
      detail: 'Notify volunteer team leaders',
      icon: 'fi fi-rr-heart-partner-handshake text-emerald-400',
      insertText: '@volunteers',
    },
  ];

  // Emojis catalog
  emojiCategories: { [key: string]: { label: string; emojis: string[] } } = {
    sports: {
      label: 'Sports & Games',
      emojis: [
        '⚽',
        '🏀',
        '🏈',
        '⚾',
        '🥎',
        '🎾',
        '🏐',
        '🏉',
        '🥏',
        '🎱',
        '🏓',
        '🏸',
        '🏒',
        '🏑',
        '🥍',
        '🏏',
        '🥊',
        '🥋',
        '🎽',
        '🛹',
        '🛼',
        '🛷',
        '⛸️',
        '🌁',
        '🏆',
        '🥇',
        '🥈',
        '🥉',
        '🏅',
        '🎖️',
        '🎗️',
        '🎫',
        '🎟️',
        '🎪',
      ],
    },
    smileys: {
      label: 'Smileys & Reactions',
      emojis: [
        '😀',
        '😃',
        '😄',
        '😁',
        '😆',
        '😅',
        '🤣',
        '😂',
        '🙂',
        '🙃',
        '😉',
        '😊',
        '😇',
        '🥰',
        '😍',
        '🤩',
        '😘',
        '😗',
        '😚',
        '😙',
        '😋',
        '😛',
        '😜',
        '🤪',
        '😝',
        '🤑',
        '🤗',
        '🤭',
        '🤫',
        '🤔',
        '🤐',
        '🤨',
        '😐',
        '😑',
        '😶',
        '😏',
        '😒',
        '🙄',
        '😬',
      ],
    },
    objects: {
      label: 'Objects & Flags',
      emojis: [
        '🎯',
        '🚩',
        '🏁',
        '📢',
        '📣',
        '🔔',
        '🔕',
        '🎼',
        '🎵',
        '🎶',
        '🎤',
        '🎧',
        '📻',
        '🎷',
        '🎸',
        '🎹',
        '🎺',
        '🎻',
        '🪕',
        '🥁',
        '📱',
        '💻',
        '🖥️',
        '🖨️',
        '📈',
        '📉',
        '📊',
        '📋',
        '📌',
        '📍',
        '📎',
        '🔒',
        '🔑',
      ],
    },
    symbols: {
      label: 'Symbols & Indicators',
      emojis: [
        '❤️',
        '🧡',
        '💛',
        '💚',
        '💙',
        '💜',
        '🖤',
        '🤍',
        '🤎',
        '💔',
        '❣️',
        '💕',
        '💞',
        '💓',
        '💗',
        '💖',
        '💘',
        '💝',
        '⭐',
        '🌟',
        '✨',
        '⚡',
        '🔥',
        '💥',
        '💯',
        '✅',
        '❌',
        '⚠️',
        '🚨',
        '🔴',
        '🟢',
        '🔵',
        '⚪',
        '⬛',
      ],
    },
  };

  // GIFs catalog
  gifs = [
    { title: 'Goal Celebration', url: 'https://media.giphy.com/media/l0HlHJGHe3yAMhdQY/giphy.gif' },
    {
      title: 'Red Card Referee',
      url: 'https://media.giphy.com/media/3o7TKrEzvLbsVAJd84/giphy.gif',
    },
    { title: 'Trophy Winner', url: 'https://media.giphy.com/media/26tknCqiYwe7CTdYA/giphy.gif' },
    { title: 'Mind Blown', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif' },
    { title: 'High Five', url: 'https://media.giphy.com/media/3oEjHV0z85GPvfxk2A/giphy.gif' },
    { title: 'Applause Clap', url: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif' },
    { title: 'Fire Flame', url: 'https://media.giphy.com/media/Lopx9eUi34rbq/giphy.gif' },
    { title: 'Winning Cheer', url: 'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif' },
  ];

  // Stickers catalog
  stickers = [
    { title: 'GOAL!', icon: 'fi fi-rr-football', bg: 'bg-emerald-600', text: 'GOAL!' },
    { title: 'RED CARD', icon: 'fi fi-rr-shield-exclamation', bg: 'bg-rose-600', text: 'RED CARD' },
    { title: 'MVP', icon: 'fi fi-rr-crown', bg: 'bg-amber-500', text: 'MVP' },
    { title: 'CHAMPION', icon: 'fi fi-rr-trophy', bg: 'bg-yellow-500', text: 'CHAMPION' },
    { title: 'APPROVED', icon: 'fi fi-rr-check-circle', bg: 'bg-indigo-600', text: 'APPROVED' },
    { title: 'HIGH FIVE', icon: 'fi fi-rr-hand', bg: 'bg-violet-600', text: 'HIGH FIVE' },
    { title: 'FIRE', icon: 'fi fi-rr-flame', bg: 'bg-orange-600', text: 'ON FIRE' },
    { title: 'GG', icon: 'fi fi-rr-smile', bg: 'bg-cyan-600', text: 'GOOD GAME' },
  ];

  // All Mention Suggestions computed
  allMentionSuggestions = computed<MentionSuggestion[]>(() => {
    const list: MentionSuggestion[] = [...this.groupMentions];

    // Users
    if (this.members && this.members.length > 0) {
      for (const m of this.members) {
        const username = m.user?.username || m.username;
        if (username) {
          list.push({
            id: m.userId || m.id,
            name: username,
            type: 'user',
            detail: m.role?.name || 'Member',
            icon: 'fi fi-rr-user text-indigo-400',
            insertText: `@${username}`,
          });
        }
      }
    }

    // Roles
    const roleNames = new Set<string>();
    if (this.members) {
      for (const m of this.members) {
        const rName = m.role?.name;
        if (rName && !roleNames.has(rName)) {
          roleNames.add(rName);
          list.push({
            id: `role-${rName}`,
            name: rName,
            type: 'role',
            detail: 'Workspace Role',
            icon: 'fi fi-rr-key text-purple-400',
            insertText: `@${rName.toLowerCase().replace(/\s+/g, '_')}`,
          });
        }
      }
    }

    // Channels
    if (this.channels && this.channels.length > 0) {
      for (const c of this.channels) {
        list.push({
          id: c.id,
          name: c.name,
          type: 'channel',
          detail: 'Workspace Channel',
          icon: c.icon || 'fi fi-rr-hashtag text-cyan-400',
          insertText: `@${c.name.toLowerCase().replace(/\s+/g, '-')}`,
        });
      }
    }

    return list;
  });

  filteredMentionSuggestions = computed<MentionSuggestion[]>(() => {
    const q = this.mentionQuery().toLowerCase().trim();
    const suggestions = this.allMentionSuggestions();
    if (!q) return suggestions;
    return suggestions.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.insertText.toLowerCase().includes(q) ||
        s.detail?.toLowerCase().includes(q),
    );
  });

  activeCategoryEmojis = computed(() => {
    return this.emojiCategories[this.activeEmojiCategory()]?.emojis || [];
  });

  onContentChange(val: string) {
    this.content.set(val);
    this.checkMentionTrigger();
  }

  private checkMentionTrigger() {
    const el = this.textareaRef?.nativeElement;
    if (!el) return;

    const cursorPos = el.selectionStart;
    const textBeforeCursor = this.content().substring(0, cursorPos);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord && (lastWord.startsWith('@') || lastWord.startsWith('#'))) {
      this.mentionQuery.set(lastWord.substring(1));
      this.mentionCursorIndex.set(cursorPos);
      this.selectedMentionIndex.set(0);
      this.showMentionPicker.set(true);
    } else {
      this.showMentionPicker.set(false);
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (this.showMentionPicker()) {
      const suggestions = this.filteredMentionSuggestions();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedMentionIndex.update((idx) =>
          suggestions.length ? (idx + 1) % suggestions.length : 0,
        );
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedMentionIndex.update((idx) =>
          suggestions.length ? (idx - 1 + suggestions.length) % suggestions.length : 0,
        );
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        if (suggestions.length > 0) {
          const selected = suggestions[this.selectedMentionIndex() || 0];
          this.applyMention(selected);
        }
        return;
      }
      if (event.key === 'Escape') {
        this.showMentionPicker.set(false);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitMessage();
    } else {
      this.typing.emit();
    }
  }

  applyMention(suggestion: MentionSuggestion) {
    const el = this.textareaRef?.nativeElement;
    if (!el) return;

    const text = this.content();
    const cursorPos = el.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const textAfterCursor = text.substring(cursorPos);

    const words = textBeforeCursor.split(/\s/);
    words.pop(); // Remove partial mention search query

    const newBefore = words.join(' ') + (words.length > 0 ? ' ' : '') + suggestion.insertText + ' ';
    const newText = newBefore + textAfterCursor;

    this.content.set(newText);
    this.showMentionPicker.set(false);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newBefore.length, newBefore.length);
    }, 10);
  }

  submitMessage() {
    const text = this.content().trim();
    if (!text || this.isSending || this.disabled) return;
    this.sendMessage.emit({ content: text });
    this.content.set('');
    this.closeAllPickers();
  }

  insertFormat(prefix: string, suffix: string = '') {
    const el = this.textareaRef?.nativeElement;
    if (!el) {
      this.content.update((c) => c + prefix + suffix);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentText = this.content();
    const selected = currentText.substring(start, end);
    const replacement = prefix + (selected || 'text') + suffix;

    const newText = currentText.substring(0, start) + replacement + currentText.substring(end);
    this.content.set(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected || 'text').length,
      );
    }, 10);
  }

  insertBlock(blockText: string) {
    this.content.update((c) => (c ? `${c}\n${blockText}` : blockText));
    setTimeout(() => {
      this.textareaRef?.nativeElement?.focus();
    }, 10);
  }

  insertTable() {
    const tableTemplate = `\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Row 1 | Data 1 | Data 2 |\n| Row 2 | Data 3 | Data 4 |\n`;
    this.insertBlock(tableTemplate);
  }

  insertEmoji(emoji: string) {
    this.content.update((c) => c + emoji);
    this.showEmojiPicker.set(false);
  }

  sendGif(gifUrl: string) {
    this.sendMessage.emit({ content: `[GIF:${gifUrl}]` });
    this.showGifPicker.set(false);
  }

  sendSticker(stickerText: string) {
    this.sendMessage.emit({ content: `**[STICKER: ${stickerText}]**` });
    this.showStickerPicker.set(false);
  }

  toggleEmojiPicker() {
    const next = !this.showEmojiPicker();
    this.closeAllPickers();
    this.showEmojiPicker.set(next);
  }

  toggleGifPicker() {
    const next = !this.showGifPicker();
    this.closeAllPickers();
    this.showGifPicker.set(next);
  }

  toggleStickerPicker() {
    const next = !this.showStickerPicker();
    this.closeAllPickers();
    this.showStickerPicker.set(next);
  }

  closeAllPickers() {
    this.showEmojiPicker.set(false);
    this.showGifPicker.set(false);
    this.showStickerPicker.set(false);
    this.showMentionPicker.set(false);
  }
}
