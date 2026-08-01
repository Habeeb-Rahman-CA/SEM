/**
 * EventThrottler keeps outbound WebSocket emissions to a sustainable
 * rate per (room, event) pair. High-frequency writers (a live scoring
 * console generating dozens of ticks per second) can call `enqueue`
 * as often as they like — the throttler collapses them into one
 * emission per interval on the trailing edge.
 *
 * Behaviour:
 *   - Leading emission is optional (default off). The first `enqueue`
 *     after an idle period schedules a trailing flush at `intervalMs`.
 *   - Subsequent `enqueue` calls within that window replace the
 *     pending payload — the newest snapshot wins.
 *   - `flush()` is called at the end of the window with the latest
 *     payload, resetting the timer.
 *
 * This is the classic trailing-throttle pattern optimized for the
 * "always want the latest snapshot" case that live scoreboards need,
 * as opposed to the "want every event" case that a chat feed would.
 */
export class EventThrottler<T> {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private pending = new Map<string, T>();

  constructor(
    private readonly intervalMs: number,
    private readonly flush: (key: string, payload: T) => void,
  ) {}

  enqueue(key: string, payload: T): void {
    this.pending.set(key, payload);
    if (this.timers.has(key)) return;
    const t = setTimeout(() => {
      const value = this.pending.get(key) as T;
      this.pending.delete(key);
      this.timers.delete(key);
      try {
        this.flush(key, value);
      } catch {
        /* swallow — never let a subscriber error kill the timer chain */
      }
    }, this.intervalMs);
    // Don't let the timer keep the process alive during shutdown
    (t as any).unref?.();
    this.timers.set(key, t);
  }

  /** Emit the pending payload for a key immediately (bypasses throttle). */
  flushNow(key: string): void {
    const timer = this.timers.get(key);
    if (timer) clearTimeout(timer);
    const value = this.pending.get(key);
    this.pending.delete(key);
    this.timers.delete(key);
    if (value !== undefined) this.flush(key, value);
  }

  /** Cancel a pending emission without flushing. */
  drop(key: string): void {
    const timer = this.timers.get(key);
    if (timer) clearTimeout(timer);
    this.timers.delete(key);
    this.pending.delete(key);
  }

  clear(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.pending.clear();
  }
}
