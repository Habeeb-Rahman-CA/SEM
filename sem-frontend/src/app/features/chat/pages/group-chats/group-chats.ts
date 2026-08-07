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
import {
  ChatService,
  GroupChat,
  GroupChatMessage,
  GroupChatMember,
} from '../../services/chat.service';
import { AuthService } from '../../../auth/services/auth.service';
import { SocketService } from '../../../../core/services/socket.service';

@Component({
  selector: 'app-group-chats',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  memberSearchQuery = signal<string>('');

  // Create Group Modal state
  isCreateModalOpen = signal<boolean>(false);
  newGroupName = signal<string>('');
  newGroupDescription = signal<string>('');
  newGroupIcon = signal<string>('fi fi-rr-users-alt');
  newGroupIsTemporary = signal<boolean>(false);
  newGroupExpiresAt = signal<string>('');
  selectedMemberIds = signal<string[]>([]);

  // Add Member Modal state
  isAddMemberModalOpen = signal<boolean>(false);

  // Group Details Drawer
  isDetailsDrawerOpen = signal<boolean>(false);

  isLoadingGroups = signal<boolean>(true);
  isLoadingMessages = signal<boolean>(false);
  isSending = signal<boolean>(false);

  typingUsers = signal<{ [userId: string]: string }>({});
  private typingTimeout: any = null;

  availableIcons = [
    { label: 'Users', icon: 'fi fi-rr-users-alt' },
    { label: 'Referee Whistle', icon: 'fi fi-rr-whistle' },
    { label: 'Trophy', icon: 'fi fi-rr-trophy' },
    { label: 'Venue Building', icon: 'fi fi-rr-building' },
    { label: 'Badge Check', icon: 'fi fi-rr-badge-check' },
    { label: 'Clipboard', icon: 'fi fi-rr-clipboard' },
    { label: 'Shield', icon: 'fi fi-rr-shield' },
    { label: 'Megaphone', icon: 'fi fi-rr-bullhorn' },
  ];

  filteredGroupChats = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.groupChats();
    if (!q) return list;
    return list.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.lastMessageText?.toLowerCase().includes(q),
    );
  });

  filteredWorkspaceMembers = computed(() => {
    const q = this.memberSearchQuery().toLowerCase().trim();
    return this.members().filter((m) => {
      if (!q) return true;
      return m.user?.username?.toLowerCase().includes(q) || m.role?.name?.toLowerCase().includes(q);
    });
  });

  nonGroupMembers = computed(() => {
    const active = this.selectedGroup();
    if (!active || !active.members) return this.members();
    const existingUserIds = new Set(active.members.map((m) => m.userId));
    const q = this.memberSearchQuery().toLowerCase().trim();
    return this.members().filter((m) => {
      const isNotMember = !existingUserIds.has(m.userId);
      if (!q) return isNotMember;
      return (
        isNotMember &&
        (m.user?.username?.toLowerCase().includes(q) || m.role?.name?.toLowerCase().includes(q))
      );
    });
  });

  ngOnInit() {
    this.loadGroupChats();
    this.setupSocketListeners();
  }

  ngOnDestroy() {
    const active = this.selectedGroup();
    if (active) {
      this.socketService.emit('unsubscribeGroupChat', { groupId: active.id });
    }
    this.cleanupSocketListeners();
  }

  private setupSocketListeners() {
    this.socketService.on('group_message_received', this.handleGroupMessageReceived);
    this.socketService.on('group_user_typing', this.handleGroupUserTyping);
    this.socketService.on('group_user_stop_typing', this.handleGroupUserStopTyping);
  }

  private cleanupSocketListeners() {
    this.socketService.off('group_message_received', this.handleGroupMessageReceived);
    this.socketService.off('group_user_typing', this.handleGroupUserTyping);
    this.socketService.off('group_user_stop_typing', this.handleGroupUserStopTyping);
  }

  private handleGroupMessageReceived = (message: any) => {
    const active = this.selectedGroup();
    if (active && active.id === message.groupChatId) {
      this.messages.update((list) => [...list, message]);
      this.scrollToBottom();
      this.markAsRead(active.id);
    }

    this.groupChats.update((list) =>
      list.map((g) => {
        if (g.id === message.groupChatId) {
          const isViewing = active?.id === g.id;
          return {
            ...g,
            lastMessageAt: message.createdAt,
            lastMessageText: message.content,
            unreadCount: isViewing ? 0 : g.unreadCount + 1,
          };
        }
        return g;
      }),
    );
  };

  private handleGroupUserTyping = (data: {
    senderId: string;
    username: string;
    groupId: string;
  }) => {
    const active = this.selectedGroup();
    if (active && active.id === data.groupId && data.senderId !== this.currentUserId()) {
      this.typingUsers.update((map) => ({ ...map, [data.senderId]: data.username }));
    }
  };

  private handleGroupUserStopTyping = (data: { senderId: string; groupId: string }) => {
    const active = this.selectedGroup();
    if (active && active.id === data.groupId) {
      this.typingUsers.update((map) => {
        const copy = { ...map };
        delete copy[data.senderId];
        return copy;
      });
    }
  };

  loadGroupChats() {
    this.isLoadingGroups.set(true);
    this.chatService.getGroupChats(this.workspaceId()).subscribe({
      next: (groups) => {
        this.groupChats.set(groups);
        this.isLoadingGroups.set(false);
        if (groups.length > 0 && !this.selectedGroup()) {
          this.selectGroup(groups[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load group chats:', err);
        this.isLoadingGroups.set(false);
      },
    });
  }

  selectGroup(group: GroupChat) {
    const prev = this.selectedGroup();
    if (prev) {
      this.socketService.emit('unsubscribeGroupChat', { groupId: prev.id });
    }

    this.selectedGroup.set(group);
    this.typingUsers.set({});
    this.socketService.emit('subscribeGroupChat', { groupId: group.id });

    // Fetch full group details (with members)
    this.chatService.getGroupChatDetails(this.workspaceId(), group.id).subscribe({
      next: (fullDetails) => {
        this.selectedGroup.set(fullDetails);
      },
    });

    this.loadMessages(group.id);
    this.markAsRead(group.id);
  }

  loadMessages(groupId: string) {
    this.isLoadingMessages.set(true);
    this.chatService.getGroupMessages(this.workspaceId(), groupId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.isLoadingMessages.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Failed to load group messages:', err);
        this.isLoadingMessages.set(false);
      },
    });
  }

  markAsRead(groupId: string) {
    this.chatService.markGroupAsRead(this.workspaceId(), groupId).subscribe({
      next: () => {
        this.groupChats.update((list) =>
          list.map((g) => (g.id === groupId ? { ...g, unreadCount: 0 } : g)),
        );
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
    const active = this.selectedGroup();
    const currentUser = this.authService.currentUser();
    if (!active || !currentUser) return;

    this.socketService.emit('group_typing', {
      groupId: active.id,
      username: currentUser.username,
    });

    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.socketService.emit('group_stop_typing', {
        groupId: active.id,
      });
    }, 2000);
  }

  sendMessage() {
    const text = this.messageInput().trim();
    const active = this.selectedGroup();
    if (!text || !active || this.isSending()) return;

    this.isSending.set(true);
    this.chatService.sendGroupMessage(this.workspaceId(), active.id, text).subscribe({
      next: (newMsg) => {
        this.messages.update((list) => [...list, newMsg]);
        this.messageInput.set('');
        this.isSending.set(false);
        this.scrollToBottom();

        // Update preview in list
        this.groupChats.update((list) =>
          list.map((g) =>
            g.id === active.id
              ? { ...g, lastMessageAt: newMsg.createdAt, lastMessageText: text }
              : g,
          ),
        );
      },
      error: (err) => {
        console.error('Failed to send group message:', err);
        this.isSending.set(false);
      },
    });
  }

  toggleMemberSelection(userId: string) {
    this.selectedMemberIds.update((ids) =>
      ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId],
    );
  }

  createGroup() {
    const name = this.newGroupName().trim();
    if (!name) return;

    this.chatService
      .createGroupChat(this.workspaceId(), {
        name,
        description: this.newGroupDescription().trim() || undefined,
        icon: this.newGroupIcon(),
        isTemporary: this.newGroupIsTemporary(),
        expiresAt: this.newGroupExpiresAt() || undefined,
        initialMemberUserIds: this.selectedMemberIds(),
      })
      .subscribe({
        next: (group) => {
          this.isCreateModalOpen.set(false);
          this.resetCreateModal();
          this.loadGroupChats();
          this.selectGroup(group);
        },
        error: (err) => {
          console.error('Failed to create group:', err);
        },
      });
  }

  resetCreateModal() {
    this.newGroupName.set('');
    this.newGroupDescription.set('');
    this.newGroupIcon.set('fi fi-rr-users-alt');
    this.newGroupIsTemporary.set(false);
    this.newGroupExpiresAt.set('');
    this.selectedMemberIds.set([]);
  }

  addMemberToActiveGroup(member: any) {
    const active = this.selectedGroup();
    if (!active) return;

    this.chatService.addGroupMember(this.workspaceId(), active.id, member.userId).subscribe({
      next: (updatedGroup) => {
        this.selectedGroup.set(updatedGroup);
        this.isAddMemberModalOpen.set(false);
      },
    });
  }

  removeMemberFromActiveGroup(member: GroupChatMember, event: Event) {
    event.stopPropagation();
    const active = this.selectedGroup();
    if (!active) return;

    this.chatService.removeGroupMember(this.workspaceId(), active.id, member.userId).subscribe({
      next: () => {
        this.selectedGroup.update((g) =>
          g ? { ...g, members: g.members?.filter((m) => m.userId !== member.userId) } : null,
        );
      },
    });
  }

  leaveCurrentGroup() {
    const active = this.selectedGroup();
    if (!active) return;

    this.chatService.leaveGroupChat(this.workspaceId(), active.id).subscribe({
      next: () => {
        this.selectedGroup.set(null);
        this.loadGroupChats();
      },
    });
  }

  togglePin(group: GroupChat, event: Event) {
    event.stopPropagation();
    const newPinned = !group.isPinned;
    this.chatService
      .updateGroupChat(this.workspaceId(), group.id, { isPinned: newPinned })
      .subscribe({
        next: () => {
          this.groupChats.update((list) =>
            list.map((g) => (g.id === group.id ? { ...g, isPinned: newPinned } : g)),
          );
        },
      });
  }

  toggleMute(group: GroupChat, event: Event) {
    event.stopPropagation();
    const newMuted = !group.isMuted;
    this.chatService
      .updateGroupChat(this.workspaceId(), group.id, { isMuted: newMuted })
      .subscribe({
        next: () => {
          this.groupChats.update((list) =>
            list.map((g) => (g.id === group.id ? { ...g, isMuted: newMuted } : g)),
          );
        },
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

  getTypingUserNames(): string {
    const names = Object.values(this.typingUsers());
    if (names.length === 0) return '';
    if (names.length === 1) return `${names[0]} is typing...`;
    return `${names.join(', ')} are typing...`;
  }
}
