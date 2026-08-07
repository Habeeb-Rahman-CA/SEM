import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
  isPinned?: boolean;
  isBookmarked?: boolean;
  isEdited?: boolean;
  translatedText?: string;
  isTranslating?: boolean;
}

@Component({
  selector: 'app-message-action-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-action-toolbar.html',
  styleUrls: ['./message-action-toolbar.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageActionToolbarComponent {
  @Input({ required: true }) message!: any;
  @Input({ required: true }) currentUserId: string = '';

  @Output() reply = new EventEmitter<any>();
  @Output() thread = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();
  @Output() pin = new EventEmitter<any>();
  @Output() forward = new EventEmitter<any>();
  @Output() copy = new EventEmitter<any>();
  @Output() bookmark = new EventEmitter<any>();
  @Output() translate = new EventEmitter<any>();
  @Output() share = new EventEmitter<any>();

  isMenuOpen = signal<boolean>(false);

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isMenuOpen.update((v) => !v);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  onAction(
    action:
      | 'reply'
      | 'thread'
      | 'edit'
      | 'delete'
      | 'pin'
      | 'forward'
      | 'copy'
      | 'bookmark'
      | 'translate'
      | 'share',
    event: MouseEvent,
  ) {
    event.stopPropagation();
    this.isMenuOpen.set(false);
    switch (action) {
      case 'reply':
        this.reply.emit(this.message);
        break;
      case 'thread':
        this.thread.emit(this.message);
        break;
      case 'edit':
        this.edit.emit(this.message);
        break;
      case 'delete':
        this.delete.emit(this.message);
        break;
      case 'pin':
        this.pin.emit(this.message);
        break;
      case 'forward':
        this.forward.emit(this.message);
        break;
      case 'copy':
        this.copy.emit(this.message);
        break;
      case 'bookmark':
        this.bookmark.emit(this.message);
        break;
      case 'translate':
        this.translate.emit(this.message);
        break;
      case 'share':
        this.share.emit(this.message);
        break;
    }
  }
}
