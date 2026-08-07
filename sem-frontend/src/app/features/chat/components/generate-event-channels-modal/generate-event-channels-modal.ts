import {
  Component,
  Output,
  EventEmitter,
  signal,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

export interface GeneratedEventPayload {
  eventName: string;
  subChannels: { name: string; icon: string; description: string }[];
}

@Component({
  selector: 'app-generate-event-channels-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generate-event-channels-modal.html',
  styleUrls: ['./generate-event-channels-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerateEventChannelsModalComponent implements OnInit {
  @Output() generateEvent = new EventEmitter<GeneratedEventPayload>();
  @Output() close = new EventEmitter<void>();

  private chatService = inject(ChatService);

  eventName = signal<string>('Cricket Tournament');
  selectedPreset = signal<'tournament' | 'league' | 'corporate'>('tournament');
  presetsList = signal<any[]>([]);

  subChannelsList = signal<
    { name: string; icon: string; description: string; selected: boolean }[]
  >([
    {
      name: 'Organizers',
      icon: 'fi fi-rr-user-gear',
      description: 'Core event organization & planning',
      selected: true,
    },
    {
      name: 'Referees',
      icon: 'fi fi-rr-whistle',
      description: 'Match officiating & referee rules',
      selected: true,
    },
    {
      name: 'Volunteers',
      icon: 'fi fi-rr-heart font-bold',
      description: 'Volunteer coordination & schedule',
      selected: true,
    },
    {
      name: 'Teams',
      icon: 'fi fi-rr-users-alt',
      description: 'Team captains & player announcements',
      selected: true,
    },
    {
      name: 'Sponsors',
      icon: 'fi fi-rr-gem',
      description: 'Sponsor relations & VIP hospitality',
      selected: true,
    },
  ]);

  ngOnInit(): void {
    this.chatService.getEventPresets().subscribe({
      next: (dbPresets) => {
        if (dbPresets && dbPresets.length > 0) {
          this.presetsList.set(dbPresets);
          const current = dbPresets.find((p) => p.presetKey === this.selectedPreset());
          if (current) {
            this.eventName.set(current.title);
            this.subChannelsList.set(current.subChannels);
          }
        }
      },
      error: () => {},
    });
  }

  selectPreset(preset: 'tournament' | 'league' | 'corporate') {
    this.selectedPreset.set(preset);
    const dbList = this.presetsList();
    const found = dbList.find((p) => p.presetKey === preset);

    if (found) {
      this.eventName.set(found.title);
      this.subChannelsList.set(found.subChannels);
      return;
    }

    if (preset === 'tournament') {
      this.eventName.set('Cricket Tournament');
      this.subChannelsList.set([
        {
          name: 'Organizers',
          icon: 'fi fi-rr-user-gear',
          description: 'Core event organization & planning',
          selected: true,
        },
        {
          name: 'Referees',
          icon: 'fi fi-rr-whistle',
          description: 'Match officiating & referee rules',
          selected: true,
        },
        {
          name: 'Volunteers',
          icon: 'fi fi-rr-heart',
          description: 'Volunteer coordination & schedule',
          selected: true,
        },
        {
          name: 'Teams',
          icon: 'fi fi-rr-users-alt',
          description: 'Team captains & player announcements',
          selected: true,
        },
        {
          name: 'Sponsors',
          icon: 'fi fi-rr-gem',
          description: 'Sponsor relations & VIP hospitality',
          selected: true,
        },
      ]);
    } else if (preset === 'league') {
      this.eventName.set('Football League');
      this.subChannelsList.set([
        {
          name: 'League Management',
          icon: 'fi fi-rr-trophy',
          description: 'Overall league governance & standings',
          selected: true,
        },
        {
          name: 'Referees & Officiating',
          icon: 'fi fi-rr-whistle',
          description: 'Referee match assignments',
          selected: true,
        },
        {
          name: 'Team Captains',
          icon: 'fi fi-rr-shield',
          description: 'Direct channel for team leaders',
          selected: true,
        },
        {
          name: 'Media & Broadcasting',
          icon: 'fi fi-rr-camera',
          description: 'Live streaming & media coverage',
          selected: true,
        },
      ]);
    } else {
      this.eventName.set('Sponsors & VIP Relations');
      this.subChannelsList.set([
        {
          name: 'Executive Sponsors',
          icon: 'fi fi-rr-briefcase',
          description: 'High level sponsor discussions',
          selected: true,
        },
        {
          name: 'Partner Relations',
          icon: 'fi fi-rr-handshake',
          description: 'Partner logos & branding compliance',
          selected: true,
        },
        {
          name: 'VIP Lounge',
          icon: 'fi fi-rr-star',
          description: 'VIP hospitality & guest lists',
          selected: true,
        },
      ]);
    }
  }

  toggleSubChannel(index: number) {
    this.subChannelsList.update((list) => {
      const updated = [...list];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return updated;
    });
  }

  submit() {
    const name = this.eventName().trim();
    if (!name) return;

    const selectedSubs = this.subChannelsList().filter((s) => s.selected);
    if (selectedSubs.length === 0) return;

    this.generateEvent.emit({
      eventName: name,
      subChannels: selectedSubs.map(({ name, icon, description }) => ({ name, icon, description })),
    });
    this.close.emit();
  }
}
