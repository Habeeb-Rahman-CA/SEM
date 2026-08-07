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

@Component({
  selector: 'app-direct-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatMessageRendererComponent, ChatRichMessageInputComponent],
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

  filteredConversations = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.conversations();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.partner?.username?.toLowerCase().includes(q) ||
        c.lastMessageText?.toLowerCase().includes(q),
    );
  });

  filteredWorkspaceMembers = computed(() => {
    const myId = this.currentUserId();
    const q = this.memberSearchQuery().toLowerCase().trim();
    return this.members().filter((m) => {
      const isNotMe = m.userId !== myId;
      if (!q) return isNotMe;
      return (
        isNotMe &&
        (m.user?.username?.toLowerCase().includes(q) || m.role?.name?.toLowerCase().includes(q))
      );
    });
  });

  ngOnInit() {
    this.loadConversations();
    this.setupSocketListeners();
  }

  ngOnDestroy() {
    this.cleanupSocketListeners();
  }

  private setupSocketListeners() {
    this.socketService.on('dm_received', this.handleDmReceived);
    this.socketService.on('user_presence_change', this.handleUserPresenceChange);
    this.socketService.on('dm_user_typing', this.handleDmUserTyping);
    this.socketService.on('dm_user_stop_typing', this.handleDmUserStopTyping);
    this.socketService.on('dm_read_receipt', this.handleDmReadReceipt);
  }

  private cleanupSocketListeners() {
    this.socketService.off('dm_received', this.handleDmReceived);
    this.socketService.off('user_presence_change', this.handleUserPresenceChange);
    this.socketService.off('dm_user_typing', this.handleDmUserTyping);
    this.socketService.off('dm_user_stop_typing', this.handleDmUserStopTyping);
    this.socketService.off('dm_read_receipt', this.handleDmReadReceipt);
  }

  private handleDmReceived = (message: any) => {
    const active = this.selectedConversation();
    if (active && active.id === message.conversationId) {
      this.messages.update((list) => [...list, message]);
      this.scrollToBottom();
      this.markAsRead(active.id);
    }

    // Update conversation preview and unread count
    this.conversations.update((list) =>
      list.map((c) => {
        if (c.id === message.conversationId) {
          const isViewing = active?.id === c.id;
          return {
            ...c,
            lastMessageAt: message.createdAt,
            lastMessageText: message.content,
            unreadCount: isViewing ? 0 : c.unreadCount + 1,
          };
        }
        return c;
      }),
    );
  };

  private handleUserPresenceChange = (data: { userId: string; status: 'online' | 'offline' }) => {
    const isOnline = data.status === 'online';
    this.conversations.update((list) =>
      list.map((c) => {
        if (c.partner?.id === data.userId) {
          return {
            ...c,
            partner: {
              ...c.partner,
              isOnline,
            },
          };
        }
        return c;
      }),
    );

    const active = this.selectedConversation();
    if (active && active.partner?.id === data.userId) {
      this.selectedConversation.set({
        ...active,
        partner: {
          ...active.partner,
          isOnline,
        },
      });
    }
  };

  private handleDmUserTyping = (data: { senderId: string; conversationId: string }) => {
    const active = this.selectedConversation();
    if (active && active.id === data.conversationId) {
      this.isPartnerTyping.set(true);
    }
  };

  private handleDmUserStopTyping = (data: { senderId: string; conversationId: string }) => {
    const active = this.selectedConversation();
    if (active && active.id === data.conversationId) {
      this.isPartnerTyping.set(false);
    }
  };

  private handleDmReadReceipt = (data: {
    readerUserId: string;
    conversationId: string;
    readAt: string;
  }) => {
    const active = this.selectedConversation();
    if (active && active.id === data.conversationId) {
      this.messages.update((list) =>
        list.map((m) => {
          if (m.senderId === this.currentUserId()) {
            return { ...m, isRead: true };
          }
          return m;
        }),
      );
    }
  };

  loadConversations() {
    this.isLoadingConversations.set(true);
    this.chatService.listDmConversations(this.workspaceId()).subscribe({
      next: (data) => {
        this.conversations.set(data);
        this.isLoadingConversations.set(false);
        if (data.length > 0 && !this.selectedConversation()) {
          this.selectConversation(data[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load DM conversations:', err);
        this.isLoadingConversations.set(false);
      },
    });
  }

  selectConversation(conv: DirectMessageConversation) {
    this.selectedConversation.set(conv);
    this.isPartnerTyping.set(false);
    this.loadMessages(conv.id);
    this.markAsRead(conv.id);
  }

  loadMessages(conversationId: string) {
    this.isLoadingMessages.set(true);
    this.chatService.getDmMessages(this.workspaceId(), conversationId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.isLoadingMessages.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Failed to load messages:', err);
        this.isLoadingMessages.set(false);
      },
    });
  }

  markAsRead(conversationId: string) {
    this.chatService.markDmAsRead(this.workspaceId(), conversationId).subscribe({
      next: () => {
        this.conversations.update((list) =>
          list.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
        );
        const active = this.selectedConversation();
        if (active && active.partner) {
          this.socketService.emit('dm_read', {
            workspaceId: this.workspaceId(),
            conversationId,
            partnerUserId: active.partner.id,
            readAt: new Date().toISOString(),
          });
        }
      },
    });
  }

  onInputKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    } else {
      this.emitTypingSignal();
    }
  }

  private emitTypingSignal() {
    const active = this.selectedConversation();
    if (!active || !active.partner) return;

    this.socketService.emit('dm_typing', {
      workspaceId: this.workspaceId(),
      conversationId: active.id,
      recipientUserId: active.partner.id,
    });

    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.socketService.emit('dm_stop_typing', {
        workspaceId: this.workspaceId(),
        conversationId: active.id,
        recipientUserId: active.partner.id,
      });
    }, 2000);
  }

  sendMessage(textInput?: string) {
    const text = (textInput || this.messageInput()).trim();
    const active = this.selectedConversation();
    if (!text || !active || !active.partner || this.isSending()) return;

    this.isSending.set(true);
    this.chatService.sendDirectMessage(this.workspaceId(), active.partner.id, text).subscribe({
      next: (newMsg) => {
        this.messages.update((list) => [...list, newMsg]);
        this.messageInput.set('');
        this.isSending.set(false);
        this.scrollToBottom();

        this.conversations.update((list) =>
          list.map((c) =>
            c.id === active.id
              ? { ...c, lastMessageAt: newMsg.createdAt, lastMessageText: text }
              : c,
          ),
        );
      },
      error: (err) => {
        console.error('Failed to send message:', err);
        this.isSending.set(false);
      },
    });
  }

  onSendRichMessage(event: { content: string; attachments?: string[] }) {
    this.sendMessage(event.content);
  }

  startConversationWithMember(member: any) {
    this.chatService.getOrCreateDmConversation(this.workspaceId(), member.userId).subscribe({
      next: (conv) => {
        this.isNewDmModalOpen.set(false);
        this.loadConversations();
        this.selectConversation(conv);
      },
      error: (err) => {
        console.error('Failed to start conversation:', err);
      },
    });
  }

  togglePin(conv: DirectMessageConversation, event: Event) {
    event.stopPropagation();
    const newPinned = !conv.isPinned;
    this.chatService
      .updateDmSettings(this.workspaceId(), conv.id, { isPinned: newPinned })
      .subscribe({
        next: () => {
          this.conversations.update((list) =>
            list.map((c) => (c.id === conv.id ? { ...c, isPinned: newPinned } : c)),
          );
        },
      });
  }

  toggleMute(conv: DirectMessageConversation, event: Event) {
    event.stopPropagation();
    const newMuted = !conv.isMuted;
    this.chatService
      .updateDmSettings(this.workspaceId(), conv.id, { isMuted: newMuted })
      .subscribe({
        next: () => {
          this.conversations.update((list) =>
            list.map((c) => (c.id === conv.id ? { ...c, isMuted: newMuted } : c)),
          );
        },
      });
  }

  executeSearchMessages() {
    const q = this.searchMessageQuery().trim();
    if (!q) {
      this.searchResults.set([]);
      return;
    }
    this.isSearchingMessages.set(true);
    this.chatService.searchDmMessages(this.workspaceId(), q).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.isSearchingMessages.set(false);
      },
      error: () => this.isSearchingMessages.set(false),
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }

  getInitials(name?: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}
