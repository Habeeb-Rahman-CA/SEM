import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { WorkspaceEvent } from '../../../workspaces/services/workspace.service';
import { EventStatusBadgePipe } from '../../pipes/event-status-badge.pipe';
import { EventView } from '../../models/event.interface';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [DatePipe, EventStatusBadgePipe],
  templateUrl: './event-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCardComponent {
  event = input.required<WorkspaceEvent>();
  view = input.required<EventView>();
  canManage = input<boolean>(false);

  select = output<WorkspaceEvent>();
  openPublic = output<WorkspaceEvent>();
  archive = output<WorkspaceEvent>();
  duplicate = output<WorkspaceEvent>();
  edit = output<WorkspaceEvent>();
  remove = output<WorkspaceEvent>();
  restore = output<WorkspaceEvent>();
}
