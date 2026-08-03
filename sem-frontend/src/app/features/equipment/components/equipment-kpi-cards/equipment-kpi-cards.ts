import { Component, input } from '@angular/core';

@Component({
  selector: 'app-equipment-kpi-cards',
  standalone: true,
  templateUrl: './equipment-kpi-cards.html',
})
export class EquipmentKpiCardsComponent {
  total = input.required<number>();
  available = input.required<number>();
  booked = input.required<number>();
  maintenance = input.required<number>();
}
