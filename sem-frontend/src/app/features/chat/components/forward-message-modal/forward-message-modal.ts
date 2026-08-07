import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-forward-message-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forward-message-modal.html',
  styleUrls: ['./forward-message-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForwardMessageModalComponent {
  @Input({ required: true }) message!: any;
  @Input() members: any[] = [];
  @Input() channels: any[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() forwardTarget = new EventEmitter<{
    targetId: string;
    targetName: string;
    type: 'user' | 'channel';
  }>();

  searchQuery = signal<string>('');
  selectedTarget = signal<{ id: string; name: string; type: 'user' | 'channel' } | null>(null);

  filteredTargets = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list: { id: string; name: string; icon: string; type: 'user' | 'channel' }[] = [];

    this.channels.forEach((ch) => {
      if (!q || ch.name.toLowerCase().includes(q)) {
        list.push({
          id: ch.id,
          name: `# ${ch.name}`,
          icon: ch.icon || 'fi fi-rr-hashtag',
          type: 'channel',
        });
      }
    });

    this.members.forEach((m) => {
      const username = m.user?.username || m.username;
      if (username && (!q || username.toLowerCase().includes(q))) {
        list.push({
          id: m.userId || m.id,
          name: `@${username}`,
          icon: 'fi fi-rr-user',
          type: 'user',
        });
      }
    });

    return list;
  });

  selectTarget(target: { id: string; name: string; type: 'user' | 'channel' }) {
    this.selectedTarget.set(target);
  }

  confirmForward() {
    const target = this.selectedTarget();
    if (!target) return;
    this.forwardTarget.emit({
      targetId: target.id,
      targetName: target.name,
      type: target.type,
    });
  }
}
