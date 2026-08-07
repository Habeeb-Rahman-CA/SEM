import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-chat-moderation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-moderation-modal.html',
  styleUrls: ['./chat-moderation-modal.css'],
})
export class ChatModerationModalComponent implements OnInit {
  @Input() workspaceId: string = 'ws-1';
  @Input() activeChannelId?: string;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();

  activeTab = signal<'actions' | 'audit_logs'>('actions');

  // Mute / Ban Form Data
  targetUserId = '';
  muteDuration = 60;
  moderationReason = '';

  // State Signals
  auditLogs = signal<any[]>([]);
  isSubmitting = signal<boolean>(false);
  statusMessage = signal<string | null>(null);

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    if (this.isOpen) {
      this.loadAuditLogs();
    }
  }

  loadAuditLogs() {
    this.chatService.getModerationAuditLogs(this.workspaceId, this.activeChannelId).subscribe({
      next: (logs) => this.auditLogs.set(logs),
      error: (err) => console.error('Failed to load moderation logs', err),
    });
  }

  onMuteUser() {
    if (!this.targetUserId) return;
    this.isSubmitting.set(true);
    this.chatService
      .muteUser(
        this.workspaceId,
        this.targetUserId,
        this.muteDuration,
        this.moderationReason,
        this.activeChannelId,
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.statusMessage.set(`User ${this.targetUserId} muted successfully.`);
          this.targetUserId = '';
          this.loadAuditLogs();
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  onBanUser() {
    if (!this.targetUserId) return;
    this.isSubmitting.set(true);
    this.chatService
      .banUser(this.workspaceId, this.targetUserId, this.moderationReason, this.activeChannelId)
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.statusMessage.set(`User ${this.targetUserId} banned successfully.`);
          this.targetUserId = '';
          this.loadAuditLogs();
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  onLockChannel(lock: boolean) {
    if (!this.activeChannelId) return;
    this.isSubmitting.set(true);
    this.chatService
      .lockChannel(this.workspaceId, this.activeChannelId, lock, this.moderationReason)
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.statusMessage.set(`Channel ${lock ? 'locked' : 'unlocked'} successfully.`);
          this.loadAuditLogs();
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  onArchiveChannel(archive: boolean) {
    if (!this.activeChannelId) return;
    this.isSubmitting.set(true);
    this.chatService
      .archiveChannel(this.workspaceId, this.activeChannelId, archive, this.moderationReason)
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.statusMessage.set(`Channel ${archive ? 'archived' : 'unarchived'} successfully.`);
          this.loadAuditLogs();
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  closeModal() {
    this.close.emit();
  }
}
