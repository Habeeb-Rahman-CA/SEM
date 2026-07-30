import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Advertisement, AdPlacement } from './entities/advertisement.entity';
import { AdEvent, AdEventType } from './entities/ad-event.entity';
import { Sponsor } from '../sponsors/entities/sponsor.entity';
import { Event } from '../events/entities/event.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { LicensingService } from '../licensing/licensing.service';
import { FEATURE_CODES } from '../licensing/feature-codes';
import {
  CreateAdvertisementDto,
  UpdateAdvertisementDto,
} from './dto/advertisement.dto';

/**
 * Serves ad creatives to the public frontend, records impressions and
 * clicks, and powers the workspace-side campaign reporting.
 *
 * Rotation policy — `serveForPlacement`:
 *   1. Filter candidates: same placement, active, inside [startDate,
 *      endDate], eventId matches (or is null == workspace-wide).
 *   2. **Sponsor-first**: if any candidate is linked to an *active,
 *      in-window* sponsor, only those participate in the pick.
 *   3. Weighted random pick from the surviving candidates.
 *
 * Impression / click writes are cheap: increment the aggregate counter
 * on the row + append an AdEvent for detailed trails. Both happen
 * synchronously — real deployments should offload the AdEvent write to
 * a queue when volume warrants it.
 */
@Injectable()
export class AdvertisementsService {
  constructor(
    @InjectRepository(Advertisement)
    private readonly adRepo: Repository<Advertisement>,
    @InjectRepository(AdEvent)
    private readonly eventRepo: Repository<AdEvent>,
    @InjectRepository(Sponsor)
    private readonly sponsorRepo: Repository<Sponsor>,
    @InjectRepository(Event)
    private readonly eventEntityRepo: Repository<Event>,
    private readonly workspacesService: WorkspacesService,
    private readonly licensing: LicensingService,
  ) {}

  // ─── Workspace CRUD ─────────────────────────────────────────────────

  async list(workspaceId: string, userId: string): Promise<Advertisement[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.adRepo.find({
      where: { workspaceId },
      relations: { event: true, sponsor: true },
      order: { isActive: 'DESC', createdAt: 'DESC' },
    });
  }

  async create(
    workspaceId: string,
    dto: CreateAdvertisementDto,
    userId: string,
  ): Promise<Advertisement> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    await this.licensing.requireFeature(workspaceId, FEATURE_CODES.adsEnabled);

    await this.validateScope(workspaceId, dto.eventId, dto.sponsorId);

