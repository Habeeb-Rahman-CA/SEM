import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-chat-security-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-security-modal.html',
  styleUrls: ['./chat-security-modal.css'],
})
export class ChatSecurityModalComponent implements OnInit {
  @Input() workspaceId: string = 'ws-1';
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();

  // Retention Settings Form
  retentionDays = 90;
  autoDeleteMedia = true;
  retentionEnabled = true;

  // E2EE Data
  e2eePublicKey = '';
  isE2EEActive = signal<boolean>(false);

  // Status Signals
  isSubmitting = signal<boolean>(false);
  statusMessage = signal<string | null>(null);

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    if (this.isOpen) {
      this.loadSettings();
    }
  }

  loadSettings() {
    this.chatService.getRetentionPolicy(this.workspaceId).subscribe({
      next: (policy) => {
        if (policy) {
          this.retentionDays = policy.retentionDays;
          this.autoDeleteMedia = policy.autoDeleteMedia;
          this.retentionEnabled = policy.enabled;
        }
      },
      error: (err) => console.error('Failed to load retention settings', err),
    });
  }

  onSaveRetention() {
    this.isSubmitting.set(true);
    this.chatService
      .updateRetentionPolicy(
        this.workspaceId,
        this.retentionDays,
        this.autoDeleteMedia,
        this.retentionEnabled,
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.statusMessage.set('Retention policy updated successfully.');
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  onRunPurge() {
    this.isSubmitting.set(true);
    this.chatService.purgeExpiredMessages(this.workspaceId).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.statusMessage.set(
          `Retention purge complete: ${res.prunedCount || 0} expired messages removed.`,
        );
      },
      error: () => this.isSubmitting.set(false),
    });
  }

  onGenerateE2EEKey() {
    const mockKey = `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA${Math.random()
      .toString(36)
      .substring(2)}...\n-----END PUBLIC KEY-----`;
    this.e2eePublicKey = mockKey;

    this.chatService.registerE2EEKey(this.workspaceId, mockKey, 'ECDH-P256').subscribe({
      next: () => {
        this.isE2EEActive.set(true);
        this.statusMessage.set('End-to-End Encryption key registered for Direct Messages.');
      },
    });
  }

  closeModal() {
    this.close.emit();
  }
}
