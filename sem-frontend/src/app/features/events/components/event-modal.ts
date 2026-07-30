import { Component, inject, signal, effect, model, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Workspace, Team, WorkspaceEvent } from '../../workspaces/services/workspace.service';
import { EventService } from '../services/event.service';
import { UiService } from '../../../core/services/ui.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar';
import { PhotoCaptureComponent } from '../../../shared/components/photo-capture/photo-capture';
import { GalleryManagerComponent } from '../../gallery/components/gallery-manager';

@Component({
  selector: 'app-event-modal',
  standalone: true,
  imports: [
    FormsModule,
    AvatarComponent,
    DatePipe,
    PhotoCaptureComponent,
    GalleryManagerComponent,
    RouterLink,
  ],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        (click)="isOpen.set(false)"
      >
        <div
          class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
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
                @if (editingEvent()) {
                  <span>Edit Event:</span>
                  <span class="text-violet-400">{{ editingEvent()?.name }}</span>
                } @else {
                  <span>Create New Event</span>
                }
              </h3>
              <p class="text-xs text-slate-400 mt-1">
                @if (editingEvent()) {
                  Update the event details and configuration.
                } @else {
                  Add a new event to this workspace.
                }
              </p>
            </div>
            <button
              (click)="isOpen.set(false)"
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

          <!-- Tabs Navigation -->
          <div
            class="px-6 border-b border-white/5 flex gap-4 text-xs font-bold text-slate-400 bg-slate-900/50"
          >
            <button
              type="button"
              (click)="activeTab.set('general')"
              class="py-3 px-1 border-b-2 transition-all cursor-pointer outline-none"
              [class.border-violet-500]="activeTab() === 'general'"
              [class.text-white]="activeTab() === 'general'"
              [class.border-transparent]="activeTab() !== 'general'"
            >
              General Info & Teams
            </button>
            <button
              type="button"
              (click)="activeTab.set('public')"
              class="py-3 px-1 border-b-2 transition-all cursor-pointer outline-none"
              [class.border-violet-500]="activeTab() === 'public'"
              [class.text-white]="activeTab() === 'public'"
              [class.border-transparent]="activeTab() !== 'public'"
            >
              Public Page & Gallery
            </button>
            <button
              type="button"
              (click)="activeTab.set('announcements')"
              class="py-3 px-1 border-b-2 transition-all cursor-pointer outline-none"
              [class.border-violet-500]="activeTab() === 'announcements'"
              [class.text-white]="activeTab() === 'announcements'"
              [class.border-transparent]="activeTab() !== 'announcements'"
            >
              Announcements
            </button>
            <button
              type="button"
              (click)="activeTab.set('sponsors')"
              class="py-3 px-1 border-b-2 transition-all cursor-pointer outline-none"
              [class.border-violet-500]="activeTab() === 'sponsors'"
              [class.text-white]="activeTab() === 'sponsors'"
              [class.border-transparent]="activeTab() !== 'sponsors'"
            >
              Sponsors
            </button>
            @if (editingEvent()) {
              <button
                type="button"
                (click)="activeTab.set('photos')"
                class="py-3 px-1 border-b-2 transition-all cursor-pointer outline-none"
                [class.border-violet-500]="activeTab() === 'photos'"
                [class.text-white]="activeTab() === 'photos'"
                [class.border-transparent]="activeTab() !== 'photos'"
              >
                Photos
              </button>
            }
          </div>

          <!-- Form Content -->
          <div class="p-6 overflow-y-auto flex-1">
            @if (success()) {
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
                {{ success() }}
              </div>
            }
            @if (error()) {
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
                {{ error() }}
              </div>
            }

            <form (submit)="onSubmit(); $event.preventDefault()" class="flex flex-col gap-6">
              <!-- Tab 1: General Info & Teams -->
              @if (activeTab() === 'general') {
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <!-- Left Column: Event Details -->
                  <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1.5 text-left">
                      <label
                        for="modal-e-name"
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                        >Event Name <span class="text-rose-400">*</span></label
                      >
                      <input
                        id="modal-e-name"
                        type="text"
                        placeholder="e.g. Annual Sports Meet 2028"
                        autocomplete="off"
                        class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
                        [ngModel]="name()"
                        (ngModelChange)="name.set($event)"
                        name="eName"
                        required
                      />
                    </div>

                    <app-photo-capture
                      label="Event Logo / Banner"
                      uploadType="event"
                      shape="thumb"
                      buttonLabel="Upload Logo"
                      [imageUrl]="logoUrl()"
                      (imageUploaded)="onEventLogoUploaded($event)"
                      (imageRemoved)="logoUrl.set('')"
                    />

                    <div class="flex flex-col gap-1.5 text-left">
                      <label
                        for="modal-e-desc"
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                        >Description</label
                      >
                      <textarea
                        id="modal-e-desc"
                        placeholder="Details about this sports festival..."
                        rows="3"
                        class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all w-full resize-none"
                        [ngModel]="description()"
                        (ngModelChange)="description.set($event)"
                        name="eDesc"
                      ></textarea>
                    </div>

                    <div class="flex flex-col gap-1.5 text-left">
                      <label
                        for="modal-e-start"
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                        >Start Date & Time</label
                      >
                      <input
                        id="modal-e-start"
                        type="datetime-local"
                        (click)="showDatePicker($event)"
                        class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all w-full"
                        [ngModel]="startDate()"
                        (ngModelChange)="startDate.set($event)"
                        name="eStartDate"
                      />
                    </div>

                    <div class="flex flex-col gap-1.5 text-left">
                      <label
                        for="modal-e-end"
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                        >End Date & Time</label
                      >
                      <input
                        id="modal-e-end"
                        type="datetime-local"
                        (click)="showDatePicker($event)"
                        class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all w-full"
                        [ngModel]="endDate()"
                        (ngModelChange)="endDate.set($event)"
                        name="eEndDate"
                      />
                    </div>

                    <div class="flex flex-col gap-1.5 text-left">
                      <label
                        for="modal-e-status"
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                        >Status</label
                      >
                      <select
                        id="modal-e-status"
                        class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all w-full"
                        [ngModel]="status()"
                        (ngModelChange)="status.set($event)"
                        name="eStatus"
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <!-- Right Column: Select Teams (Grid) -->
                  <div
                    class="flex flex-col gap-3 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 h-full"
                  >
                    <div class="flex items-center justify-between">
                      <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                        >Participating Teams</label
                      >
                      <span class="text-[10px] text-violet-400 font-bold"
                        >{{ selectedTeamIds().length }} selected</span
                      >
                    </div>

                    @if (teams().length === 0) {
                      <div
                        class="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500"
                      >
                        No teams found in this workspace. Please create teams first.
                      </div>
                    } @else {
                      <div
                        class="grid grid-cols-1 gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar"
                      >
                        @for (team of teams(); track team.id) {
                          <div
                            (click)="toggleEventTeam(team.id)"
                            [class]="
                              selectedTeamIds().includes(team.id)
                                ? 'border-violet-500/40 bg-violet-500/5'
                                : 'border-white/5 bg-slate-950/40'
                            "
                            class="border hover:border-violet-500/30 rounded-xl px-3 py-2 flex items-center justify-between gap-3 cursor-pointer transition-all select-none"
                          >
                            <div class="flex items-center gap-2">
                              <app-avatar
                                [name]="team.name"
                                [logoUrl]="team.logoUrl"
                                customClass="w-6 h-6 rounded-lg flex-shrink-0"
                                textClass="text-[8px] font-extrabold text-white"
                              />
                              <span
                                class="text-xs font-semibold text-white truncate max-w-[150px]"
                                >{{ team.name }}</span
                              >
                            </div>
                            <div
                              class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                              [class]="
                                selectedTeamIds().includes(team.id)
                                  ? 'bg-violet-600 border-violet-600 text-white'
                                  : 'border-white/20 bg-slate-950'
                              "
                            >
                              @if (selectedTeamIds().includes(team.id)) {
                                <i class="fi fi-rr-check text-[8px]"></i>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Tab 2: Public Page Settings & Gallery -->
              @if (activeTab() === 'public') {
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <!-- Left Column: Settings -->
                  <div class="flex flex-col gap-4">
                    <div
                      class="flex items-center justify-between p-3.5 bg-slate-950/60 border border-white/10 rounded-xl"
                    >
                      <div class="flex flex-col gap-0.5 text-left">
                        <span class="text-xs font-bold text-white">Public Visibility</span>
                        <span class="text-[10px] text-slate-400"
                          >Allow anyone to view this event without logging in</span
                        >
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          class="sr-only peer"
                          [checked]="isPublic()"
                          (change)="isPublic.set(!isPublic())"
                        />
                        <div
                          class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600 peer-checked:after:bg-white"
                        ></div>
                      </label>
                    </div>

                    <div class="flex flex-col gap-1.5 text-left">
                      <label
                        for="modal-e-reg"
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                        >Registration Status</label
                      >
                      <select
                        id="modal-e-reg"
                        class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all w-full"
                        [ngModel]="registrationStatus()"
                        (ngModelChange)="registrationStatus.set($event)"
                        name="eRegStatus"
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="not_started">Not Started</option>
                      </select>
                    </div>

                    <div class="flex flex-col gap-1.5 text-left">
                      <label
                        for="modal-e-venue"
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                        >Public Venue Details</label
                      >
                      <input
                        id="modal-e-venue"
                        type="text"
                        placeholder="e.g. National Stadium / Court A"
                        autocomplete="off"
                        class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
                        [ngModel]="venue()"
                        (ngModelChange)="venue.set($event)"
                        name="eVenue"
                      />
                    </div>

                    <div class="flex flex-col gap-1.5 text-left">
                      <label
                        for="modal-e-sport"
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                        >Public Sport Label</label
                      >
                      <input
                        id="modal-e-sport"
                        type="text"
                        placeholder="e.g. Football / Multiple Sports"
                        autocomplete="off"
                        class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
                        [ngModel]="sport()"
                        (ngModelChange)="sport.set($event)"
                        name="eSport"
                      />
                    </div>

                    <div class="flex flex-col gap-1.5 text-left">
                      <label
                        for="modal-e-organizers"
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                        >Organizers</label
                      >
                      <input
                        id="modal-e-organizers"
                        type="text"
                        placeholder="e.g. Sports Association of City"
                        autocomplete="off"
                        class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
                        [ngModel]="organizers()"
                        (ngModelChange)="organizers.set($event)"
                        name="eOrganizers"
                      />
                    </div>
                  </div>

                  <!-- Right Column: Gallery -->
                  <div
                    class="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 h-full text-left"
                  >
                    <div class="flex flex-col gap-1">
                      <span class="text-xs font-bold text-white">Event Gallery</span>
                      <span class="text-[10px] text-slate-400"
                        >Add image URLs or upload files to display in the public event gallery</span
                      >
                    </div>

                    <div class="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Paste image URL..."
                        class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all flex-1"
                        [ngModel]="newGalleryUrl()"
                        (ngModelChange)="newGalleryUrl.set($event)"
                        name="eNewGalleryUrl"
                      />
                      <button
                        type="button"
                        (click)="addGalleryUrl()"
                        [disabled]="!newGalleryUrl().trim()"
                        class="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex-shrink-0"
                      >
                        Add URL
                      </button>
                    </div>

                    <!-- Camera/Gallery capture pushes into the gallery list on upload -->
                    <app-photo-capture
                      label="Attach from Camera or Device"
                      hint="captured images go into the gallery"
                      uploadType="event"
                      shape="thumb"
                      buttonLabel="Capture Image"
                      [imageUrl]="null"
                      (imageUploaded)="onGalleryImageUploaded($event)"
                    />

                    <!-- Gallery Preview Grid -->
                    <div
                      class="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar"
                    >
                      @for (url of gallery(); track url) {
                        <div
                          class="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-slate-950 group"
                        >
                          <img [src]="url" alt="Gallery item" class="w-full h-full object-cover" />
                          <div
                            class="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                          >
                            <button
                              type="button"
                              (click)="removeGalleryUrl(url)"
                              class="p-1 bg-rose-600 hover:bg-rose-500 rounded-full text-white cursor-pointer transition"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="w-3.5 h-3.5"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path
                                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      } @empty {
                        <div
                          class="col-span-3 py-8 rounded-xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center text-xs text-slate-500"
                        >
                          <i class="fi fi-rr-picture text-lg mb-1"></i>
                          No gallery images added yet.
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }

              <!-- Tab 3: Announcements -->
              @if (activeTab() === 'announcements') {
                <div class="flex flex-col gap-4 text-left">
                  <div class="flex flex-col gap-1">
                    <span class="text-xs font-bold text-white">Event Announcements</span>
                    <span class="text-[10px] text-slate-400"
                      >Publish news updates, schedules, and important notifications directly to the
                      public page</span
                    >
                  </div>

                  <!-- Add Announcement -->
                  <div
                    class="p-4 bg-slate-950/40 border border-white/5 rounded-xl flex flex-col gap-3"
                  >
                    <span class="text-[10px] font-bold text-violet-400 uppercase tracking-wider"
                      >New Announcement</span
                    >
                    <div class="flex flex-col gap-1.5">
                      <input
                        type="text"
                        placeholder="Title (e.g. Schedule Updates)"
                        class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
                        [ngModel]="newAnnTitle()"
                        (ngModelChange)="newAnnTitle.set($event)"
                        name="eNewAnnTitle"
                      />
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <textarea
                        placeholder="Announcement content..."
                        rows="2"
                        class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all w-full resize-none"
                        [ngModel]="newAnnContent()"
                        (ngModelChange)="newAnnContent.set($event)"
                        name="eNewAnnContent"
                      ></textarea>
                    </div>
                    <button
                      type="button"
                      (click)="addAnnouncement()"
                      [disabled]="!newAnnTitle().trim() || !newAnnContent().trim()"
                      class="self-end px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Publish Announcement
                    </button>
                  </div>

                  <!-- Announcements List -->
                  <div
                    class="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar"
                  >
                    @for (ann of announcements(); track ann.id) {
                      <div
                        class="p-3 bg-slate-950/20 border border-white/5 rounded-xl flex justify-between gap-4"
                      >
                        <div class="flex-1 flex flex-col gap-1">
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-white">{{ ann.title }}</span>
                            <span class="text-[9px] text-slate-500">{{
                              ann.createdAt | date: 'medium'
                            }}</span>
                          </div>
                          <p class="text-[11px] text-slate-300 whitespace-pre-line">
                            {{ ann.content }}
                          </p>
                        </div>
                        <button
                          type="button"
                          (click)="removeAnnouncement(ann.id)"
                          class="text-slate-500 hover:text-rose-450 self-start transition cursor-pointer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path
                              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                            />
                          </svg>
                        </button>
                      </div>
                    } @empty {
                      <div
                        class="py-8 rounded-xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center text-xs text-slate-500"
                      >
                        <i class="fi fi-rr-bullhorn text-lg mb-1"></i>
                        No announcements published yet.
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Tab 4: Sponsors -->
              @if (activeTab() === 'sponsors') {
                <div class="flex flex-col gap-4 text-left">
                  <div class="flex flex-col gap-1">
                    <span class="text-xs font-bold text-white">Event Sponsors & Partners</span>
                    <span class="text-[10px] text-slate-400"
                      >Showcase the brands and organizations supporting your event. Sponsors appear
                      on the public event page.</span
                    >
                  </div>

                  @if (editingEvent()) {
                    <a
                      [routerLink]="['/workspaces', workspace()?.id, 'sponsors']"
                      class="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 flex items-center gap-3 hover:border-violet-500/40 hover:bg-violet-500/10 transition group"
                    >
                      <i class="fi fi-rr-star text-violet-300 text-base"></i>
                      <div class="flex-1 min-w-0 text-[11px]">
                        <div class="font-bold text-violet-200">Workspace sponsor catalog</div>
                        <div class="text-slate-400 mt-0.5">
                          Register sponsors once at the workspace level and reuse them across every
                          event, with per-event tier overrides and visibility windows.
                        </div>
                      </div>
                      <i
                        class="fi fi-rr-arrow-small-right text-violet-300 group-hover:translate-x-0.5 transition"
                      ></i>
                    </a>
                  }

                  <!-- Add Sponsor -->
                  <div
                    class="p-4 bg-slate-950/40 border border-white/5 rounded-xl flex flex-col gap-3"
                  >
                    <span class="text-[10px] font-bold text-violet-400 uppercase tracking-wider"
                      >New Sponsor</span
                    >

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div class="flex flex-col gap-1.5">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                          >Sponsor Name <span class="text-rose-400">*</span></label
                        >
                        <input
                          type="text"
                          placeholder="e.g. Acme Corp"
                          class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
                          [ngModel]="newSponsorName()"
                          (ngModelChange)="newSponsorName.set($event)"
                          name="eNewSpName"
                        />
                      </div>
                      <div class="flex flex-col gap-1.5">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                          >Tier / Label</label
                        >
                        <select
                          class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2 text-xs text-white outline-none transition-all w-full"
                          [ngModel]="newSponsorTier()"
                          (ngModelChange)="newSponsorTier.set($event)"
                          name="eNewSpTier"
                        >
                          <option value="">— None —</option>
                          <option value="Title">Title Sponsor</option>
                          <option value="Platinum">Platinum</option>
                          <option value="Gold">Gold</option>
                          <option value="Silver">Silver</option>
                          <option value="Bronze">Bronze</option>
                          <option value="Partner">Partner</option>
                        </select>
                      </div>
                      <div class="flex flex-col gap-1.5 md:col-span-2">
                        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                          >Website URL</label
                        >
                        <input
                          type="url"
                          placeholder="https://example.com"
                          class="bg-slate-950 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all w-full"
                          [ngModel]="newSponsorUrl()"
                          (ngModelChange)="newSponsorUrl.set($event)"
                          name="eNewSpUrl"
                        />
                      </div>
                    </div>

                    <app-photo-capture
                      label="Sponsor Logo"
                      hint="upload or paste a URL"
                      uploadType="event"
                      shape="thumb"
                      buttonLabel="Upload Logo"
                      [imageUrl]="newSponsorLogoUrl()"
                      (imageUploaded)="newSponsorLogoUrl.set($event)"
                      (imageRemoved)="newSponsorLogoUrl.set('')"
                    />

                    <button
                      type="button"
                      (click)="addSponsor()"
                      [disabled]="!newSponsorName().trim()"
                      class="self-end px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Add Sponsor
                    </button>
                  </div>

                  <!-- Sponsors List -->
                  <div
                    class="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar"
                  >
                    @for (sp of sponsors(); track sp.id) {
                      <div
                        class="p-3 bg-slate-950/20 border border-white/5 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                          <app-avatar
                            [name]="sp.name"
                            [logoUrl]="sp.logoUrl ?? undefined"
                            customClass="w-9 h-9 rounded-lg flex-shrink-0"
                            textClass="text-[10px] font-extrabold text-white"
                          />
                          <div class="flex flex-col gap-0.5 min-w-0">
                            <div class="flex items-center gap-2">
                              <span class="text-xs font-bold text-white truncate">{{
                                sp.name
                              }}</span>
                              @if (sp.tier) {
                                <span
                                  class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/25"
                                  >{{ sp.tier }}</span
                                >
                              }
                            </div>
                            @if (sp.url) {
                              <a
                                [href]="sp.url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-[10px] text-slate-400 hover:text-violet-300 truncate"
                                >{{ sp.url }}</a
                              >
                            }
                          </div>
                        </div>
                        <button
                          type="button"
                          (click)="removeSponsor(sp.id)"
                          class="text-slate-500 hover:text-rose-400 transition cursor-pointer flex-shrink-0"
                          aria-label="Remove sponsor"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path
                              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                            />
                          </svg>
                        </button>
                      </div>
                    } @empty {
                      <div
                        class="py-8 rounded-xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center text-xs text-slate-500"
                      >
                        <i class="fi fi-rr-star text-lg mb-1"></i>
                        No sponsors added yet.
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Tab 5: Organized Photos -->
              @if (activeTab() === 'photos' && editingEvent(); as evt) {
                <div class="flex flex-col gap-4 text-left">
                  <div class="flex flex-col gap-1">
                    <span class="text-xs font-bold text-white">Organized event photos</span>
                    <span class="text-[10px] text-slate-400">
                      Upload photos from the event and tag them by competition so spectators can
                      filter what they see on the public page.
                    </span>
                  </div>

                  <app-gallery-manager
                    [workspaceId]="workspace()!.id"
                    [eventId]="evt.id"
                    [competitions]="evt.competitions ?? []"
                    [matches]="[]"
                  />
                </div>
              }

              <!-- Full Width Action Buttons -->
              <div class="md:col-span-2 pt-2 flex gap-2">
                <button
                  type="button"
                  (click)="isOpen.set(false)"
                  class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white hover:text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="isSaving() || !name()"
                  class="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  @if (isSaving()) {
                    <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
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
                    Save
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
export class EventModalComponent {
  private eventService = inject(EventService);
  private uiService = inject(UiService);

  workspace = input.required<Workspace | null>();
  teams = input<Team[]>([]);
  editingEvent = input<WorkspaceEvent | null>(null);

  isOpen = model<boolean>(false);
  eventSaved = output<WorkspaceEvent>();

  // Tabs
  activeTab = signal<'general' | 'public' | 'announcements' | 'sponsors' | 'photos'>('general');

  // Local Form Signals
  name = signal('');
  description = signal('');
  startDate = signal('');
  endDate = signal('');
  status = signal('upcoming');
  logoUrl = signal('');
  selectedTeamIds = signal<string[]>([]);

  // Public Event Signals
  isPublic = signal(false);
  gallery = signal<string[]>([]);
  announcements = signal<Array<{ id: string; title: string; content: string; createdAt: string }>>(
    [],
  );
  sponsors = signal<
    Array<{
      id: string;
      name: string;
      logoUrl?: string | null;
      url?: string | null;
      tier?: string | null;
    }>
  >([]);
  registrationStatus = signal('open');
  venue = signal('');
  sport = signal('');
  organizers = signal('');

  newGalleryUrl = signal('');
  newAnnTitle = signal('');
  newAnnContent = signal('');
  newSponsorName = signal('');
  newSponsorUrl = signal('');
  newSponsorTier = signal('');
  newSponsorLogoUrl = signal('');

  isSaving = signal(false);
  error = signal('');
  success = signal('');

  constructor() {
    effect(
      () => {
        const open = this.isOpen();
        const event = this.editingEvent();
        if (open) {
          this.activeTab.set('general');
          if (event) {
            this.name.set(event.name);
            this.description.set(event.description ?? '');
            this.startDate.set(this.formatToLocalDatetime(event.startDate));
            this.endDate.set(this.formatToLocalDatetime(event.endDate));
            this.status.set(event.status);
            this.logoUrl.set(event.logoUrl ?? '');
            this.selectedTeamIds.set(event.teams?.map((t) => t.id) || []);
            this.isPublic.set(event.isPublic ?? false);
            this.gallery.set(event.gallery || []);
            this.announcements.set(event.announcements || []);
            this.sponsors.set(event.sponsors || []);
            this.registrationStatus.set(event.registrationStatus ?? 'open');
            this.venue.set(event.venue ?? '');
            this.sport.set(event.sport ?? '');
            this.organizers.set(event.organizers ?? '');
          } else {
            this.name.set('');
            this.description.set('');
            this.startDate.set('');
            this.endDate.set('');
            this.status.set('upcoming');
            this.logoUrl.set('');
            this.selectedTeamIds.set([]);
            this.isPublic.set(false);
            this.gallery.set([]);
            this.announcements.set([]);
            this.sponsors.set([]);
            this.registrationStatus.set('open');
            this.venue.set('');
            this.sport.set('');
            this.organizers.set('');
          }
          this.newGalleryUrl.set('');
          this.newAnnTitle.set('');
          this.newAnnContent.set('');
          this.newSponsorName.set('');
          this.newSponsorUrl.set('');
          this.newSponsorTier.set('');
          this.newSponsorLogoUrl.set('');
          this.error.set('');
          this.success.set('');
        }
      },
      { allowSignalWrites: true },
    );
  }

  showDatePicker(event: any) {
    if (event.target && typeof event.target.showPicker === 'function') {
      try {
        event.target.showPicker();
      } catch (e) {
        console.warn('showPicker is not supported or blocked:', e);
      }
    }
  }

  toggleEventTeam(teamId: string) {
    this.selectedTeamIds.update((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  }

  addGalleryUrl() {
    const url = this.newGalleryUrl().trim();
    if (!url) return;
    this.gallery.update((prev) => [...prev, url]);
    this.newGalleryUrl.set('');
  }

  removeGalleryUrl(url: string) {
    this.gallery.update((prev) => prev.filter((u) => u !== url));
  }

  onGalleryImageUploaded(url: string) {
    this.gallery.update((prev) => [...prev, url]);
    this.uiService.success('Gallery image uploaded successfully.');
  }

  addAnnouncement() {
    const title = this.newAnnTitle().trim();
    const content = this.newAnnContent().trim();
    if (!title || !content) return;

    const newAnn = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: new Date().toISOString(),
    };
    this.announcements.update((prev) => [newAnn, ...prev]);
    this.newAnnTitle.set('');
    this.newAnnContent.set('');
    this.uiService.success('Announcement added.');
  }

  removeAnnouncement(id: string) {
    this.announcements.update((prev) => prev.filter((ann) => ann.id !== id));
    this.uiService.success('Announcement removed.');
  }

  addSponsor() {
    const name = this.newSponsorName().trim();
    if (!name) return;
    const sponsor = {
      id: crypto.randomUUID(),
      name,
      logoUrl: this.newSponsorLogoUrl().trim() || null,
      url: this.newSponsorUrl().trim() || null,
      tier: this.newSponsorTier().trim() || null,
    };
    this.sponsors.update((prev) => [...prev, sponsor]);
    this.newSponsorName.set('');
    this.newSponsorUrl.set('');
    this.newSponsorTier.set('');
    this.newSponsorLogoUrl.set('');
    this.uiService.success('Sponsor added.');
  }

  removeSponsor(id: string) {
    this.sponsors.update((prev) => prev.filter((sp) => sp.id !== id));
    this.uiService.success('Sponsor removed.');
  }

  private formatToLocalDatetime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().substring(0, 16);
  }

  onEventLogoUploaded(url: string) {
    this.logoUrl.set(url);
    this.uiService.success('Event logo uploaded successfully.');
  }

  onSubmit() {
    const ws = this.workspace();
    if (!ws || !this.name().trim()) return;

    this.isSaving.set(true);
    this.error.set('');
    this.success.set('');

    const payload = {
      name: this.name().trim(),
      description: this.description().trim() || undefined,
      startDate: this.startDate() ? new Date(this.startDate()).toISOString() : undefined,
      endDate: this.endDate() ? new Date(this.endDate()).toISOString() : undefined,
      status: this.status(),
      logoUrl: this.logoUrl() || undefined,
      teamIds: this.selectedTeamIds(),
      isPublic: this.isPublic(),
      gallery: this.gallery(),
      announcements: this.announcements(),
      sponsors: this.sponsors(),
      registrationStatus: this.registrationStatus(),
      venue: this.venue().trim() || undefined,
      sport: this.sport().trim() || undefined,
      organizers: this.organizers().trim() || undefined,
    };

    const event = this.editingEvent();
    const request$ = event
      ? this.eventService.updateEvent(ws.id, event.id, payload)
      : this.eventService.createEvent(ws.id, payload);

    request$.subscribe({
      next: (savedEvent) => {
        this.isSaving.set(false);
        this.success.set(
          event
            ? 'Event updated successfully!'
            : `Event "${savedEvent.name}" created successfully!`,
        );
        this.eventSaved.emit(savedEvent);
        setTimeout(() => this.isOpen.set(false), 1500);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.error.set(err.error?.message ?? 'Failed to save event.');
      },
    });
  }
}
