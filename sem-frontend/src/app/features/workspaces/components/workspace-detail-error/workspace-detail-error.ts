import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-workspace-detail-error',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './workspace-detail-error.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceDetailErrorComponent {
  message = input.required<string>();
}
