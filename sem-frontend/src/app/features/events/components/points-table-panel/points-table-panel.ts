import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { CompetitionStage } from '../../../workspaces/services/workspace.service';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar';
import { TeamStatsRow } from '../../models/event.interface';

@Component({
  selector: 'app-points-table-panel',
  standalone: true,
  imports: [AvatarComponent],
  templateUrl: './points-table-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PointsTablePanelComponent {
  stage = input<CompetitionStage | null>(null);
  table = input.required<TeamStatsRow[]>();
  isStageCompleted = input<boolean>(false);
  availableGroups = input<string[]>([]);
  canManage = input<boolean>(false);
  selectedGroup = model.required<string>();

  openQualificationPreview = output<void>();

  showChampionHighlight = computed(() => {
    const t = this.stage()?.type;
    return (
      this.isStageCompleted() &&
      (t === 'league' || t === 'group' || t === 'swiss') &&
      this.table().length > 0
    );
  });

  showQualificationBanner = computed(() => {
    const s = this.stage();
    if (!s) return false;
    const isGroup = s.type === 'group' || s.type === 'group_knockout';
    return (
      isGroup &&
      s.config?.manualQualification &&
      !s.config?.publishedQualification &&
      this.isStageCompleted() &&
      this.canManage()
    );
  });

  showPreviewButton = computed(() => {
    const s = this.stage();
    if (!s) return false;
    return (s.type === 'group' || s.type === 'group_knockout') && this.canManage();
  });
}
