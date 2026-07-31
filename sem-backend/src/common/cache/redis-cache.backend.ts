import { Logger } from '@nestjs/common';
import { CacheBackend, CacheStats } from './cache.types';

/**
 * Redis-backed cache. Uses `ioredis` (already a runtime dep in this
 * project via the socket.io adapter). Loaded lazily so a missing package
 * or unreachable Redis at boot only degrades caching — the app still
 * runs on the in-memory fallback.
 *
 * Values are stored as JSON strings with `SET key value EX ttlSec`.
 * Invalidation uses SCAN (never KEYS) so lookups don't block Redis on
 * multi-million-key databases.
 */
export class RedisCacheBackend implements CacheBackend {
  private readonly logger = new Logger('RedisCache');
  private client: any = null;
  private connected = false;
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private invalidations = 0;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly password?: string,
    private readonly db: number = 0,
  ) {}

  async connect(): Promise<void> {
    try {
      const Redis = require('ioredis');
      this.client = new Redis({
        host: this.host,
        port: this.port,
        password: this.password || undefined,
        db: this.db,
        // Fast-fail on connect errors so callers move to the fallback
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
        connectTimeout: 5_000,
        lazyConnect: false,
      });
      this.client.on('ready', () => {
        this.connected = true;
        this.logger.log(`Redis cache connected @ ${this.host}:${this.port}`);
      });
      this.client.on('error', (err: any) => {
        this.connected = false;
        this.logger.warn(`Redis cache error: ${err?.message || err}`);
      });
      this.client.on('end', () => {
        this.connected = false;
      });
    } catch (err) {
      this.logger.warn(
        `ioredis unavailable — falling back to memory cache: ${err}`,
      );
      this.client = null;
    }
  }

  ready(): boolean {
    return this.connected && this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.ready()) return null;
    try {
      const raw = await this.client.get(key);
      if (raw == null) {
        this.misses += 1;
        return null;
      }
      this.hits += 1;
      try {
        return JSON.parse(raw) as T;
      } catch {
        // Value wasn't JSON — return as-is (string cache)
        return raw;
      }
    } catch (err) {
      this.logger.warn(`get(${key}) failed: ${err}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    if (!this.ready()) return;
    try {
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      await this.client.set(key, payload, 'EX', Math.max(1, ttlSec));
      this.sets += 1;
    } catch (err) {
      this.logger.warn(`set(${key}) failed: ${err}`);
    }
  }

  async del(...keys: string[]): Promise<number> {
    if (!this.ready() || keys.length === 0) return 0;
    try {
      const n = await this.client.del(...keys);
      this.invalidations += n;
      return n;
    } catch (err) {
      this.logger.warn(`del failed: ${err}`);
      return 0;
    }
  }

  async scan(pattern: string): Promise<string[]> {
    if (!this.ready()) return [];
    const out: string[] = [];
    try {
      let cursor = '0';
      do {
        const [next, batch]: [string, string[]] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          200,
        );
        out.push(...batch);
        cursor = next;
        // Safety guard: never spin forever
        if (out.length > 100_000) break;
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(`scan(${pattern}) failed: ${err}`);
    }
    return out;
  }

  async ttl(key: string): Promise<number> {
    if (!this.ready()) return -1;
    try {
      return await this.client.ttl(key);
    } catch (err) {
      this.logger.warn(`ttl(${key}) failed: ${err}`);
      return -1;
    }
  }

  async stats(): Promise<CacheStats> {
    return {
      backend: 'redis',
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      invalidations: this.invalidations,
      connected: this.connected,
    };
  }

  async flush(): Promise<void> {
    if (!this.ready()) return;
    try {
      await this.client.flushdb();
    } catch (err) {
      this.logger.warn(`flush failed: ${err}`);
    }
  }

  async close(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      /* ignore */
    }
    this.connected = false;
    this.client = null;
  }
}
