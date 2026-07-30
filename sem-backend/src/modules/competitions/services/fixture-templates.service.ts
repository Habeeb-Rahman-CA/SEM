import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FixtureTemplate } from '../entities/fixture-template.entity';
import { Venue } from '../../venues/entities/venue.entity';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { CreateFixtureTemplateDto } from '../dto/create-fixture-template.dto';
import { UpdateFixtureTemplateDto } from '../dto/update-template-types.dto';

export interface ResolvedScheduleConfig {
  matchIntervalDays: number;
  matchesPerDay: number;
  gapBetweenMatchesMinutes: number;
  defaultKickoffTime: string | null;
  venueStrategy: string;
  /** Ordered venue IDs resolved from template slots */
  resolvedVenueIds: string[];
  /** Kickoff Date generator — returns the next Date given start date + round index */
  getMatchDate: (
    startDate: Date,
    roundIndex: number,
    matchIndexInRound: number,
  ) => Date;
}

@Injectable()
export class FixtureTemplatesService {
  constructor(
    @InjectRepository(FixtureTemplate)
    private readonly templateRepo: Repository<FixtureTemplate>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────

  async getTemplates(
    workspaceId: string,
    userId: string,
  ): Promise<FixtureTemplate[]> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.read',
    );
    return this.templateRepo.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Get Single ────────────────────────────────────────────────────────────

  async getTemplate(
    workspaceId: string,
    templateId: string,
    userId: string,
  ): Promise<FixtureTemplate> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.read',
    );
    const tmpl = await this.templateRepo.findOne({
      where: { id: templateId, workspaceId },
    });
    if (!tmpl) throw new NotFoundException(`Fixture template not found`);
    return tmpl;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createTemplate(
    workspaceId: string,
    dto: CreateFixtureTemplateDto,
    userId: string,
  ): Promise<FixtureTemplate> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );
    const tmpl = this.templateRepo.create({
      workspaceId,
      name: dto.name,
      description: dto.description ?? null,
      defaultKickoffTime: dto.defaultKickoffTime ?? null,
      matchIntervalDays: dto.matchIntervalDays ?? 1,
      matchesPerDay: dto.matchesPerDay ?? 1,
      gapBetweenMatchesMinutes: dto.gapBetweenMatchesMinutes ?? 90,
      venueSlots: dto.venueSlots ?? null,
      venueStrategy: dto.venueStrategy ?? 'round_robin',
    });
    return this.templateRepo.save(tmpl);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateTemplate(
    workspaceId: string,
    templateId: string,
    dto: UpdateFixtureTemplateDto,
    userId: string,
  ): Promise<FixtureTemplate> {
    const tmpl = await this.getTemplate(workspaceId, templateId, userId);
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );
    Object.assign(tmpl, dto);
    return this.templateRepo.save(tmpl);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async deleteTemplate(
    workspaceId: string,
    templateId: string,
    userId: string,
  ): Promise<void> {
    const tmpl = await this.getTemplate(workspaceId, templateId, userId);
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );
    tmpl.deletedAt = new Date();
    await this.templateRepo.save(tmpl);
  }

  // ── Resolve to scheduling config ──────────────────────────────────────────
  /**
   * Resolves a template into a concrete scheduling configuration object.
   * The FixturesGeneratorService can consume this to drive match date / venue assignment.
   */
  async resolveConfig(
    workspaceId: string,
    templateId: string,
    userId: string,
  ): Promise<ResolvedScheduleConfig> {
    const tmpl = await this.getTemplate(workspaceId, templateId, userId);

    // Build ordered venue IDs from slots
    const sortedSlots = (tmpl.venueSlots ?? []).sort(
      (a, b) => a.priority - b.priority,
    );
    const resolvedVenueIds = sortedSlots.map((s) => s.venueId);

    // Kickoff time parser: "15:00" → { hours: 15, minutes: 0 }
    const [kickHours, kickMinutes] = tmpl.defaultKickoffTime
      ? tmpl.defaultKickoffTime.split(':').map(Number)
      : [null, null];

    const intervalDays = tmpl.matchIntervalDays;
    const matchesPerDay = tmpl.matchesPerDay;
    const gapMinutes = tmpl.gapBetweenMatchesMinutes;

    const getMatchDate = (
      startDate: Date,
      roundIndex: number,
      matchIndexInRound: number,
    ): Date => {
      const dayOffset =
        roundIndex * intervalDays +
        Math.floor(matchIndexInRound / matchesPerDay);
      const matchOnDayIndex = matchIndexInRound % matchesPerDay;

      const d = new Date(startDate);
      d.setDate(d.getDate() + dayOffset);

      if (kickHours !== null && kickMinutes !== null) {
        d.setHours(kickHours, kickMinutes + matchOnDayIndex * gapMinutes, 0, 0);
      } else {
        // Preserve existing time but add gap offset
        d.setMinutes(d.getMinutes() + matchOnDayIndex * gapMinutes, 0, 0);
      }
      return d;
    };

    // Bump use count
    tmpl.useCount = (tmpl.useCount ?? 0) + 1;
    await this.templateRepo.save(tmpl);

    return {
      matchIntervalDays: intervalDays,
      matchesPerDay,
      gapBetweenMatchesMinutes: gapMinutes,
      defaultKickoffTime: tmpl.defaultKickoffTime,
      venueStrategy: tmpl.venueStrategy,
      resolvedVenueIds,
      getMatchDate,
    };
  }
}
