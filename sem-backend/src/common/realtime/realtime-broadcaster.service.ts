import { Injectable, Logger } from '@nestjs/common';
import { EventThrottler } from './event-throttler';
import {
  diffCollection,
  diffObject,
  CollectionDiff,
  ObjectDiff,
} from './payload-differ';

type EmitFn = (room: string, event: string, payload: unknown) => void;

/**
 * Wraps a raw socket.io Server (or any emit-shaped function) with two
 * critical realtime optimizations:
 *
 *   1. Throttling — a chatty producer (live scoring console) can call
 *      broadcastObject/broadcastCollection at full tick rate, but only
 *      one emission per (room, event) per `intervalMs` actually goes
 *      over the wire. Trailing-edge; the newest snapshot wins.
 *
 *   2. Delta payloads — the broadcaster remembers the last snapshot per
 *      (room, event) and diffs against it. Clients receive
 *      { changed, removed } instead of the whole object, or
 *      { added, updated, removed } for collections. When nothing
 *      changed, no emission happens at all.
 *
 * Backwards compatible: if a caller wants to force a full snapshot
 * (client just joined the room and needs the initial state), use
 * `broadcastSnapshot()` to bypass diffing and throttling.
 *
 * Gateways wire this in one line and get the perf win for free:
 *
 *   this.broadcaster.attach((room, event, payload) => {
 *     this.server.to(room).emit(event, payload);
 *   });
 *   this.broadcaster.broadcastObject('match:123', 'matchUpdated', match);
 */
@Injectable()
export class RealtimeBroadcaster {
  private readonly logger = new Logger(RealtimeBroadcaster.name);
  private emit: EmitFn | null = null;
  private snapshots = new Map<string, any>();
  private throttler: EventThrottler<{
    event: string;
    payload: unknown;
    kind: 'object' | 'collection' | 'raw';
  }>;

  constructor() {
    this.throttler = new EventThrottler(
      /* default 100ms — tunable per gateway via setIntervalMs */
      100,
      (key, entry) => {
        const [room, event] = this.splitKey(key);
        try {
          this.emit?.(room, event, entry.payload);
        } catch (err) {
          this.logger.warn(`emit failed for ${room}/${event}: ${err}`);
        }
      },
    );
  }

  /** Wire the actual emit implementation (usually server.to().emit). */
  attach(fn: EmitFn): void {
    this.emit = fn;
  }

  setIntervalMs(ms: number): void {
    this.throttler.clear();
    this.throttler = new EventThrottler(ms, (key, entry) => {
      const [room, event] = this.splitKey(key);
      try {
        this.emit?.(room, event, entry.payload);
      } catch (err) {
        this.logger.warn(`emit failed for ${room}/${event}: ${err}`);
      }
    });
  }

  /**
   * Broadcast an object snapshot as a delta if it changed. First call
   * (no prior snapshot) sends the full object; later calls send just
   * `{ changed, removed }` on the same event.
   */
  broadcastObject<T extends Record<string, any>>(
    room: string,
    event: string,
    next: T,
  ): ObjectDiff<T> | T | null {
    if (!this.emit) return null;
    const key = this.key(room, event);
    const prev = this.snapshots.get(key) as T | undefined;
    const diff = diffObject(prev, next);
    if (diff === null) return null;
    this.snapshots.set(key, this.deepClone(next));
    const payload = prev ? diff : next; // first-time: full snapshot
    this.throttler.enqueue(key, {
      event,
      payload,
      kind: 'object',
    });
    return prev ? diff : next;
  }

  /**
   * Broadcast a collection as `{ added, updated, removed }` deltas.
   * Items must have a stable `id` field.
   */
  broadcastCollection<T extends { id: string }>(
    room: string,
    event: string,
    next: T[],
  ): CollectionDiff<T> | null {
    if (!this.emit) return null;
    const key = this.key(room, event);
    const prev = (this.snapshots.get(key) as T[] | undefined) ?? [];
    const diff = diffCollection(prev, next);
    if (diff === null) return null;
    this.snapshots.set(key, this.deepClone(next));
    this.throttler.enqueue(key, {
      event,
      payload: diff,
      kind: 'collection',
    });
    return diff;
  }

  /**
   * Force a full-payload emit (bypasses diffing + throttling). Use for
   * initial snapshots when a client joins mid-stream and needs the
   * complete state before deltas start applying.
   */
  broadcastSnapshot(room: string, event: string, payload: unknown): void {
    if (!this.emit) return;
    const key = this.key(room, event);
    this.snapshots.set(key, this.deepClone(payload));
    this.emit(room, event, payload);
  }

  /**
   * Drop cached snapshots for a room so the next broadcast sends a full
   * payload again. Call on room lifecycle events (match reset, page
   * navigation, etc.) to prevent stale deltas.
   */
  resetRoom(room: string): void {
    const prefix = `${room}::`;
    for (const key of Array.from(this.snapshots.keys())) {
      if (key.startsWith(prefix)) this.snapshots.delete(key);
    }
  }

  private key(room: string, event: string): string {
    return `${room}::${event}`;
  }

  private splitKey(key: string): [string, string] {
    const idx = key.indexOf('::');
    if (idx < 0) return [key, ''];
    return [key.slice(0, idx), key.slice(idx + 2)];
  }

  private deepClone<T>(value: T): T {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }
}
