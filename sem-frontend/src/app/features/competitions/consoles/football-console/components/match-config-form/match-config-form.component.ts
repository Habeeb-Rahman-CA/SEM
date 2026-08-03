import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CompetitionStage, Match } from '../../../../../workspaces/services/workspace.service';
import { FootballMatchStartOptions } from '../../models/football-console.interface';

@Component({
  selector: 'app-football-match-config-form',
  standalone: true,
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
