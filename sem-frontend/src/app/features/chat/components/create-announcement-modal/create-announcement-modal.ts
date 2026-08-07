import { Component, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  priority: 'urgent' | 'important' | 'notice';
  requireReadConfirmation: boolean;
  readConfirmations: string[]; // user IDs who confirmed reading
  createdById?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-create-announcement-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-announcement-modal.html',
  styleUrls: ['./create-announcement-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAnnouncementModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() createAnnouncement = new EventEmitter<AnnouncementData>();

  title = signal<string>('');
  content = signal<string>('');
  priority = signal<'urgent' | 'important' | 'notice'>('important');
  requireReadConfirmation = signal<boolean>(true);

  onSubmit() {
    const t = this.title().trim();
    const c = this.content().trim();
    if (!t || !c) return;

    const announcement: AnnouncementData = {
      id: 'ann-' + Math.random().toString(36).substring(2, 9),
      title: t,
      content: c,
      priority: this.priority(),
      requireReadConfirmation: this.requireReadConfirmation(),
      readConfirmations: [],
      createdAt: new Date().toISOString(),
    };

    this.createAnnouncement.emit(announcement);
  }
}
