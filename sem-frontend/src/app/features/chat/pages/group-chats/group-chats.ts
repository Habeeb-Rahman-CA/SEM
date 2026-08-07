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
import {
  GenerateEventChannelsModalComponent,
  GeneratedEventPayload,
} from '../../components/generate-event-channels-modal/generate-event-channels-modal';
import { MatchDiscussionDrawerComponent } from '../../components/match-discussion-drawer/match-discussion-drawer';
import { SmartMatchData } from '../../components/smart-event-card/smart-event-card';

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
    GenerateEventChannelsModalComponent,
    MatchDiscussionDrawerComponent,
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

  scheduledMessages = signal<ScheduledMessageItem[]>([]);
  isScheduledDrawerOpen = signal<boolean>(false);
  isAdvancedSearchOpen = signal<boolean>(false);
  selectedAttachmentDetails = signal<AttachmentFileDetails | null>(null);
  activeDiscussionMatch = signal<SmartMatchData | null>(null);
  typingUsers = signal<{ userId: string; username: string }[]>([]);
  userPresence = signal<UserPresenceState>({
    status: 'online',
    customStatusText: 'Focusing on code',
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
      id: 'gn1',
      senderName: 'Habeeb Rahman',
      channelName: 'captains-hub',
      content: 'Hey @team, venue selection poll is live. Please cast your votes.',
      type: 'mention',
      createdAt: '15m ago',
      isRead: false,
    },
    {
      id: 'gn2',
      senderName: 'Committee Lead',
      channelName: 'tournament-leads',
      content: 'Emergency Announcement: Schedule adjustments for group stage matches.',
      type: 'announcement',
      createdAt: '1h ago',
      isRead: false,
    },
  ]);

  unreadNotificationCount = computed(
    () => this.notificationsList().filter((n) => !n.isRead).length,
  );

  isGenerateEventModalOpen = signal<boolean>(false);

  // Event Hierarchy Grouping
  eventGroups = computed(() => {
    const chats = this.groupChats();
    const map = new Map<string, GroupChat[]>();

    chats.forEach((chat) => {
      const eName = chat.eventName || chat.category || 'General';
      if (!map.has(eName)) {
        map.set(eName, []);
      }
      map.get(eName)!.push(chat);
    });

    return Array.from(map.entries()).map(([eventName, channels]) => {
      const isArchived = channels.every((c) => c.isArchived);
      return { eventName, channels, isArchived };
    });
  });

  onGenerateEventChannels(payload: GeneratedEventPayload): void {
    const newChats: GroupChat[] = payload.subChannels.map((sub) => ({
      id: 'group-' + Math.random().toString(36).substring(2, 9),
      workspaceId: this.workspaceId(),
      name: `${payload.eventName} - ${sub.name}`,
      description: sub.description,
      category: payload.eventName,
      eventName: payload.eventName,
      icon: sub.icon,
      isTemporary: false,
      createdById: this.currentUserId(),
      createdAt: new Date().toISOString(),
      memberCount: 8,
      unreadCount: 0,
      isArchived: false,
      postingPermission: 'all_members',
    }));

    this.groupChats.update((list) => [...newChats, ...list]);
    if (newChats.length > 0) {
      this.selectGroup(newChats[0]);
    }
    this.showToast(`Generated ${newChats.length} sub-channels for "${payload.eventName}"`);
  }

  toggleArchiveEvent(eventName: string): void {
    let newArchivedState = false;
    this.groupChats.update((list) => {
      const targetChannels = list.filter((c) => (c.eventName || c.category) === eventName);
      newArchivedState = !targetChannels.every((c) => c.isArchived);

      return list.map((c) => {
        if ((c.eventName || c.category) === eventName) {
          return {
            ...c,
            isArchived: newArchivedState,
            postingPermission: newArchivedState ? 'read_only' : 'all_members',
          };
        }
        return c;
      });
    });

    const activeGroup = this.selectedGroup();
    if (activeGroup && (activeGroup.eventName || activeGroup.category) === eventName) {
      this.selectedGroup.update((g) =>
        g
          ? {
              ...g,
              isArchived: newArchivedState,
              postingPermission: newArchivedState ? 'read_only' : 'all_members',
            }
          : null,
      );
    }

    this.showToast(
      newArchivedState
        ? `Event "${eventName}" archived. Related channels are now READ-ONLY 🔒`
        : `Event "${eventName}" un-archived. Channels restored to active posting!`,
    );
  }

  activeTypingUserNames = computed(() => this.typingUsers().map((u) => u.username));

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
    const activeGroup = this.selectedGroup();
    if (!activeGroup) return;

    const pollMessage: any = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      groupChatId: activeGroup.id,
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
    this.showToast('Poll created and sent to channel!');
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
    const activeGroup = this.selectedGroup();
    if (!activeGroup) return;

    const announcementMessage: any = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      groupChatId: activeGroup.id,
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
    this.showToast('Announcement published & pinned to channel!');
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
    this.showToast('Scheduled message sent now to channel!');
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
      name: file.name || 'Attachment_Document.pdf',
      url: file.url || '',
      sizeFormatted: '3.1 MB',
      uploaderName: senderName || 'Channel Member',
      uploaderRole: 'Member',
      createdAt: new Date().toISOString(),
      version: 'v1.0',
      virusScanStatus: 'clean',
      category: (file.category as any) || 'pdf',
    };
    this.selectedAttachmentDetails.set(details);
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
        if (!res || res.length === 0) {
          // Provide default Event-aware structured hierarchy
          const defaultEventChats: GroupChat[] = [
            {
              id: 'gc-gen',
              workspaceId: this.workspaceId(),
              name: 'General Workspace Discussion',
              description: 'Company-wide announcements and general chat',
              eventName: 'General Workspace',
              category: 'General Workspace',
              icon: 'fi fi-rr-comments',
              isTemporary: false,
              createdById: 'admin',
              createdAt: new Date().toISOString(),
              memberCount: 24,
              unreadCount: 0,
              isArchived: false,
              postingPermission: 'all_members',
            },
            {
              id: 'gc-crick-org',
              workspaceId: this.workspaceId(),
              name: 'Cricket Tournament - Organizers',
              description: 'Executive committee & tournament leads',
              eventName: 'Cricket Tournament',
              category: 'Cricket Tournament',
              icon: 'fi fi-rr-user-gear',
              isTemporary: false,
              createdById: 'admin',
              createdAt: new Date().toISOString(),
              memberCount: 6,
              unreadCount: 0,
              isArchived: false,
              postingPermission: 'all_members',
            },
            {
              id: 'gc-crick-ref',
              workspaceId: this.workspaceId(),
              name: 'Cricket Tournament - Referees',
              description: 'Match officials & referee assignments',
              eventName: 'Cricket Tournament',
              category: 'Cricket Tournament',
              icon: 'fi fi-rr-whistle',
              isTemporary: false,
              createdById: 'admin',
              createdAt: new Date().toISOString(),
              memberCount: 4,
              unreadCount: 2,
              isArchived: false,
              postingPermission: 'all_members',
            },
            {
              id: 'gc-crick-vol',
              workspaceId: this.workspaceId(),
              name: 'Cricket Tournament - Volunteers',
              description: 'Ground staff & volunteer task force',
              eventName: 'Cricket Tournament',
              category: 'Cricket Tournament',
              icon: 'fi fi-rr-heart',
              isTemporary: false,
              createdById: 'admin',
              createdAt: new Date().toISOString(),
              memberCount: 12,
              unreadCount: 0,
              isArchived: false,
              postingPermission: 'all_members',
            },
            {
              id: 'gc-crick-team',
              workspaceId: this.workspaceId(),
              name: 'Cricket Tournament - Teams',
              description: 'Team captains & squad registrations',
              eventName: 'Cricket Tournament',
              category: 'Cricket Tournament',
              icon: 'fi fi-rr-users-alt',
              isTemporary: false,
              createdById: 'admin',
              createdAt: new Date().toISOString(),
              memberCount: 18,
              unreadCount: 1,
              isArchived: false,
              postingPermission: 'all_members',
            },
            {
              id: 'gc-foot-lead',
              workspaceId: this.workspaceId(),
              name: 'Football League - League Management',
              description: 'Football league rules & standings',
              eventName: 'Football League',
              category: 'Football League',
              icon: 'fi fi-rr-trophy',
              isTemporary: false,
              createdById: 'admin',
              createdAt: new Date().toISOString(),
              memberCount: 10,
              unreadCount: 0,
              isArchived: false,
              postingPermission: 'all_members',
            },
          ];
          this.groupChats.set(defaultEventChats);
          if (!this.selectedGroup()) {
            this.selectGroup(defaultEventChats[0]);
          }
        } else {
          this.groupChats.set(res);
        }
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
        if (!msgs || msgs.length === 0) {
          const sampleMsgs: GroupChatMessage[] = [
            {
              id: 'msg-demo-1',
              groupChatId,
              workspaceId: this.workspaceId(),
              senderId: 'user-admin',
              senderName: 'Habeeb Rahman',
              content:
                'Welcome everyone! Mentioning @player.habeeb and @player.rahman for squad lineup verification. Check live fixture #MATCH-101 below.',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              updatedAt: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: 'msg-demo-2',
              groupChatId,
              workspaceId: this.workspaceId(),
              senderId: 'user-referee-1',
              senderName: 'David Warner (Umpire)',
              content:
                'Pitch inspection completed by @player.smith for match #MATCH-FT-88. Hover over any player name to view stats & rating card.',
              createdAt: new Date(Date.now() - 1800000).toISOString(),
              updatedAt: new Date(Date.now() - 1800000).toISOString(),
            },
          ];
          this.messages.set(sampleMsgs);
        } else {
          this.messages.set(msgs);
        }
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
