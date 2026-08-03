import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Match } from '../../../workspaces/services/workspace.service';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';
import { MatchStatusBadgePipe } from '../../pipes/match-status-badge.pipe';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [DatePipe, AvatarComponent, MatchStatusBadgePipe],
  templateUrl: './match-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchCardComponent {
  match = input.required<Match>();
  canManage = input<boolean>(false);

  schedule = output<Match>();
  select = output<Match>();
}
