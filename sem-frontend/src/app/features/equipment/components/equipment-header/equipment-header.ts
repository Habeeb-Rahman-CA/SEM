import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-equipment-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './equipment-header.html',
})
export class EquipmentHeaderComponent {
  scanQuery = input.required<string>();

  scanQueryChange = output<string>();
  scan = output<void>();
  addClick = output<void>();
}
