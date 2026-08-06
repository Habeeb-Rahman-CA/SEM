import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CompetitionStage, Match } from '../../../../../workspaces/services/workspace.service';
import { FootballMatchStartOptions } from '../../models/football-console.interface';
import { HelpTooltipComponent } from '../../../../../../shared/components/help-tooltip/help-tooltip';

@Component({
  selector: 'app-football-match-config-form',
  standalone: true,
  imports: [FormsModule, HelpTooltipComponent],
  templateUrl: './match-config-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchConfigFormComponent {
  match = input.required<Match>();
  stage = input<CompetitionStage | null>(null);

  startMatch = output<FootballMatchStartOptions>();

  enableExtraTime = signal<boolean>(false);
  extraTimeHalfDuration = signal<number>(15);
  enablePenaltyShootout = signal<boolean>(false);

  supportsKnockoutOptions(): boolean {
    const type = this.stage()?.type;
    return type === 'knockout' || type === 'group_knockout';
  }

  emitStart(halfDurationValue: string) {
    const halfDurationMinutes = +halfDurationValue || 45;
    this.startMatch.emit({
      halfDurationMinutes,
      enableExtraTime: this.enableExtraTime(),
      enablePenaltyShootout: this.enablePenaltyShootout(),
      extraTimeHalfDurationMinutes: this.extraTimeHalfDuration(),
    });
  }
}
