import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ScheduledMessageItem {
  id: string;
  content: string;
  scheduledFor: string;
  createdAt: string;
  poll?: any;
  announcement?: any;
}

@Component({
  selector: 'app-scheduled-messages-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scheduled-messages-drawer.html',
  styleUrls: ['./scheduled-messages-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledMessagesDrawerComponent {
  @Input({ required: true }) scheduledMessages: ScheduledMessageItem[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() sendNow = new EventEmitter<string>();
  @Output() cancelScheduled = new EventEmitter<string>();
}
