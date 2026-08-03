import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { Equipment } from '../../services/equipment.service';
import { HumanizeActionPipe } from '../../pipes/humanize-action.pipe';
import { CentsToDollarsPipe } from '../../pipes/cents-to-dollars.pipe';

@Component({
  selector: 'app-equipment-detail-modal',
  standalone: true,
  imports: [DatePipe, HumanizeActionPipe, CentsToDollarsPipe],
  templateUrl: './equipment-detail-modal.html',
})
export class EquipmentDetailModalComponent {
  open = input.required<boolean>();
  equipment = input<Equipment | null>(null);

  close = output<void>();
}
