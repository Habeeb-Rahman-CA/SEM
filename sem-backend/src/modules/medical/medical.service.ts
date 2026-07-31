import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { MedicalProfile } from './entities/medical-profile.entity';
import { MedicalInjury } from './entities/medical-injury.entity';
import { RecoveryPlan } from './entities/recovery-plan.entity';
import { FitnessStatus } from './entities/fitness-status.entity';
import { MedicalAlert } from './entities/medical-alert.entity';
import { Player } from '../players/entities/player.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateMedicalProfileDto } from './dto/create-medical-profile.dto';
import { UpdateMedicalProfileDto } from './dto/update-medical-profile.dto';
import { CreateInjuryDto } from './dto/create-injury.dto';
import { UpdateInjuryDto } from './dto/update-injury.dto';
import { CreateRecoveryPlanDto } from './dto/create-recovery-plan.dto';
import { UpdateRecoveryPlanDto } from './dto/update-recovery-plan.dto';
import { CreateFitnessStatusDto } from './dto/create-fitness-status.dto';
import { CreateAlertDto, UpdateAlertStatusDto } from './dto/create-alert.dto';

@Injectable()
export class MedicalService {
  constructor(
    @InjectRepository(MedicalProfile)
    private readonly profileRepo: Repository<MedicalProfile>,
    @InjectRepository(MedicalInjury)
    private readonly injuryRepo: Repository<MedicalInjury>,
    @InjectRepository(RecoveryPlan)
    private readonly recoveryRepo: Repository<RecoveryPlan>,
    @InjectRepository(FitnessStatus)
    private readonly fitnessRepo: Repository<FitnessStatus>,
    @InjectRepository(MedicalAlert)
    private readonly alertRepo: Repository<MedicalAlert>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Medical Profiles ────────────────────────────────────────────────────

  async getProfiles(
    workspaceId: string,
    userId: string,
  ): Promise<MedicalProfile[]> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    return this.profileRepo.find({
      where: { workspaceId },
      relations: { player: { user: true, team: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async getProfileById(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<MedicalProfile> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const profile = await this.profileRepo.findOne({
      where: { id, workspaceId },
      relations: {
        player: { user: true, team: true },
        injuries: { recoveryPlan: true },
        fitnessHistory: { assessedBy: true },
        alerts: { acknowledgedBy: true },
      },
    });
    if (!profile) {
      throw new NotFoundException('Medical profile not found');
    }
    return profile;
  }

  async getProfileByPlayer(
    workspaceId: string,
    playerId: string,
    userId: string,
  ): Promise<MedicalProfile | null> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    return this.profileRepo.findOne({
      where: { workspaceId, playerId },
      relations: {
        player: { user: true, team: true },
        injuries: { recoveryPlan: true },
        fitnessHistory: { assessedBy: true },
        alerts: { acknowledgedBy: true },
      },
    });
  }

  async createProfile(
    workspaceId: string,
    dto: CreateMedicalProfileDto,
    userId: string,
  ): Promise<MedicalProfile> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const player = await this.playerRepo.findOne({
      where: { id: dto.playerId, workspaceId },
    });
    if (!player) {
      throw new NotFoundException('Player not found in this workspace');
    }

    const existing = await this.profileRepo.findOne({
      where: { workspaceId, playerId: dto.playerId },
    });
    if (existing) {
      throw new ConflictException(
        'Medical profile already exists for this player',
      );
    }

    const profile = this.profileRepo.create({
      workspaceId,
      playerId: dto.playerId,
      bloodGroup: dto.bloodGroup || null,
      heightCm: dto.heightCm ?? null,
      weightKg: dto.weightKg ?? null,
      allergies: dto.allergies || null,
      chronicConditions: dto.chronicConditions || null,
      medications: dto.medications || null,
      emergencyContactName: dto.emergencyContactName || null,
      emergencyContactPhone: dto.emergencyContactPhone || null,
      emergencyContactRelation: dto.emergencyContactRelation || null,
      physicianName: dto.physicianName || null,
      physicianPhone: dto.physicianPhone || null,
      insuranceProvider: dto.insuranceProvider || null,
      insurancePolicyNumber: dto.insurancePolicyNumber || null,
      lastCheckupDate: dto.lastCheckupDate
        ? new Date(dto.lastCheckupDate)
        : null,
      nextCheckupDate: dto.nextCheckupDate
        ? new Date(dto.nextCheckupDate)
        : null,
      fitnessLevel: dto.fitnessLevel || 'fit',
      clearedToPlay: dto.clearedToPlay ?? true,
      notes: dto.notes || null,
    });

    const saved = await this.profileRepo.save(profile);

    // Allergy alerts on profile creation
    if (saved.allergies && saved.allergies.length > 0) {
      await this.raiseAlert(workspaceId, saved.id, {
        severity: 'warning',
        source: 'allergy',
        title: 'Allergy information on file',
        message: `Player has known allergies: ${saved.allergies.join(', ')}`,
      });
    }

    return this.getProfileById(workspaceId, saved.id, userId);
  }

  async updateProfile(
    workspaceId: string,
    id: string,
    dto: UpdateMedicalProfileDto,
    userId: string,
  ): Promise<MedicalProfile> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const profile = await this.profileRepo.findOne({
      where: { id, workspaceId },
    });
    if (!profile) {
      throw new NotFoundException('Medical profile not found');
    }

    const oldClearance = profile.clearedToPlay;
    const oldFitness = profile.fitnessLevel;

    Object.assign(profile, {
      ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup }),
      ...(dto.heightCm !== undefined && { heightCm: dto.heightCm }),
      ...(dto.weightKg !== undefined && { weightKg: dto.weightKg }),
      ...(dto.allergies !== undefined && { allergies: dto.allergies }),
      ...(dto.chronicConditions !== undefined && {
        chronicConditions: dto.chronicConditions,
      }),
      ...(dto.medications !== undefined && { medications: dto.medications }),
      ...(dto.emergencyContactName !== undefined && {
        emergencyContactName: dto.emergencyContactName,
      }),
      ...(dto.emergencyContactPhone !== undefined && {
        emergencyContactPhone: dto.emergencyContactPhone,
      }),
      ...(dto.emergencyContactRelation !== undefined && {
        emergencyContactRelation: dto.emergencyContactRelation,
      }),
      ...(dto.physicianName !== undefined && {
        physicianName: dto.physicianName,
      }),
      ...(dto.physicianPhone !== undefined && {
        physicianPhone: dto.physicianPhone,
      }),
      ...(dto.insuranceProvider !== undefined && {
        insuranceProvider: dto.insuranceProvider,
      }),
      ...(dto.insurancePolicyNumber !== undefined && {
        insurancePolicyNumber: dto.insurancePolicyNumber,
      }),
      ...(dto.lastCheckupDate !== undefined && {
        lastCheckupDate: dto.lastCheckupDate
          ? new Date(dto.lastCheckupDate)
          : null,
      }),
      ...(dto.nextCheckupDate !== undefined && {
        nextCheckupDate: dto.nextCheckupDate
          ? new Date(dto.nextCheckupDate)
          : null,
      }),
      ...(dto.fitnessLevel !== undefined && { fitnessLevel: dto.fitnessLevel }),
      ...(dto.clearedToPlay !== undefined && {
        clearedToPlay: dto.clearedToPlay,
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    const saved = await this.profileRepo.save(profile);

    // Auto-alerts on clearance/fitness change
    if (oldClearance && !saved.clearedToPlay) {
      await this.raiseAlert(workspaceId, saved.id, {
        severity: 'critical',
        source: 'clearance',
        title: 'Player NOT cleared to play',
        message:
          'Medical clearance has been revoked. Do not include in match lineups until re-cleared.',
      });
    } else if (!oldClearance && saved.clearedToPlay) {
      await this.raiseAlert(workspaceId, saved.id, {
        severity: 'info',
        source: 'clearance',
        title: 'Player cleared to play',
        message: 'Medical clearance has been restored.',
      });
    }

    if (
      oldFitness !== saved.fitnessLevel &&
      (saved.fitnessLevel === 'unfit' || saved.fitnessLevel === 'injured')
    ) {
      await this.raiseAlert(workspaceId, saved.id, {
        severity: 'warning',
        source: 'fitness',
        title: `Fitness downgraded to ${saved.fitnessLevel}`,
        message: `Player fitness level changed from ${oldFitness} to ${saved.fitnessLevel}.`,
      });
    }

    return this.getProfileById(workspaceId, saved.id, userId);
  }

  async deleteProfile(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const profile = await this.profileRepo.findOne({
      where: { id, workspaceId },
    });
    if (!profile) {
      throw new NotFoundException('Medical profile not found');
    }
    await this.profileRepo.remove(profile);
  }

  // ─── Injuries ────────────────────────────────────────────────────────────

  async createInjury(
    workspaceId: string,
    dto: CreateInjuryDto,
    userId: string,
  ): Promise<MedicalInjury> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const profile = await this.profileRepo.findOne({
      where: { id: dto.profileId, workspaceId },
    });
    if (!profile) {
      throw new NotFoundException('Medical profile not found');
    }

    const injury = this.injuryRepo.create({
      workspaceId,
      profileId: dto.profileId,
      title: dto.title,
      description: dto.description || null,
      bodyPart: dto.bodyPart || null,
      severity: dto.severity || 'minor',
      status: dto.status || 'active',
      sustainedDate: new Date(dto.sustainedDate),
      diagnosisDate: dto.diagnosisDate ? new Date(dto.diagnosisDate) : null,
      diagnosis: dto.diagnosis || null,
      treatment: dto.treatment || null,
      notes: dto.notes || null,
      reportedBy: userId,
    });

    const saved = await this.injuryRepo.save(injury);

    // Update profile fitness/clearance if severe/critical
    if (
      (saved.severity === 'severe' || saved.severity === 'critical') &&
      saved.status !== 'recovered'
    ) {
      profile.fitnessLevel = 'injured';
      profile.clearedToPlay = false;
      await this.profileRepo.save(profile);
    }

    // Raise alert
    const severityMap: Record<
      MedicalInjury['severity'],
      'info' | 'warning' | 'critical'
    > = {
      minor: 'info',
      moderate: 'warning',
      severe: 'critical',
      critical: 'critical',
    };
    await this.raiseAlert(workspaceId, saved.profileId, {
      severity: severityMap[saved.severity],
      source: 'injury',
      title: `New ${saved.severity} injury: ${saved.title}`,
      message: `${saved.bodyPart ? `[${saved.bodyPart}] ` : ''}${
        saved.description || 'Injury reported. Review recovery plan.'
      }`,
      sourceRefId: saved.id,
    });

    return saved;
  }

  async updateInjury(
    workspaceId: string,
    injuryId: string,
    dto: UpdateInjuryDto,
    userId: string,
  ): Promise<MedicalInjury> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const injury = await this.injuryRepo.findOne({
      where: { id: injuryId, workspaceId },
      relations: { profile: true },
    });
    if (!injury) {
      throw new NotFoundException('Injury record not found');
    }

    const oldStatus = injury.status;

    Object.assign(injury, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.bodyPart !== undefined && { bodyPart: dto.bodyPart }),
      ...(dto.severity !== undefined && { severity: dto.severity }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.sustainedDate !== undefined && {
        sustainedDate: new Date(dto.sustainedDate),
      }),
      ...(dto.diagnosisDate !== undefined && {
        diagnosisDate: dto.diagnosisDate ? new Date(dto.diagnosisDate) : null,
      }),
      ...(dto.diagnosis !== undefined && { diagnosis: dto.diagnosis }),
      ...(dto.treatment !== undefined && { treatment: dto.treatment }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    const saved = await this.injuryRepo.save(injury);

    // If recovered, check for other active injuries; if none, restore fitness
    if (oldStatus !== 'recovered' && saved.status === 'recovered') {
      const activeInjuries = await this.injuryRepo.count({
        where: {
          profileId: injury.profileId,
          status: In(['active', 'recovering']),
        },
      });
      if (activeInjuries === 0 && injury.profile) {
        injury.profile.fitnessLevel = 'fit';
        injury.profile.clearedToPlay = true;
        await this.profileRepo.save(injury.profile);

        await this.raiseAlert(workspaceId, saved.profileId, {
          severity: 'info',
          source: 'injury',
          title: `Recovered from ${saved.title}`,
          message: 'Player has recovered and is cleared to play.',
          sourceRefId: saved.id,
        });
      }
    }

    return saved;
  }

  async deleteInjury(
    workspaceId: string,
    injuryId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const injury = await this.injuryRepo.findOne({
      where: { id: injuryId, workspaceId },
    });
    if (!injury) {
      throw new NotFoundException('Injury record not found');
    }
    await this.injuryRepo.remove(injury);
  }

  // ─── Recovery Plans ──────────────────────────────────────────────────────

  async createRecoveryPlan(
    workspaceId: string,
    dto: CreateRecoveryPlanDto,
    userId: string,
  ): Promise<RecoveryPlan> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const injury = await this.injuryRepo.findOne({
      where: { id: dto.injuryId, workspaceId },
    });
    if (!injury) {
      throw new NotFoundException('Injury not found');
    }

    const existing = await this.recoveryRepo.findOne({
      where: { injuryId: dto.injuryId },
    });
    if (existing) {
      throw new ConflictException(
        'Recovery plan already exists for this injury',
      );
    }

    const plan = this.recoveryRepo.create({
      workspaceId,
      injuryId: dto.injuryId,
      title: dto.title,
      protocol: dto.protocol || null,
      startDate: new Date(dto.startDate),
      expectedReturnDate: dto.expectedReturnDate
        ? new Date(dto.expectedReturnDate)
        : null,
      actualReturnDate: dto.actualReturnDate
        ? new Date(dto.actualReturnDate)
        : null,
      milestones: dto.milestones || null,
      status: dto.status || 'in_progress',
      progressPercent: dto.progressPercent ?? 0,
      notes: dto.notes || null,
    });

    // Injury moves from active to recovering
    if (injury.status === 'active') {
      injury.status = 'recovering';
      await this.injuryRepo.save(injury);
    }

    return this.recoveryRepo.save(plan);
  }

  async updateRecoveryPlan(
    workspaceId: string,
    planId: string,
    dto: UpdateRecoveryPlanDto,
    userId: string,
  ): Promise<RecoveryPlan> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const plan = await this.recoveryRepo.findOne({
      where: { id: planId, workspaceId },
      relations: { injury: { profile: true } },
    });
    if (!plan) {
      throw new NotFoundException('Recovery plan not found');
    }

    const oldStatus = plan.status;

    Object.assign(plan, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.protocol !== undefined && { protocol: dto.protocol }),
      ...(dto.startDate !== undefined && {
        startDate: new Date(dto.startDate),
      }),
      ...(dto.expectedReturnDate !== undefined && {
        expectedReturnDate: dto.expectedReturnDate
          ? new Date(dto.expectedReturnDate)
          : null,
      }),
      ...(dto.actualReturnDate !== undefined && {
        actualReturnDate: dto.actualReturnDate
          ? new Date(dto.actualReturnDate)
          : null,
      }),
      ...(dto.milestones !== undefined && { milestones: dto.milestones }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.progressPercent !== undefined && {
        progressPercent: dto.progressPercent,
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    const saved = await this.recoveryRepo.save(plan);

    if (oldStatus !== 'delayed' && saved.status === 'delayed') {
      await this.raiseAlert(workspaceId, plan.injury.profileId, {
        severity: 'warning',
        source: 'injury',
        title: `Recovery delayed: ${plan.injury.title}`,
        message: `Recovery plan "${saved.title}" is marked as delayed. Reassess return date.`,
        sourceRefId: plan.injuryId,
      });
    }

    return saved;
  }

  // ─── Fitness Status ──────────────────────────────────────────────────────

  async createFitnessStatus(
    workspaceId: string,
    dto: CreateFitnessStatusDto,
    userId: string,
  ): Promise<FitnessStatus> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const profile = await this.profileRepo.findOne({
      where: { id: dto.profileId, workspaceId },
    });
    if (!profile) {
      throw new NotFoundException('Medical profile not found');
    }

    const record = this.fitnessRepo.create({
      workspaceId,
      profileId: dto.profileId,
      assessedAt: new Date(dto.assessedAt),
      assessedById: userId,
      fitnessLevel: dto.fitnessLevel || 'fit',
      cardioScore: dto.cardioScore ?? null,
      strengthScore: dto.strengthScore ?? null,
      flexibilityScore: dto.flexibilityScore ?? null,
      enduranceScore: dto.enduranceScore ?? null,
      restingHeartRate: dto.restingHeartRate ?? null,
      bodyFatPercent: dto.bodyFatPercent ?? null,
      clearedToPlay: dto.clearedToPlay ?? true,
      restrictions: dto.restrictions || null,
      notes: dto.notes || null,
    });

    const saved = await this.fitnessRepo.save(record);

    // Sync profile with latest fitness assessment
    profile.fitnessLevel = saved.fitnessLevel;
    profile.clearedToPlay = saved.clearedToPlay;
    await this.profileRepo.save(profile);

    if (!saved.clearedToPlay) {
      await this.raiseAlert(workspaceId, saved.profileId, {
        severity: 'critical',
        source: 'fitness',
        title: 'Not cleared after fitness assessment',
        message:
          saved.restrictions ||
          'Player was not medically cleared during the latest fitness assessment.',
      });
    }

    return saved;
  }

  // ─── Medical Alerts ──────────────────────────────────────────────────────

  async getAlerts(
    workspaceId: string,
    userId: string,
    filter: { openOnly?: boolean } = {},
  ): Promise<MedicalAlert[]> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const where: any = { workspaceId };
    if (filter.openOnly) {
      where.status = 'open';
    }
    return this.alertRepo.find({
      where,
      relations: {
        profile: { player: { user: true, team: true } },
        acknowledgedBy: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async createAlert(
    workspaceId: string,
    dto: CreateAlertDto,
    userId: string,
  ): Promise<MedicalAlert> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const profile = await this.profileRepo.findOne({
      where: { id: dto.profileId, workspaceId },
    });
    if (!profile) {
      throw new NotFoundException('Medical profile not found');
    }

    return this.raiseAlert(workspaceId, dto.profileId, {
      severity: dto.severity || 'info',
      source: dto.source || 'general',
      title: dto.title,
      message: dto.message,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
  }

  async updateAlertStatus(
    workspaceId: string,
    alertId: string,
    dto: UpdateAlertStatusDto,
    userId: string,
  ): Promise<MedicalAlert> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const alert = await this.alertRepo.findOne({
      where: { id: alertId, workspaceId },
    });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    alert.status = dto.status;
    if (dto.status === 'acknowledged' && !alert.acknowledgedAt) {
      alert.acknowledgedAt = new Date();
      alert.acknowledgedById = userId;
    }

    return this.alertRepo.save(alert);
  }

  private async raiseAlert(
    workspaceId: string,
    profileId: string,
    payload: {
      severity: 'info' | 'warning' | 'critical';
      source:
        | 'injury'
        | 'fitness'
        | 'checkup_due'
        | 'clearance'
        | 'allergy'
        | 'general';
      title: string;
      message: string;
      sourceRefId?: string;
      expiresAt?: Date | null;
    },
  ): Promise<MedicalAlert> {
    const alert = this.alertRepo.create({
      workspaceId,
      profileId,
      severity: payload.severity,
      source: payload.source,
      title: payload.title,
      message: payload.message,
      status: 'open',
      sourceRefId: payload.sourceRefId || null,
      expiresAt: payload.expiresAt || null,
    });
    return this.alertRepo.save(alert);
  }

  // ─── Dashboard Summary ───────────────────────────────────────────────────

  async getSummary(workspaceId: string, userId: string) {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 14);

    const [
      totalProfiles,
      injuredProfiles,
      unfitProfiles,
      notCleared,
      activeInjuries,
      openAlerts,
      criticalAlerts,
      upcomingCheckups,
    ] = await Promise.all([
      this.profileRepo.count({ where: { workspaceId } }),
      this.profileRepo.count({
        where: { workspaceId, fitnessLevel: 'injured' },
      }),
      this.profileRepo.count({ where: { workspaceId, fitnessLevel: 'unfit' } }),
      this.profileRepo.count({
        where: { workspaceId, clearedToPlay: false },
      }),
      this.injuryRepo.count({
        where: { workspaceId, status: In(['active', 'recovering']) },
      }),
      this.alertRepo.count({ where: { workspaceId, status: 'open' } }),
      this.alertRepo.count({
        where: { workspaceId, status: 'open', severity: 'critical' },
      }),
      this.profileRepo.count({
        where: {
          workspaceId,
          nextCheckupDate: LessThanOrEqual(soon),
        },
      }),
    ]);

    return {
      totalProfiles,
      injuredProfiles,
      unfitProfiles,
      notCleared,
      activeInjuries,
      openAlerts,
      criticalAlerts,
      upcomingCheckups,
      generatedAt: now.toISOString(),
    };
  }
}
