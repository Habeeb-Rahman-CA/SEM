import { Component, inject, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuickPreviewService } from '../../../core/services/quick-preview.service';
import { AvatarComponent } from '../avatar/avatar';
import { BadgeComponent } from '../badge/badge';
import { ButtonComponent } from '../button/button';

@Component({
  selector: 'app-quick-preview-modal',
  standalone: true,
  imports: [CommonModule, AvatarComponent, BadgeComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quick-preview-modal.html',
})
export class QuickPreviewModalComponent {
  previewService = inject(QuickPreviewService);

  close() {
    this.previewService.closePreview();
  }

  viewFull() {
    const data = this.previewService.previewData();
    if (data?.onViewFull) {
      data.onViewFull();
    }
    this.close();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.previewService.isOpen()) {
      this.close();
      event.preventDefault();
    }
  }
}
