import { Component, input, output, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Venue } from '../../../services/venue.service';

@Component({
  selector: 'app-venue-list',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <div class="flex flex-col gap-6 w-full animate-fadeIn text-left">
      <!-- Venues Header -->
      <div class="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 class="text-xl font-bold text-white">Workspace Venues</h2>
          <p class="text-xs text-slate-400 mt-1">Manage venues and sports facilities belonging to this workspace.</p>
        </div>
        <div class="flex items-center gap-3">
          <span
            class="text-xs font-semibold px-2.5 py-1 bg-slate-900 border border-white/10 text-violet-400 rounded-lg">
            {{ venues().length }} Total
          </span>
          @if (canUpdate()) {
          <button (click)="add.emit()"
            class="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-violet-900/20 transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Venue
          </button>
          }
        </div>
      </div>

      <!-- Venues Grid -->
      @if (venues().length === 0) {
      <div
        class="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 border border-white/10 rounded-2xl">
        <div class="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center mb-4">
          <i class="fi fi-rr-marker text-slate-600 text-2xl"></i>
        </div>
        <h3 class="text-sm font-bold text-white mb-1">No venues registered</h3>
        <p class="text-xs text-slate-500 max-w-xs">Register your first venue or sports facility to assign it to
          matches.</p>
      </div>
      } @else {
        <!-- Search and Filter Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/20 border border-white/5 p-4 rounded-2xl mb-4">
          <div class="text-xs text-slate-400 font-medium">
            @if (venueSearchQuery()) {
              Showing {{ filteredVenues().length }} of {{ venues().length }} venues
            } @else {
              {{ venues().length }} venue{{ venues().length !== 1 ? 's' : '' }} registered
            }
          </div>
          <div class="relative w-full sm:w-72">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <i class="fi fi-rr-search text-xs"></i>
            </span>
            <input type="text" [ngModel]="venueSearchQuery()" (ngModelChange)="venueSearchQuery.set($event)"
              placeholder="Search venues by name or location..."
              class="w-full bg-slate-950/40 border border-white/10 focus:border-violet-500/50 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all" />
            @if (venueSearchQuery()) {
            <button (click)="venueSearchQuery.set('')"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer bg-transparent border-0">
              <i class="fi fi-rr-cross text-[10px]"></i>
            </button>
            }
          </div>
        </div>

        @if (filteredVenues().length === 0) {
        <div
          class="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 border border-white/10 rounded-2xl w-full">
          <div class="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center mb-4">
            <i class="fi fi-rr-search text-slate-600 text-2xl"></i>
          </div>
          <h3 class="text-sm font-bold text-white mb-1">No matching venues</h3>
          <p class="text-xs text-slate-500 max-w-xs">No venues match your search query "{{ venueSearchQuery() }}".</p>
        </div>
        } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (venue of filteredVenues(); track venue.id) {
          <div
            class="bg-slate-900 border border-white/10 hover:border-violet-500/30 rounded-2xl flex flex-col overflow-hidden group transition-all duration-300 shadow-xl hover:shadow-2xl">
            <!-- Cover Image / Banner -->
            <div
              class="h-40 w-full relative bg-slate-950/60 overflow-hidden border-b border-white/5 flex-shrink-0 flex items-center justify-center">
              @if (venue.imageUrl) {
              <img [src]="venue.imageUrl" alt="Venue Cover"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              } @else {
              <!-- Stylized fallback banner with nice colors & icon -->
              <div class="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-indigo-900/40 opacity-70"></div>
              <div
                class="absolute w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-violet-400 text-lg shadow-inner z-10">
                <i class="fi fi-rr-marker"></i>
              </div>
              }
            </div>

            <!-- Card Body -->
            <div class="p-5 flex-1 flex flex-col justify-between gap-4 text-left">
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-bold text-white truncate" [title]="venue.name">{{ venue.name }}</h4>
                @if (venue.location) {
                <p class="text-xs text-slate-400 mt-2 flex items-center gap-1.5" [title]="venue.location">
                  <i class="fi fi-rr-navigation text-violet-400 flex-shrink-0 text-[10px]"></i>
                  <span class="truncate">{{ venue.location }}</span>
                </p>
                }
                <p class="text-[9px] text-slate-500 mt-2.5">Registered {{ venue.createdAt | date: 'MMM d, y' }}</p>
              </div>

              <!-- Actions -->
              @if (canUpdate()) {
              <div
                class="flex items-center justify-end gap-2 pt-3 border-t border-white/5 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <button (click)="edit.emit(venue)"
                  class="px-3 py-1.5 text-[11px] font-bold text-violet-400 hover:text-white hover:bg-violet-600/20 border border-violet-500/10 hover:border-violet-500/30 rounded-lg transition-all cursor-pointer">
                  Edit
                </button>
                <button (click)="delete.emit(venue)"
                  class="px-3 py-1.5 text-[11px] font-bold text-rose-400 hover:text-white hover:bg-rose-600/20 border border-rose-500/10 hover:border-rose-500/30 rounded-lg transition-all cursor-pointer">
                  Delete
                </button>
              </div>
              }
            </div>
          </div>
          }
        </div>
        }
      }
    </div>
  `
})
export class VenueListComponent {
  venues = input<Venue[]>([]);
  canUpdate = input<boolean>(false);

  add = output<void>();
  edit = output<Venue>();
  delete = output<Venue>();

  venueSearchQuery = signal('');

  filteredVenues = computed(() => {
    const query = this.venueSearchQuery().toLowerCase().trim();
    if (!query) return this.venues();
    return this.venues().filter(v =>
      v.name.toLowerCase().includes(query) ||
      (v.location && v.location.toLowerCase().includes(query))
    );
  });
}
