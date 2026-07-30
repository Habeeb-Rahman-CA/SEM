import { Component, input, output, signal, effect, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VenueService, Venue } from '../services/venue.service';
import { UiService } from '../../../core/services/ui.service';
import { PhotoCaptureComponent } from '../../../shared/components/photo-capture/photo-capture';

declare const L: any;

@Component({
  selector: 'app-venue-modal',
  standalone: true,
  imports: [FormsModule, PhotoCaptureComponent],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        (click)="closeModal()"
      >
        <div
          class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
          (click)="$event.stopPropagation()"
        >
          <!-- Gradient top line -->
          <div
            class="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500"
          ></div>

          <!-- Header -->
          <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                @if (venue()) {
                  <span>Edit Venue:</span>
                  <span class="text-violet-400">{{ venue()?.name }}</span>
                } @else {
                  <span>Register New Venue</span>
                }
              </h3>
              <p class="text-xs text-slate-400 mt-1">
                @if (venue()) {
                  Update the venue details and configuration.
                } @else {
                  Add a new venue or sports facility to this workspace.
                }
              </p>
            </div>
            <button
              (click)="closeModal()"
              class="text-slate-400 hover:text-white transition cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                />
              </svg>
            </button>
          </div>

          <!-- Form Content -->
          <div class="p-6 overflow-y-auto flex-1">
            @if (venue()) {
              <div
                class="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-300 text-xs flex items-center gap-2"
              >
                <i class="fi fi-rr-marker text-sm"></i>
                Editing existing venue records.
              </div>
            }

            @if (saveSuccess()) {
              <div
                class="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-300 text-xs flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                  />
                </svg>
                {{ saveSuccess() }}
              </div>
            }
            @if (saveError()) {
              <div
                class="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-rose-300 text-xs flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                  />
                </svg>
                {{ saveError() }}
              </div>
            }

            <form
              (submit)="onSubmit(); $event.preventDefault()"
              class="flex flex-col gap-4 text-left"
            >
              <!-- Venue Image (Optional) -->
              <app-photo-capture
                label="Venue Image"
                hint="optional"
                uploadType="venue"
                shape="thumb"
                buttonLabel="Add Image"
                [imageUrl]="imageUrl()"
                (imageUploaded)="onVenueImageUploaded($event)"
                (imageRemoved)="imageUrl.set('')"
              />

              <!-- Venue Name -->
              <div class="flex flex-col gap-1.5">
                <label
                  for="v-name"
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                  >Venue Name <span class="text-rose-400">*</span></label
                >
                <input
                  id="v-name"
                  type="text"
                  placeholder="Enter venue name"
                  class="bg-slate-800 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  [ngModel]="name()"
                  (ngModelChange)="name.set($event)"
                  name="vName"
                  required
                />
              </div>

              <!-- Venue Location -->
              <div class="flex flex-col gap-1.5">
                <label
                  for="v-location"
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                  >Location / Address</label
                >
                <input
                  id="v-location"
                  type="text"
                  placeholder="e.g. Court A, Main Campus Stadium"
                  class="bg-slate-800 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  [ngModel]="location()"
                  (ngModelChange)="location.set($event)"
                  name="vLocation"
                />

                <!-- Interactive Map Search & Container -->
                <div class="flex flex-col gap-2 mt-2">
                  <div class="flex gap-2">
                    <input
                      type="text"
                      #mapSearchInput
                      placeholder="Search address or city..."
                      class="flex-1 bg-slate-800 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                      (keyup.enter)="searchMapLocation(mapSearchInput.value)"
                    />
                    <button
                      type="button"
                      (click)="searchMapLocation(mapSearchInput.value)"
                      class="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Search Map
                    </button>
                  </div>
                  <div
                    id="venue-map"
                    class="h-48 rounded-xl border border-white/10 overflow-hidden bg-slate-950 relative z-10"
                    style="min-height: 192px;"
                  ></div>
                  <p class="text-[10px] text-slate-500 italic">
                    Drag the marker or click anywhere on the map to pin the exact venue location.
                  </p>
                </div>
              </div>

              <!-- Venue Capacity -->
              <div class="flex flex-col gap-1.5">
                <label
                  for="v-capacity"
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                  >Seating/Spectator Capacity</label
                >
                <input
                  id="v-capacity"
                  type="number"
                  placeholder="e.g. 500"
                  class="bg-slate-800 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  [ngModel]="capacity()"
                  (ngModelChange)="capacity.set($event)"
                  name="vCapacity"
                />
              </div>

              <!-- Action buttons -->
              <div class="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="isSaving() || !name().trim()"
                  class="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  @if (isSaving()) {
                    <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      ></path>
                    </svg>
                    Saving...
                  } @else {
                    {{ venue() ? 'Save Changes' : 'Register Venue' }}
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `,
})
export class VenueModalComponent implements OnDestroy {
  isOpen = input<boolean>(false);
  venue = input<Venue | null>(null);
  workspaceId = input<string>('');

  close = output<void>();
  save = output<Venue>();

  private venueService = inject(VenueService);
  private uiService = inject(UiService);

  name = signal('');
  location = signal('');
  capacity = signal<number | null>(null);
  imageUrl = signal('');

  isSaving = signal(false);
  saveSuccess = signal('');
  saveError = signal('');

  map: any = null;
  marker: any = null;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        const v = this.venue();
        if (v) {
          this.name.set(v.name);
          this.location.set(v.location ?? '');
          this.capacity.set(v.capacity);
          this.imageUrl.set(v.imageUrl ?? '');
        } else {
          this.name.set('');
          this.location.set('');
          this.capacity.set(null);
          this.imageUrl.set('');
        }
        this.saveSuccess.set('');
        this.saveError.set('');

        // Initialize Map
        setTimeout(() => {
          if (v) {
            const coordsMatch = v.location?.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
            if (coordsMatch) {
              this.initMap(parseFloat(coordsMatch[1]), parseFloat(coordsMatch[2]));
            } else if (v.location) {
              this.geocodeAndCenterMap(v.location);
            } else {
              this.initMap();
            }
          } else {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => this.initMap(pos.coords.latitude, pos.coords.longitude),
                () => this.initMap(),
              );
            } else {
              this.initMap();
            }
          }
        }, 150);
      } else {
        this.destroyMap();
      }
    });
  }

  ngOnDestroy() {
    this.destroyMap();
  }

  closeModal() {
    this.destroyMap();
    this.close.emit();
  }

  destroyMap() {
    if (this.map) {
      try {
        this.map.remove();
      } catch (e) {
        console.error(e);
      }
      this.map = null;
      this.marker = null;
    }
  }

  initMap(latitude?: number, longitude?: number) {
    this.destroyMap();

    const lat = latitude ?? 51.505;
    const lng = longitude ?? -0.09;
    const zoom = latitude && longitude ? 15 : 13;

    const mapEl = document.getElementById('venue-map');
    if (!mapEl) {
      return;
    }

    try {
      this.map = L.map('venue-map').setView([lat, lng], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map);

      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      this.marker = L.marker([lat, lng], { draggable: true, icon: DefaultIcon }).addTo(this.map);

      const updateCoords = (newLat: number, newLng: number) => {
        this.reverseGeocode(newLat, newLng);
      };

      this.marker.on('dragend', (event: any) => {
        const markerPos = event.target.getLatLng();
        updateCoords(markerPos.lat, markerPos.lng);
      });

      this.map.on('click', (event: any) => {
        const clickedPos = event.latlng;
        this.marker.setLatLng(clickedPos);
        updateCoords(clickedPos.lat, clickedPos.lng);
      });
    } catch (e) {
      console.error('Error initializing map:', e);
    }
  }

  reverseGeocode(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.display_name) {
          this.location.set(data.display_name);
        } else {
          this.location.set(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      })
      .catch((err) => {
        console.error('Reverse geocoding failed:', err);
        this.location.set(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      });
  }

  geocodeAndCenterMap(query: string) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then((res) => res.json())
      .then((results) => {
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          this.initMap(lat, lng);
        } else {
          this.initMap();
        }
      })
      .catch((err) => {
        console.error('Geocoding failed:', err);
        this.initMap();
      });
  }

  searchMapLocation(query: string) {
    if (!query.trim()) return;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then((res) => res.json())
      .then((results) => {
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);

          if (this.map && this.marker) {
            this.map.setView([lat, lng], 15);
            this.marker.setLatLng([lat, lng]);
            this.location.set(results[0].display_name);
          } else {
            this.initMap(lat, lng);
          }
        } else {
          this.uiService.error('Location not found. Please try a different search.');
        }
      })
      .catch((err) => {
        console.error('Geocoding search failed:', err);
        this.uiService.error('Failed to search location.');
      });
  }

  onVenueImageUploaded(url: string) {
    this.imageUrl.set(url);
    this.uiService.success('Venue image uploaded successfully.');
  }

  onSubmit() {
    const nameVal = this.name().trim();
    const locVal = this.location().trim();
    const capVal = this.capacity();
    const imgVal = this.imageUrl().trim();
    const wsId = this.workspaceId();

    if (!wsId || !nameVal) return;

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    const payload = {
      name: nameVal,
      location: locVal || null,
      capacity: capVal !== null && capVal !== undefined ? capVal : null,
      imageUrl: imgVal || null,
    };

    const v = this.venue();
    const obs = v
      ? this.venueService.updateVenue(wsId, v.id, payload)
      : this.venueService.createVenue(wsId, payload);

    obs.subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.saveSuccess.set(v ? 'Venue updated successfully!' : 'Venue registered successfully!');
        this.save.emit(res);
        setTimeout(() => this.closeModal(), 1000);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveError.set(err.error?.message ?? 'Failed to save venue.');
      },
    });
  }
}
