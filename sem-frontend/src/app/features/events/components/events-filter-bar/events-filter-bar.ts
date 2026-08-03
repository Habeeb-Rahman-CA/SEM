import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Workspace } from '../../../workspaces/services/workspace.service';
import { EventFilterCriteria, SavedEventFilter } from '../../models/event.interface';

@Component({
  selector: 'app-events-filter-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './events-filter-bar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsFilterBarComponent {
  workspace = input<Workspace | null>(null);
  userWorkspaces = input<Workspace[]>([]);

  eventSearchQuery = model<string>('');
  isAdvancedSearchOpen = model<boolean>(false);
  criteria = model.required<EventFilterCriteria>();
  newFilterName = model<string>('');

  savedFilters = input<SavedEventFilter[]>([]);
  searchActive = input<boolean>(false);
  statusLine = input<string>('');

  applyFilter = output<EventFilterCriteria>();
  saveFilter = output<void>();
  deleteFilter = output<string>();
  resetFilters = output<void>();
  triggerSearch = output<void>();

  patch(partial: Partial<EventFilterCriteria>) {
    this.criteria.update((cur) => ({ ...cur, ...partial }));
  }
}
