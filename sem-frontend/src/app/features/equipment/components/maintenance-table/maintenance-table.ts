import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { EquipmentMaintenance } from '../../services/equipment.service';
import type { MaintenanceStatus } from '../../models/equipment.interface';
import { MaintenanceStatusColorPipe } from '../../pipes/maintenance-status-color.pipe';

export interface MaintenanceStatusChange {
  id: string;
  status: MaintenanceStatus;
}

@Component({
  selector: 'app-maintenance-table',
  standalone: true,
  imports: [DatePipe, MaintenanceStatusColorPipe],
  templateUrl: './maintenance-table.html',
})
export class MaintenanceTableComponent {
  records = input.required<EquipmentMaintenance[]>();

  scheduleClick = output<void>();
  statusChange = output<MaintenanceStatusChange>();
}
