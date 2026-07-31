import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheKeys } from './cache.keys';

/**
 * Cross-cutting invalidation. Instead of every service knowing about
 * every key it might affect, mutations funnel through here — one method
 * per "event" that should drop stale cache entries.
 *
 * This keeps the invalidation strategy discoverable in one file: if a
 * new cache key is introduced, it should get a corresponding drop path
 * here so writers don't accidentally serve stale reads after edits.
 *
 * Callers should invoke *after* the write commits, not before, so a
 * failed write doesn't clear caches and leave everyone reloading.
 */
@Injectable()
export class CacheInvalidator {
  private readonly logger = new Logger(CacheInvalidator.name);

  constructor(private readonly cache: CacheService) {}

  /** Any workspace-scoped change — the nuclear option. Prefer more precise
   *  helpers below when you know the domain. */
  async invalidateWorkspace(workspaceId: string): Promise<void> {
    const n = await this.cache.invalidatePrefix(
      CacheKeys.workspacePrefix(workspaceId),
    );
    if (n > 0)
      this.logger.debug(`Invalidated ${n} keys for workspace ${workspaceId}`);
  }

  async invalidateDashboard(workspaceId: string): Promise<void> {
    await this.cache.invalidatePrefix(
      CacheKeys.dashboardOverviewPrefix(workspaceId),
    );
  }

  async invalidateRankings(
    workspaceId: string,
    competitionId?: string,
  ): Promise<void> {
    if (competitionId) {
      await Promise.all([
        this.cache.del(
          CacheKeys.competitionRankings(workspaceId, competitionId),
        ),
        this.cache.del(CacheKeys.standings(workspaceId, competitionId)),
      ]);
    } else {
      await this.cache.invalidatePrefix(CacheKeys.rankingsPrefix(workspaceId));
    }
  }

  async invalidatePublicEvent(eventId: string): Promise<void> {
    await Promise.all([
      this.cache.del(CacheKeys.publicEvent(eventId)),
      this.cache.del(CacheKeys.publicEventList()),
    ]);
  }

  async invalidatePublicMatch(matchId: string): Promise<void> {
    await Promise.all([
      this.cache.del(CacheKeys.publicMatchDetail(matchId)),
      this.cache.del(CacheKeys.publicLiveMatches()),
    ]);
  }

  async invalidatePermissions(
    workspaceId: string,
    userId?: string,
  ): Promise<void> {
    if (userId) {
      await this.cache.del(CacheKeys.memberPermissions(workspaceId, userId));
    } else {
      await this.cache.invalidatePrefix(
        CacheKeys.memberPermissionsPrefix(workspaceId),
      );
    }
    // Role/member list often changes with permissions
    await Promise.all([
      this.cache.del(CacheKeys.workspaceRoles(workspaceId)),
      this.cache.del(CacheKeys.workspaceMembers(workspaceId)),
    ]);
  }

  /** Static reference data changed (rare: super-admin adding a sport). */
  async invalidateReferenceData(): Promise<void> {
    await Promise.all([
      this.cache.del(CacheKeys.sports()),
      this.cache.del(CacheKeys.referenceData()),
    ]);
  }

  async invalidateAuctionSummary(workspaceId: string): Promise<void> {
    await this.cache.del(CacheKeys.auctionSummary(workspaceId));
  }

  async invalidateFinance(workspaceId: string, season?: string): Promise<void> {
    if (season) {
      await this.cache.del(CacheKeys.financeSummary(workspaceId, season));
    } else {
      await this.cache.invalidatePattern(
        `${CacheKeys.workspacePrefix(workspaceId)}finance:*`,
      );
    }
  }
}
