import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  HostListener,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface GalleryImage {
  url: string;
  title?: string;
  sender?: string;
  timestamp?: string;
}

@Component({
  selector: 'app-image-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-viewer.html',
  styleUrls: ['./image-viewer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageViewerComponent {
  @Input({ required: true }) images: GalleryImage[] = [];
  @Input() set initialIndex(val: number) {
    if (val >= 0 && val < (this.images?.length || 1)) {
      this.currentIndex.set(val);
      this.resetTransform();
    }
  }

  @Output() close = new EventEmitter<void>();
  @Output() indexChange = new EventEmitter<number>();

  @ViewChild('viewerContainerRef') viewerContainerRef!: ElementRef<HTMLDivElement>;

  currentIndex = signal<number>(0);
  zoomLevel = signal<number>(1.0);
  rotationAngle = signal<number>(0);
  isFullscreen = signal<boolean>(false);

  currentImage = computed(() => {
    if (!this.images || this.images.length === 0) return null;
    const idx = Math.min(Math.max(0, this.currentIndex()), this.images.length - 1);
    return this.images[idx];
  });

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.onClose();
    } else if (event.key === 'ArrowLeft') {
      this.prevImage();
    } else if (event.key === 'ArrowRight') {
      this.nextImage();
    } else if (event.key === '+' || event.key === '=') {
      this.zoomIn();
    } else if (event.key === '-') {
      this.zoomOut();
    } else if (event.key === 'r' || event.key === 'R') {
      this.rotateClockwise();
    }
  }

  onClose() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    this.close.emit();
  }

  prevImage() {
    if (!this.images || this.images.length <= 1) return;
    const newIdx = (this.currentIndex() - 1 + this.images.length) % this.images.length;
    this.currentIndex.set(newIdx);
    this.indexChange.emit(newIdx);
    this.resetTransform();
  }

  nextImage() {
    if (!this.images || this.images.length <= 1) return;
    const newIdx = (this.currentIndex() + 1) % this.images.length;
    this.currentIndex.set(newIdx);
    this.indexChange.emit(newIdx);
    this.resetTransform();
  }

  selectImage(index: number) {
    if (index >= 0 && index < this.images.length) {
      this.currentIndex.set(index);
      this.indexChange.emit(index);
      this.resetTransform();
    }
  }

  zoomIn() {
    this.zoomLevel.update((z) => Math.min(4.0, z + 0.25));
  }

  zoomOut() {
    this.zoomLevel.update((z) => Math.max(0.25, z - 0.25));
  }

  resetTransform() {
    this.zoomLevel.set(1.0);
    this.rotationAngle.set(0);
  }

  rotateClockwise() {
    this.rotationAngle.update((a) => (a + 90) % 360);
  }

  rotateCounterClockwise() {
    this.rotationAngle.update((a) => (a - 90 + 360) % 360);
  }

  toggleFullscreen() {
    const el = this.viewerContainerRef?.nativeElement;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen()
        .then(() => this.isFullscreen.set(true))
        .catch((err) => console.error('Fullscreen request error', err));
    } else {
      document
        .exitFullscreen()
        .then(() => this.isFullscreen.set(false))
        .catch((err) => console.error('Exit fullscreen error', err));
    }
  }

  downloadImage() {
    const img = this.currentImage();
    if (!img || !img.url) return;

    const link = document.createElement('a');
    link.href = img.url;
    link.target = '_blank';
    link.download = img.title || `image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
