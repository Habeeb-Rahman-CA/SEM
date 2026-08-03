import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ConsoleMode } from '../../models/football-console.interface';

@Component({
  selector: 'app-football-mode-selector',
  standalone: true,
  templateUrl: './mode-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModeSelectorComponent {
  mode = input.required<ConsoleMode>();
  showPublish = input<boolean>(false);

  modeChange = output<ConsoleMode>();
  publish = output<void>();
}
