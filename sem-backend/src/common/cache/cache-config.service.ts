import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheConfigEntity } from './entities/cache-config.entity';
import { CacheTTL } from './cache.keys';

export interface DomainSetting {
  enabled: boolean;
  ttlSec: number;
}

export type CacheDomain =
  | 'dashboard'
  | 'leaderboard'
  | 'public'
  | 'permissions'
  | 'lookup'
  | 'auction'
  | 'finance';

const DOMAIN_DEFAULTS: Record<CacheDomain, DomainSetting> = {
  dashboard: { enabled: true, ttlSec: CacheTTL.short },
  leaderboard: { enabled: true, ttlSec: CacheTTL.medium },
  public: { enabled: true, ttlSec: CacheTTL.short },
  permissions: { enabled: true, ttlSec: CacheTTL.long },
  lookup: { enabled: true, ttlSec: CacheTTL.reference },
  auction: { enabled: true, ttlSec: CacheTTL.short },
  finance: { enabled: true, ttlSec: CacheTTL.short },
};

/**
 * Reads/writes the singleton cache configuration row and exposes a
 * runtime API for services to consult before caching. Services that
 * honor this can be turned off centrally when caching a specific
 * domain causes issues, without a redeploy.
 *
 *   const { enabled, ttlSec } = cfgService.settings('dashboard');
 *   if (!enabled) return this.compute(...);
 *   return this.cache.wrap(key, ttlSec, () => this.compute(...));
 */
@Injectable()
export class CacheConfigService implements OnModuleInit {
  private cached: CacheConfigEntity | null = null;

  constructor(
    @InjectRepository(CacheConfigEntity)
    private readonly repo: Repository<CacheConfigEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.load();
    } catch {
      // Table may not exist yet in a fresh dev DB; fall back to defaults.
      this.cached = null;
    }
  }

  private async load(): Promise<CacheConfigEntity> {
    let row = await this.repo.findOne({ where: { id: 'singleton' } });
    if (!row) {
      row = this.repo.create({
        id: 'singleton',
        globallyEnabled: true,
        namespace: 'sem',
        domainSettings: { ...DOMAIN_DEFAULTS },
      });
      row = await this.repo.save(row);
    }
    this.cached = row;
    return row;
  }

  async get(): Promise<CacheConfigEntity> {
    if (this.cached) return this.cached;
    return this.load();
  }

  /** Resolve the effective settings for a domain, filling in defaults. */
  async settings(domain: CacheDomain): Promise<DomainSetting> {
    const row = await this.get();
    if (!row.globallyEnabled) return { enabled: false, ttlSec: 0 };
    const overrides = row.domainSettings || {};
    const eff = overrides[domain];
    if (!eff) return DOMAIN_DEFAULTS[domain];
    return {
      enabled: eff.enabled !== false,
      ttlSec: eff.ttlSec > 0 ? eff.ttlSec : DOMAIN_DEFAULTS[domain].ttlSec,
    };
  }

  /**
   * Update the config in one call. Missing fields on the patch are left
   * untouched. Domain settings are shallow-merged so callers can toggle
   * one domain without resending them all.
   */
  async update(
    patch: {
      globallyEnabled?: boolean;
      namespace?: string;
      domainSettings?: Partial<Record<CacheDomain, DomainSetting>>;
      notes?: string;
    },
    userId?: string,
  ): Promise<CacheConfigEntity> {
    const row = await this.get();
    if (patch.globallyEnabled !== undefined) {
      row.globallyEnabled = patch.globallyEnabled;
    }
    if (patch.namespace !== undefined) {
      row.namespace = patch.namespace;
    }
    if (patch.domainSettings) {
      const merged: Record<string, DomainSetting> = {
        ...(row.domainSettings || DOMAIN_DEFAULTS),
      };
      for (const [k, v] of Object.entries(patch.domainSettings)) {
        if (!v) continue;
        const prior = merged[k];
        const defaults = (DOMAIN_DEFAULTS as Record<string, DomainSetting>)[k];
        merged[k] = {
          enabled: v.enabled ?? prior?.enabled ?? true,
          ttlSec: v.ttlSec ?? prior?.ttlSec ?? defaults?.ttlSec ?? 60,
        };
      }
      row.domainSettings = merged;
    }
    if (patch.notes !== undefined) row.notes = patch.notes;
    row.updatedById = userId || row.updatedById;
    this.cached = await this.repo.save(row);
    return this.cached;
  }

  /** List of known domains with their current effective settings. */
  async listDomains(): Promise<
    Array<{ domain: CacheDomain; settings: DomainSetting; isDefault: boolean }>
  > {
    const row = await this.get();
    const overrides = row.domainSettings || {};
    return (Object.keys(DOMAIN_DEFAULTS) as CacheDomain[]).map((d) => {
      const eff = overrides[d];
      const isDefault =
        !eff ||
        (eff.enabled === DOMAIN_DEFAULTS[d].enabled &&
          eff.ttlSec === DOMAIN_DEFAULTS[d].ttlSec);
      return {
        domain: d,
        settings: eff ? { ...DOMAIN_DEFAULTS[d], ...eff } : DOMAIN_DEFAULTS[d],
        isDefault,
      };
    });
  }

  /** Reset a domain to its shipped default. */
  async resetDomain(domain: CacheDomain): Promise<CacheConfigEntity> {
    const row = await this.get();
    const overrides = { ...(row.domainSettings || {}) };
    overrides[domain] = DOMAIN_DEFAULTS[domain];
    row.domainSettings = overrides;
    this.cached = await this.repo.save(row);
    return this.cached;
  }
}
