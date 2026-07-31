import { Component, input, signal, computed, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  EquipmentService,
  Equipment,
  EquipmentBooking,
  EquipmentMaintenance,
  EquipmentHistory,
} from '../services/equipment.service';
import { SearchInputComponent } from '../../../shared';

@Component({
  selector: 'app-equipment',
  standalone: true,
  imports: [DatePipe, FormsModule, SearchInputComponent],
  template: `
    <div class="h-full flex flex-col overflow-hidden w-full text-left animate-fadeIn">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-white/5 pb-4 flex-shrink-0">
        <div>
          <h2 class="text-xl font-bold text-white">Equipment & Inventory</h2>
          <p class="text-xs text-slate-400 mt-1">
            Manage sports gear, track maintenance schedules, QR/barcodes, and event bookings.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Quick QR/Barcode Scan Simulator -->
          <div
            class="flex items-center gap-2 bg-slate-900 border border-white/10 px-3 py-1.5 rounded-xl"
          >
            <i class="fi fi-rr-qrcode text-emerald-400 text-sm"></i>
            <input
              type="text"
              [(ngModel)]="scanSkuQuery"
              placeholder="Scan/Enter barcode..."
              (keyup.enter)="simulateBarcodeScan()"
              class="bg-transparent border-0 outline-none text-xs text-white placeholder-slate-500 w-32"
            />
            <button
              (click)="simulateBarcodeScan()"
              class="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded text-[10px] font-bold border-0 cursor-pointer transition"
            >
              Scan
            </button>
          </div>

          <button
            (click)="openAddModal()"
            class="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-violet-900/20 transition-all cursor-pointer border-0 outline-none"
          >
            <i class="fi fi-rr-plus text-xs"></i>
            Add Equipment
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 my-4 flex-shrink-0">
        <div class="bg-slate-900/40 p-4 border border-white/5 rounded-xl">
          <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider">
            Total Assets
          </div>
          <div class="text-xl font-black text-white mt-1">{{ equipmentList().length }}</div>
          <div class="text-[8px] text-slate-400 mt-0.5">Registered items</div>
        </div>
        <div class="bg-slate-900/40 p-4 border border-white/5 rounded-xl">
          <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider">
            Available Now
          </div>
          <div class="text-xl font-black text-emerald-400 mt-1">{{ availableCount() }}</div>
          <div class="text-[8px] text-slate-400 mt-0.5">Ready for booking</div>
        </div>
        <div class="bg-slate-900/40 p-4 border border-white/5 rounded-xl">
          <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider">
            Active Bookings
          </div>
          <div class="text-xl font-black text-violet-400 mt-1">{{ bookedCount() }}</div>
          <div class="text-[8px] text-slate-400 mt-0.5">Assigned to events</div>
        </div>
        <div class="bg-slate-900/40 p-4 border border-white/5 rounded-xl">
          <div class="text-[9px] text-slate-500 uppercase font-black tracking-wider">
            Under Maintenance
          </div>
          <div class="text-xl font-black text-amber-400 mt-1">{{ maintenanceCount() }}</div>
          <div class="text-[8px] text-slate-400 mt-0.5">Inspections & repairs</div>
        </div>
      </div>

      <!-- Sub Navigation Tabs -->
      <div class="flex border-b border-white/5 mb-4 flex-shrink-0">
        <button
          (click)="currentTab.set('inventory')"
          [class]="
            currentTab() === 'inventory'
              ? 'border-b-2 border-violet-500 text-violet-400'
              : 'text-slate-400 hover:text-white'
          "
          class="px-4 py-2.5 text-xs font-bold bg-transparent border-0 cursor-pointer transition outline-none"
        >
          <i class="fi fi-rr-box mr-1.5"></i>Inventory Roster
        </button>
        <button
          (click)="currentTab.set('bookings')"
          [class]="
            currentTab() === 'bookings'
              ? 'border-b-2 border-violet-500 text-violet-400'
              : 'text-slate-400 hover:text-white'
          "
          class="px-4 py-2.5 text-xs font-bold bg-transparent border-0 cursor-pointer transition outline-none"
        >
          <i class="fi fi-rr-calendar mr-1.5"></i>Bookings & Checkouts
        </button>
        <button
          (click)="currentTab.set('maintenance')"
          [class]="
            currentTab() === 'maintenance'
              ? 'border-b-2 border-violet-500 text-violet-400'
              : 'text-slate-400 hover:text-white'
          "
          class="px-4 py-2.5 text-xs font-bold bg-transparent border-0 cursor-pointer transition outline-none"
        >
          <i class="fi fi-rr-wrench mr-1.5"></i>Maintenance Queue
        </button>
      </div>

      <!-- Main Body -->
      <div class="flex-1 overflow-hidden min-h-0 flex flex-col">
        <!-- 1. INVENTORY TAB -->
        @if (currentTab() === 'inventory') {
          <div
            class="flex-shrink-0 flex items-center justify-between gap-4 bg-slate-900/20 border border-white/5 p-4 rounded-xl mb-4"
          >
            <div class="text-xs text-slate-400 font-medium">
              Showing {{ filteredEquipment().length }} of {{ equipmentList().length }} equipment
              items
            </div>
            <div class="flex items-center gap-3">
              <select
                [(ngModel)]="filterCategory"
                class="bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="">All Categories</option>
                @for (cat of categories(); track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
              <select
                [(ngModel)]="filterStatus"
                class="bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="available">Available</option>
                <option value="booked">Booked</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
              <app-search-input
                [value]="searchQuery()"
                placeholder="Search by name, SKU/barcode..."
                (valueChange)="searchQuery.set($event)"
              />
            </div>
          </div>

          <div class="flex-1 overflow-y-auto min-h-0 pr-1">
            @if (filteredEquipment().length === 0) {
              <div
                class="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 border border-white/10 rounded-2xl"
              >
                <i class="fi fi-rr-box text-slate-600 text-3xl mb-3"></i>
                <h3 class="text-sm font-bold text-white mb-1">No equipment assets found</h3>
                <p class="text-xs text-slate-500">
                  Register new equipment or modify filters to get started.
                </p>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                @for (item of filteredEquipment(); track item.id) {
                  <div
                    class="bg-slate-900 border border-white/10 hover:border-violet-500/30 rounded-2xl p-5 flex flex-col justify-between gap-4 group transition shadow-xl"
                  >
                    <div>
                      <div class="flex justify-between items-start">
                        <span
                          class="text-[9px] bg-slate-800 border border-white/10 px-2 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider"
                        >
                          {{ item.category }}
                        </span>
                        <span
                          [class]="
                            item.status === 'available'
                              ? 'text-emerald-400'
                              : item.status === 'booked'
                                ? 'text-violet-400'
                                : item.status === 'maintenance'
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                          "
                          class="text-[9px] font-black uppercase tracking-wider"
                        >
                          ● {{ item.status }}
                        </span>
                      </div>
                      <h3 class="text-sm font-bold text-white mt-2.5 truncate" [title]="item.name">
                        {{ item.name }}
                      </h3>
                      <div class="flex items-center gap-1.5 mt-2">
                        <i class="fi fi-rr-barcode text-[10px] text-slate-500"></i>
                        <span class="text-xs text-slate-400 font-mono">{{
                          item.sku || 'No Barcode'
                        }}</span>
                      </div>
                      <p class="text-xs text-slate-500 mt-2 line-clamp-2">
                        {{ item.description || 'No description provided.' }}
                      </p>
                    </div>

                    <div class="border-t border-white/5 pt-3.5 flex items-center justify-between">
                      <span class="text-[10px] text-slate-400 flex items-center gap-1">
                        Condition:
                        <strong
                          class="capitalize"
                          [class]="item.condition === 'poor' ? 'text-rose-400' : 'text-slate-200'"
                        >
                          {{ item.condition }}
                        </strong>
                      </span>
                      <div class="flex items-center gap-2">
                        <button
                          (click)="openDetailModal(item)"
                          class="px-2.5 py-1.5 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition border-0"
                        >
                          View Log
                        </button>
                        <button
                          (click)="openBookModal(item)"
                          [disabled]="item.status === 'retired'"
                          class="px-2.5 py-1.5 text-[10px] font-bold bg-violet-600/20 hover:bg-violet-600 text-violet-400 hover:text-white rounded-lg cursor-pointer transition border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Book
                        </button>
                        <button
                          (click)="openEditModal(item)"
                          class="p-1.5 text-[11px] font-bold text-slate-400 hover:text-white bg-transparent rounded-lg cursor-pointer transition border-0"
                        >
                          <i class="fi fi-rr-edit"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- 2. BOOKINGS TAB -->
        @if (currentTab() === 'bookings') {
          <div
            class="flex-shrink-0 flex items-center justify-between gap-4 bg-slate-900/20 border border-white/5 p-4 rounded-xl mb-4"
          >
            <div class="text-xs text-slate-400 font-medium">
              Equipment Reservations & Checkout History
            </div>
          </div>

          <div class="flex-1 overflow-y-auto min-h-0 pr-1">
            @if (bookingsList().length === 0) {
              <div
                class="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 border border-white/10 rounded-2xl"
              >
                <i class="fi fi-rr-calendar text-slate-600 text-3xl mb-3"></i>
                <h3 class="text-sm font-bold text-white mb-1">No bookings found</h3>
                <p class="text-xs text-slate-500">
                  Book equipment from the Inventory tab to schedule checkouts.
                </p>
              </div>
            } @else {
              <div class="bg-slate-900/20 border border-white/5 rounded-2xl p-5 shadow-xl">
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        class="border-b border-white/10 text-slate-500 font-bold uppercase tracking-wider text-[10px]"
                      >
                        <th class="py-2.5">Equipment</th>
                        <th class="py-2.5">Booked By</th>
                        <th class="py-2.5">Linked Event</th>
                        <th class="py-2.5">Date Period</th>
                        <th class="py-2.5">Status</th>
                        <th class="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5 text-slate-300">
                      @for (booking of bookingsList(); track booking.id) {
                        <tr>
                          <td class="py-3.5">
                            <div class="font-bold text-white">{{ booking.equipment?.name }}</div>
                            <div class="text-[9px] text-slate-500 font-mono mt-0.5">
                              {{ booking.equipment?.sku }}
                            </div>
                          </td>
                          <td class="py-3.5">{{ booking.bookedBy?.username }}</td>
                          <td class="py-3.5 text-slate-400">
                            {{ booking.event?.title || 'None' }}
                          </td>
                          <td class="py-3.5">
                            {{ booking.startAt | date: 'MMM d' }} -
                            {{ booking.endAt | date: 'MMM d, y' }}
                          </td>
                          <td class="py-3.5 uppercase text-[9px] font-black">
                            <span
                              [class]="
                                booking.status === 'active'
                                  ? 'text-violet-400'
                                  : booking.status === 'returned'
                                    ? 'text-emerald-400'
                                    : booking.status === 'pending'
                                      ? 'text-amber-400'
                                      : 'text-slate-500'
                              "
                            >
                              {{ booking.status }}
                            </span>
                          </td>
                          <td class="py-3.5 text-right">
                            <div class="flex justify-end gap-1.5">
                              @if (booking.status === 'pending') {
                                <button
                                  (click)="updateBookingStatus(booking.id, 'approved')"
                                  class="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded text-[10px] font-bold cursor-pointer transition border-0"
                                >
                                  Approve
                                </button>
                              }
                              @if (booking.status === 'approved') {
                                <button
                                  (click)="updateBookingStatus(booking.id, 'active')"
                                  class="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded text-[10px] font-bold cursor-pointer transition border-0"
                                >
                                  Check Out
                                </button>
                              }
                              @if (booking.status === 'active') {
                                <button
                                  (click)="updateBookingStatus(booking.id, 'returned')"
                                  class="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer transition border-0"
                                >
                                  Return Gear
                                </button>
                              }
                              @if (
                                booking.status !== 'returned' && booking.status !== 'cancelled'
                              ) {
                                <button
                                  (click)="updateBookingStatus(booking.id, 'cancelled')"
                                  class="p-1 text-rose-400 hover:text-white bg-transparent rounded cursor-pointer transition border-0"
                                >
                                  <i class="fi fi-rr-cross-circle"></i>
                                </button>
                              }
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>
        }

        <!-- 3. MAINTENANCE TAB -->
        @if (currentTab() === 'maintenance') {
          <div
            class="flex-shrink-0 flex items-center justify-between gap-4 bg-slate-900/20 border border-white/5 p-4 rounded-xl mb-4"
          >
            <div class="text-xs text-slate-400 font-medium">
              Maintenance inspection logs & schedules
            </div>
            <button
              (click)="openMaintenanceModal()"
              class="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600 text-violet-400 hover:text-white rounded-xl text-xs font-bold border-0 cursor-pointer transition"
            >
              Schedule Maintenance
            </button>
          </div>

          <div class="flex-1 overflow-y-auto min-h-0 pr-1">
            @if (maintenanceList().length === 0) {
              <div
                class="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 border border-white/10 rounded-2xl"
              >
                <i class="fi fi-rr-wrench text-slate-600 text-3xl mb-3"></i>
                <h3 class="text-sm font-bold text-white mb-1">No maintenance records</h3>
                <p class="text-xs text-slate-500">
                  Schedule checkups/repairs from the maintenance action buttons.
                </p>
              </div>
            } @else {
              <div class="bg-slate-900/20 border border-white/5 rounded-2xl p-5 shadow-xl">
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        class="border-b border-white/10 text-slate-500 font-bold uppercase tracking-wider text-[10px]"
                      >
                        <th class="py-2.5">Equipment</th>
                        <th class="py-2.5">Maintenance Task</th>
                        <th class="py-2.5">Type</th>
                        <th class="py-2.5">Scheduled Date</th>
                        <th class="py-2.5">Status</th>
                        <th class="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5 text-slate-300">
                      @for (m of maintenanceList(); track m.id) {
                        <tr>
                          <td class="py-3.5">
                            <div class="font-bold text-white">{{ m.equipment?.name }}</div>
                          </td>
                          <td class="py-3.5">
                            <div class="font-bold text-slate-200">{{ m.title }}</div>
                            <div class="text-[10px] text-slate-500 mt-0.5">
                              {{ m.description || 'No description' }}
                            </div>
                          </td>
                          <td class="py-3.5 capitalize text-slate-400">{{ m.maintenanceType }}</td>
                          <td class="py-3.5">{{ m.scheduledDate | date: 'MMM d, y' }}</td>
                          <td class="py-3.5 uppercase text-[9px] font-black">
                            <span
                              [class]="
                                m.status === 'completed'
                                  ? 'text-emerald-400'
                                  : m.status === 'in_progress'
                                    ? 'text-amber-400'
                                    : m.status === 'scheduled'
                                      ? 'text-slate-400'
                                      : 'text-slate-500'
                              "
                            >
                              {{ m.status }}
                            </span>
                          </td>
                          <td class="py-3.5 text-right">
                            <div class="flex justify-end gap-1.5">
                              @if (m.status === 'scheduled') {
                                <button
                                  (click)="updateMaintenanceStatus(m.id, 'in_progress')"
                                  class="px-2 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded text-[10px] font-bold cursor-pointer transition border-0"
                                >
                                  Start Task
                                </button>
                              }
                              @if (m.status === 'in_progress') {
                                <button
                                  (click)="updateMaintenanceStatus(m.id, 'completed')"
                                  class="px-2 py-1 bg-emerald-600 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded text-[10px] font-bold cursor-pointer transition border-0"
                                >
                                  Complete
                                </button>
                              }
                              @if (m.status !== 'completed' && m.status !== 'cancelled') {
                                <button
                                  (click)="updateMaintenanceStatus(m.id, 'cancelled')"
                                  class="p-1 text-rose-400 hover:text-white bg-transparent rounded cursor-pointer transition border-0"
                                >
                                  <i class="fi fi-rr-cross-circle"></i>
                                </button>
                              }
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- ═══════════════ MODALS ═══════════════ -->

    <!-- Add/Edit Equipment Modal -->
    @if (isModalOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <div
          class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-left"
        >
          <div class="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 class="text-sm font-bold text-white uppercase tracking-widest">
              {{ editingItem() ? 'Edit Equipment' : 'Add Equipment Asset' }}
            </h3>
            <button
              (click)="closeModal()"
              class="text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
            >
              <i class="fi fi-rr-cross text-xs"></i>
            </button>
          </div>
          <div class="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
            <div>
              <label
                class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                >Equipment Name *</label
              >
              <input
                type="text"
                [(ngModel)]="itemForm.name"
                class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >SKU / Barcode *</label
                >
                <div class="flex gap-2">
                  <input
                    type="text"
                    [(ngModel)]="itemForm.sku"
                    class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                  <button
                    (click)="generateMockSku()"
                    class="px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold border-0 cursor-pointer"
                  >
                    Gen
                  </button>
                </div>
              </div>
              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >Category</label
                >
                <input
                  type="text"
                  [(ngModel)]="itemForm.category"
                  placeholder="e.g. Footballs, Timers"
                  class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >Condition</label
                >
                <select
                  [(ngModel)]="itemForm.condition"
                  class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="new">New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >Status</label
                >
                <select
                  [(ngModel)]="itemForm.status"
                  class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="available">Available</option>
                  <option value="booked">Booked</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >Purchase Cost (USD)</label
                >
                <input
                  type="number"
                  [(ngModel)]="itemForm.cost"
                  placeholder="e.g. 50"
                  class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >Storage Location</label
                >
                <input
                  type="text"
                  [(ngModel)]="itemForm.location"
                  placeholder="e.g. Locker room B"
                  class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>
            <div>
              <label
                class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                >Description</label
              >
              <textarea
                [(ngModel)]="itemForm.description"
                rows="3"
                class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
              ></textarea>
            </div>
          </div>
          <div
            class="p-6 border-t border-white/5 flex justify-between items-center bg-slate-950/20"
          >
            @if (editingItem()) {
              <button
                (click)="deleteEquipment(editingItem()!.id)"
                class="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl text-xs font-bold border-0 cursor-pointer transition"
              >
                Delete Asset
              </button>
            } @else {
              <div></div>
            }
            <div class="flex gap-2">
              <button
                (click)="closeModal()"
                class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border-0 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                (click)="saveEquipment()"
                class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold border-0 cursor-pointer transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Booking Modal -->
    @if (isBookModalOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <div
          class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-left"
        >
          <div class="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 class="text-sm font-bold text-white uppercase tracking-widest">
              Book Asset: {{ selectedEquipment()?.name }}
            </h3>
            <button
              (click)="closeBookModal()"
              class="text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
            >
              <i class="fi fi-rr-cross text-xs"></i>
            </button>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label
                class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                >Select Event Linkage</label
              >
              <select
                [(ngModel)]="bookingForm.eventId"
                class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
              >
                <option value="">No Event Linkage</option>
                @for (e of events(); track e.id) {
                  <option [value]="e.id">{{ e.title }}</option>
                }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >Start Date *</label
                >
                <input
                  type="date"
                  [(ngModel)]="bookingForm.startAt"
                  class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >End Date *</label
                >
                <input
                  type="date"
                  [(ngModel)]="bookingForm.endAt"
                  class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>
            <div>
              <label
                class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                >Booking Notes</label
              >
              <textarea
                [(ngModel)]="bookingForm.notes"
                placeholder="Details of the checkout purpose..."
                rows="3"
                class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
              ></textarea>
            </div>
          </div>
          <div class="p-6 border-t border-white/5 flex justify-end gap-2 bg-slate-950/20">
            <button
              (click)="closeBookModal()"
              class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border-0 cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              (click)="saveBooking()"
              class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold border-0 cursor-pointer transition"
            >
              Confirm Booking
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Maintenance Schedule Modal -->
    @if (isMaintenanceModalOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <div
          class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-left"
        >
          <div class="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 class="text-sm font-bold text-white uppercase tracking-widest">
              Schedule Maintenance Task
            </h3>
            <button
              (click)="closeMaintenanceModal()"
              class="text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
            >
              <i class="fi fi-rr-cross text-xs"></i>
            </button>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label
                class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                >Target Equipment *</label
              >
              <select
                [(ngModel)]="maintenanceForm.equipmentId"
                class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
              >
                <option value="">Select Equipment Item</option>
                @for (item of equipmentList(); track item.id) {
                  <option [value]="item.id">{{ item.name }} ({{ item.sku }})</option>
                }
              </select>
            </div>
            <div>
              <label
                class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                >Maintenance Title *</label
              >
              <input
                type="text"
                [(ngModel)]="maintenanceForm.title"
                placeholder="e.g. Inspect stitching, Clean grips"
                class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >Task Type</label
                >
                <select
                  [(ngModel)]="maintenanceForm.maintenanceType"
                  class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="routine">Routine</option>
                  <option value="repair">Repair</option>
                  <option value="inspection">Inspection</option>
                </select>
              </div>
              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >Scheduled Date *</label
                >
                <input
                  type="date"
                  [(ngModel)]="maintenanceForm.scheduledDate"
                  class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >Estimated Cost (USD)</label
                >
                <input
                  type="number"
                  [(ngModel)]="maintenanceForm.cost"
                  placeholder="e.g. 15"
                  class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >Performed By</label
                >
                <input
                  type="text"
                  [(ngModel)]="maintenanceForm.performedBy"
                  placeholder="e.g. John Doe, Vendor"
                  class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>
            <div>
              <label
                class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                >Description / Notes</label
              >
              <textarea
                [(ngModel)]="maintenanceForm.description"
                rows="2"
                class="w-full bg-slate-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
              ></textarea>
            </div>
          </div>
          <div class="p-6 border-t border-white/5 flex justify-end gap-2 bg-slate-950/20">
            <button
              (click)="closeMaintenanceModal()"
              class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border-0 cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              (click)="saveMaintenance()"
              class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold border-0 cursor-pointer transition"
            >
              Schedule
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Equipment Detail & History Log Modal -->
    @if (isDetailModalOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <div
          class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-left"
        >
          <div class="p-6 border-b border-white/5 flex justify-between items-center">
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-widest">
                Asset Profile: {{ selectedEquipment()?.name }}
              </h3>
              <p class="text-[10px] text-slate-500 mt-1 font-mono">
                ID: {{ selectedEquipment()?.id }}
              </p>
            </div>
            <button
              (click)="closeDetailModal()"
              class="text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
            >
              <i class="fi fi-rr-cross text-xs"></i>
            </button>
          </div>
          <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[65vh]">
            <!-- Left Info Column -->
            <div class="space-y-4">
              <div class="bg-slate-950/40 p-4 border border-white/5 rounded-xl space-y-2.5">
                <h4 class="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                  Specifications
                </h4>
                <div class="flex justify-between text-xs">
                  <span class="text-slate-400">Barcode/SKU</span>
                  <span class="font-mono text-white font-bold">{{
                    selectedEquipment()?.sku || 'N/A'
                  }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-slate-400">Category</span>
                  <span class="text-white capitalize font-semibold">{{
                    selectedEquipment()?.category
                  }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-slate-400">Condition</span>
                  <span class="text-white capitalize font-semibold">{{
                    selectedEquipment()?.condition
                  }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-slate-400">Location</span>
                  <span class="text-white font-semibold">{{
                    selectedEquipment()?.location || 'Unassigned'
                  }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-slate-400">Purchase Cost</span>
                  <span class="text-white font-semibold">{{
                    selectedEquipment()?.cost
                      ? '$' + (selectedEquipment()!.cost! / 100).toFixed(2)
                      : 'N/A'
                  }}</span>
                </div>
              </div>

              <div>
                <label
                  class="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1"
                  >Description</label
                >
                <p
                  class="text-xs text-slate-300 bg-slate-950/20 p-3 border border-white/5 rounded-xl min-h-[60px]"
                >
                  {{
                    selectedEquipment()?.description ||
                      'No description available for this gear item.'
                  }}
                </p>
              </div>
            </div>

            <!-- Right History Timeline -->
            <div class="flex flex-col min-h-0">
              <h4 class="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-3">
                Asset Lifecycle Log
              </h4>
              <div
                class="flex-1 overflow-y-auto max-h-[300px] border border-white/5 bg-slate-950/30 rounded-xl p-4 space-y-4"
              >
                @if (!selectedEquipment()?.history || selectedEquipment()?.history?.length === 0) {
                  <div class="text-center py-10 text-xs text-slate-500">
                    No asset history entries logged.
                  </div>
                } @else {
                  <div class="relative border-l border-white/10 pl-4 space-y-4">
                    @for (log of selectedEquipment()?.history; track log.id) {
                      <div class="relative">
                        <!-- Dot -->
                        <span
                          class="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-violet-500 border border-slate-900"
                        ></span>
                        <div class="text-xs font-bold text-white capitalize">
                          {{ log.action.replace('_', ' ') }}
                        </div>
                        <p class="text-[10px] text-slate-400 mt-0.5">{{ log.notes }}</p>
                        <div class="text-[9px] text-slate-500 mt-1 flex justify-between">
                          <span>By: {{ log.performedBy?.username || 'System' }}</span>
                          <span>{{ log.createdAt | date: 'MMM d, y, h:mm a' }}</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
          <div class="p-6 border-t border-white/5 flex justify-end bg-slate-950/20">
            <button
              (click)="closeDetailModal()"
              class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border-0 cursor-pointer transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class EquipmentComponent {
  workspaceId = input.required<string>();
  events = input<any[]>([]);

  private eqService = inject(EquipmentService);

  // States
  currentTab = signal<'inventory' | 'bookings' | 'maintenance'>('inventory');
  equipmentList = signal<Equipment[]>([]);
  bookingsList = signal<EquipmentBooking[]>([]);
  maintenanceList = signal<EquipmentMaintenance[]>([]);

  // Scanning & filters
  scanSkuQuery = '';
  searchQuery = signal('');
  filterCategory = '';
  filterStatus = '';

  // KPI computations
  availableCount = computed(
    () => this.equipmentList().filter((e) => e.status === 'available').length,
  );
  bookedCount = computed(() => this.equipmentList().filter((e) => e.status === 'booked').length);
  maintenanceCount = computed(
    () => this.equipmentList().filter((e) => e.status === 'maintenance').length,
  );

  categories = computed(() => {
    const set = new Set<string>();
    this.equipmentList().forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  });

  filteredEquipment = computed(() => {
    let list = this.equipmentList();
    const query = this.searchQuery().toLowerCase().trim();

    if (query) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(query) || (e.sku && e.sku.toLowerCase().includes(query)),
      );
    }
    if (this.filterCategory) {
      list = list.filter((e) => e.category === this.filterCategory);
    }
    if (this.filterStatus) {
      list = list.filter((e) => e.status === this.filterStatus);
    }
    return list;
  });

  // Modal controls
  isModalOpen = signal(false);
  editingItem = signal<Equipment | null>(null);
  itemForm = {
    name: '',
    sku: '',
    category: 'general',
    status: 'available' as any,
    condition: 'good' as any,
    cost: null as number | null,
    location: '',
    description: '',
  };

  isBookModalOpen = signal(false);
  selectedEquipment = signal<Equipment | null>(null);
  bookingForm = {
    eventId: '',
    startAt: '',
    endAt: '',
    notes: '',
  };

  isMaintenanceModalOpen = signal(false);
  maintenanceForm = {
    equipmentId: '',
    title: '',
    maintenanceType: 'routine' as any,
    scheduledDate: '',
    cost: null as number | null,
    performedBy: '',
    description: '',
  };

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

  // QR Barcode scan search simulator
  simulateBarcodeScan() {
    const sku = this.scanSkuQuery.trim();
    if (!sku) return;

    this.eqService.getEquipmentBySku(this.workspaceId(), sku).subscribe({
      next: (item) => {
        this.openDetailModal(item);
        this.scanSkuQuery = '';
      },
      error: () => {
        alert(`No equipment asset found matching scanned barcode: "${sku}"`);
      },
    });
  }

  generateMockSku() {
    const prefix = this.itemForm.category.substring(0, 3).toUpperCase() || 'EQ';
    const rand = Math.floor(100000 + Math.random() * 900000);
    this.itemForm.sku = `${prefix}-${rand}`;
  }

  // Inventory logic
  openAddModal() {
    this.editingItem.set(null);
    this.itemForm = {
      name: '',
      sku: '',
      category: 'general',
      status: 'available',
      condition: 'good',
      cost: null,
      location: '',
      description: '',
    };
    this.isModalOpen.set(true);
  }

  openEditModal(item: Equipment) {
    this.editingItem.set(item);
    this.itemForm = {
      name: item.name,
      sku: item.sku || '',
      category: item.category,
      status: item.status,
      condition: item.condition,
      cost: item.cost ? item.cost / 100 : null,
      location: item.location || '',
      description: item.description || '',
    };
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
    if (editing) {
      this.eqService.updateEquipment(wsId, editing.id, payload).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    } else {
      this.eqService.createEquipment(wsId, payload).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    }
  }

  deleteEquipment(id: string) {
    if (confirm('Are you sure you want to permanently delete this equipment asset?')) {
      this.eqService.removeEquipment(this.workspaceId(), id).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    }
  }

  // Booking logic
  openBookModal(item: Equipment) {
    this.selectedEquipment.set(item);
    const today = new Date().toISOString().substring(0, 10);
    this.bookingForm = {
      eventId: '',
      startAt: today,
      endAt: today,
      notes: '',
    };
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

  updateBookingStatus(id: string, status: any) {
    this.eqService.updateBooking(this.workspaceId(), id, { status }).subscribe(() => {
      this.loadData();
    });
  }

  // Maintenance logic
  openMaintenanceModal() {
    const today = new Date().toISOString().substring(0, 10);
    this.maintenanceForm = {
      equipmentId: '',
      title: '',
      maintenanceType: 'routine',
      scheduledDate: today,
      cost: null,
      performedBy: '',
      description: '',
    };
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

  updateMaintenanceStatus(id: string, status: any) {
    const payload: any = { status };
    if (status === 'completed') {
      payload.completedDate = new Date().toISOString();
    }
    this.eqService.updateMaintenance(this.workspaceId(), id, payload).subscribe(() => {
      this.loadData();
    });
  }

  // Detail / lifecycle log
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
