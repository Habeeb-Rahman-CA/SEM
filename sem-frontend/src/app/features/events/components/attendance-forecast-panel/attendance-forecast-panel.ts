import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AttendanceForecast } from '../../models/event.interface';

@Component({
  selector: 'app-attendance-forecast-panel',
  standalone: true,
  imports: [],
  templateUrl: './attendance-forecast-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceForecastPanelComponent {
  isLoading = input<boolean>(false);
  forecast = input<AttendanceForecast | null>(null);
}
