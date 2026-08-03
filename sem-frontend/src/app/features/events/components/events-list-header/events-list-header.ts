import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { EventView } from '../../models/event.interface';

@Component({
  selector: 'app-events-list-header',
  standalone: true,
  imports: [],
  templateUrl: './events-list-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsListHeaderComponent {
  canManage = input<boolean>(false);
  activeEventCount = input<number>(0);
  archivedEventCount = input<number>(0);
  activeView = model.required<EventView>();

  openTemplates = output<void>();
  addEvent = output<void>();
}
