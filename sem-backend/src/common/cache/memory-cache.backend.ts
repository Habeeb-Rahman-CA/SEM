import { CacheBackend, CacheStats } from './cache.types';

interface Entry {
  value: any;
  expiresAt: number;
}

/**
 * In-memory cache backend used when Redis isn't configured. Not for
 * production multi-instance deployments — each Node process has its own
 * cache and they'll diverge on invalidations.
 *
 * Uses lazy expiry (entries are checked on read) plus an occasional
 * sweeper to bound memory. Matches the RedisCacheBackend interface so
 * services can be written once and swap backends transparently.
 */
export class MemoryCacheBackend implements CacheBackend {
  private store = new Map<string, Entry>();
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private invalidations = 0;
  private sweeper: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly maxEntries = 10_000) {
    // Sweep expired entries every 60s so long-idle keys don't hoard memory
    this.sweeper = setInterval(() => this.sweep(), 60_000);
    // Keep the interval from holding the process open in tests
    (this.sweeper as any).unref?.();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }
    this.hits += 1;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    if (this.store.size >= this.maxEntries) {
      // Bound memory: evict oldest entry
      const first = this.store.keys().next().value;
      if (first) this.store.delete(first);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1, ttlSec) * 1000,
    });
    this.sets += 1;
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const k of keys) if (this.store.delete(k)) n += 1;
    this.invalidations += n;
    return n;
  }

  async scan(pattern: string): Promise<string[]> {
    const rx = this.globToRegex(pattern);
    const out: string[] = [];
    for (const k of this.store.keys()) if (rx.test(k)) out.push(k);
    return out;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -1;
    const ms = entry.expiresAt - Date.now();
    return ms > 0 ? Math.ceil(ms / 1000) : -1;
  }

  async stats(): Promise<CacheStats> {
    return {
      backend: 'memory',
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      invalidations: this.invalidations,
      size: this.store.size,
    };
  }

  async flush(): Promise<void> {
    this.store.clear();
  }

  ready(): boolean {
    return true;
  }

  async close(): Promise<void> {
    if (this.sweeper) clearInterval(this.sweeper);
    this.sweeper = null;
    this.store.clear();
  }

  private sweep(): void {
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (v.expiresAt <= now) this.store.delete(k);
    }
  }

  private globToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
  }
}
