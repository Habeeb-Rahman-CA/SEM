import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Equipment } from '../../services/equipment.service';
import type { MaintenanceFormModel } from '../../models/equipment.interface';

@Component({
  selector: 'app-maintenance-form-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './maintenance-form-modal.html',
})
export class MaintenanceFormModalComponent {
  open = input.required<boolean>();
  form = input.required<MaintenanceFormModel>();
  equipmentOptions = input.required<Equipment[]>();

  close = output<void>();
  save = output<void>();

  protected get f(): MaintenanceFormModel {
    return this.form();
  }
}