    const ad = this.adRepo.create({
      workspaceId,
      name: dto.name,
      title: dto.title ?? null,
      imageUrl: dto.imageUrl,
      targetUrl: dto.targetUrl,
      placement: dto.placement,
      eventId: dto.eventId ?? null,
      sponsorId: dto.sponsorId ?? null,
      isActive: dto.isActive ?? true,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      weight: dto.weight ?? 1,
    });
    return this.adRepo.save(ad);
  }

  async update(
    workspaceId: string,
    adId: string,
    dto: UpdateAdvertisementDto,
    userId: string,
  ): Promise<Advertisement> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    await this.licensing.requireFeature(workspaceId, FEATURE_CODES.adsEnabled);

    const ad = await this.adRepo.findOne({
      where: { id: adId, workspaceId },
    });
    if (!ad) throw new NotFoundException('Advertisement not found');

    if (dto.eventId !== undefined || dto.sponsorId !== undefined) {
      await this.validateScope(
        workspaceId,
        dto.eventId ?? ad.eventId,
        dto.sponsorId ?? ad.sponsorId,
      );
    }

    Object.assign(ad, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.targetUrl !== undefined && { targetUrl: dto.targetUrl }),
      ...(dto.placement !== undefined && { placement: dto.placement }),
      ...(dto.eventId !== undefined && { eventId: dto.eventId }),
      ...(dto.sponsorId !== undefined && { sponsorId: dto.sponsorId }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.startDate !== undefined && {
        startDate: dto.startDate ? new Date(dto.startDate) : null,
      }),
      ...(dto.endDate !== undefined && {
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      }),
      ...(dto.weight !== undefined && { weight: dto.weight }),
    });
    return this.adRepo.save(ad);
  }

  async remove(
    workspaceId: string,
    adId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'event.manage',
    );
    const ad = await this.adRepo.findOne({
      where: { id: adId, workspaceId },
    });
    if (!ad) throw new NotFoundException('Advertisement not found');
    ad.deletedAt = new Date();
    await this.adRepo.save(ad);
  }

  async getStats(
    workspaceId: string,
    userId: string,
  ): Promise<{
    totalAds: number;
    activeAds: number;
    totalImpressions: number;
    totalClicks: number;
    overallCtr: number;
    perPlacement: Array<{
      placement: AdPlacement;
      ads: number;
      impressions: number;
      clicks: number;
      ctr: number;
    }>;
  }> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const ads = await this.adRepo.find({ where: { workspaceId } });
    const totalImpressions = ads.reduce((s, a) => s + a.impressionCount, 0);
    const totalClicks = ads.reduce((s, a) => s + a.clickCount, 0);
    const overallCtr = totalImpressions
      ? Math.round((totalClicks / totalImpressions) * 10_000) / 100
      : 0;

    const perPlacementMap = new Map<
      AdPlacement,
      { ads: number; impressions: number; clicks: number }
    >();
    for (const a of ads) {
      const bucket = perPlacementMap.get(a.placement) ?? {
        ads: 0,
        impressions: 0,
        clicks: 0,
      };
      bucket.ads++;
      bucket.impressions += a.impressionCount;
      bucket.clicks += a.clickCount;
      perPlacementMap.set(a.placement, bucket);
    }

    return {
      totalAds: ads.length,
      activeAds: ads.filter((a) => a.isActive).length,
      totalImpressions,
      totalClicks,
      overallCtr,
      perPlacement: Array.from(perPlacementMap.entries()).map(([p, s]) => ({
        placement: p,
        ads: s.ads,
        impressions: s.impressions,
        clicks: s.clicks,
        ctr: s.impressions
          ? Math.round((s.clicks / s.impressions) * 10_000) / 100
          : 0,
      })),
    };
  }

  // ─── Public serving ────────────────────────────────────────────────

  async serveForPlacement(
    placement: AdPlacement,
    eventId: string | null,
  ): Promise<{
    id: string;
    title: string | null;
    imageUrl: string;
    targetUrl: string;
    sponsorName: string | null;
  } | null> {
    const now = new Date();

    // Fetch candidates: right placement, active. Optionally scoped to
    // the eventId (ads with a null eventId match every event too, so
    // workspace-wide creatives still appear).
    const qb = this.adRepo
      .createQueryBuilder('ad')
      .leftJoinAndSelect('ad.sponsor', 'sponsor')
      .where('ad.placement = :placement', { placement })
      .andWhere('ad.isActive = TRUE')
      .andWhere('ad.deletedAt IS NULL')
      .andWhere('(ad.startDate IS NULL OR ad.startDate <= :now)', { now })
      .andWhere('(ad.endDate IS NULL OR ad.endDate >= :now)', { now });

    if (eventId) {
      qb.andWhere('(ad.eventId = :eventId OR ad.eventId IS NULL)', {
        eventId,
      });
    } else {
      // No event context — only unscoped ads eligible.
      qb.andWhere('ad.eventId IS NULL');
    }

    const candidates = await qb.getMany();
    if (candidates.length === 0) return null;

    // Sponsor-first priority: if any candidate has an active + in-window
    // sponsor, restrict the pool to those.
    const sponsorFirst = candidates.filter((a) =>
      this.isSponsorEligible(a.sponsor),
    );
    const pool = sponsorFirst.length > 0 ? sponsorFirst : candidates;

    const picked = this.weightedPick(pool);
    return picked
      ? {
          id: picked.id,
          title: picked.title,
          imageUrl: picked.imageUrl,
          targetUrl: picked.targetUrl,
          sponsorName: picked.sponsor?.name ?? null,
        }
      : null;
  }

  async recordEvent(
    adId: string,
    eventType: AdEventType,
    sourceIp: string | null,
    userAgent: string | null,
    referrer: string | null,
  ): Promise<{ ok: true }> {
    const ad = await this.adRepo.findOne({ where: { id: adId } });
    if (!ad) throw new NotFoundException('Advertisement not found');

    // Bump the aggregate counter atomically. Skip the ORM entity path —
    // a direct UPDATE is one round-trip and avoids read-then-write races.
    const column = eventType === 'click' ? 'click_count' : 'impression_count';
    await this.adRepo
      .createQueryBuilder()
      .update(Advertisement)
      .set({
        [column === 'click_count' ? 'clickCount' : 'impressionCount']: () =>
          `${column} + 1`,
      })
      .where('id = :id', { id: adId })
      .execute();

    // Append the trail row. Fire-and-forget style — if this fails the
    // aggregate is still correct.
    try {
      await this.eventRepo.save(
        this.eventRepo.create({
          adId,
          eventType,
          sourceIp,
          userAgent: userAgent ? userAgent.slice(0, 400) : null,
          referrer: referrer ? referrer.slice(0, 500) : null,
        }),
      );
    } catch {
      // Silent — never fail the endpoint over the trail row.
    }

    return { ok: true };
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private async validateScope(
    workspaceId: string,
    eventId?: string | null,
    sponsorId?: string | null,
  ): Promise<void> {
    if (eventId) {
      const evt = await this.eventEntityRepo.findOne({
        where: { id: eventId, workspaceId },
      });
      if (!evt) {
        throw new BadRequestException(
          'Scoped event does not belong to this workspace',
        );
      }
    }
    if (sponsorId) {
      const sp = await this.sponsorRepo.findOne({
        where: { id: sponsorId, workspaceId },
      });
      if (!sp) {
        throw new BadRequestException(
          'Linked sponsor does not belong to this workspace',
        );
      }
    }
  }

  private isSponsorEligible(sponsor: Sponsor | null | undefined): boolean {
    if (!sponsor || !sponsor.isActive) return false;
    const now = Date.now();
    if (sponsor.startDate && sponsor.startDate.getTime() > now) return false;
    if (sponsor.endDate && sponsor.endDate.getTime() < now) return false;
    return true;
  }

  private weightedPick(pool: Advertisement[]): Advertisement | null {
    if (pool.length === 0) return null;
    if (pool.length === 1) return pool[0];
    const total = pool.reduce((s, a) => s + Math.max(1, a.weight), 0);
    let r = Math.random() * total;
    for (const a of pool) {
      r -= Math.max(1, a.weight);
      if (r <= 0) return a;
    }
    return pool[pool.length - 1];
  }
}
