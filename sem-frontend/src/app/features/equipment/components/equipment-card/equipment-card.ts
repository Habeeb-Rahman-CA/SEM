import { Component, input, output } from '@angular/core';
import type { Equipment } from '../../services/equipment.service';
import { EquipmentStatusColorPipe } from '../../pipes/equipment-status-color.pipe';
import { ConditionColorPipe } from '../../pipes/condition-color.pipe';

@Component({
  selector: 'app-equipment-card',
  standalone: true,
  imports: [EquipmentStatusColorPipe, ConditionColorPipe],
  templateUrl: './equipment-card.html',
})
export class EquipmentCardComponent {
  item = input.required<Equipment>();

  viewLog = output<Equipment>();
  book = output<Equipment>();
  edit = output<Equipment>();
}
