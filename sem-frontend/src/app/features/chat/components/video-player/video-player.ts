import {
  Component,
  OnInit,
  OnDestroy,
  input,
  output,
  signal,
  computed,
  ElementRef,
  ViewChild,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface VideoSource {
  url: string;
  title?: string;
  sender?: string;
  timestamp?: string;
}

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-player.html',
  styleUrls: ['./video-player.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  video = input.required<VideoSource>();
  close = output<void>();

  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('playerContainer') containerRef!: ElementRef<HTMLDivElement>;

  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  volume = signal<number>(1);
  isMuted = signal<boolean>(false);
  playbackRate = signal<number>(1);
  isFullscreen = signal<boolean>(false);
  isPipMode = signal<boolean>(false);
  showSpeedMenu = signal<boolean>(false);
  showControls = signal<boolean>(true);
  isPipSupported = signal<boolean>(false);

  speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  private controlsTimeout: any = null;

  formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));
  formattedDuration = computed(() => this.formatTime(this.duration()));
  progressPercentage = computed(() => {
    const dur = this.duration();
    if (!dur) return 0;
    return Math.min(100, Math.max(0, (this.currentTime() / dur) * 100));
  });

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.isPipSupported.set(
        'pictureInPictureEnabled' in document && document.pictureInPictureEnabled,
      );
    }
  }

  ngOnDestroy(): void {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'escape':
        event.preventDefault();
        this.closePlayer();
        break;
      case ' ':
      case 'k':
        event.preventDefault();
        this.togglePlay();
        break;
      case 'f':
        event.preventDefault();
        this.toggleFullscreen();
        break;
      case 'p':
        event.preventDefault();
        if (this.isPipSupported()) {
          this.togglePictureInPicture();
        }
        break;
      case 'm':
        event.preventDefault();
        this.toggleMute();
        break;
      case 'arrowleft':
        event.preventDefault();
        this.seekRelative(-5);
        break;
      case 'arrowright':
        event.preventDefault();
        this.seekRelative(5);
        break;
    }
  }

  onLoadedMetadata(): void {
    const v = this.videoRef.nativeElement;
    if (v) {
      this.duration.set(v.duration || 0);
      this.volume.set(v.volume);
      this.isMuted.set(v.muted);
      v.playbackRate = this.playbackRate();
    }
  }

  onTimeUpdate(): void {
    const v = this.videoRef.nativeElement;
    if (v) {
      this.currentTime.set(v.currentTime || 0);
    }
  }

  onEnded(): void {
    this.isPlaying.set(false);
  }

  togglePlay(): void {
    const v = this.videoRef.nativeElement;
    if (!v) return;

    if (v.paused) {
      v.play()
        .then(() => this.isPlaying.set(true))
        .catch((err) => console.error('Video play error:', err));
    } else {
      v.pause();
      this.isPlaying.set(false);
    }
  }

  seek(event: MouseEvent | TouchEvent): void {
    const v = this.videoRef.nativeElement;
    if (!v || !this.duration()) return;

    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
    const clickPosition = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    const newTime = clickPosition * this.duration();
    v.currentTime = newTime;
    this.currentTime.set(newTime);
  }

  seekRelative(seconds: number): void {
    const v = this.videoRef.nativeElement;
    if (!v) return;
    const target = Math.max(0, Math.min(this.duration(), v.currentTime + seconds));
    v.currentTime = target;
    this.currentTime.set(target);
  }

  setVolume(event: Event): void {
    const v = this.videoRef.nativeElement;
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    if (v) {
      v.volume = val;
      v.muted = val === 0;
      this.volume.set(val);
      this.isMuted.set(v.muted);
    }
  }

  toggleMute(): void {
    const v = this.videoRef.nativeElement;
    if (!v) return;
    v.muted = !v.muted;
    this.isMuted.set(v.muted);
  }

  setPlaybackRate(speed: number): void {
    const v = this.videoRef.nativeElement;
    if (v) {
      v.playbackRate = speed;
      this.playbackRate.set(speed);
      this.showSpeedMenu.set(false);
    }
  }

  async togglePictureInPicture(): Promise<void> {
    const v = this.videoRef.nativeElement;
    if (!v || !this.isPipSupported()) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        this.isPipMode.set(false);
      } else {
        await v.requestPictureInPicture();
        this.isPipMode.set(true);
      }
    } catch (err) {
      console.error('Picture-in-Picture error:', err);
    }
  }

  toggleFullscreen(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container
        .requestFullscreen()
        .then(() => this.isFullscreen.set(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => this.isFullscreen.set(false))
        .catch(() => {});
    }
  }

  downloadVideo(): void {
    const url = this.video().url;
    const title = this.video().title || 'video-stream.mp4';
    const link = document.createElement('a');
    link.href = url;
    link.download = title;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onMouseMove(): void {
    this.showControls.set(true);
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    this.controlsTimeout = setTimeout(() => {
      if (this.isPlaying() && !this.showSpeedMenu()) {
        this.showControls.set(false);
      }
    }, 3000);
  }

  closePlayer(): void {
    const v = this.videoRef?.nativeElement;
    if (v) {
      v.pause();
    }
    this.close.emit();
  }

  private formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hrs = Math.floor(mins / 60);

    if (hrs > 0) {
      const remMins = mins % 60;
      return `${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
