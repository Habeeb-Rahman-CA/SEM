import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { EventTypeLabelPipe } from '../../pipes/event-type-label.pipe';
import {
  FilteredFootballEvent,
  FootballEditEventPayload,
} from '../../models/football-console.interface';

@Component({
  selector: 'app-football-edit-event-modal',
  standalone: true,
  imports: [EventTypeLabelPipe],
  templateUrl: './edit-event-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditEventModalComponent {
  editingEvent = input<FilteredFootballEvent | null>(null);

  save = output<FootballEditEventPayload>();
  cancel = output<void>();

  minute = signal<number>(0);
  note = signal<string>('');

  constructor() {
    effect(
      () => {
        const ev = this.editingEvent();
        if (ev) {
          this.minute.set(ev.minute ?? 0);
          this.note.set(ev._note ?? '');
        }
      },
      { allowSignalWrites: true },
    );
  }

  emitSave() {
    const ev = this.editingEvent();
    if (!ev) return;
    this.save.emit({
      originalIndex: ev._originalIndex,
      minute: this.minute(),
      note: this.note(),
    });
  }
}
