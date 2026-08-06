import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutoSaveService } from '../../../core/services/auto-save.service';

@Component({
  selector: 'app-auto-save-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auto-save-badge.html',
})
export class AutoSaveBadgeComponent {
  autoSaveService = inject(AutoSaveService);
}
