import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PollData } from '../components/create-poll-modal/create-poll-modal';
import { AnnouncementData } from '../components/create-announcement-modal/create-announcement-modal';

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  icon: string;
  accessType: 'public' | 'private';
  postingPermission: 'all_members' | 'admin_only_posting' | 'read_only';
  isDefault: boolean;
  isArchived: boolean;
  isJoined?: boolean;
  isAdmin?: boolean;
  memberCount?: number;
  members?: ChannelMember[];
  createdById?: string;
  createdAt: string;
}

export interface ChannelMember {
  id: string;
  userId: string;
  username?: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface CreateChannelDto {
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  accessType?: 'public' | 'private';
  postingPermission?: 'all_members' | 'admin_only_posting' | 'read_only';
  initialMemberUserIds?: string[];
}

export interface UpdateChannelDto {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  accessType?: 'public' | 'private';
  postingPermission?: 'all_members' | 'admin_only_posting' | 'read_only';
  isArchived?: boolean;
}

export interface DirectMessagePartner {
  id: string;
  username: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface DirectMessageConversation {
  id: string;
  workspaceId: string;
  lastMessageAt?: string;
  lastMessageText?: string;
  createdAt: string;
  partner: DirectMessagePartner;
  isPinned: boolean;
  isMuted: boolean;
  lastReadAt?: string;
  unreadCount: number;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  workspaceId: string;
  senderId: string;
  senderName?: string;
  senderAvatarUrl?: string;
  content: string;
  attachments?: string[];
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  isBookmarked?: boolean;
  isRead?: boolean;
  translatedText?: string;
  reactions?: { emoji: string; count: number; userReacted?: boolean; users?: string[] }[];
  poll?: PollData;
  announcement?: AnnouncementData;
  createdAt: string;
  updatedAt: string;
}

export interface GroupChatMember {
  id: string;
  userId: string;
  username?: string;
  avatarUrl?: string;
  role: 'admin' | 'member';
  joinedAt: string;
  isOnline?: boolean;
}

export interface GroupChat {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  category?: string;
  eventId?: string;
  eventName?: string;
  isArchived?: boolean;
  postingPermission?: 'all_members' | 'admin_only_posting' | 'read_only';
  icon: string;
  isTemporary: boolean;
  expiresAt?: string;
  createdById: string;
  lastMessageAt?: string;
  lastMessageText?: string;
  createdAt: string;
  role?: 'admin' | 'member';
  isPinned?: boolean;
  isMuted?: boolean;
  lastReadAt?: string;
  memberCount: number;
  unreadCount: number;
  members?: GroupChatMember[];
}

export interface CreateGroupChatDto {
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  isTemporary?: boolean;
  expiresAt?: string;
  initialMemberUserIds?: string[];
}

export interface UpdateGroupChatDto {
  name?: string;
  description?: string;
  icon?: string;
  isTemporary?: boolean;
  expiresAt?: string;
  isPinned?: boolean;
  isMuted?: boolean;
}

export interface GroupChatMessage {
  id: string;
  groupChatId: string;
  workspaceId: string;
  senderId: string;
  senderName?: string;
  senderAvatarUrl?: string;
  content: string;
  attachments?: string[];
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  isBookmarked?: boolean;
  isRead?: boolean;
  readBy?: { userId: string; username: string; avatarUrl?: string; readAt?: string }[];
  translatedText?: string;
  reactions?: { emoji: string; count: number; userReacted?: boolean; users?: string[] }[];
  poll?: PollData;
  announcement?: AnnouncementData;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ─── Channel Endpoints ───
  getChannels(workspaceId: string): Observable<Channel[]> {
    return this.http.get<Channel[]>(`${this.apiUrl}/workspaces/${workspaceId}/channels`);
  }

  seedDefaultChannels(workspaceId: string): Observable<Channel[]> {
    return this.http.post<Channel[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/channels/seed-defaults`,
      {},
    );
  }

  createChannel(workspaceId: string, dto: CreateChannelDto): Observable<Channel> {
    return this.http.post<Channel>(`${this.apiUrl}/workspaces/${workspaceId}/channels`, dto);
  }

  getChannel(workspaceId: string, channelId: string): Observable<Channel> {
    return this.http.get<Channel>(`${this.apiUrl}/workspaces/${workspaceId}/channels/${channelId}`);
  }

  updateChannel(
    workspaceId: string,
    channelId: string,
    dto: UpdateChannelDto,
  ): Observable<Channel> {
    return this.http.patch<Channel>(
      `${this.apiUrl}/workspaces/${workspaceId}/channels/${channelId}`,
      dto,
    );
  }

  deleteChannel(
    workspaceId: string,
    channelId: string,
  ): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/workspaces/${workspaceId}/channels/${channelId}`,
    );
  }

