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
import { ChatMessageRendererComponent } from '../chat-message-renderer/chat-message-renderer';
import { ChatRichMessageInputComponent } from '../chat-rich-message-input/chat-rich-message-input';
import { ImageViewerComponent, GalleryImage } from '../image-viewer/image-viewer';
import { VideoPlayerComponent, VideoSource } from '../video-player/video-player';

export interface ThreadReplyItem {
  id: string;
  parentMessageId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
}

@Component({
  selector: 'app-thread-drawer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChatMessageRendererComponent,
    ChatRichMessageInputComponent,
    ImageViewerComponent,
    VideoPlayerComponent,
  ],
  templateUrl: './thread-drawer.html',
  styleUrls: ['./thread-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreadDrawerComponent {
  @Input({ required: true }) parentMessage!: any;
  @Input() replies: ThreadReplyItem[] = [];
  @Input({ required: true }) currentUserId: string = '';
  @Input() members: any[] = [];
  @Input() channels: any[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() sendReply = new EventEmitter<{ parentMessageId: string; content: string }>();

  @ViewChild('repliesContainer') private repliesContainer!: ElementRef;

  // Media Modal state inside thread
  isImageViewerOpen = signal<boolean>(false);
  galleryImages = signal<GalleryImage[]>([]);
  activeImageIndex = signal<number>(0);

  isVideoPlayerOpen = signal<boolean>(false);
  activeVideo = signal<VideoSource | null>(null);

  isSendingReply = signal<boolean>(false);

  onSendReply(event: { content: string }) {
    if (!event.content || !this.parentMessage) return;
    this.sendReply.emit({
      parentMessageId: this.parentMessage.id,
      content: event.content,
    });
    this.scrollToBottom();
  }

  onImageClick(event: { url: string; title?: string }): void {
    const allImages: GalleryImage[] = [];
    let foundIndex = 0;

    if (this.parentMessage?.content?.includes(event.url)) {
      allImages.push({ url: event.url, title: this.parentMessage.senderName });
    }

    this.replies.forEach((rep) => {
      if (rep.content.includes('[ATTACHMENT:') || rep.content.includes('<img')) {
        const matches = rep.content.match(/\[ATTACHMENT:(.*?)\|(.*?)\|image\|(.*?)\]/g);
        if (matches) {
          matches.forEach((m) => {
            const parts = m.split('|');
            const url = parts[0].replace('[ATTACHMENT:', '');
            const title = parts[1];
            if (url === event.url) foundIndex = allImages.length;
            allImages.push({ url, title: `${rep.senderName} - ${title}` });
          });
        }
      }
    });

    if (allImages.length === 0) {
      allImages.push({ url: event.url, title: event.title || 'Thread Attachment' });
    }

    this.galleryImages.set(allImages);
    this.activeImageIndex.set(foundIndex);
    this.isImageViewerOpen.set(true);
  }

  onVideoClick(event: { url: string; title?: string }): void {
    this.activeVideo.set({
      url: event.url,
      title: event.title || 'Thread Shared Video',
    });
    this.isVideoPlayerOpen.set(true);
  }

  getInitials(name?: string): string {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.repliesContainer) {
        const el = this.repliesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }
}
