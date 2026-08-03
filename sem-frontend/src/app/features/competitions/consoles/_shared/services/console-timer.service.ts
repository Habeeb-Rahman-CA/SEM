import { Injectable, signal } from '@angular/core';

/**
 * Generic 1Hz tick timer usable by any live console (football, badminton, etc.).
 * Consumers subscribe to the elapsed-seconds signal and choose how to persist it.
 */
@Injectable()
export class ConsoleTimerService {
  private intervalId: any = null;
  readonly elapsedSeconds = signal<number>(0);
  readonly running = signal<boolean>(false);

  private onTick: ((s: number) => void) | null = null;

  setElapsed(seconds: number): void {
    this.elapsedSeconds.set(seconds || 0);
  }

  start(onTick?: (elapsed: number) => void): void {
    if (this.intervalId) return;
    this.onTick = onTick ?? null;
    this.running.set(true);
    this.intervalId = setInterval(() => {
      this.elapsedSeconds.update((s) => s + 1);
      if (this.onTick) this.onTick(this.elapsedSeconds());
    }, 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running.set(false);
    this.onTick = null;
  }

  reset(): void {
    this.stop();
    this.elapsedSeconds.set(0);
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }
}
