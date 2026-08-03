import { Pipe, PipeTransform } from '@angular/core';
import type { MaintenanceStatus } from '../models/equipment.interface';

const COLORS: Record<MaintenanceStatus, string> = {
  scheduled: 'text-slate-400',
  in_progress: 'text-amber-400',
  completed: 'text-emerald-400',
  cancelled: 'text-slate-500',
};

@Pipe({ name: 'maintenanceStatusColor', standalone: true })
export class MaintenanceStatusColorPipe implements PipeTransform {
  transform(status: MaintenanceStatus | string | null | undefined): string {
    if (!status) return 'text-slate-500';
    return COLORS[status as MaintenanceStatus] ?? 'text-slate-500';
  }
}
