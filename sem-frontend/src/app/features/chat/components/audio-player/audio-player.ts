import {
  Component,
  OnInit,
  OnDestroy,
  input,
  signal,
  computed,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-player.html',
  styleUrls: ['./audio-player.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AudioPlayerComponent implements OnInit, OnDestroy {
  src = input.required<string>();
  title = input<string>('Voice Message');
  size = input<string>('');

  @ViewChild('audioRef') audioRef!: ElementRef<HTMLAudioElement>;

  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  playbackSpeed = signal<number>(1.0);
  isNoiseReductionActive = signal<boolean>(true);

  // Pre-calculated representative waveform bar heights (percentage)
  waveformBars = signal<number[]>([]);

  speedOptions = [1.0, 1.25, 1.5, 2.0];

  private audioCtx?: AudioContext;
  private biquadFilter?: BiquadFilterNode;
  private sourceNode?: MediaElementAudioSourceNode;

  formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));
  formattedDuration = computed(() => this.formatTime(this.duration()));
  progressPercentage = computed(() => {
    const dur = this.duration();
    if (!dur) return 0;
    return Math.min(100, Math.max(0, (this.currentTime() / dur) * 100));
  });

  ngOnInit(): void {
    // Generate static visual waveform pattern
    const bars: number[] = [];
    for (let i = 0; i < 32; i++) {
      const height = Math.floor(Math.sin(i * 0.4) * 35 + Math.cos(i * 0.8) * 25 + 45);
      bars.push(Math.max(15, Math.min(95, height)));
    }
    this.waveformBars.set(bars);
  }

  ngOnDestroy(): void {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
  }

  onLoadedMetadata(): void {
    const a = this.audioRef?.nativeElement;
    if (a) {
      this.duration.set(a.duration || 0);
      a.playbackRate = this.playbackSpeed();
    }
  }

  onTimeUpdate(): void {
    const a = this.audioRef?.nativeElement;
    if (a) {
      this.currentTime.set(a.currentTime || 0);
    }
  }

  onEnded(): void {
    this.isPlaying.set(false);
    this.currentTime.set(0);
  }

  togglePlay(): void {
    const a = this.audioRef?.nativeElement;
    if (!a) return;

    if (!this.audioCtx && typeof window !== 'undefined') {
      this.setupNoiseReductionFilter(a);
    }

    if (a.paused) {
      a.play()
        .then(() => this.isPlaying.set(true))
        .catch((err) => console.error('Audio playback error:', err));
    } else {
      a.pause();
      this.isPlaying.set(false);
    }
  }

  cyclePlaybackSpeed(): void {
    const current = this.playbackSpeed();
    const idx = this.speedOptions.indexOf(current);
    const nextSpeed = this.speedOptions[(idx + 1) % this.speedOptions.length];
    this.playbackSpeed.set(nextSpeed);

    const a = this.audioRef?.nativeElement;
    if (a) {
      a.playbackRate = nextSpeed;
    }
  }

  toggleNoiseReduction(): void {
    const active = !this.isNoiseReductionActive();
    this.isNoiseReductionActive.set(active);

    if (this.biquadFilter && this.audioCtx) {
      // High-pass filter cut-off frequency: 300Hz cuts low rumble and background hum
      this.biquadFilter.frequency.setValueAtTime(active ? 300 : 10, this.audioCtx.currentTime);
    }
  }

  seek(index: number): void {
    const a = this.audioRef?.nativeElement;
    if (!a || !this.duration()) return;

    const fraction = index / this.waveformBars().length;
    const targetTime = fraction * this.duration();
    a.currentTime = targetTime;
    this.currentTime.set(targetTime);
  }

  private setupNoiseReductionFilter(audioEl: HTMLAudioElement): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      this.sourceNode = this.audioCtx.createMediaElementSource(audioEl);
      this.biquadFilter = this.audioCtx.createBiquadFilter();

      this.biquadFilter.type = 'highpass';
      this.biquadFilter.frequency.value = this.isNoiseReductionActive() ? 300 : 10;

      this.sourceNode.connect(this.biquadFilter);
      this.biquadFilter.connect(this.audioCtx.destination);
    } catch (e) {
      // Fallback if media element source already connected
    }
  }

  private formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
