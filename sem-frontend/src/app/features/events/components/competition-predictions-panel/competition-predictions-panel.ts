import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PredictionsData } from '../../models/event.interface';

@Component({
  selector: 'app-competition-predictions-panel',
  standalone: true,
  imports: [],
  templateUrl: './competition-predictions-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitionPredictionsPanelComponent {
  isLoading = input<boolean>(false);
  data = input<PredictionsData | null>(null);

  gaugeDashOffset = computed(() => {
    const conf = this.data()?.confidenceScore ?? 0;
    return 175.9 - (175.9 * conf) / 100;
  });
}
