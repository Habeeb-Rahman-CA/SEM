import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { BookingFormModel, EquipmentEventOption } from '../../models/equipment.interface';

@Component({
  selector: 'app-booking-form-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './booking-form-modal.html',
})
export class BookingFormModalComponent {
  open = input.required<boolean>();
  form = input.required<BookingFormModel>();
  equipmentName = input<string | null>(null);
  events = input.required<EquipmentEventOption[]>();

  close = output<void>();
  save = output<void>();

  protected get f(): BookingFormModel {
    return this.form();
  }
}
