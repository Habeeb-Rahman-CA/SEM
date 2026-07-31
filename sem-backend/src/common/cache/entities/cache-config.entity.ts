import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Persisted cache configuration. Single row (id = 'singleton') so the
 * config survives restarts. The service seeds a default row on boot if
 * none exists.
 *
 * `domainSettings` is a jsonb blob so we can add new domains without a
 * migration — the shape is:
 *
 *   {
 *     dashboard:  { enabled: true,  ttlSec: 60 },
 *     leaderboard:{ enabled: true,  ttlSec: 300 },
 *     public:     { enabled: true,  ttlSec: 60 },
 *     permissions:{ enabled: true,  ttlSec: 1800 },
 *     lookup:     { enabled: true,  ttlSec: 3600 },
 *     auction:    { enabled: true,  ttlSec: 60 },
 *     finance:    { enabled: true,  ttlSec: 60 },
 *   }
 *
 * Callers that want to honor operator settings should read via
 * CacheConfigService.getSettings(domain) instead of hardcoding TTLs.
 */
@Entity('cache_configs')
export class CacheConfigEntity {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ name: 'globally_enabled', type: 'boolean', default: true })
  globallyEnabled: boolean;

  @Column({ name: 'namespace', type: 'varchar', length: 60, default: 'sem' })
  namespace: string;

  @Column({ name: 'domain_settings', type: 'jsonb', nullable: true })
  domainSettings: Record<string, { enabled: boolean; ttlSec: number }> | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById: string | null;
}
