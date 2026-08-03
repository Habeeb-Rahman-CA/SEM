import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-workspace-detail-skeleton',
  standalone: true,
  templateUrl: './workspace-detail-skeleton.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceDetailSkeletonComponent {
  protected readonly sidebarItems = [1, 2, 3, 4, 5, 6, 7];
  protected readonly statCards = [1, 2, 3, 4, 5];
  protected readonly liveGames = [1, 2, 3];
}
