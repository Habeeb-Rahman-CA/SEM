import {
  Component,
  OnInit,
  OnDestroy,
  input,
  signal,
  computed,
  inject,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, DirectMessageConversation, DirectMessage } from '../../services/chat.service';
import { AuthService } from '../../../auth/services/auth.service';
import { SocketService } from '../../../../core/services/socket.service';

import { ChatMessageRendererComponent } from '../../components/chat-message-renderer/chat-message-renderer';
import { ChatRichMessageInputComponent } from '../../components/chat-rich-message-input/chat-rich-message-input';
import { ImageViewerComponent, GalleryImage } from '../../components/image-viewer/image-viewer';

@Component({
  selector: 'app-direct-messages',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChatMessageRendererComponent,
    ChatRichMessageInputComponent,
    ImageViewerComponent,
  ],
  templateUrl: './direct-messages.html',
  styleUrls: ['./direct-messages.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectMessagesComponent implements OnInit, OnDestroy {
  workspaceId = input.required<string>();
  members = input<any[]>([]);

  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  currentUserId = computed(() => this.authService.currentUser()?.id || '');

  conversations = signal<DirectMessageConversation[]>([]);
  selectedConversation = signal<DirectMessageConversation | null>(null);
  messages = signal<DirectMessage[]>([]);

  searchQuery = signal<string>('');
  messageInput = signal<string>('');
  memberSearchQuery = signal<string>('');
  searchMessageQuery = signal<string>('');

  isLoadingConversations = signal<boolean>(true);
  isLoadingMessages = signal<boolean>(false);
  isSending = signal<boolean>(false);
  isNewDmModalOpen = signal<boolean>(false);
  isSearchingMessages = signal<boolean>(false);
  searchResults = signal<any[]>([]);

  isPartnerTyping = signal<boolean>(false);
  private typingTimeout: any = null;

  // Image Viewer Lightbox State
  isImageViewerOpen = signal<boolean>(false);
  galleryImages = signal<GalleryImage[]>([]);
  activeImageIndex = signal<number>(0);

  filteredConversations = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.conversations();
    return this.conversations().filter((c: DirectMessageConversation) =>
      c.partner.username.toLowerCase().includes(q),
    );
  });

  availableMembers = computed(() => {
    const meId = this.currentUserId();
    const existingPartnerIds = new Set(
      this.conversations().map((c: DirectMessageConversation) => c.partner.id),
    );
    const q = this.memberSearchQuery().toLowerCase().trim();

    return (this.members() || []).filter((m: any) => {
      const uId = m.userId || m.id;
      if (uId === meId) return false;
      if (existingPartnerIds.has(uId)) return false;
      if (q) {
        return m.user?.username?.toLowerCase().includes(q);
      }
      return true;
    });
  });

  filteredWorkspaceMembers = computed(() => this.availableMembers());

  startConversationWithMember(mem: any): void {
    const targetUserId = mem.userId || mem.id;
    if (targetUserId) {
      this.startNewDm(targetUserId);
    }
  }

  ngOnInit(): void {
    this.loadConversations();
    this.setupSocketListeners();
  }

  ngOnDestroy(): void {
    this.socketService.off('dm_message');
    this.socketService.off('dm_typing');
    this.socketService.off('dm_read');
    this.socketService.off('user_status');
  }

  private setupSocketListeners(): void {
    this.socketService.on('dm_message', (msg: DirectMessage) => {
      const selected = this.selectedConversation();
      if (selected && selected.id === msg.conversationId) {
        this.messages.update((list) => [...list, msg]);
        this.scrollToBottom();
        this.markAsRead(msg.conversationId);
      }
      this.loadConversations();
    });

    this.socketService.on(
      'dm_typing',
      (data: { conversationId: string; userId: string; isTyping: boolean }) => {
        const selected = this.selectedConversation();
        if (
          selected &&
          selected.id === data.conversationId &&
          data.userId !== this.currentUserId()
        ) {
          this.isPartnerTyping.set(data.isTyping);
          if (data.isTyping) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
              this.isPartnerTyping.set(false);
            }, 3000);
          }
        }
      },
    );

    this.socketService.on('dm_read', (data: { conversationId: string; userId: string }) => {
      const selected = this.selectedConversation();
      if (selected && selected.id === data.conversationId && data.userId !== this.currentUserId()) {
        this.messages.update((list) =>
          list.map((m: DirectMessage) =>
            m.senderId === this.currentUserId() ? { ...m, isRead: true } : m,
          ),
        );
      }
    });

    this.socketService.on(
      'user_status',
      (data: { userId: string; isOnline: boolean; lastSeen?: string }) => {
        this.conversations.update((list) =>
          list.map((c: DirectMessageConversation) => {
            if (c.partner.id === data.userId) {
              return {
                ...c,
                partner: {
                  ...c.partner,
                  isOnline: data.isOnline,
                  lastSeen: data.lastSeen || c.partner.lastSeen,
                },
              };
            }
            return c;
          }),
        );
      },
    );
  }

  loadConversations(): void {
    this.isLoadingConversations.set(true);
    this.chatService.listDmConversations(this.workspaceId()).subscribe({
      next: (res: DirectMessageConversation[]) => {
        this.conversations.set(res);
        this.isLoadingConversations.set(false);
      },
      error: (err: any) => {
        console.error('Failed to load conversations', err);
        this.isLoadingConversations.set(false);
      },
    });
  }

  selectConversation(conv: DirectMessageConversation): void {
    this.selectedConversation.set(conv);
    this.loadMessages(conv.id);
    this.markAsRead(conv.id);
  }

  loadMessages(conversationId: string): void {
    this.isLoadingMessages.set(true);
    this.chatService.getDmMessages(this.workspaceId(), conversationId).subscribe({
      next: (msgs: DirectMessage[]) => {
        this.messages.set(msgs);
        this.isLoadingMessages.set(false);
        this.scrollToBottom();
      },
      error: (err: any) => {
        console.error('Failed to load messages', err);
        this.isLoadingMessages.set(false);
      },
    });
  }

  sendMessage(): void {
    const text = this.messageInput().trim();
    if (!text) return;
    this.onSendRichMessage({ content: text });
  }

  onSendRichMessage(event: { content: string; attachments?: string[] }): void {
    const conv = this.selectedConversation();
    if (!conv || this.isSending()) return;

    this.isSending.set(true);
    this.chatService
      .sendDirectMessage(this.workspaceId(), conv.partner.id, event.content)
      .subscribe({
        next: (msg: DirectMessage) => {
          this.messages.update((list) => [...list, msg]);
          this.messageInput.set('');
          this.isSending.set(false);
          this.scrollToBottom();
          this.loadConversations();
        },
        error: (err: any) => {
          console.error('Failed to send message', err);
          this.isSending.set(false);
        },
      });
  }

  onTyping(): void {
    const conv = this.selectedConversation();
    if (!conv) return;
    this.socketService.emit('dm_typing', {
      workspaceId: this.workspaceId(),
      conversationId: conv.id,
      recipientId: conv.partner.id,
    });
  }

  markAsRead(conversationId: string): void {
    this.chatService.markDmAsRead(this.workspaceId(), conversationId).subscribe({
      next: () => {
        this.conversations.update((list) =>
          list.map((c: DirectMessageConversation) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c,
          ),
        );
      },
    });
  }

  togglePin(conv: DirectMessageConversation, event: Event): void {
    event.stopPropagation();
    const newStatus = !conv.isPinned;
    this.chatService
      .updateDmSettings(this.workspaceId(), conv.id, { isPinned: newStatus })
      .subscribe({
        next: () => {
          this.conversations.update((list) =>
            list.map((c: DirectMessageConversation) =>
              c.id === conv.id ? { ...c, isPinned: newStatus } : c,
            ),
          );
        },
      });
  }

  toggleMute(conv: DirectMessageConversation, event: Event): void {
    event.stopPropagation();
    const newStatus = !conv.isMuted;
    this.chatService
      .updateDmSettings(this.workspaceId(), conv.id, { isMuted: newStatus })
      .subscribe({
        next: () => {
          this.conversations.update((list) =>
            list.map((c: DirectMessageConversation) =>
              c.id === conv.id ? { ...c, isMuted: newStatus } : c,
            ),
          );
        },
      });
  }

  startNewDm(targetUserId: string): void {
    this.isNewDmModalOpen.set(false);
    this.isSending.set(true);
    this.chatService.sendDirectMessage(this.workspaceId(), targetUserId, '👋 Hello!').subscribe({
      next: (msg: DirectMessage) => {
        this.isSending.set(false);
        this.loadConversations();
        this.chatService
          .listDmConversations(this.workspaceId())
          .subscribe((convs: DirectMessageConversation[]) => {
            const created = convs.find(
              (c: DirectMessageConversation) => c.partner.id === targetUserId,
            );
            if (created) {
              this.selectConversation(created);
            }
          });
      },
      error: (err: any) => {
        console.error('Failed to start new DM', err);
        this.isSending.set(false);
      },
    });
  }

  searchMessages(): void {
    const q = this.searchMessageQuery().trim();
    const conv = this.selectedConversation();
    if (!q || !conv) return;

    this.isSearchingMessages.set(true);
    this.chatService.searchDmMessages(this.workspaceId(), q).subscribe({
      next: (results: any[]) => {
        this.searchResults.set(results.filter((m: any) => m.conversationId === conv.id));
        this.isSearchingMessages.set(false);
      },
      error: (err: any) => {
        console.error('Failed to search messages', err);
        this.isSearchingMessages.set(false);
      },
    });
  }

  onImageClick(event: { url: string; title?: string }): void {
    const allImages: GalleryImage[] = [];
    let foundIndex = 0;

    for (const m of this.messages()) {
      const matches = m.content.matchAll(
        /src="([^"]+)"|\[GIF:([^\]]+)\]|\[ATTACHMENT:([^\|]+)\|([^\|]+)\|image/g,
      );
      for (const match of matches) {
        const url = match[1] || match[2] || match[3];
        if (url) {
          if (url === event.url) {
            foundIndex = allImages.length;
          }
          allImages.push({
            url,
            title: match[4] || event.title || 'Chat Image',
            sender: m.senderName,
            timestamp: new Date(m.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
        }
      }
    }

    if (allImages.length === 0) {
      allImages.push({ url: event.url, title: event.title || 'Image Preview' });
    }

    this.galleryImages.set(allImages);
    this.activeImageIndex.set(foundIndex);
    this.isImageViewerOpen.set(true);
  }

  getInitials(name?: string): string {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }
}
