import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { VenueListComponent } from '../../../../venues/pages/venue-list';
import type { Venue } from '../../../../venues/services/venue.service';

@Component({
  selector: 'app-workspace-venues-panel',
  standalone: true,
  imports: [VenueListComponent],
  templateUrl: './venues-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceVenuesPanelComponent {
  venues = input.required<Venue[]>();
  canUpdate = input<boolean>(false);

  add = output<void>();
  edit = output<Venue>();
  delete = output<Venue>();
}
