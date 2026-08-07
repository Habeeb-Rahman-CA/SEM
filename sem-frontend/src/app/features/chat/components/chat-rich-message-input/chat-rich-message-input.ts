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

  @Output() sendMessage = new EventEmitter<{ content: string; attachments?: string[] }>();
  @Output() typing = new EventEmitter<void>();

  @ViewChild('textareaRef') textareaRef!: ElementRef<HTMLTextAreaElement>;

  content = signal<string>('');

  // Pickers state
  showEmojiPicker = signal<boolean>(false);
  showGifPicker = signal<boolean>(false);
  showStickerPicker = signal<boolean>(false);
  activeEmojiCategory = signal<string>('sports');

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

  activeCategoryEmojis = computed(() => {
    return this.emojiCategories[this.activeEmojiCategory()]?.emojis || [];
  });

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitMessage();
    } else {
      this.typing.emit();
    }
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
  }
}
