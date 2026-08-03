import { Pipe, PipeTransform } from '@angular/core';
import type { EquipmentCondition } from '../models/equipment.interface';

const COLORS: Record<EquipmentCondition, string> = {
  new: 'text-emerald-400',
  good: 'text-slate-200',
  fair: 'text-amber-400',
  poor: 'text-rose-400',
};

@Pipe({ name: 'conditionColor', standalone: true })
export class ConditionColorPipe implements PipeTransform {
  transform(condition: EquipmentCondition | string | null | undefined): string {
    if (!condition) return 'text-slate-200';
    return COLORS[condition as EquipmentCondition] ?? 'text-slate-200';
  }
}
