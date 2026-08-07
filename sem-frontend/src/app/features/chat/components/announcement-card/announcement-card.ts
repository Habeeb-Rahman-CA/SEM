import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnnouncementData } from '../create-announcement-modal/create-announcement-modal';

@Component({
  selector: 'app-announcement-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './announcement-card.html',
  styleUrls: ['./announcement-card.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementCardComponent {
  @Input({ required: true }) announcement!: AnnouncementData;
  @Input({ required: true }) currentUserId: string = '';

  @Output() confirmRead = new EventEmitter<string>();

  hasUserConfirmed(): boolean {
    if (!this.announcement?.readConfirmations || !this.currentUserId) return false;
    return this.announcement.readConfirmations.includes(this.currentUserId);
  }

  getReadCount(): number {
    return this.announcement?.readConfirmations ? this.announcement.readConfirmations.length : 0;
  }

  onAcknowledge() {
    if (!this.hasUserConfirmed()) {
      this.confirmRead.emit(this.announcement.id);
    }
  }
}
