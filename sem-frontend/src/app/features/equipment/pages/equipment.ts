import { Component, input, signal, computed, effect, inject } from '@angular/core';
import {
  EquipmentService,
  Equipment,
  EquipmentBooking,
  EquipmentMaintenance,
} from '../services/equipment.service';
import { EquipmentFilterService } from '../services/equipment-filter.service';
import {
  EquipmentTab,
  BookingStatus,
  MaintenanceStatus,
  EquipmentEventOption,
  EMPTY_EQUIPMENT_FORM,
  EMPTY_BOOKING_FORM,
  EMPTY_MAINTENANCE_FORM,
} from '../models/equipment.interface';
import { generateMockSku } from '../utils/sku.util';

import { EquipmentHeaderComponent } from '../components/equipment-header/equipment-header';
import { EquipmentKpiCardsComponent } from '../components/equipment-kpi-cards/equipment-kpi-cards';
import { EquipmentTabsComponent } from '../components/equipment-tabs/equipment-tabs';
import { InventoryToolbarComponent } from '../components/inventory-toolbar/inventory-toolbar';
import { InventoryGridComponent } from '../components/inventory-grid/inventory-grid';
import { BookingsTableComponent } from '../components/bookings-table/bookings-table';
import { MaintenanceTableComponent } from '../components/maintenance-table/maintenance-table';
import { EquipmentFormModalComponent } from '../components/equipment-form-modal/equipment-form-modal';
import { BookingFormModalComponent } from '../components/booking-form-modal/booking-form-modal';
import { MaintenanceFormModalComponent } from '../components/maintenance-form-modal/maintenance-form-modal';
import { EquipmentDetailModalComponent } from '../components/equipment-detail-modal/equipment-detail-modal';

@Component({
  selector: 'app-equipment',
  standalone: true,
  imports: [
    EquipmentHeaderComponent,
    EquipmentKpiCardsComponent,
    EquipmentTabsComponent,
    InventoryToolbarComponent,
    InventoryGridComponent,
    BookingsTableComponent,
    MaintenanceTableComponent,
    EquipmentFormModalComponent,
    BookingFormModalComponent,
    MaintenanceFormModalComponent,
    EquipmentDetailModalComponent,
  ],
  templateUrl: './equipment.html',
})
export class EquipmentComponent {
  workspaceId = input.required<string>();
  events = input<EquipmentEventOption[]>([]);

  private eqService = inject(EquipmentService);
  private filterService = inject(EquipmentFilterService);

  currentTab = signal<EquipmentTab>('inventory');
  equipmentList = signal<Equipment[]>([]);
  bookingsList = signal<EquipmentBooking[]>([]);
  maintenanceList = signal<EquipmentMaintenance[]>([]);

  scanSkuQuery = signal('');
  searchQuery = signal('');
  filterCategory = signal('');
  filterStatus = signal('');

  availableCount = computed(
    () => this.equipmentList().filter((e) => e.status === 'available').length,
  );
  bookedCount = computed(() => this.equipmentList().filter((e) => e.status === 'booked').length);
  maintenanceCount = computed(
    () => this.equipmentList().filter((e) => e.status === 'maintenance').length,
  );

  categories = computed(() => this.filterService.distinctCategories(this.equipmentList()));

  filteredEquipment = computed(() =>
    this.filterService.filter(
      this.equipmentList(),
      this.searchQuery(),
      this.filterCategory(),
      this.filterStatus(),
    ),
  );

  isModalOpen = signal(false);
  editingItem = signal<Equipment | null>(null);
  itemForm = { ...EMPTY_EQUIPMENT_FORM };

  isBookModalOpen = signal(false);
  selectedEquipment = signal<Equipment | null>(null);
  bookingForm = { ...EMPTY_BOOKING_FORM };

  isMaintenanceModalOpen = signal(false);
  maintenanceForm = { ...EMPTY_MAINTENANCE_FORM };

  isDetailModalOpen = signal(false);

  constructor() {
    effect(
      () => {
        const wsId = this.workspaceId();
        if (wsId) {
          this.loadData();
        }
      },
      { allowSignalWrites: true },
    );
  }

  loadData() {
    const wsId = this.workspaceId();
    if (!wsId) return;

    this.eqService.getEquipment(wsId).subscribe((data) => this.equipmentList.set(data));
    this.eqService.getBookings(wsId).subscribe((data) => this.bookingsList.set(data));
    this.eqService
      .getMaintenanceSchedules(wsId)
      .subscribe((data) => this.maintenanceList.set(data));
  }

