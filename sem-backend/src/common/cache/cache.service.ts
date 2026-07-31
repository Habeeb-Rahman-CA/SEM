import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CacheBackend,
  CacheKeyDetail,
  CacheKeyMeta,
  CacheStats,
} from './cache.types';
import { MemoryCacheBackend } from './memory-cache.backend';
import { RedisCacheBackend } from './redis-cache.backend';

/**
 * Application-wide cache facade. Callers get one API regardless of
 * whether the backend is Redis (multi-instance) or in-memory (dev). All
 * keys are namespaced with `CACHE_NAMESPACE` so multiple apps sharing a
 * Redis instance don't collide.
 *
 * Usage patterns:
 *
 *   // Get-or-load pattern — the workhorse. Loader runs at most once
 *   // per key per TTL window, no matter how many concurrent callers.
 *   const stats = await cache.wrap(
 *     CacheKeys.dashboardStats(workspaceId),
 *     60,
 *     () => statsService.compute(workspaceId),
 *   );
 *
 *   // Precise invalidation on write
 *   await cache.invalidatePrefix(CacheKeys.dashboardStatsPrefix(workspaceId));
 *
 *   // Scoped view — convenient when many operations share a prefix
 *   const wsCache = cache.scoped(`ws:${workspaceId}:`);
 *   await wsCache.set('members', members, 300);
 */
@Injectable()
export class CacheService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(CacheService.name);
  private backend!: CacheBackend;
  private namespace: string;
  private inflight = new Map<string, Promise<any>>();

  constructor(private readonly config: ConfigService) {
    this.namespace = this.config.get<string>('CACHE_NAMESPACE', 'sem') + ':';
  }

  async onModuleInit(): Promise<void> {
    const host = this.config.get<string>('REDIS_HOST');
    if (host) {
      const port = this.config.get<number>('REDIS_PORT', 6379);
      const password = this.config.get<string>('REDIS_PASSWORD');
      const db = this.config.get<number>('REDIS_CACHE_DB', 0);
      const redis = new RedisCacheBackend(host, port, password, db);
      await redis.connect();
      if (redis.ready()) {
        this.backend = redis;
        this.logger.log('CacheService using Redis backend');
        return;
      }
      this.logger.warn(
        'Redis not ready after connect — falling back to memory cache',
      );
    }
    this.backend = new MemoryCacheBackend(
      this.config.get<number>('CACHE_MAX_ENTRIES', 10_000),
    );
    this.logger.log('CacheService using in-memory backend');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.backend?.close();
  }

  private ns(key: string): string {
    return this.namespace + key;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.backend.get<T>(this.ns(key));
  }

  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    return this.backend.set<T>(this.ns(key), value, ttlSec);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.backend.del(...keys.map((k) => this.ns(k)));
  }

  /**
   * Delete every key matching a glob pattern (`ws:123:*`). Uses SCAN
   * under the hood so it's safe on large Redis DBs.
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.backend.scan(this.ns(pattern));
    if (keys.length === 0) return 0;
    return this.backend.del(...keys);
  }

  /** Convenience: drops everything with a given prefix. */
  invalidatePrefix(prefix: string): Promise<number> {
    return this.invalidatePattern(prefix + '*');
  }

  /**
   * Get-or-load with in-process dedup. If two callers request the same
   * key while a fetch is already in flight, both share the same
   * promise — no duplicate downstream work.
   */
  async wrap<T>(
    key: string,
    ttlSec: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const namespaced = this.ns(key);
    const cached = await this.backend.get<T>(namespaced);
    if (cached !== null && cached !== undefined) return cached;

    const pending = this.inflight.get(namespaced) as Promise<T> | undefined;
    if (pending) return pending;

    const promise = (async () => {
      try {
        const value = await loader();
        if (value !== undefined && value !== null) {
          await this.backend.set(namespaced, value, ttlSec);
        }
        return value;
      } finally {
        this.inflight.delete(namespaced);
      }
    })();

    this.inflight.set(namespaced, promise);
    return promise;
  }

  /**
   * Returns a scoped view that automatically prepends `prefix` to every
   * key. Useful for per-workspace caches so callers don't have to repeat
   * the prefix at every call site.
   */
  scoped(prefix: string): ScopedCache {
    return new ScopedCache(this, prefix);
  }

  async stats(): Promise<CacheStats & { namespace: string; hitRate: number }> {
    const s = await this.backend.stats();
    const total = s.hits + s.misses;
    const hitRate = total > 0 ? +((s.hits / total) * 100).toFixed(2) : 0;
    return { ...s, namespace: this.namespace, hitRate };
  }

  /**
   * Browse cache keys under the app namespace. Pattern is glob-style
   * with `*` and `?`. Strips the namespace prefix from returned keys so
   * the UI shows the caller-friendly logical key.
   */
  async listKeys(
    pattern = '*',
    limit = 200,
  ): Promise<{ keys: CacheKeyMeta[]; matched: number; truncated: boolean }> {
    const nsPattern = this.ns(pattern);
    const all = await this.backend.scan(nsPattern);
    const truncated = all.length > limit;
    const selected = all.slice(0, limit);

    const metas: CacheKeyMeta[] = await Promise.all(
      selected.map(async (fullKey) => {
        const [value, ttlSec] = await Promise.all([
          this.backend.get<any>(fullKey),
          this.backend.ttl(fullKey),
        ]);
        const serialized = this.safeStringify(value);
        return {
          key: this.stripNs(fullKey),
          ttlSec,
          sizeBytes: Buffer.byteLength(serialized, 'utf8'),
          preview: serialized.slice(0, 80),
        };
      }),
    );

    return { keys: metas, matched: all.length, truncated };
  }

  /**
   * Return the full cached value plus metadata for a single key. Used by
   * the admin UI to inspect what's in a slot without hitting the app
   * endpoint that would serve it.
   */
  async inspect(key: string): Promise<CacheKeyDetail | null> {
    const fullKey = this.ns(key);
    const [value, ttlSec] = await Promise.all([
      this.backend.get<any>(fullKey),
      this.backend.ttl(fullKey),
    ]);
    if (value === null) return null;
    const serialized = this.safeStringify(value);
    return {
      key,
      ttlSec,
      sizeBytes: Buffer.byteLength(serialized, 'utf8'),
      value,
    };
  }

  private stripNs(fullKey: string): string {
    return fullKey.startsWith(this.namespace)
      ? fullKey.slice(this.namespace.length)
      : fullKey;
  }

  private safeStringify(value: unknown): string {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  backendKind(): 'redis' | 'memory' {
    return this.backend instanceof MemoryCacheBackend ? 'memory' : 'redis';
  }

  namespaceValue(): string {
    return this.namespace;
  }

  /** Test-only escape hatch. */
  async flush(): Promise<void> {
    await this.backend.flush();
  }
}

export class ScopedCache {
  constructor(
    private readonly cache: CacheService,
    private readonly prefix: string,
  ) {}

  get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(this.prefix + key);
  }

  set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    return this.cache.set<T>(this.prefix + key, value, ttlSec);
  }

  del(...keys: string[]): Promise<number> {
    return this.cache.del(...keys.map((k) => this.prefix + k));
  }

  invalidateAll(): Promise<number> {
    return this.cache.invalidatePrefix(this.prefix);
  }

  wrap<T>(key: string, ttlSec: number, loader: () => Promise<T>): Promise<T> {
    return this.cache.wrap<T>(this.prefix + key, ttlSec, loader);
  }
}
