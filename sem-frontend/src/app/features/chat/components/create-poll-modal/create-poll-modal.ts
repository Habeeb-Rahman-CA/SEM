import { Component, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PollOptionData {
  id: string;
  text: string;
  votes: string[];
}

export interface PollData {
  id: string;
  question: string;
  options: PollOptionData[];
  isAnonymous: boolean;
  allowMultipleChoice: boolean;
  expiresAt?: string;
  closed?: boolean;
  createdById?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-create-poll-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-poll-modal.html',
  styleUrls: ['./create-poll-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePollModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() createPoll = new EventEmitter<PollData>();

  question = signal<string>('');
  options = signal<string[]>(['', '']);
  isAnonymous = signal<boolean>(false);
  allowMultipleChoice = signal<boolean>(false);
  durationPreset = signal<string>('24h'); // '1h', '24h', '7d', 'never'

  // Presets requested by user
  presetTemplates = [
    {
      name: 'Match Time',
      icon: 'fi-rr-clock',
      question: 'What time should we schedule the match?',
      options: ['Saturday 3:00 PM', 'Saturday 6:00 PM', 'Sunday 2:00 PM', 'Sunday 5:00 PM'],
    },
    {
      name: 'Venue Selection',
      icon: 'fi-rr-marker',
      question: 'Which venue works best for everyone?',
      options: ['Main Stadium Pitch A', 'Community Sports Complex', 'Central Park Arena'],
    },
    {
      name: 'Jersey Color',
      icon: 'fi-rr-shirt',
      question: 'Select team jersey color for this tournament',
      options: ['Royal Blue & White', 'Neon Green & Black', 'Crimson Red & Gold'],
    },
    {
      name: 'Food Choice',
      icon: 'fi-rr-utensils',
      question: 'What food/refreshments should we order?',
      options: ['Pizza & Soft Drinks', 'Gourmet Burgers & Shakes', 'Healthy Salad & Protein Bowls'],
    },
  ];

  applyPreset(preset: { question: string; options: string[] }) {
    this.question.set(preset.question);
    this.options.set([...preset.options]);
  }

  addOption() {
    if (this.options().length < 8) {
      this.options.update((list) => [...list, '']);
    }
  }

  removeOption(index: number) {
    if (this.options().length > 2) {
      this.options.update((list) => list.filter((_, i) => i !== index));
    }
  }

  updateOption(index: number, val: string) {
    this.options.update((list) => {
      const copy = [...list];
      copy[index] = val;
      return copy;
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  onSubmit() {
    const q = this.question().trim();
    const validOpts = this.options()
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    if (!q || validOpts.length < 2) return;

    let expiresAt: string | undefined = undefined;
    const now = new Date();
    if (this.durationPreset() === '1h') {
      expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    } else if (this.durationPreset() === '24h') {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    } else if (this.durationPreset() === '7d') {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    const poll: PollData = {
      id: 'poll-' + Math.random().toString(36).substring(2, 9),
      question: q,
      options: validOpts.map((text, idx) => ({
        id: 'opt-' + idx + '-' + Math.random().toString(36).substring(2, 6),
        text,
        votes: [],
      })),
      isAnonymous: this.isAnonymous(),
      allowMultipleChoice: this.allowMultipleChoice(),
      expiresAt,
      closed: false,
      createdAt: new Date().toISOString(),
    };

    this.createPoll.emit(poll);
  }
}