  simulateBarcodeScan() {
    const sku = this.scanSkuQuery().trim();
    if (!sku) return;

    this.eqService.getEquipmentBySku(this.workspaceId(), sku).subscribe({
      next: (item) => {
        this.openDetailModal(item);
        this.scanSkuQuery.set('');
      },
      error: () => {
        alert(`No equipment asset found matching scanned barcode: "${sku}"`);
      },
    });
  }

  generateMockSku() {
    this.itemForm.sku = generateMockSku(this.itemForm.category);
  }

  openAddModal() {
    this.editingItem.set(null);
    Object.assign(this.itemForm, EMPTY_EQUIPMENT_FORM);
    this.isModalOpen.set(true);
  }

  openEditModal(item: Equipment) {
    this.editingItem.set(item);
    Object.assign(this.itemForm, {
      name: item.name,
      sku: item.sku || '',
      category: item.category,
      status: item.status,
      condition: item.condition,
      cost: item.cost ? item.cost / 100 : null,
      location: item.location || '',
      description: item.description || '',
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  saveEquipment() {
    if (!this.itemForm.name) {
      alert('Equipment name is required.');
      return;
    }
    const wsId = this.workspaceId();
    const payload = {
      ...this.itemForm,
      cost: this.itemForm.cost ? Math.round(this.itemForm.cost * 100) : null,
    };

    const editing = this.editingItem();
    const request$ = editing
      ? this.eqService.updateEquipment(wsId, editing.id, payload)
      : this.eqService.createEquipment(wsId, payload);

    request$.subscribe(() => {
      this.loadData();
      this.closeModal();
    });
  }

  deleteEquipment(id: string) {
    if (confirm('Are you sure you want to permanently delete this equipment asset?')) {
      this.eqService.removeEquipment(this.workspaceId(), id).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    }
  }

  openBookModal(item: Equipment) {
    this.selectedEquipment.set(item);
    const today = new Date().toISOString().substring(0, 10);
    Object.assign(this.bookingForm, { ...EMPTY_BOOKING_FORM, startAt: today, endAt: today });
    this.isBookModalOpen.set(true);
  }

  closeBookModal() {
    this.isBookModalOpen.set(false);
  }

  saveBooking() {
    if (!this.bookingForm.startAt || !this.bookingForm.endAt) {
      alert('Start and End dates are required.');
      return;
    }
    const wsId = this.workspaceId();
    const payload = {
      equipmentId: this.selectedEquipment()!.id,
      eventId: this.bookingForm.eventId || null,
      startAt: new Date(this.bookingForm.startAt).toISOString(),
      endAt: new Date(this.bookingForm.endAt).toISOString(),
      notes: this.bookingForm.notes || null,
    };

    this.eqService.createBooking(wsId, payload).subscribe(() => {
      this.loadData();
      this.closeBookModal();
      this.currentTab.set('bookings');
    });
  }

  updateBookingStatus(id: string, status: BookingStatus) {
    this.eqService.updateBooking(this.workspaceId(), id, { status }).subscribe(() => {
      this.loadData();
    });
  }

  openMaintenanceModal() {
    const today = new Date().toISOString().substring(0, 10);
    Object.assign(this.maintenanceForm, { ...EMPTY_MAINTENANCE_FORM, scheduledDate: today });
    this.isMaintenanceModalOpen.set(true);
  }

  closeMaintenanceModal() {
    this.isMaintenanceModalOpen.set(false);
  }

  saveMaintenance() {
    if (
      !this.maintenanceForm.equipmentId ||
      !this.maintenanceForm.title ||
      !this.maintenanceForm.scheduledDate
    ) {
      alert('Equipment, Title, and Scheduled Date are required.');
      return;
    }
    const wsId = this.workspaceId();
    const payload = {
      ...this.maintenanceForm,
      cost: this.maintenanceForm.cost ? Math.round(this.maintenanceForm.cost * 100) : null,
      scheduledDate: new Date(this.maintenanceForm.scheduledDate).toISOString(),
    };

    this.eqService.createMaintenance(wsId, payload).subscribe(() => {
      this.loadData();
      this.closeMaintenanceModal();
    });
  }

  updateMaintenanceStatus(id: string, status: MaintenanceStatus) {
    const payload: Record<string, unknown> = { status };
    if (status === 'completed') {
      payload['completedDate'] = new Date().toISOString();
    }
    this.eqService.updateMaintenance(this.workspaceId(), id, payload).subscribe(() => {
      this.loadData();
    });
  }

  openDetailModal(item: Equipment) {
    this.eqService.getEquipmentById(this.workspaceId(), item.id).subscribe((data) => {
      this.selectedEquipment.set(data);
      this.isDetailModalOpen.set(true);
    });
  }

  closeDetailModal() {
    this.isDetailModalOpen.set(false);
  }
}
