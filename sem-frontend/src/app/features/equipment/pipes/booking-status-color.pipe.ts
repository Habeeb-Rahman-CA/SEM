import { Pipe, PipeTransform } from '@angular/core';
import type { BookingStatus } from '../models/equipment.interface';

const COLORS: Record<BookingStatus, string> = {
  pending: 'text-amber-400',
  approved: 'text-emerald-400',
  active: 'text-violet-400',
  returned: 'text-emerald-400',
  cancelled: 'text-slate-500',
};

@Pipe({ name: 'bookingStatusColor', standalone: true })
export class BookingStatusColorPipe implements PipeTransform {
  transform(status: BookingStatus | string | null | undefined): string {
    if (!status) return 'text-slate-500';
    return COLORS[status as BookingStatus] ?? 'text-slate-500';
  }
}
