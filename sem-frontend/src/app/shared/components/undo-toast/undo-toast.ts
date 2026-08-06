import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UndoService } from '../../../core/services/undo.service';

@Component({
  selector: 'app-undo-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './undo-toast.html',
})
export class UndoToastComponent {
  undoService = inject(UndoService);

  onUndo() {
    this.undoService.executeUndo();
  }

  onDismiss() {
    this.undoService.dismiss();
  }
}
