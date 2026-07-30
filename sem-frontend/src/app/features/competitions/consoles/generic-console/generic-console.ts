import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CompetitionService } from '../../services/competition.service';
import { UiService } from '../../../../core/services/ui.service';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';
import {
  Match,
  Player,
  Team,
  CompetitionStage,
  MatchPlayer,
  Sport,
} from '../../../workspaces/services/workspace.service';
import { getSportIconClass } from '../../../../shared';
import { MatchEvidencePanelComponent } from '../../components/match-evidence/match-evidence-panel';
import { MatchHighlightsPanelComponent } from '../../components/match-highlights/match-highlights-panel';

@Component({
  selector: 'app-generic-console',
  standalone: true,
  imports: [
    FormsModule,
    AvatarComponent,
    MatchEvidencePanelComponent,
    MatchHighlightsPanelComponent,
  ],
  templateUrl: './generic-console.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericConsoleComponent {
  @Input() workspaceId!: string;
  @Input() eventId!: string;
  @Input() competitionId!: string;
  @Input() stageId!: string;
  @Input() stage: CompetitionStage | null = null;
  @Input() match!: Match;
  @Input() players: Player[] = [];
  @Input() teams: Team[] = [];
  @Input() matchLineup: MatchPlayer[] = [];
  @Input() canScore = false;
  @Input() sport: Sport | null | undefined = null;

  @Output() matchCompleted = new EventEmitter<void>();
  @Output() matchUpdated = new EventEmitter<Match>();
  @Output() openLineupModal = new EventEmitter<void>();

  private competitionService = inject(CompetitionService);
  private uiService = inject(UiService);

  homeScoreInput = signal(0);
  awayScoreInput = signal(0);
  selectedMvpId = signal<string | null>(null);
  isSaving = signal(false);
  isCompleting = signal(false);

  getSportIcon = getSportIconClass;

  get sportName(): string {
    return this.sport?.name ?? 'Match';
  }

  get homeTeam(): Team | undefined {
    return this.teams.find((t) => t.id === this.match.homeTeamId);
  }

  get awayTeam(): Team | undefined {
    return this.teams.find((t) => t.id === this.match.awayTeamId);
  }

  get playingLineup(): MatchPlayer[] {
    return this.matchLineup.filter((mp) => mp.isPlaying);
  }

  getPlayerName(playerId: string): string {
    return this.players.find((p) => p.id === playerId)?.user?.username ?? 'Player';
  }

  onUpdateScore() {
    if (!this.canScore) return;
    this.isSaving.set(true);
    const payload = {
      homeScore: this.homeScoreInput(),
      awayScore: this.awayScoreInput(),
      liveData: { homeScore: this.homeScoreInput(), awayScore: this.awayScoreInput() },
    };
    this.competitionService
      .updateMatch(
        this.workspaceId,
        this.eventId,
        this.competitionId,
        this.stageId,
        this.match.id,
        payload,
      )
      .subscribe({
        next: (updated) => {
          this.matchUpdated.emit(updated);
          this.isSaving.set(false);
          this.uiService.success('Score updated.');
        },
        error: (err) => {
          this.isSaving.set(false);
          this.uiService.error(err.error?.message ?? 'Failed to update score.');
        },
      });
  }

  async onStartMatch() {
    if (!this.canScore) return;
    const confirmed = await this.uiService.confirm({
      title: 'Start Match',
      message: 'Mark this match as live?',
      confirmText: 'Start',
      type: 'info',
    });
    if (!confirmed) return;
    this.competitionService
      .updateMatch(
        this.workspaceId,
        this.eventId,
        this.competitionId,
        this.stageId,
        this.match.id,
        { status: 'live' },
      )
      .subscribe({
        next: (updated) => this.matchUpdated.emit(updated),
        error: (err) => this.uiService.error(err.error?.message ?? 'Failed to start match.'),
      });
  }

  async onCompleteMatch() {
    if (!this.canScore) return;
    const confirmed = await this.uiService.confirm({
      title: 'Complete Match',
      message: 'Mark this match as completed? This cannot be undone.',
      confirmText: 'Complete',
      type: 'warning',
    });
    if (!confirmed) return;
    this.isCompleting.set(true);
    const payload: any = {
      status: 'completed',
      homeScore: this.homeScoreInput(),
      awayScore: this.awayScoreInput(),
    };
    if (this.selectedMvpId()) {
      payload.mvpPlayerId = this.selectedMvpId();
    }
    this.competitionService
      .updateMatch(
        this.workspaceId,
        this.eventId,
        this.competitionId,
        this.stageId,
        this.match.id,
        payload,
      )
      .subscribe({
        next: () => {
          this.isCompleting.set(false);
          this.matchCompleted.emit();
          this.uiService.success('Match completed.');
        },
        error: (err) => {
          this.isCompleting.set(false);
          this.uiService.error(err.error?.message ?? 'Failed to complete match.');
        },
      });
  }
}
