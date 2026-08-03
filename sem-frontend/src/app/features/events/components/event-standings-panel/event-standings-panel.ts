import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';
import { InitialsPipe } from '../../../../shared/pipes/initials.pipe';
import { RankMedalPipe } from '../../pipes/rank-medal.pipe';
import { EventStandingRow } from '../../models/event.interface';

@Component({
  selector: 'app-event-standings-panel',
  standalone: true,
  imports: [AvatarComponent, InitialsPipe, RankMedalPipe],
  templateUrl: './event-standings-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventStandingsPanelComponent {
  standings = input<EventStandingRow[]>([]);
}
