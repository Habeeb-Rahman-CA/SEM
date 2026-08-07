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
import { VideoPlayerComponent, VideoSource } from '../../components/video-player/video-player';
import {
  ThreadDrawerComponent,
  ThreadReplyItem,
} from '../../components/thread-drawer/thread-drawer';
import { MessageActionToolbarComponent } from '../../components/message-action-toolbar/message-action-toolbar';
import { ForwardMessageModalComponent } from '../../components/forward-message-modal/forward-message-modal';
import { ShareMessageModalComponent } from '../../components/share-message-modal/share-message-modal';
import { PollCardComponent } from '../../components/poll-card/poll-card';
import { PollData } from '../../components/create-poll-modal/create-poll-modal';
import { AnnouncementCardComponent } from '../../components/announcement-card/announcement-card';
import { AnnouncementData } from '../../components/create-announcement-modal/create-announcement-modal';
import {
  ScheduledMessagesDrawerComponent,
  ScheduledMessageItem,
} from '../../components/scheduled-messages-drawer/scheduled-messages-drawer';
import { AdvancedSearchModalComponent } from '../../components/advanced-search-modal/advanced-search-modal';
import {
  AttachmentDetailsModalComponent,
  AttachmentFileDetails,
} from '../../components/attachment-details-modal/attachment-details-modal';
import { ReadReceiptIndicatorComponent } from '../../components/read-receipt-indicator/read-receipt-indicator';
import { TypingIndicatorComponent } from '../../components/typing-indicator/typing-indicator';
import {
  UserPresenceBadgeComponent,
  UserPresenceSelectorComponent,
  UserPresenceState,
} from '../../components/user-presence/user-presence';
import {
  NotificationSettingsModalComponent,
  NotificationPreferences,
} from '../../components/notification-settings-modal/notification-settings-modal';
import {
  NotificationSummaryModalComponent,
  NotificationItem,
} from '../../components/notification-summary-modal/notification-summary-modal';

