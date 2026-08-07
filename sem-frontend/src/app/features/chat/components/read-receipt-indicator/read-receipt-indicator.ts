import { Component, Input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MessageReader {
  userId: string;
  username: string;
  avatarUrl?: string;
  readAt?: string;
}

@Component({
  selector: 'app-read-receipt-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './read-receipt-indicator.html',
  styleUrls: ['./read-receipt-indicator.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadReceiptIndicatorComponent {
  @Input() status: 'sent' | 'delivered' | 'read' = 'sent';
  @Input() readBy: MessageReader[] = [];
  @Input() isGroupChat: boolean = false;

  showPopover = signal<boolean>(false);

  togglePopover(event: MouseEvent) {
    if (this.isGroupChat && this.readBy && this.readBy.length > 0) {
      event.stopPropagation();
      this.showPopover.update((v) => !v);
    }
  }
}
