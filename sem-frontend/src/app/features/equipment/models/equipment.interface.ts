import type {
  Equipment,
  EquipmentBooking,
  EquipmentMaintenance,
} from '../services/equipment.service';

export type EquipmentTab = 'inventory' | 'bookings' | 'maintenance';

export type EquipmentStatus = Equipment['status'];
export type EquipmentCondition = Equipment['condition'];
export type BookingStatus = EquipmentBooking['status'];
export type MaintenanceStatus = EquipmentMaintenance['status'];
export type MaintenanceType = EquipmentMaintenance['maintenanceType'];

export interface EquipmentEventOption {
  id: string;
  title?: string;
  name?: string;
}

export interface EquipmentFormModel {
  name: string;
  sku: string;
  category: string;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  cost: number | null;
  location: string;
  description: string;
}

export interface BookingFormModel {
  eventId: string;
  startAt: string;
  endAt: string;
  notes: string;
}

export interface MaintenanceFormModel {
  equipmentId: string;
  title: string;
  maintenanceType: MaintenanceType;
  scheduledDate: string;
  cost: number | null;
  performedBy: string;
  description: string;
}

export const EMPTY_EQUIPMENT_FORM: EquipmentFormModel = {
  name: '',
  sku: '',
  category: 'general',
  status: 'available',
  condition: 'good',
  cost: null,
  location: '',
  description: '',
};

export const EMPTY_BOOKING_FORM: BookingFormModel = {
  eventId: '',
  startAt: '',
  endAt: '',
  notes: '',
};

export const EMPTY_MAINTENANCE_FORM: MaintenanceFormModel = {
  equipmentId: '',
  title: '',
  maintenanceType: 'routine',
  scheduledDate: '',
  cost: null,
  performedBy: '',
  description: '',
};
