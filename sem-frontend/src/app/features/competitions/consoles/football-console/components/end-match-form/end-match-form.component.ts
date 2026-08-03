import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Match } from '../../../../../workspaces/services/workspace.service';

@Component({
  selector: 'app-football-end-match-form',
  standalone: true,
  templateUrl: './end-match-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndMatchFormComponent {
  match = input.required<Match>();

  endMatch = output<string>();
}
