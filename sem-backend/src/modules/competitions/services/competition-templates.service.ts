import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompetitionTemplate } from '../entities/competition-template.entity';
import { Competition } from '../entities/competition.entity';
import { CompetitionStage } from '../entities/competition-stage.entity';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { CreateCompetitionTemplateDto } from '../dto/create-competition-template.dto';
import { UpdateCompetitionTemplateDto } from '../dto/update-template-types.dto';

export interface ApplyTemplateResult {
  competitionId: string;
  stagesCreated: number;
}

@Injectable()
export class CompetitionTemplatesService {
  constructor(
    @InjectRepository(CompetitionTemplate)
    private readonly templateRepo: Repository<CompetitionTemplate>,
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(CompetitionStage)
    private readonly stageRepo: Repository<CompetitionStage>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────

  async getTemplates(
    workspaceId: string,
    userId: string,
  ): Promise<CompetitionTemplate[]> {
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
  ): Promise<CompetitionTemplate> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.read',
    );
    const template = await this.templateRepo.findOne({
      where: { id: templateId, workspaceId },
    });
    if (!template)
      throw new NotFoundException(`Competition template not found`);
    return template;
  }

  // ── Create from scratch ───────────────────────────────────────────────────

  async createTemplate(
    workspaceId: string,
    dto: CreateCompetitionTemplateDto,
    userId: string,
  ): Promise<CompetitionTemplate> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );

    const template = this.templateRepo.create({
      workspaceId,
      name: dto.name,
      description: dto.description ?? null,
      sportId: dto.sportId ?? null,
      pointsConfig: dto.pointsConfig ?? null,
      stageBlueprints: dto.stageBlueprints ?? null,
    });
    return this.templateRepo.save(template);
  }

  // ── Save from existing competition ────────────────────────────────────────

  async createFromCompetition(
    workspaceId: string,
    eventId: string,
    competitionId: string,
    name: string,
    userId: string,
  ): Promise<CompetitionTemplate> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );

    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
      relations: { sport: true },
    });
    if (!competition) throw new NotFoundException(`Competition not found`);

    const stages = await this.stageRepo.find({
      where: { competitionId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });

    const stageBlueprints = stages.map((s, idx) => ({
      name: s.name,
      type: s.type,
      sequence: s.sequence ?? idx + 1,
      config: s.config ?? {},
    }));

    const template = this.templateRepo.create({
      workspaceId,
      name,
      description: `Captured from competition "${competition.name}"`,
      sportId: competition.sportId ?? null,
      pointsConfig: competition.pointsConfig ?? null,
      stageBlueprints: stageBlueprints.length > 0 ? stageBlueprints : null,
    });
    return this.templateRepo.save(template);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateTemplate(
    workspaceId: string,
    templateId: string,
    dto: UpdateCompetitionTemplateDto,
    userId: string,
  ): Promise<CompetitionTemplate> {
    const template = await this.getTemplate(workspaceId, templateId, userId);
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );

    Object.assign(template, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.sportId !== undefined && { sportId: dto.sportId }),
      ...(dto.pointsConfig !== undefined && { pointsConfig: dto.pointsConfig }),
      ...(dto.stageBlueprints !== undefined && {
        stageBlueprints: dto.stageBlueprints,
      }),
    });
    return this.templateRepo.save(template);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async deleteTemplate(
    workspaceId: string,
    templateId: string,
    userId: string,
  ): Promise<void> {
    const template = await this.getTemplate(workspaceId, templateId, userId);
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );
    template.deletedAt = new Date();
    await this.templateRepo.save(template);
  }

  // ── Apply to competition ──────────────────────────────────────────────────
  /**
   * Applies all stage blueprints from the template to an existing competition.
   * Existing stages in that competition are soft-deleted first.
   */
  async applyToCompetition(
    workspaceId: string,
    templateId: string,
    eventId: string,
    competitionId: string,
    userId: string,
  ): Promise<ApplyTemplateResult> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'competition.manage',
    );

    const template = await this.templateRepo.findOne({
      where: { id: templateId, workspaceId },
    });
    if (!template)
      throw new NotFoundException(`Competition template not found`);

    const competition = await this.competitionRepo.findOne({
      where: { id: competitionId, eventId },
    });
    if (!competition) throw new NotFoundException(`Competition not found`);

    // Optionally update sport & points config on the competition
    let updated = false;
    if (template.sportId && !competition.sportId) {
      competition.sportId = template.sportId;
      updated = true;
    }
    if (template.pointsConfig) {
      competition.pointsConfig = template.pointsConfig;
      updated = true;
    }
    if (updated) await this.competitionRepo.save(competition);

    // Soft-delete existing stages
    const existingStages = await this.stageRepo.find({
      where: { competitionId },
    });
    if (existingStages.length > 0) {
      existingStages.forEach((s) => (s.deletedAt = new Date()));
      await this.stageRepo.save(existingStages);
    }

    // Create stages from blueprints
    const blueprints = template.stageBlueprints ?? [];
    let stagesCreated = 0;
    for (const bp of blueprints) {
      const stage = this.stageRepo.create({
        competitionId,
        name: bp.name,
        type: bp.type as any,
        sequence: bp.sequence,
        config: bp.config as any,
      });
      await this.stageRepo.save(stage);
      stagesCreated++;
    }

    // Increment use count
    template.useCount = (template.useCount ?? 0) + 1;
    await this.templateRepo.save(template);

    return { competitionId, stagesCreated };
  }
}