  joinChannel(workspaceId: string, channelId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/workspaces/${workspaceId}/channels/${channelId}/join`,
      {},
    );
  }

  leaveChannel(workspaceId: string, channelId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/workspaces/${workspaceId}/channels/${channelId}/leave`,
      {},
    );
  }

  addMember(
    workspaceId: string,
    channelId: string,
    userId: string,
    role: 'admin' | 'member' = 'member',
  ): Observable<ChannelMember> {
    return this.http.post<ChannelMember>(
      `${this.apiUrl}/workspaces/${workspaceId}/channels/${channelId}/members`,
      { userId, role },
    );
  }

  removeMember(
    workspaceId: string,
    channelId: string,
    userId: string,
  ): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.apiUrl}/workspaces/${workspaceId}/channels/${channelId}/members/${userId}`,
    );
  }

  // ─── Direct Message Endpoints ───
  listDmConversations(workspaceId: string): Observable<DirectMessageConversation[]> {
    return this.http.get<DirectMessageConversation[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/direct-messages/conversations`,
    );
  }

  getOrCreateDmConversation(
    workspaceId: string,
    recipientUserId: string,
  ): Observable<DirectMessageConversation> {
    return this.http.post<DirectMessageConversation>(
      `${this.apiUrl}/workspaces/${workspaceId}/direct-messages/conversations`,
      { recipientUserId },
    );
  }

  getDmMessages(
    workspaceId: string,
    conversationId: string,
    limit: number = 50,
  ): Observable<DirectMessage[]> {
    return this.http.get<DirectMessage[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/direct-messages/conversations/${conversationId}/messages?limit=${limit}`,
    );
  }

  sendDirectMessage(
    workspaceId: string,
    recipientUserId: string,
    content: string,
    attachments: string[] = [],
  ): Observable<DirectMessage> {
    return this.http.post<DirectMessage>(
      `${this.apiUrl}/workspaces/${workspaceId}/direct-messages/messages`,
      { recipientUserId, content, attachments },
    );
  }

  updateDmSettings(
    workspaceId: string,
    conversationId: string,
    settings: { isPinned?: boolean; isMuted?: boolean },
  ): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/direct-messages/conversations/${conversationId}/settings`,
      settings,
    );
  }

  markDmAsRead(
    workspaceId: string,
    conversationId: string,
  ): Observable<{ success: boolean; lastReadAt: string }> {
    return this.http.post<{ success: boolean; lastReadAt: string }>(
      `${this.apiUrl}/workspaces/${workspaceId}/direct-messages/conversations/${conversationId}/read`,
      {},
    );
  }

  searchDmMessages(workspaceId: string, query: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/direct-messages/search?q=${encodeURIComponent(query)}`,
    );
  }

  // ─── Group Chat Endpoints ───
  getGroupChats(workspaceId: string): Observable<GroupChat[]> {
    return this.http.get<GroupChat[]>(`${this.apiUrl}/workspaces/${workspaceId}/group-chats`);
  }

  createGroupChat(workspaceId: string, dto: CreateGroupChatDto): Observable<GroupChat> {
    return this.http.post<GroupChat>(`${this.apiUrl}/workspaces/${workspaceId}/group-chats`, dto);
  }

  getGroupChatDetails(workspaceId: string, groupId: string): Observable<GroupChat> {
    return this.http.get<GroupChat>(
      `${this.apiUrl}/workspaces/${workspaceId}/group-chats/${groupId}`,
    );
  }

  updateGroupChat(
    workspaceId: string,
    groupId: string,
    dto: UpdateGroupChatDto,
  ): Observable<GroupChat> {
    return this.http.patch<GroupChat>(
      `${this.apiUrl}/workspaces/${workspaceId}/group-chats/${groupId}`,
      dto,
    );
  }

  deleteGroupChat(
    workspaceId: string,
    groupId: string,
  ): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/workspaces/${workspaceId}/group-chats/${groupId}`,
    );
  }

  addGroupMember(workspaceId: string, groupId: string, userId: string): Observable<GroupChat> {
    return this.http.post<GroupChat>(
      `${this.apiUrl}/workspaces/${workspaceId}/group-chats/${groupId}/members`,
      { userId },
    );
  }

  removeGroupMember(
    workspaceId: string,
    groupId: string,
    userId: string,
  ): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.apiUrl}/workspaces/${workspaceId}/group-chats/${groupId}/members/${userId}`,
    );
  }

  leaveGroupChat(workspaceId: string, groupId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/workspaces/${workspaceId}/group-chats/${groupId}/leave`,
      {},
    );
  }

  getGroupMessages(
    workspaceId: string,
    groupId: string,
    limit: number = 50,
  ): Observable<GroupChatMessage[]> {
    return this.http.get<GroupChatMessage[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/group-chats/${groupId}/messages?limit=${limit}`,
    );
  }

  sendGroupMessage(
    workspaceId: string,
    groupId: string,
    content: string,
    attachments: string[] = [],
  ): Observable<GroupChatMessage> {
    return this.http.post<GroupChatMessage>(
      `${this.apiUrl}/workspaces/${workspaceId}/group-chats/${groupId}/messages`,
      { content, attachments },
    );
  }

  markGroupAsRead(
    workspaceId: string,
    groupId: string,
  ): Observable<{ success: boolean; lastReadAt?: string }> {
    return this.http.post<{ success: boolean; lastReadAt?: string }>(
      `${this.apiUrl}/workspaces/${workspaceId}/group-chats/${groupId}/read`,
      {},
    );
  }

  // File Repository API Endpoints
  getRepositoryFolders(workspaceId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/workspaces/${workspaceId}/file-repository/folders`);
  }

  createRepositoryFolder(
    workspaceId: string,
    data: { name: string; icon?: string; color?: string },
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/file-repository/folders`,
      data,
    );
  }

  getRepositoryFiles(workspaceId: string, category?: string, folderId?: string): Observable<any[]> {
    let url = `${this.apiUrl}/workspaces/${workspaceId}/file-repository/files?`;
    if (category) url += `category=${category}&`;
    if (folderId) url += `folderId=${folderId}&`;
    return this.http.get<any[]>(url);
  }

  createRepositoryFile(workspaceId: string, fileData: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/file-repository/files`,
      fileData,
    );
  }

  togglePinRepositoryFile(workspaceId: string, fileId: string): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/file-repository/files/${fileId}/pin`,
      {},
    );
  }

  // Match Discussion Notes API Endpoints
  getMatchNotes(workspaceId: string, matchId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/matches/${matchId}/notes`,
    );
  }

  createMatchNote(workspaceId: string, matchId: string, noteData: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/matches/${matchId}/notes`,
      noteData,
    );
  }

  // Scheduled Messages API Endpoints
  getScheduledMessages(workspaceId: string, senderId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/scheduled-messages/${senderId}`,
    );
  }

  createScheduledMessage(workspaceId: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/scheduled-messages`, data);
  }

  cancelScheduledMessage(workspaceId: string, id: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/scheduled-messages/${id}`,
    );
  }

  // User Notification Preferences API Endpoints
  getUserPreferences(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/${userId}/preferences`);
  }

  updateUserPreferences(userId: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${userId}/preferences`, data);
  }

  // Player Profile API Endpoint
  getPlayerProfile(handle: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/players/profile/${handle}`);
  }

  // Polls & Announcements API Endpoints
  createPoll(workspaceId: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/polls`, data);
  }

  votePoll(workspaceId: string, pollId: string, userId: string, optionId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/polls/${pollId}/vote`, {
      userId,
      optionId,
    });
  }

  createAnnouncement(workspaceId: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/announcements`, data);
  }

  acknowledgeAnnouncement(workspaceId: string, id: string, userId: string): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/announcements/${id}/acknowledge`,
      {
        userId,
      },
    );
  }

  // Event Presets API Endpoint
  getEventPresets(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/event-presets`);
  }

  // Match Fixture API Endpoint
  getMatchFixture(workspaceId: string, matchId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/workspaces/${workspaceId}/matches/${matchId}`);
  }

  // Link Preview API Endpoint
  getLinkPreview(url: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/link-previews?url=${encodeURIComponent(url)}`);
  }

  // Moderation API Endpoints
  deleteMedia(workspaceId: string, fileId: string, reason?: string): Observable<any> {
    return this.http.request<any>(
      'delete',
      `${this.apiUrl}/workspaces/${workspaceId}/chat/moderation/media/${fileId}`,
      {
        body: { reason },
      },
    );
  }

  muteUser(
    workspaceId: string,
    targetUserId: string,
    durationMinutes?: number,
    reason?: string,
    channelId?: string,
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/chat/moderation/mute`, {
      targetUserId,
      durationMinutes,
      reason,
      channelId,
    });
  }

  unmuteUser(workspaceId: string, targetUserId: string, channelId?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/chat/moderation/unmute`, {
      targetUserId,
      channelId,
    });
  }

  banUser(
    workspaceId: string,
    targetUserId: string,
    reason?: string,
    channelId?: string,
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/chat/moderation/ban`, {
      targetUserId,
      reason,
      channelId,
    });
  }

  unbanUser(workspaceId: string, targetUserId: string, channelId?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/chat/moderation/unban`, {
      targetUserId,
      channelId,
    });
  }

  lockChannel(
    workspaceId: string,
    channelId: string,
    isLocked: boolean,
    reason?: string,
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/moderation/channels/${channelId}/lock`,
      { isLocked, reason },
    );
  }

  archiveChannel(
    workspaceId: string,
    channelId: string,
    isArchived: boolean,
    reason?: string,
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/moderation/channels/${channelId}/archive`,
      { isArchived, reason },
    );
  }

  getModerationAuditLogs(
    workspaceId: string,
    channelId?: string,
    limit: number = 50,
  ): Observable<any[]> {
    const channelParam = channelId ? `&channelId=${channelId}` : '';
    return this.http.get<any[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/moderation/audit-logs?limit=${limit}${channelParam}`,
    );
  }

  // Security API Endpoints
  registerE2EEKey(
    workspaceId: string,
    publicKey: string,
    algorithm: string = 'ECDH-P256',
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/chat/security/e2ee/keys`, {
      publicKey,
      algorithm,
    });
  }

  getUserE2EEKey(workspaceId: string, userId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/security/e2ee/keys/${userId}`,
    );
  }

  scanFile(
    workspaceId: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/chat/security/scan-file`, {
      fileName,
      mimeType,
      fileSize,
    });
  }

  getRetentionPolicy(workspaceId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/workspaces/${workspaceId}/chat/security/retention`);
  }

  updateRetentionPolicy(
    workspaceId: string,
    retentionDays: number,
    autoDeleteMedia: boolean,
    enabled: boolean,
  ): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/workspaces/${workspaceId}/chat/security/retention`, {
      retentionDays,
      autoDeleteMedia,
      enabled,
    });
  }

  purgeExpiredMessages(workspaceId: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/security/retention/purge`,
      {},
    );
  }

  // Productivity API Endpoints
  toggleStarMessage(
    workspaceId: string,
    messageId: string,
    messageType: string = 'channel',
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/chat/productivity/star`, {
      messageId,
      messageType,
    });
  }

  getStarredMessages(workspaceId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/productivity/starred`,
    );
  }

  createReminder(
    workspaceId: string,
    messageId: string,
    remindAt: string,
    note?: string,
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/productivity/reminders`,
      { messageId, remindAt, note },
    );
  }

  getReminders(workspaceId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/productivity/reminders`,
    );
  }

  createTask(
    workspaceId: string,
    messageId: string,
    taskTitle: string,
    assigneeId?: string,
    dueDate?: string,
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/chat/productivity/tasks`, {
      messageId,
      taskTitle,
      assigneeId,
      dueDate,
    });
  }

  getTasks(workspaceId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/workspaces/${workspaceId}/chat/productivity/tasks`);
  }

  getCalendarEvents(workspaceId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/productivity/calendar`,
    );
  }

  toggleBookmark(
    workspaceId: string,
    targetId: string,
    targetType: string = 'channel',
    label?: string,
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/productivity/bookmarks`,
      { targetId, targetType, label },
    );
  }

  getBookmarks(workspaceId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/productivity/bookmarks`,
    );
  }

  getUnreadMarker(workspaceId: string, channelId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/productivity/unread-marker?channelId=${channelId}`,
    );
  }

  getRecentlySharedFiles(workspaceId: string, limit: number = 10): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/workspaces/${workspaceId}/chat/productivity/recent-files?limit=${limit}`,
    );
  }
}
