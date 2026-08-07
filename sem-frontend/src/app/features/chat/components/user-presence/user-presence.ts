import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type PresenceStatusType = 'online' | 'offline' | 'away' | 'busy' | 'invisible';

export interface UserPresenceState {
  status: PresenceStatusType;
  customStatusText?: string;
  customStatusIcon?: string;
}

@Component({
  selector: 'app-user-presence-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-flex items-center gap-1 group">
      <span
        [class]="badgeClass"
        class="w-2.5 h-2.5 rounded-full border-2 border-slate-900 shrink-0 shadow-sm transition-all"
        [title]="statusTitle"
      ></span>
      @if (showLabel && customText) {
        <span class="text-[11px] text-slate-300 truncate max-w-[120px] font-medium">
          {{ customText }}
        </span>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPresenceBadgeComponent {
  @Input() status: PresenceStatusType = 'online';
  @Input() customText?: string;
  @Input() showLabel: boolean = false;

  get badgeClass(): string {
    switch (this.status) {
      case 'online':
        return 'bg-emerald-500 ring-2 ring-emerald-500/20';
      case 'away':
        return 'bg-amber-500 ring-2 ring-amber-500/20';
      case 'busy':
        return 'bg-rose-500 ring-2 ring-rose-500/20';
      case 'invisible':
        return 'bg-slate-500 ring-2 ring-slate-500/20 opacity-70';
      case 'offline':
      default:
        return 'bg-slate-600';
    }
  }

  get statusTitle(): string {
    if (this.customText) return `${this.status.toUpperCase()}: ${this.customText}`;
    return this.status.toUpperCase();
  }
}

@Component({
  selector: 'app-user-presence-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, UserPresenceBadgeComponent],
  templateUrl: './user-presence.html',
  styleUrls: ['./user-presence.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPresenceSelectorComponent {
  @Input() currentState: UserPresenceState = { status: 'online' };
  @Output() statusChange = new EventEmitter<UserPresenceState>();
  @Output() close = new EventEmitter<void>();

  selectedStatus = signal<PresenceStatusType>('online');
  customText = signal<string>('');
  customIcon = signal<string>('fi fi-rr-smile');

  statusOptions: {
    type: PresenceStatusType;
    label: string;
    description: string;
    color: string;
    icon: string;
  }[] = [
    {
      type: 'online',
      label: 'Online',
      description: 'Available for messages and calls',
      color: 'text-emerald-400',
      icon: 'fi fi-rr-check-circle',
    },
    {
      type: 'away',
      label: 'Away',
      description: 'Temporarily inactive or away from keyboard',
      color: 'text-amber-400',
      icon: 'fi fi-rr-clock',
    },
    {
      type: 'busy',
      label: 'Busy (Do Not Disturb)',
      description: 'Mute popups and notifications',
      color: 'text-rose-400',
      icon: 'fi fi-rr-minus-circle',
    },
    {
      type: 'invisible',
      label: 'Invisible',
      description: 'Appear offline to workspace members',
      color: 'text-slate-400',
      icon: 'fi fi-rr-eye-cross',
    },
    {
      type: 'offline',
      label: 'Offline',
      description: 'Logged out or inactive',
      color: 'text-slate-500',
      icon: 'fi fi-rr-cross-circle',
    },
  ];

  presetCustomStatuses = [
    { text: 'In a meeting', icon: 'fi fi-rr-briefcase' },
    { text: 'Working remotely', icon: 'fi fi-rr-laptop' },
    { text: 'Out for lunch', icon: 'fi fi-rr-utensils' },
    { text: 'On vacation', icon: 'fi fi-rr-plane' },
    { text: 'Focusing on code', icon: 'fi fi-rr-code-branch' },
  ];

  ngOnInit() {
    if (this.currentState) {
      this.selectedStatus.set(this.currentState.status || 'online');
      this.customText.set(this.currentState.customStatusText || '');
      this.customIcon.set(this.currentState.customStatusIcon || 'fi fi-rr-smile');
    }
  }

  selectPreset(preset: { text: string; icon: string }) {
    this.customText.set(preset.text);
    this.customIcon.set(preset.icon);
  }

  clearCustomStatus() {
    this.customText.set('');
  }

  save() {
    this.statusChange.emit({
      status: this.selectedStatus(),
      customStatusText: this.customText().trim() || undefined,
      customStatusIcon: this.customIcon(),
    });
    this.close.emit();
  }
}
