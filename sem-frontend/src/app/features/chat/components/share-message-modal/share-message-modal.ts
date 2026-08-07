import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-share-message-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './share-message-modal.html',
  styleUrls: ['./share-message-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareMessageModalComponent {
  @Input({ required: true }) message!: any;
  @Output() close = new EventEmitter<void>();

  isCopied = signal<boolean>(false);

  get shareUrl(): string {
    return `${window.location.origin}/chat/messages/${this.message?.id || '123'}`;
  }

  copyShareLink() {
    navigator.clipboard.writeText(this.shareUrl).then(() => {
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2000);
    });
  }
}
