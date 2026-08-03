import { Injectable, inject } from '@angular/core';
import { ConsoleTimerService } from '../../_shared/services/console-timer.service';
import { FootballLiveData } from '../models/football-console.interface';

export interface FootballTimerLimits {
  halfSeconds: number;
  extraHalfSeconds: number;
}

/**
 * Football-specific helpers built on top of the generic ConsoleTimerService.
 * Encapsulates half/extra-half boundary detection so the component only
 * decides what to persist when a boundary is hit.
 */
@Injectable()
export class FootballTimerService {
  readonly timer = inject(ConsoleTimerService);

  get elapsedSeconds() {
    return this.timer.elapsedSeconds;
  }

  setElapsed(seconds: number) {
    this.timer.setElapsed(seconds);
  }

  stop() {
    this.timer.stop();
  }

  isRunning(): boolean {
    return this.timer.isRunning();
  }

  static limits(live: FootballLiveData | null | undefined): FootballTimerLimits {
    const halfMinutes = live?.halfDurationMinutes ?? 45;
    const extraHalfMinutes = live?.extraTimeHalfDurationMinutes ?? 15;
    return {
      halfSeconds: halfMinutes * 60,
      extraHalfSeconds: extraHalfMinutes * 60,
    };
  }

  /** Returns the max seconds allowed for the current half, or null if none. */
  static maxForHalf(live: FootballLiveData | null | undefined): number | null {
    if (!live) return null;
    const { halfSeconds, extraHalfSeconds } = FootballTimerService.limits(live);
    switch (live.currentHalf) {
      case 1:
        return halfSeconds;
      case 2:
        return halfSeconds * 2;
      case 3:
        return halfSeconds * 2 + extraHalfSeconds;
      case 4:
        return halfSeconds * 2 + extraHalfSeconds * 2;
      default:
        return null;
    }
  }

  start(
    getLive: () => FootballLiveData | null | undefined,
    onBoundaryReached: (cappedSeconds: number) => void,
  ): void {
    if (this.timer.isRunning()) return;
    this.timer.start(() => {
      const live = getLive();
      const limit = FootballTimerService.maxForHalf(live);
      if (limit != null && this.timer.elapsedSeconds() >= limit) {
        this.timer.stop();
        onBoundaryReached(limit);
      }
    });
  }
}
