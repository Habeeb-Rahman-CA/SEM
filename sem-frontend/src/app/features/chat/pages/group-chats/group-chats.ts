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
import { ChatService, GroupChat, GroupChatMessage } from '../../services/chat.service';
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

@Component({
  selector: 'app-group-chats',
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
  ],
  templateUrl: './group-chats.html',
  styleUrls: ['./group-chats.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupChatsComponent implements OnInit, OnDestroy {
  workspaceId = input.required<string>();
  members = input<any[]>([]);

  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  currentUserId = computed(() => this.authService.currentUser()?.id || '');

  groupChats = signal<GroupChat[]>([]);
  selectedGroup = signal<GroupChat | null>(null);
  messages = signal<GroupChatMessage[]>([]);

  searchQuery = signal<string>('');
  messageInput = signal<string>('');
  searchMessageQuery = signal<string>('');

  // Modals state
  isCreateModalOpen = signal<boolean>(false);
  isMembersModalOpen = signal<boolean>(false);
  isAddMemberModalOpen = signal<boolean>(false);
  isDetailsDrawerOpen = signal<boolean>(false);
  isSearchingMessages = signal<boolean>(false);
  searchResults = signal<any[]>([]);

  isLoadingGroups = signal<boolean>(true);
  isLoadingMessages = signal<boolean>(false);
  isSending = signal<boolean>(false);

  // New Group Form state
  newGroupName = signal<string>('');
  newGroupDescription = signal<string>('');
  newGroupCategory = signal<string>('custom');
  newGroupIcon = signal<string>('fi fi-rr-users-alt');
  newGroupIsTemporary = signal<boolean>(false);
  selectedInitialUserIds = signal<string[]>([]);

  presetIcons = [
    { icon: 'fi fi-rr-users-alt', label: 'Group' },
    { icon: 'fi fi-rr-trophy', label: 'Trophy' },
    { icon: 'fi fi-rr-whistle', label: 'Referee' },
    { icon: 'fi fi-rr-heart-partner-handshake', label: 'Volunteer' },
    { icon: 'fi fi-rr-marker', label: 'Venue' },
    { icon: 'fi fi-rr-briefcase', label: 'Committee' },
  ];
  availableIcons = this.presetIcons;

  removeMemberFromActiveGroup(mem: any, event: Event): void {
    event.stopPropagation();
    const userId = mem.userId || mem.id;
    if (userId) {
      this.removeMemberFromGroup(userId);
    }
  }

  leaveCurrentGroup(): void {
    const group = this.selectedGroup();
    if (group) {
      this.leaveGroup(group, new Event('click'));
    }
  }

  // Typing indicator state
  typingUsers = signal<{ userId: string; username: string }[]>([]);
  private typingTimeouts = new Map<string, any>();

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

  // Group Templates Preset
  presetTemplates = [
    {
      name: 'Football Referees',
      category: 'referees',
      icon: 'fi fi-rr-whistle text-cyan-400',
      desc: 'Official referee coordination & match assignments.',
    },
    {
      name: 'Cricket Team Captains',
      category: 'captains',
      icon: 'fi fi-rr-trophy text-amber-400',
      desc: 'Captains strategy, toss results & captain briefings.',
    },
    {
      name: 'Volunteer Leaders',
      category: 'volunteers',
      icon: 'fi fi-rr-heart-partner-handshake text-emerald-400',
      desc: 'Ground operations, venue volunteers & tasks.',
    },
    {
      name: 'Venue Managers',
      category: 'operations',
      icon: 'fi fi-rr-marker text-rose-400',
      desc: 'Stadium facilities, equipment & pitch readiness.',
    },
    {
      name: 'Tournament Committee',
      category: 'committee',
      icon: 'fi fi-rr-briefcase text-violet-400',
      desc: 'Executive decisions, scheduling & disputes.',
    },
  ];

  filteredGroups = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.groupChats();
    return this.groupChats().filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.category?.toLowerCase().includes(q),
    );
  });

  availableWorkspaceMembers = computed(() => {
    const group = this.selectedGroup();
    if (!group || !this.members()) return [];
    const existingMemberIds = new Set(group.members?.map((m) => m.userId));
    return this.members().filter((m) => {
      const uId = m.userId || m.id;
      return !existingMemberIds.has(uId);
    });
  });

  nonGroupMembers = computed(() => this.availableWorkspaceMembers());
  filteredWorkspaceMembers = computed(() => this.availableWorkspaceMembers());
  selectedMemberIds = computed(() => this.selectedInitialUserIds());

  toggleMemberSelection(userId: string): void {
    this.toggleInitialUser(userId);
  }

  createGroup(): void {
    this.createGroupChat();
  }

  ngOnInit(): void {
    this.loadGroupChats();
    this.setupSocketListeners();
  }

  ngOnDestroy(): void {
    this.socketService.off('group_message');
    this.socketService.off('group_typing');
  }

  private setupSocketListeners(): void {
    this.socketService.on('group_message', (msg: GroupChatMessage) => {
      const selected = this.selectedGroup();
      if (selected && selected.id === msg.groupChatId) {
        this.messages.update((list) => [...list, msg]);
        this.scrollToBottom();
      }
      this.loadGroupChats();
    });

    this.socketService.on(
      'group_typing',
      (data: { groupChatId: string; userId: string; username: string; isTyping: boolean }) => {
        const selected = this.selectedGroup();
        if (selected && selected.id === data.groupChatId && data.userId !== this.currentUserId()) {
          if (data.isTyping) {
            this.typingUsers.update((list) => {
              if (!list.some((u) => u.userId === data.userId)) {
                return [...list, { userId: data.userId, username: data.username }];
              }
              return list;
            });

            if (this.typingTimeouts.has(data.userId)) {
              clearTimeout(this.typingTimeouts.get(data.userId));
            }
            const timeout = setTimeout(() => {
              this.typingUsers.update((list) => list.filter((u) => u.userId !== data.userId));
              this.typingTimeouts.delete(data.userId);
            }, 3000);
            this.typingTimeouts.set(data.userId, timeout);
          } else {
            this.typingUsers.update((list) => list.filter((u) => u.userId !== data.userId));
          }
        }
      },
    );
  }

  loadGroupChats(): void {
    this.isLoadingGroups.set(true);
    this.chatService.getGroupChats(this.workspaceId()).subscribe({
      next: (res: GroupChat[]) => {
        this.groupChats.set(res);
        this.isLoadingGroups.set(false);
      },
      error: (err: any) => {
        console.error('Failed to load group chats', err);
        this.isLoadingGroups.set(false);
      },
    });
  }

  selectGroup(group: GroupChat): void {
    this.selectedGroup.set(group);
    this.loadGroupMessages(group.id);
  }

  loadGroupMessages(groupChatId: string): void {
    this.isLoadingMessages.set(true);
    this.chatService.getGroupMessages(this.workspaceId(), groupChatId).subscribe({
      next: (msgs: GroupChatMessage[]) => {
        this.messages.set(msgs);
        this.isLoadingMessages.set(false);
        this.scrollToBottom();
      },
      error: (err: any) => {
        console.error('Failed to load group messages', err);
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
    const group = this.selectedGroup();
    if (!group || this.isSending()) return;

    this.isSending.set(true);
    this.chatService.sendGroupMessage(this.workspaceId(), group.id, event.content).subscribe({
      next: (msg: GroupChatMessage) => {
        this.messages.update((list) => [...list, msg]);
        this.messageInput.set('');
        this.isSending.set(false);
        this.scrollToBottom();
        this.loadGroupChats();
      },
      error: (err: any) => {
        console.error('Failed to send group message', err);
        this.isSending.set(false);
      },
    });
  }

  onTyping(): void {
    const group = this.selectedGroup();
    if (!group) return;
    this.socketService.emit('group_typing', {
      workspaceId: this.workspaceId(),
      groupChatId: group.id,
    });
  }

  openCreateModal(preset?: any): void {
    if (preset) {
      this.newGroupName.set(preset.name);
      this.newGroupDescription.set(preset.desc);
      this.newGroupCategory.set(preset.category);
    } else {
      this.newGroupName.set('');
      this.newGroupDescription.set('');
      this.newGroupCategory.set('custom');
    }
    this.selectedInitialUserIds.set([]);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  toggleInitialUser(userId: string): void {
    this.selectedInitialUserIds.update((ids) => {
      if (ids.includes(userId)) return ids.filter((id) => id !== userId);
      return [...ids, userId];
    });
  }

  createGroupChat(): void {
    const name = this.newGroupName().trim();
    if (!name) return;

    this.isSending.set(true);
    this.chatService
      .createGroupChat(this.workspaceId(), {
        name,
        description: this.newGroupDescription().trim() || undefined,
        category: this.newGroupCategory(),
        initialMemberUserIds: this.selectedInitialUserIds(),
      })
      .subscribe({
        next: (group: GroupChat) => {
          this.isSending.set(false);
          this.closeCreateModal();
          this.loadGroupChats();
          this.selectGroup(group);
        },
        error: (err: any) => {
          console.error('Failed to create group chat', err);
          this.isSending.set(false);
        },
      });
  }

  addMemberToActiveGroup(mem: any): void {
    const userId = mem.userId || mem.id;
    if (userId) {
      this.addMemberToGroup(userId);
      this.isAddMemberModalOpen.set(false);
    }
  }

  addMemberToGroup(userId: string): void {
    const group = this.selectedGroup();
    if (!group) return;

    this.chatService.addGroupMember(this.workspaceId(), group.id, userId).subscribe({
      next: () => {
        this.chatService
          .getGroupChatDetails(this.workspaceId(), group.id)
          .subscribe((updated: GroupChat) => {
            this.selectedGroup.set(updated);
            this.loadGroupChats();
          });
      },
    });
  }

  removeMemberFromGroup(userId: string): void {
    const group = this.selectedGroup();
    if (!group) return;

    this.chatService.removeGroupMember(this.workspaceId(), group.id, userId).subscribe({
      next: () => {
        this.chatService
          .getGroupChatDetails(this.workspaceId(), group.id)
          .subscribe((updated: GroupChat) => {
            this.selectedGroup.set(updated);
            this.loadGroupChats();
          });
      },
    });
  }

  togglePin(group: GroupChat, event: Event): void {
    event.stopPropagation();
    this.groupChats.update((list) =>
      list.map((g) => (g.id === group.id ? { ...g, isPinned: !g.isPinned } : g)),
    );
  }

  toggleMute(group: GroupChat, event: Event): void {
    event.stopPropagation();
    this.groupChats.update((list) =>
      list.map((g) => (g.id === group.id ? { ...g, isMuted: !g.isMuted } : g)),
    );
  }

  leaveGroup(group: GroupChat, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to leave ${group.name}?`)) return;

    this.chatService.leaveGroupChat(this.workspaceId(), group.id).subscribe({
      next: () => {
        if (this.selectedGroup()?.id === group.id) {
          this.selectedGroup.set(null);
        }
        this.loadGroupChats();
      },
    });
  }

  searchMessages(): void {
    const q = this.searchMessageQuery().toLowerCase().trim();
    const group = this.selectedGroup();
    if (!q || !group) return;

    const matched = this.messages().filter((m) => m.content.toLowerCase().includes(q));
    this.searchResults.set(matched);
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
            title: match[4] || event.title || 'Group Chat Image',
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
      title: event.title || 'Shared Group Video',
    });
    this.isVideoPlayerOpen.set(true);
  }

  filteredGroupChats = computed(() => this.filteredGroups());

  getTypingUserNames(): string {
    const users = this.typingUsers();
    if (users.length === 1) return `${users[0].username} is typing...`;
    if (users.length === 2) return `${users[0].username} and ${users[1].username} are typing...`;
    if (users.length > 2)
      return `${users[0].username} and ${users.length - 1} others are typing...`;
    return '';
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
