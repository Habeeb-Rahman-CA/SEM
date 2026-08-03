import { Component, input, output } from '@angular/core';
import type { EquipmentTab } from '../../models/equipment.interface';

@Component({
  selector: 'app-equipment-tabs',
  standalone: true,
  templateUrl: './equipment-tabs.html',
})
export class EquipmentTabsComponent {
  activeTab = input.required<EquipmentTab>();
  tabChange = output<EquipmentTab>();
}
