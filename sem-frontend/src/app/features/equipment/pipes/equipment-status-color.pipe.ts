import { Pipe, PipeTransform } from '@angular/core';
import type { EquipmentStatus } from '../models/equipment.interface';

const COLORS: Record<EquipmentStatus, string> = {
  available: 'text-emerald-400',
  booked: 'text-violet-400',
  maintenance: 'text-amber-400',
  retired: 'text-rose-400',
};

@Pipe({ name: 'equipmentStatusColor', standalone: true })
export class EquipmentStatusColorPipe implements PipeTransform {
  transform(status: EquipmentStatus | string | null | undefined): string {
    if (!status) return 'text-slate-400';
    return COLORS[status as EquipmentStatus] ?? 'text-slate-400';
  }
}
