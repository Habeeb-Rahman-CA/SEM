import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { EquipmentBooking } from '../../services/equipment.service';
import type { BookingStatus } from '../../models/equipment.interface';
import { BookingStatusColorPipe } from '../../pipes/booking-status-color.pipe';

export interface BookingStatusChange {
  id: string;
  status: BookingStatus;
}

@Component({
  selector: 'app-bookings-table',
  standalone: true,
  imports: [DatePipe, BookingStatusColorPipe],
  templateUrl: './bookings-table.html',
})
export class BookingsTableComponent {
  bookings = input.required<EquipmentBooking[]>();

  statusChange = output<BookingStatusChange>();
}
