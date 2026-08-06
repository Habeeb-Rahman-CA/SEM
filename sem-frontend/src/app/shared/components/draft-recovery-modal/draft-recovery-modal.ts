import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutoSaveService, DraftItem } from '../../../core/services/auto-save.service';

@Component({
  selector: 'app-draft-recovery-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './draft-recovery-modal.html',
})
export class DraftRecoveryModalComponent {
  autoSaveService = inject(AutoSaveService);

  restore(draft: DraftItem) {
    this.autoSaveService.restoreDraft(draft);
  }

  delete(draftId: string) {
    this.autoSaveService.deleteDraft(draftId).subscribe();
  }

  close() {
    this.autoSaveService.closeRecoveryModal();
  }

  getFormTypeBadge(type: string): string {
    const formatted = type.replace(/_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}