@Component({
  selector: 'app-direct-messages',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChatMessageRendererComponent,
    ChatRichMessageInputComponent,
    ImageViewerComponent,
    VideoPlayerComponent,
    ThreadDrawerComponent,
    MessageActionToolbarComponent,
    ForwardMessageModalComponent,
    ShareMessageModalComponent,
    PollCardComponent,
    AnnouncementCardComponent,
    ScheduledMessagesDrawerComponent,
    AdvancedSearchModalComponent,
    AttachmentDetailsModalComponent,
    ReadReceiptIndicatorComponent,
    TypingIndicatorComponent,
    UserPresenceBadgeComponent,
    UserPresenceSelectorComponent,
    NotificationSettingsModalComponent,
    NotificationSummaryModalComponent,
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

  scheduledMessages = signal<ScheduledMessageItem[]>([]);
  isScheduledDrawerOpen = signal<boolean>(false);
  isAdvancedSearchOpen = signal<boolean>(false);
  selectedAttachmentDetails = signal<AttachmentFileDetails | null>(null);
  userPresence = signal<UserPresenceState>({
    status: 'online',
    customStatusText: 'Working remotely',
  });
  isPresenceModalOpen = signal<boolean>(false);

  // Notification Modals & Preferences
  isNotificationSettingsOpen = signal<boolean>(false);
  isNotificationSummaryOpen = signal<boolean>(false);
  notificationPreferences = signal<NotificationPreferences>({
    desktopEnabled: true,
    browserEnabled: true,
    pushEnabled: true,
    emailDigest: 'hourly',
    notificationScope: 'all',
    mutedChannelIds: [],
    mutedUserIds: [],
  });

  notificationsList = signal<NotificationItem[]>([
    {
      id: 'n1',
      senderName: 'Habeeb Rahman',
      content:
        'Hey @team, please check out the newly deployed typing indicators and notification preferences.',
      type: 'mention',
      createdAt: '10m ago',
      isRead: false,
    },
    {
      id: 'n2',
      senderName: 'Sarah Jenkins',
      channelName: 'referees-announcements',
      content: 'Match schedule for tomorrow has been updated. Please confirm your attendance.',
      type: 'announcement',
      createdAt: '45m ago',
      isRead: false,
    },
    {
      id: 'n3',
      senderName: 'Alex Rivers',
      content: 'Sent you the updated venue selection PDF attachment.',
      type: 'direct_message',
      createdAt: '2h ago',
      isRead: true,
    },
  ]);

  unreadNotificationCount = computed(
    () => this.notificationsList().filter((n) => !n.isRead).length,
  );

  isPartnerTyping = signal<boolean>(false);
  private typingTimeout: any = null;

  activeTypingUsers = computed(() => {
    if (this.isPartnerTyping()) {
      const partnerName = this.selectedConversation()?.partner?.username || 'Partner';
      return [partnerName];
    }
    return [];
  });

  // Image Viewer Lightbox State
  isImageViewerOpen = signal<boolean>(false);
  galleryImages = signal<GalleryImage[]>([]);
  activeImageIndex = signal<number>(0);

  // Video Player Modal State
  isVideoPlayerOpen = signal<boolean>(false);
  activeVideo = signal<VideoSource | null>(null);

  // Thread Side Drawer State
  activeThreadMessage = signal<any | null>(null);
  threadRepliesMap = signal<{ [messageId: string]: ThreadReplyItem[] }>({});

  activeThreadReplies = computed(() => {
    const parent = this.activeThreadMessage();
    if (!parent) return [];
    return this.threadRepliesMap()[parent.id] || [];
  });

  openThread(msg: any): void {
    this.activeThreadMessage.set(msg);
  }

  closeThread(): void {
    this.activeThreadMessage.set(null);
  }

  getThreadReplyCount(messageId: string): number {
    return (this.threadRepliesMap()[messageId] || []).length;
  }

  sendThreadReply(event: { parentMessageId: string; content: string }): void {
    const currentUser = this.authService.currentUser();
    const replyItem: ThreadReplyItem = {
      id: 'rep-' + Math.random().toString(36).substring(2, 9),
      parentMessageId: event.parentMessageId,
      senderId: this.currentUserId(),
      senderName: currentUser?.username || 'You',
      content: event.content,
      createdAt: new Date().toISOString(),
    };

    this.threadRepliesMap.update((map) => {
      const existing = map[event.parentMessageId] || [];
      return {
        ...map,
        [event.parentMessageId]: [...existing, replyItem],
      };
    });
  }

  // 10 Message Actions State & Handlers
  replyingToMessage = signal<any | null>(null);
  editingMessage = signal<any | null>(null);
  forwardingMessage = signal<any | null>(null);
  sharingMessage = signal<any | null>(null);
  toastMessage = signal<string | null>(null);

  pinnedMessages = computed(() => {
    return this.messages().filter((m: any) => m.isPinned);
  });

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }

  onReplyMsg(msg: any): void {
    this.replyingToMessage.set(msg);
  }

  onThreadMsg(msg: any): void {
    this.openThread(msg);
  }

  onEditMsg(msg: any): void {
    this.editingMessage.set(msg);
  }

  onDeleteMsg(msg: any): void {
    this.messages.update((list: any[]) => list.filter((m) => m.id !== msg.id));
    this.showToast('Message deleted');
  }

  onPinMsg(msg: any): void {
    this.messages.update((list: any[]) =>
      list.map((m) => (m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m)),
    );
    this.showToast(msg.isPinned ? 'Message unpinned' : 'Message pinned');
  }

  onForwardMsg(msg: any): void {
    this.forwardingMessage.set(msg);
  }

  onCopyMsg(msg: any): void {
    navigator.clipboard.writeText(msg.content).then(() => {
      this.showToast('Message text copied to clipboard');
    });
  }

  onBookmarkMsg(msg: any): void {
    this.messages.update((list: any[]) =>
      list.map((m) => (m.id === msg.id ? { ...m, isBookmarked: !m.isBookmarked } : m)),
    );
    this.showToast(msg.isBookmarked ? 'Bookmark removed' : 'Message bookmarked');
  }

  onTranslateMsg(msg: any): void {
    this.messages.update((list: any[]) =>
      list.map((m) => {
        if (m.id === msg.id) {
          const translatedText = m.translatedText ? undefined : `🌐 [Translated]: ${m.content}`;
          return { ...m, translatedText };
        }
        return m;
      }),
    );
  }

  onShareMsg(msg: any): void {
    this.sharingMessage.set(msg);
  }

  onReactEmoji(event: { message: any; emoji: string }): void {
    this.messages.update((list: any[]) =>
      list.map((m) => {
        if (m.id === event.message.id) {
          const reactions = m.reactions ? [...m.reactions] : [];
          const existingIdx = reactions.findIndex((r: any) => r.emoji === event.emoji);

          if (existingIdx > -1) {
            const r = reactions[existingIdx];
            if (r.userReacted) {
              const count = r.count - 1;
              if (count <= 0) {
                reactions.splice(existingIdx, 1);
              } else {
                reactions[existingIdx] = { ...r, count, userReacted: false };
              }
            } else {
              reactions[existingIdx] = { ...r, count: r.count + 1, userReacted: true };
            }
          } else {
            reactions.push({ emoji: event.emoji, count: 1, userReacted: true });
          }

          return { ...m, reactions };
        }
        return m;
      }),
    );
  }

  handleConfirmForward(event: {
    targetId: string;
    targetName: string;
    type: 'user' | 'channel';
  }): void {
    const fwd = this.forwardingMessage();
    if (!fwd) return;

    this.showToast(`Message forwarded to ${event.targetName}`);
    this.forwardingMessage.set(null);
  }

  onSendPoll(poll: PollData): void {
    const currentUser = this.authService.currentUser();
    const activeConv = this.selectedConversation();
    if (!activeConv) return;

    const pollMessage: any = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      conversationId: activeConv.id,
      workspaceId: this.workspaceId(),
      senderId: this.currentUserId(),
      senderName: currentUser?.username || 'You',
      content: `📊 **Poll**: ${poll.question}`,
      poll: { ...poll, createdById: this.currentUserId() },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.messages.update((list: any[]) => [...list, pollMessage]);
    this.scrollToBottom();
    this.showToast('Poll created and sent!');
  }

  onVotePoll(event: { pollId: string; optionId: string }): void {
    const userId = this.currentUserId();
    this.messages.update((list: any[]) =>
      list.map((m) => {
        if (m.poll && m.poll.id === event.pollId) {
          const poll = { ...m.poll };
          const options = poll.options.map((opt: any) => {
            let votes = opt.votes ? [...opt.votes] : [];
            const hasVoted = votes.includes(userId);

            if (opt.id === event.optionId) {
              if (hasVoted) {
                votes = votes.filter((v: string) => v !== userId);
              } else {
                votes.push(userId);
              }
            } else if (!poll.allowMultipleChoice && hasVoted) {
              // If not multiple choice, remove vote from other options
              votes = votes.filter((v: string) => v !== userId);
            }

            return { ...opt, votes };
          });

          return { ...m, poll: { ...poll, options } };
        }
        return m;
      }),
    );
  }

  onSendAnnouncement(announcement: AnnouncementData): void {
    const currentUser = this.authService.currentUser();
    const activeConv = this.selectedConversation();
    if (!activeConv) return;

    const announcementMessage: any = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      conversationId: activeConv.id,
      workspaceId: this.workspaceId(),
      senderId: this.currentUserId(),
      senderName: currentUser?.username || 'You',
      content: `📢 **Announcement**: ${announcement.title}`,
      isPinned: true, // Announcements are automatically pinned!
      announcement: { ...announcement, createdById: this.currentUserId() },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.messages.update((list: any[]) => [...list, announcementMessage]);
    this.scrollToBottom();
    this.showToast('Announcement published & pinned!');
  }

  onConfirmReadAnnouncement(announcementId: string): void {
    const userId = this.currentUserId();
    this.messages.update((list: any[]) =>
      list.map((m) => {
        if (m.announcement && m.announcement.id === announcementId) {
          const ann = { ...m.announcement };
          const reads = ann.readConfirmations ? [...ann.readConfirmations] : [];
          if (!reads.includes(userId)) {
            reads.push(userId);
          }
          return { ...m, announcement: { ...ann, readConfirmations: reads } };
        }
        return m;
      }),
    );
    this.showToast('Read confirmation acknowledged');
  }

  onScheduleMessage(event: { content: string; scheduledFor: string }): void {
    const newItem: ScheduledMessageItem = {
      id: 'sch-' + Math.random().toString(36).substring(2, 9),
      content: event.content,
      scheduledFor: event.scheduledFor,
      createdAt: new Date().toISOString(),
    };
    this.scheduledMessages.update((list) => [...list, newItem]);
    const sendDateStr = new Date(event.scheduledFor).toLocaleString();
    this.showToast(`Message scheduled for ${sendDateStr}`);
  }

  onSendScheduledNow(id: string): void {
    const item = this.scheduledMessages().find((s) => s.id === id);
    if (!item) return;
    this.scheduledMessages.update((list) => list.filter((s) => s.id !== id));
    this.onSendRichMessage({ content: item.content });
    this.showToast('Scheduled message sent now!');
  }

  onCancelScheduled(id: string): void {
    this.scheduledMessages.update((list) => list.filter((s) => s.id !== id));
    this.showToast('Scheduled message cancelled');
  }

  onJumpToMessage(msg: any): void {
    this.scrollToBottom();
    this.showToast(`Jumped to message from ${msg.senderName || 'Member'}`);
  }

  onFileDetailsClick(
    file: { name: string; url?: string; category?: string },
    senderName?: string,
  ): void {
    const details: AttachmentFileDetails = {
      id: 'att-' + Math.random().toString(36).substring(2, 9),
      name: file.name || 'Attachment_File.pdf',
      url: file.url || '',
      sizeFormatted: '2.4 MB',
      uploaderName: senderName || 'Workspace Member',
      uploaderRole: 'Member',
      createdAt: new Date().toISOString(),
      version: 'v1.0',
      virusScanStatus: 'clean',
      category: (file.category as any) || 'pdf',
    };
    this.selectedAttachmentDetails.set(details);
  }

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

  onVideoClick(event: { url: string; title?: string }): void {
    this.activeVideo.set({
      url: event.url,
      title: event.title || 'Shared Video Stream',
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
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }
}
