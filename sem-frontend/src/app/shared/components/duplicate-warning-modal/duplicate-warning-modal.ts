import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DuplicateDetectionService } from '../../../core/services/duplicate-detection.service';

@Component({
  selector: 'app-duplicate-warning-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './duplicate-warning-modal.html',
})
export class DuplicateWarningModalComponent {
  duplicateService = inject(DuplicateDetectionService);

  cancel() {
    this.duplicateService.cancelCreation();
  }

  proceed() {
    this.duplicateService.proceedAnyway();
  }
}
