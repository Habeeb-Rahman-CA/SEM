import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Match } from '../../../../../workspaces/services/workspace.service';

@Component({
  selector: 'app-football-period-controls',
  standalone: true,
  templateUrl: './period-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodControlsComponent {
  match = input.required<Match>();
  periodStatus = input<string>('');
  isHalfTime = input<boolean>(false);
  isExtra1Pending = input<boolean>(false);
  isFullTime = input<boolean>(false);
  isShootoutPending = input<boolean>(false);

  toggleTimer = output<void>();
  startSecondHalf = output<void>();
  startFirstExtraHalf = output<void>();
  startSecondExtraHalf = output<void>();
  startPenaltyShootout = output<void>();
}
