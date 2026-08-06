import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export type NotificationCategory = 'mention' | 'support' | 'system' | 'match' | 'payment';
export type NotificationTab = 'all' | 'unread' | 'mentions' | 'support' | 'archived' | 'snoozed';

export interface CenterNotificationItem {
  id: string;
  workspaceId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  isArchived: boolean;
  snoozedUntil: string | null;
  createdAt: string;
  linkUrl?: string;
  authorName?: string;
}

@Injectable({ providedIn: 'root' })
export class FrontendNotificationCenterService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  unreadCount = signal<number>(0);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private wsBase(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/notifications`;
  }

  getNotifications(
    workspaceId: string,
    tab: NotificationTab = 'all',
  ): Observable<{ items: CenterNotificationItem[]; unreadCount: number }> {
    return this.http
      .get<{ items: CenterNotificationItem[]; unreadCount: number }>(
        `${this.wsBase(workspaceId)}?tab=${tab}`,
        { headers: this.authHeaders },
      )
      .pipe(tap((res) => this.unreadCount.set(res.unreadCount)));
  }

  toggleRead(
    workspaceId: string,
    notificationId: string,
    isRead: boolean,
  ): Observable<CenterNotificationItem> {
    return this.http.post<CenterNotificationItem>(
      `${this.wsBase(workspaceId)}/${notificationId}/read`,
      { isRead },
      { headers: this.authHeaders },
    );
  }

  archive(workspaceId: string, notificationId: string): Observable<CenterNotificationItem> {
    return this.http.post<CenterNotificationItem>(
      `${this.wsBase(workspaceId)}/${notificationId}/archive`,
      {},
      { headers: this.authHeaders },
    );
  }

  snooze(
    workspaceId: string,
    notificationId: string,
    minutes: number,
  ): Observable<CenterNotificationItem> {
    return this.http.post<CenterNotificationItem>(
      `${this.wsBase(workspaceId)}/${notificationId}/snooze`,
      { minutes },
      { headers: this.authHeaders },
    );
  }

  markAllAsRead(workspaceId: string): Observable<{ success: boolean; count: number }> {
    return this.http
      .post<{ success: boolean; count: number }>(
        `${this.wsBase(workspaceId)}/read-all`,
        {},
        { headers: this.authHeaders },
      )
      .pipe(tap(() => this.unreadCount.set(0)));
  }

  getCategoryIcon(category: NotificationCategory): string {
    switch (category) {
      case 'mention':
        return 'fi fi-rr-at';
      case 'support':
        return 'fi fi-rr-headset';
      case 'payment':
        return 'fi fi-rr-credit-card';
      case 'match':
        return 'fi fi-sr-play-alt';
      default:
        return 'fi fi-rr-bell';
    }
  }

  getCategoryBadgeClass(category: NotificationCategory): string {
    switch (category) {
      case 'mention':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      case 'support':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'payment':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'match':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  }
}
