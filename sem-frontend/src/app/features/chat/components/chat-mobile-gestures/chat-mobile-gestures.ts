import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-chat-mobile-gestures',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-mobile-gestures.html',
  styleUrls: ['./chat-mobile-gestures.css'],
})
export class ChatMobileGesturesComponent implements OnInit {
  @Input() workspaceId: string = 'ws-1';
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() cameraCapture = new EventEmitter<string>();
  @Output() gallerySelect = new EventEmitter<FileList>();

  // Mobile State Signals
  isOnline = signal<boolean>(navigator.onLine);
  offlineQueue = signal<any[]>([]);
  backgroundUploadProgress = signal<number>(0);
  pushEnabled = signal<boolean>(false);
  cameraStreamActive = signal<boolean>(false);

  // Touch Swipe Gesture State
  touchStartX = 0;
  touchEndX = 0;
  swipedMessage = signal<string | null>(null);
  swipeAction = signal<'reply' | 'react' | null>(null);

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.loadOfflineQueue();
  }

  @HostListener('window:online')
  onOnline() {
    this.isOnline.set(true);
    this.syncOfflineQueue();
  }

  @HostListener('window:offline')
  onOffline() {
    this.isOnline.set(false);
  }

  // Swipe Gestures Logic
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent, messageId: string) {
    this.touchEndX = event.changedTouches[0].screenX;
    const diffX = this.touchEndX - this.touchStartX;

    if (diffX > 60) {
      // Swipe Right -> React
      this.swipedMessage.set(messageId);
      this.swipeAction.set('react');
    } else if (diffX < -60) {
      // Swipe Left -> Reply
      this.swipedMessage.set(messageId);
      this.swipeAction.set('reply');
    }
  }

  // Offline Message Queue
  saveToOfflineQueue(content: string) {
    const queue = this.offlineQueue();
    queue.push({ id: Date.now(), content, timestamp: new Date() });
    this.offlineQueue.set([...queue]);
    localStorage.setItem('chat_offline_queue', JSON.stringify(queue));
  }

  loadOfflineQueue() {
    const saved = localStorage.getItem('chat_offline_queue');
    if (saved) {
      this.offlineQueue.set(JSON.parse(saved));
    }
  }

  syncOfflineQueue() {
    const queue = this.offlineQueue();
    if (queue.length === 0) return;

    // Simulate Background Queue Flush
    this.backgroundUploadProgress.set(20);
    setTimeout(() => {
      this.backgroundUploadProgress.set(100);
      this.offlineQueue.set([]);
      localStorage.removeItem('chat_offline_queue');
      setTimeout(() => this.backgroundUploadProgress.set(0), 1500);
    }, 1000);
  }

  // Camera & Gallery Integration
  async openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.cameraStreamActive.set(true);
      // Clean up demo stream
      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop());
        this.cameraStreamActive.set(false);
        this.cameraCapture.emit('data:image/png;base64,mockCapturedImageData');
      }, 2000);
    } catch (err) {
      console.warn('Camera access denied or unavailable', err);
    }
  }

  onGalleryChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.gallerySelect.emit(input.files);
    }
  }

  // Push Notifications Setup
  enablePushNotifications() {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          this.pushEnabled.set(true);
          this.chatService.registerPushToken('web-token-' + Date.now(), 'web').subscribe();
        }
      });
    }
  }

  closeModal() {
    this.close.emit();
  }
}
