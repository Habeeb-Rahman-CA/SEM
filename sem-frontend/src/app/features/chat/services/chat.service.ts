import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

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
  translatedText?: string;
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
  translatedText?: string;
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
}
