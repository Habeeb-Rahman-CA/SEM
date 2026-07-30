import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CapacitorService, PhotoSource } from '../../../core/services/capacitor.service';
import { WorkspaceService } from '../../../features/workspaces/services/workspace.service';
import { UiService } from '../../../core/services/ui.service';

export type PhotoUploadType = 'workspace' | 'team' | 'user' | 'event' | 'venue';
export type PhotoShape = 'avatar' | 'thumb' | 'banner';

/**
 * PhotoCaptureComponent
 *
 * Reusable image picker that works both in-browser and on native (Capacitor).
 * On tap it shows a small popover with "Take Photo" (rear camera) and "From
 * Gallery" (photo library / file picker). Chosen image is uploaded via
 * WorkspaceService.uploadImage and the resulting CDN URL is emitted back to
 * the parent so it can persist alongside its own entity.
 *
 * Usage:
 *   <app-photo-capture
 *     label="Profile Photo"
 *     uploadType="user"
 *     shape="avatar"
 *     [imageUrl]="avatarUrl()"
 *     (imageUploaded)="onAvatarUploaded($event)"
 *     (imageRemoved)="onAvatarRemoved()"
 *   />
 */
@Component({
  selector: 'app-photo-capture',
  standalone: true,
  imports: [],
  template: `
    <div class="flex flex-col gap-1.5 text-left">
      @if (label()) {
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {{ label() }}
          @if (hint()) {
            <span class="text-slate-600 font-normal normal-case ml-1">({{ hint() }})</span>
          }
        </label>
      }
      <div class="flex items-start gap-3">
        <!-- Preview -->
        @if (!hidePreview()) {
          <div
            [class]="previewClass()"
            class="bg-slate-950 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 relative"
          >
            @if (isUploading()) {
              <div class="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                <svg class="animate-spin h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24">
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
              </div>
            } @else if (imageUrl()) {
              <img
                [src]="imageUrl()"
                [alt]="label() || 'Photo'"
                class="w-full h-full object-cover"
              />
            } @else {
              <i [class]="'fi ' + placeholderIcon() + ' text-slate-500'"></i>
            }
          </div>
        }

        <!-- Action buttons -->
        <div class="relative flex items-center gap-2 flex-wrap">
          <button
            type="button"
            (click)="toggleMenu()"
            [disabled]="isUploading() || disabled()"
            class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <i class="fi fi-rr-camera text-xs"></i>
            {{ imageUrl() ? 'Change' : buttonLabel() }}
          </button>

          @if (imageUrl() && !isUploading()) {
            <button
              type="button"
              (click)="onRemove()"
              class="text-xs text-rose-400 hover:text-rose-300 font-bold transition cursor-pointer"
            >
              Remove
            </button>
          }

          @if (isMenuOpen()) {
            <div
              class="absolute top-full left-0 mt-2 min-w-[180px] bg-slate-900 border border-white/10 rounded-xl shadow-xl z-40 overflow-hidden"
            >
              <button
                type="button"
                (click)="pick('camera')"
                class="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-200 hover:bg-white/5 transition text-left cursor-pointer"
              >
                <i class="fi fi-rr-camera text-violet-400"></i> Take Photo
              </button>
              <button
                type="button"
                (click)="pick('gallery')"
                class="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-200 hover:bg-white/5 transition text-left border-t border-white/5 cursor-pointer"
              >
                <i class="fi fi-rr-picture text-violet-400"></i> From Gallery
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class PhotoCaptureComponent {
  private capacitor = inject(CapacitorService);
  private workspaceService = inject(WorkspaceService);
  private ui = inject(UiService);

  // Inputs
  label = input<string | null>(null);
  hint = input<string | null>(null);
  imageUrl = input<string | null>(null);
  uploadType = input<PhotoUploadType>('workspace');
  shape = input<PhotoShape>('avatar');
  disabled = input<boolean>(false);
  buttonLabel = input<string>('Upload Photo');
  /** Hide the built-in preview thumbnail (useful when the parent already renders one). */
  hidePreview = input<boolean>(false);

  // Outputs — parent persists whatever fields it needs
  imageUploaded = output<string>();
  imageRemoved = output<void>();
  captureError = output<string>();

  isUploading = signal(false);
  isMenuOpen = signal(false);

  previewClass = computed(() => {
    switch (this.shape()) {
      case 'banner':
        return 'w-24 h-14 rounded-lg';
      case 'thumb':
        return 'w-14 h-14 rounded-xl';
      case 'avatar':
      default:
        return 'w-12 h-12 rounded-xl';
    }
  });

  placeholderIcon = computed(() => {
    switch (this.uploadType()) {
      case 'user':
        return 'fi-rr-user';
      case 'venue':
        return 'fi-rr-marker';
      case 'event':
        return 'fi-rr-trophy';
      case 'team':
        return 'fi-rr-shield';
      default:
        return 'fi-rr-picture';
    }
  });

  toggleMenu() {
    if (this.isUploading() || this.disabled()) return;
    this.isMenuOpen.update((v) => !v);
  }

  async pick(source: PhotoSource) {
    this.isMenuOpen.set(false);
    const captured = await this.capacitor.capturePhoto(source);
    if (!captured) return; // user cancelled

    this.isUploading.set(true);
    this.workspaceService.uploadImage(captured.file, this.uploadType()).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        this.imageUploaded.emit(res.url);
      },
      error: (err) => {
        this.isUploading.set(false);
        const msg = err?.error?.message || 'Failed to upload image.';
        this.captureError.emit(msg);
        this.ui.error(msg);
      },
    });
  }

  onRemove() {
    if (this.disabled() || this.isUploading()) return;
    this.imageRemoved.emit();
  }
}
