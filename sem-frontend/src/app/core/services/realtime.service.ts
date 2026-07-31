import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { SocketService } from './socket.service';
import { throttle } from './throttle';

/**
 * Delta payload shape emitted by the backend RealtimeBroadcaster for
 * object streams. The first message is a full snapshot; subsequent
 * messages carry only what changed.
 */
export interface ObjectDelta<T> {
  changed: Partial<T>;
  removed: string[];
}

export interface CollectionDelta<T> {
  added: T[];
  updated: T[];
  removed: string[];
}

/**
 * RealtimeService is a lightweight facade over the existing SocketService
 * with three ergonomic patterns for feature components:
 *
 *   1. subscribeThrottled(event, handler, interval)
 *        Wraps a socket.on with a trailing throttle so a page rerender
 *        never runs faster than the interval — even if the server bursts
 *        30 messages per second.
 *
 *   2. applyObjectDelta(base, delta)
 *        Merge helper for the ObjectDelta shape the backend emits after
 *        the first snapshot.
 *
 *   3. pollOrStream(event, fetcher, intervalMs)
 *        Returns an Observable that emits WebSocket messages when the
 *        socket is connected, or falls back to polling `fetcher` every
 *        `intervalMs` when it's not. This is the "one line to get
 *        realtime with graceful degradation" pattern.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket = inject(SocketService);

  /** Public signal so components can show a "live" badge only when true. */
  connected = signal(false);

  /**
   * Subscribe to a socket event with a trailing throttle. Returns an
   * unsubscribe function callers should invoke on destroy.
   */
  subscribeThrottled<T = any>(
    event: string,
    handler: (payload: T) => void,
    intervalMs = 200,
  ): () => void {
    const wrapped = throttle(intervalMs, handler);
    const raw = this.rawSocket();
    if (!raw) {
      // Socket not ready yet — poll and attach when it comes online
      const attach = () => {
        const s = this.rawSocket();
        if (s) {
          s.on(event, wrapped);
          this.connected.set(true);
        } else {
          setTimeout(attach, 250);
        }
      };
      attach();
      return () => {
        const s = this.rawSocket();
        s?.off(event, wrapped as any);
      };
    }
    raw.on(event, wrapped);
    this.connected.set(true);
    return () => raw.off(event, wrapped as any);
  }

  /**
   * Merge an ObjectDelta into a base object. Fields listed in `removed`
   * become `null` so callers can distinguish "explicitly cleared" from
   * "not present in the payload".
   */
  applyObjectDelta<T extends Record<string, any>>(base: T | null, delta: ObjectDelta<T> | T): T {
    // Full snapshot (first emission) — pass-through
    if (!('changed' in delta) && !('removed' in delta)) {
      return delta as T;
    }
    const merged: any = base ? { ...base } : {};
    Object.assign(merged, (delta as ObjectDelta<T>).changed || {});
    for (const key of (delta as ObjectDelta<T>).removed || []) {
      merged[key] = null;
    }
    return merged as T;
  }

  /**
   * Merge a CollectionDelta into an existing list, keyed by `id`.
   */
  applyCollectionDelta<T extends { id: string }>(list: T[], delta: CollectionDelta<T>): T[] {
    const map = new Map(list.map((i) => [i.id, i]));
    for (const item of delta.added || []) map.set(item.id, item);
    for (const item of delta.updated || []) map.set(item.id, item);
    for (const id of delta.removed || []) map.delete(id);
    return Array.from(map.values());
  }

  /**
   * WebSocket-preferred data stream with polling backstop.
   *
   *   const status$ = realtime.pollOrStream(
   *     'auction:live',
   *     () => auctionsSvc.getLiveStatus(id),
   *     3000, // poll every 3s if socket isn't connected
   *   );
   *
   * Semantics:
   *   - Immediately emits one `fetcher()` result so the UI has data
   *   - If the socket is connected, later ticks come from socket events
   *     (throttled). Polling stops.
   *   - If the socket drops, polling resumes.
   *   - Caller subscribes and pipes takeUntilDestroyed for cleanup.
   */
  pollOrStream<T>(event: string, fetcher: () => Observable<T>, intervalMs = 5000): Observable<T> {
    return new Observable<T>((subscriber) => {
      const stop$ = new Subject<void>();
      let sockedUnsub: (() => void) | null = null;

      const startPolling = () => {
        timer(0, intervalMs)
          .pipe(
            switchMap(() => fetcher()),
            takeUntil(stop$),
          )
          .subscribe({
            next: (v) => subscriber.next(v),
            error: (e) => subscriber.error(e),
          });
      };

      const raw = this.rawSocket();
      if (raw && raw.connected) {
        this.connected.set(true);
        sockedUnsub = this.subscribeThrottled<T>(
          event,
          (payload) => subscriber.next(payload),
          Math.min(500, intervalMs / 2),
        );
        // Emit an initial fetch so the UI isn't blank until the first tick
        fetcher().subscribe({ next: (v) => subscriber.next(v) });
      } else {
        startPolling();
      }

      return () => {
        stop$.next();
        stop$.complete();
        sockedUnsub?.();
      };
    });
  }

  /** Escape hatch for callers that need the raw socket. */
  private rawSocket(): any {
    // The existing SocketService keeps its socket private; we reach in
    // via a tiny compatibility shim so we don't have to modify that file.
    return (this.socket as any).socket ?? null;
  }
}
