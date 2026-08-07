import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-schedule-message-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule-message-modal.html',
  styleUrls: ['./schedule-message-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleMessageModalComponent implements OnInit {
  @Input() messagePreview: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() schedule = new EventEmitter<string>(); // emits ISO string

  customDateTime = signal<string>('');

  // Quick Presets requested by user:
  // - Tomorrow 9AM
  // - Before Match (2 Hours Before)
  // - One Hour Before Event
  // - Tonight 8PM
  presets = [
    {
      name: 'Tomorrow 9:00 AM',
      icon: 'fi-rr-sun',
      getIso: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d.toISOString();
      },
    },
    {
      name: 'Before Match (2 Hrs Before)',
      icon: 'fi-rr-trophy',
      getIso: () => {
        const d = new Date();
        d.setHours(d.getHours() + 2);
        return d.toISOString();
      },
    },
    {
      name: 'One Hour Before Event',
      icon: 'fi-rr-clock',
      getIso: () => {
        const d = new Date();
        d.setHours(d.getHours() + 1);
        return d.toISOString();
      },
    },
    {
      name: 'Tonight 8:00 PM',
      icon: 'fi-rr-moon',
      getIso: () => {
        const d = new Date();
        if (d.getHours() >= 20) {
          d.setDate(d.getDate() + 1);
        }
        d.setHours(20, 0, 0, 0);
        return d.toISOString();
      },
    },
  ];

  ngOnInit() {
    // Default datetime-local input to tomorrow 9am formatted
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    this.customDateTime.set(this.formatForDateTimeLocal(tomorrow));
  }

  formatForDateTimeLocal(date: Date): string {
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  }

  applyPreset(preset: { getIso: () => string }) {
    const iso = preset.getIso();
    const d = new Date(iso);
    this.customDateTime.set(this.formatForDateTimeLocal(d));
  }

  onSubmit() {
    const val = this.customDateTime();
    if (!val) return;
    const selectedDate = new Date(val);
    if (isNaN(selectedDate.getTime()) || selectedDate.getTime() <= new Date().getTime()) return;

    this.schedule.emit(selectedDate.toISOString());
  }
}
