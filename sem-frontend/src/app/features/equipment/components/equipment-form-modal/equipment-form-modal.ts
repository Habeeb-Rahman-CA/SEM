import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EquipmentFormModel } from '../../models/equipment.interface';

@Component({
  selector: 'app-equipment-form-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './equipment-form-modal.html',
})
export class EquipmentFormModalComponent {
  open = input.required<boolean>();
  form = input.required<EquipmentFormModel>();
  isEditing = input.required<boolean>();

  close = output<void>();
  save = output<void>();
  delete = output<void>();
  generateSku = output<void>();

  protected get f(): EquipmentFormModel {
    return this.form();
  }
}
