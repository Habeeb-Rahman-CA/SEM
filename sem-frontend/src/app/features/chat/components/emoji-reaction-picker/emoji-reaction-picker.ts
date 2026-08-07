import {
  Component,
  Output,
  EventEmitter,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

const RECENTLY_USED_STORAGE_KEY = 'chat_recently_used_emojis';

@Component({
  selector: 'app-emoji-reaction-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './emoji-reaction-picker.html',
  styleUrls: ['./emoji-reaction-picker.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmojiReactionPickerComponent implements OnInit {
  @Output() selectEmoji = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  // Popular reactions quick list
  popularEmojis = ['👍', '❤️', '😂', '🔥', '🎉', '👀', '🚀', '💯'];

  // Recently used emojis state
  recentlyUsed = signal<string[]>([]);

  // Categorized emoji catalog
  emojiCategories = [
    {
      name: 'Smileys & Emotion',
      emojis: [
        '😀',
        '😃',
        '😄',
        '😁',
        '😆',
        '😅',
        '😂',
        '🤣',
        '😊',
        '😇',
        '🙂',
        '🙃',
        '😉',
        '😌',
        '😍',
        '🥰',
        '😘',
        '😋',
        '😛',
        '😜',
        '🤪',
        '🤨',
        '🧐',
        '🤓',
        '😎',
        '🤩',
        '🥳',
        '😏',
        '😒',
        '😞',
        '😔',
        '😟',
        '😕',
        '🙁',
        '😣',
        '😖',
        '😫',
        '😩',
        '🥺',
        '😢',
        '😭',
        '😤',
        '😠',
        '😡',
        '🤬',
        '🤯',
        '😳',
        '🥵',
        '🥶',
        '😱',
        '😨',
        '😰',
        '😥',
        '😓',
      ],
    },
    {
      name: 'Gestures & People',
      emojis: [
        '👍',
        '👎',
        '👊',
        '✊',
        '🤛',
        '🤜',
        '👏',
        '🙌',
        '👐',
        '🤲',
        '🤝',
        '🙏',
        '✍️',
        '💅',
        '🤳',
        '💪',
        '🦵',
        '🦶',
        '👂',
        '👃',
        '🧠',
        '🫀',
        '🫁',
        '👀',
        '👁️',
        '👅',
        '👄',
      ],
    },
    {
      name: 'Sports & Trophies',
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
        '🛷',
        '🛼',
        '🎯',
        '⛳',
        '🪁',
        '🏹',
        '🎣',
        '🤿',
        '🥊',
        '🥋',
        '🎽',
        '🛹',
        '🛷',
        '⛸️',
        '🥌',
        '🎿',
        '⛷️',
        '🏂',
        '🪂',
        '🏋️',
        '🤼',
        '🤸',
        '⛹️',
        '🤺',
        '🤾',
        '🏌️',
        '🏇',
        '🧘',
        '🏄',
        '🏊',
        '🤽',
        '🚣',
        '🧗',
        '🚵',
        '🚴',
        '🏆',
        '🥇',
        '🥈',
        '🥉',
        '🏅',
        '🎖️',
        '🎗️',
      ],
    },
    {
      name: 'Symbols & Celebrations',
      emojis: [
        '🎉',
        '🎊',
        '🎈',
        '🎂',
        '💥',
        '✨',
        '🌟',
        '⭐',
        '🔥',
        '⚡',
        '🌈',
        '☀️',
        '🥇',
        '🏆',
        '💯',
        '✅',
        '❌',
        '⚠️',
        '🚨',
        '🚀',
        '❤️',
        '🧡',
        '💛',
        '💚',
        '💙',
        '💜',
        '🤎',
        '🖤',
        '🤍',
        '💔',
        '❣️',
        '💕',
        '💞',
        '💓',
        '💗',
        '💖',
        '💘',
        '💝',
      ],
    },
  ];

  ngOnInit() {
    this.loadRecentlyUsed();
  }

  loadRecentlyUsed() {
    try {
      const stored = localStorage.getItem(RECENTLY_USED_STORAGE_KEY);
      if (stored) {
        this.recentlyUsed.set(JSON.parse(stored));
      } else {
        // Default recently used set
        this.recentlyUsed.set(['👍', '🔥', '❤️', '🎉', '😂']);
      }
    } catch {
      this.recentlyUsed.set(['👍', '🔥', '❤️', '🎉', '😂']);
    }
  }

  onEmojiSelect(emoji: string) {
    this.addRecentlyUsed(emoji);
    this.selectEmoji.emit(emoji);
  }

  private addRecentlyUsed(emoji: string) {
    const list = this.recentlyUsed().filter((e) => e !== emoji);
    const updated = [emoji, ...list].slice(0, 10);
    this.recentlyUsed.set(updated);
    try {
      localStorage.setItem(RECENTLY_USED_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }
}
