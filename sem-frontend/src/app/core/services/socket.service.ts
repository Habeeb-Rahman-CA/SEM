import { Injectable, inject, effect } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private authService = inject(AuthService);
  private socket: Socket | null = null;

  private notificationSubject = new Subject<any>();
  private matchSubject = new Subject<any>();
  private globalLogoutSubject = new Subject<any>();

  notification$ = this.notificationSubject.asObservable();
  matchUpdated$ = this.matchSubject.asObservable();
  globalLogout$ = this.globalLogoutSubject.asObservable();

  constructor() {
    // React to token changes to establish or close websocket connection
    effect(() => {
      const token = this.authService.token();
      this.connect(token);
    });
  }

  private connect(token: string | null) {
    if (this.socket) {
      this.socket.disconnect();
    }

    const wsUrl = environment.apiUrl.replace('/api', '');
    const options: any = {
      transports: ['websocket', 'polling'],
    };
    if (token) {
      options.auth = {
        token,
      };
    }
    this.socket = io(wsUrl, options);

    this.socket.on('connect', () => {
      console.log('Socket.IO connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
    });

    this.socket.on('notification', (data) => {
      console.log('Socket.IO notification received:', data);
      this.notificationSubject.next(data);
    });

    this.socket.on('matchUpdated', (data) => {
      console.log('Socket.IO match update received:', data);
      this.matchSubject.next(data);
    });

    this.socket.on('global_logout_event', (data) => {
      console.log('Socket.IO global logout event received:', data);
      this.globalLogoutSubject.next(data);
    });
  }

  private disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket.IO connection closed.');
    }
  }

  subscribeMatch(matchId: string) {
    if (this.socket) {
      this.socket.emit('subscribeMatch', { matchId });
    }
  }

  unsubscribeMatch(matchId: string) {
    if (this.socket) {
      this.socket.emit('unsubscribeMatch', { matchId });
    }
  }

  subscribeWorkspace(workspaceId: string) {
    if (this.socket) {
      this.socket.emit('subscribeWorkspace', { workspaceId });
    }
  }

  unsubscribeWorkspace(workspaceId: string) {
    if (this.socket) {
      this.socket.emit('unsubscribeWorkspace', { workspaceId });
    }
  }

  onFileScanned(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('fileScanned', callback);
    }
  }

  offFileScanned() {
    if (this.socket) {
      this.socket.off('fileScanned');
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}
