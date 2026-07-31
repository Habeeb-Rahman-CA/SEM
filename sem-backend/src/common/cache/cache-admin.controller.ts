import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CacheService } from './cache.service';
import { CacheInvalidator } from './cache.invalidator';
import { CacheConfigService, CacheDomain } from './cache-config.service';
import { UpdateCacheConfigDto, UpsertDomainDto } from './dto/cache-admin.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../modules/auth/guards/super-admin.guard';

/**
 * Full admin API for the cache manager UI. Restricted to super-admins.
 *
 * Endpoints are grouped into three families:
 *
 *   /admin/cache/stats        — observability
 *   /admin/cache/keys*        — browse + inspect what's cached
 *   /admin/cache/invalidate*  — targeted flushes (pattern, domain, all)
 *   /admin/cache/config*      — persistent runtime configuration
 */
@ApiTags('Admin — Cache')
@ApiBearerAuth()
@Controller('admin/cache')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class CacheAdminController {
  constructor(
    private readonly cache: CacheService,
    private readonly invalidator: CacheInvalidator,
    private readonly config: CacheConfigService,
  ) {}

  // ─── Observability ───────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Backend + counters + hit-rate' })
  stats() {
    return this.cache.stats();
  }

  // ─── Keys browser ────────────────────────────────────────────────────

  @Get('keys')
  @ApiOperation({
    summary:
      'Browse cache keys (with TTL + size + preview). Pattern uses `*`/`?`',
  })
  @ApiQuery({ name: 'pattern', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listKeys(@Query('pattern') pattern: string, @Query('limit') limit: string) {
    return this.cache.listKeys(
      pattern || '*',
      limit ? Math.min(500, Math.max(1, Number(limit))) : 200,
    );
  }

  @Get('keys/inspect')
  @ApiOperation({
    summary: 'Inspect the full cached value for a single key',
  })
  @ApiQuery({ name: 'key', required: true })
  async inspect(@Query('key') key: string) {
    if (!key) throw new NotFoundException('key query parameter is required');
    const detail = await this.cache.inspect(key);
    if (!detail) throw new NotFoundException(`Cache key not found: ${key}`);
    return detail;
  }

  @Delete('keys')
  @ApiOperation({ summary: 'Delete one or more exact keys' })
  @ApiQuery({ name: 'key', required: true, isArray: true })
  async deleteKeys(@Query('key') keys: string | string[]) {
    const list = Array.isArray(keys) ? keys : [keys];
    const removed = await this.cache.del(...list);
    return { keys: list, removed };
  }

  // ─── Invalidation ────────────────────────────────────────────────────

  @Delete('invalidate')
  @ApiOperation({
    summary: 'Invalidate every key matching a glob pattern (e.g. `ws:abc:*`)',
  })
  @ApiQuery({ name: 'pattern', required: true })
  async invalidate(@Query('pattern') pattern: string) {
    const count = await this.cache.invalidatePattern(pattern);
    return { pattern, invalidated: count };
  }

  @Post('invalidate/domain/:domain')
  @ApiOperation({
    summary:
      'Invalidate every cache entry for a domain — dashboard, rankings, public, permissions, lookup, auction, finance, workspace',
  })
  @ApiParam({ name: 'domain' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @ApiQuery({ name: 'competitionId', required: false })
  @ApiQuery({ name: 'season', required: false })
  async invalidateDomain(
    @Param('domain') domain: string,
    @Query('workspaceId') workspaceId: string,
    @Query('competitionId') competitionId: string,
    @Query('season') season: string,
  ) {
    switch (domain) {
      case 'workspace':
        if (!workspaceId)
          return { error: 'workspaceId required', invalidated: 0 };
        await this.invalidator.invalidateWorkspace(workspaceId);
        return { domain, workspaceId, invalidated: true };
      case 'dashboard':
        if (!workspaceId)
          return { error: 'workspaceId required', invalidated: 0 };
        await this.invalidator.invalidateDashboard(workspaceId);
        return { domain, workspaceId, invalidated: true };
      case 'rankings':
      case 'leaderboard':
        if (!workspaceId)
          return { error: 'workspaceId required', invalidated: 0 };
        await this.invalidator.invalidateRankings(workspaceId, competitionId);
        return { domain, workspaceId, competitionId, invalidated: true };
      case 'public':
        await this.cache.invalidatePrefix('public:');
        return { domain, invalidated: true };
      case 'permissions':
        if (!workspaceId)
          return { error: 'workspaceId required', invalidated: 0 };
        await this.invalidator.invalidatePermissions(workspaceId);
        return { domain, workspaceId, invalidated: true };
      case 'lookup':
      case 'reference':
        await this.invalidator.invalidateReferenceData();
        return { domain, invalidated: true };
      case 'auction':
        if (!workspaceId)
          return { error: 'workspaceId required', invalidated: 0 };
        await this.invalidator.invalidateAuctionSummary(workspaceId);
        return { domain, workspaceId, invalidated: true };
      case 'finance':
        if (!workspaceId)
          return { error: 'workspaceId required', invalidated: 0 };
        await this.invalidator.invalidateFinance(workspaceId, season);
        return { domain, workspaceId, season, invalidated: true };
      default:
        return { error: `Unknown domain: ${domain}` };
    }
  }

  @Delete('flush')
  @ApiOperation({
    summary:
      'Drop every namespaced cache entry (nuke). Confirms via ?confirm=true',
  })
  @ApiQuery({ name: 'confirm', required: true })
  async flush(@Query('confirm') confirm: string) {
    if (confirm !== 'true') {
      return {
        flushed: false,
        message: 'Add ?confirm=true to acknowledge — this drops every key',
      };
    }
    await this.cache.flush();
    return { flushed: true };
  }

  // ─── Configuration ───────────────────────────────────────────────────

  @Get('config')
  @ApiOperation({ summary: 'Get persistent cache configuration' })
  getConfig() {
    return this.config.get();
  }

  @Patch('config')
  @ApiOperation({ summary: 'Update cache configuration (partial merge)' })
  updateConfig(@Body() dto: UpdateCacheConfigDto, @Request() req: any) {
    return this.config.update(dto, req.user?.id);
  }

  @Get('config/domains')
  @ApiOperation({
    summary: 'List every known cache domain with its effective settings',
  })
  listDomains() {
    return this.config.listDomains();
  }

  @Patch('config/domains/:domain')
  @ApiOperation({
    summary:
      'Enable/disable a domain and override its TTL (persisted across restarts)',
  })
  @ApiParam({ name: 'domain' })
  async updateDomain(
    @Param('domain') domain: string,
    @Body() dto: UpsertDomainDto,
    @Request() req: any,
  ) {
    return this.config.update(
      {
        domainSettings: {
          [domain as CacheDomain]: { enabled: dto.enabled, ttlSec: dto.ttlSec },
        },
      },
      req.user?.id,
    );
  }

  @Delete('config/domains/:domain')
  @ApiOperation({ summary: 'Reset a domain to its shipped default' })
  @ApiParam({ name: 'domain' })
  resetDomain(@Param('domain') domain: string) {
    return this.config.resetDomain(domain as CacheDomain);
  }
}
