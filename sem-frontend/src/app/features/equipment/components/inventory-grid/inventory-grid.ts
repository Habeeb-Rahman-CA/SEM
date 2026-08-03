import { Component, input, output } from '@angular/core';
import type { Equipment } from '../../services/equipment.service';
import { EquipmentCardComponent } from '../equipment-card/equipment-card';

@Component({
  selector: 'app-inventory-grid',
  standalone: true,
  imports: [EquipmentCardComponent],
  templateUrl: './inventory-grid.html',
})
export class InventoryGridComponent {
  items = input.required<Equipment[]>();

  viewLog = output<Equipment>();
  book = output<Equipment>();
  edit = output<Equipment>();
}
