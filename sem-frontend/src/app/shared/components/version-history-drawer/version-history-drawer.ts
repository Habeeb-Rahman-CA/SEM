import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  VersionHistoryService,
  VersionSnapshot,
} from '../../../core/services/version-history.service';

@Component({
  selector: 'app-version-history-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-history-drawer.html',
})
export class VersionHistoryDrawerComponent {
  versionService = inject(VersionHistoryService);

  versionRestored = output<VersionSnapshot>();

  close() {
    this.versionService.closeVersionHistory();
  }

  restore(snapshot: VersionSnapshot) {
    this.versionService.restoreVersion(snapshot).subscribe(() => {
      this.versionRestored.emit(snapshot);
    });
  }
}
