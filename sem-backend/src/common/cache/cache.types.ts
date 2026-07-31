/**
 * Backend-agnostic cache primitives. Two implementations satisfy this
 * interface: RedisCacheBackend (production / horizontal scale) and
 * MemoryCacheBackend (dev, tests, single-instance deployments).
 *
 * All keys are opaque strings — the CacheService adds a global namespace
 * prefix so multiple apps sharing a Redis instance don't collide.
 */
export interface CacheBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSec: number): Promise<void>;
  del(...keys: string[]): Promise<number>;
  /**
   * Return keys matching a glob pattern (Redis-style: `*`, `?`, `[…]`).
   * Implementations must NOT block (Redis: use SCAN, not KEYS).
   */
  scan(pattern: string): Promise<string[]>;
  /**
   * Return remaining TTL in seconds for the key, or -1 if it doesn't
   * exist / -2 for infinite. Matches Redis's TTL semantics.
   */
  ttl(key: string): Promise<number>;
  /** Free-form debug counters. */
  stats(): Promise<CacheStats>;
  /** Wipe everything under the app's namespace. Callers should use
   *  invalidate patterns instead; this is for tests / crisis reset. */
  flush(): Promise<void>;
  ready(): boolean;
  close(): Promise<void>;
}

export interface CacheStats {
  backend: 'redis' | 'memory';
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  size?: number;
  connected?: boolean;
}

export interface CacheKeyMeta {
  key: string;
  ttlSec: number;
  sizeBytes: number;
  preview?: string;
}

export interface CacheKeyDetail extends CacheKeyMeta {
  value: any;
}
