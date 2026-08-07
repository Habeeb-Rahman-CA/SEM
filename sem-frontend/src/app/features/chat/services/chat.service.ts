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

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

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
}
