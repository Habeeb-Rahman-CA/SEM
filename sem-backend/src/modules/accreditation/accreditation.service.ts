import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  AccreditationCredential,
  CredentialHolderType,
} from './entities/credential.entity';
import { AccessZone } from './entities/access-zone.entity';
import { CredentialAccessGrant } from './entities/credential-access-grant.entity';
import {
  AttendanceDirection,
  AttendanceLog,
  AttendanceResult,
} from './entities/attendance-log.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto';
import { ScanCredentialDto } from './dto/scan-credential.dto';

interface ScanOutcome {
  result: AttendanceResult;
  direction: AttendanceDirection;
  credential: AccreditationCredential | null;
  zone: AccessZone | null;
  message: string;
  log: AttendanceLog;
}

@Injectable()
export class AccreditationService {
  constructor(
    @InjectRepository(AccreditationCredential)
    private readonly credentialRepo: Repository<AccreditationCredential>,
    @InjectRepository(AccessZone)
    private readonly zoneRepo: Repository<AccessZone>,
    @InjectRepository(CredentialAccessGrant)
    private readonly grantRepo: Repository<CredentialAccessGrant>,
    @InjectRepository(AttendanceLog)
    private readonly attendanceRepo: Repository<AttendanceLog>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Credentials ─────────────────────────────────────────────────────────

  async getCredentials(
    workspaceId: string,
    userId: string,
    filter: { holderType?: CredentialHolderType; eventId?: string } = {},
  ): Promise<AccreditationCredential[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const where: any = { workspaceId };
    if (filter.holderType) where.holderType = filter.holderType;
    if (filter.eventId) where.eventId = filter.eventId;
    return this.credentialRepo.find({
      where,
      relations: {
        holderUser: true,
        holderPlayer: { user: true, team: true },
        event: true,
        accessGrants: { zone: true },
        issuedBy: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getCredentialById(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<AccreditationCredential> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const credential = await this.credentialRepo.findOne({
      where: { id, workspaceId },
      relations: {
        holderUser: true,
        holderPlayer: { user: true, team: true },
        event: true,
        accessGrants: { zone: true },
        attendanceLogs: { zone: true, scannedBy: true },
        issuedBy: true,
      },
    });
    if (!credential) {
      throw new NotFoundException('Credential not found');
    }
    return credential;
  }

  async createCredential(
    workspaceId: string,
    dto: CreateCredentialDto,
    userId: string,
  ): Promise<AccreditationCredential> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validUntil);
    if (validUntil <= validFrom) {
      throw new BadRequestException('validUntil must be after validFrom');
    }

    const code = this.generateCode(dto.holderType);

    const credential = this.credentialRepo.create({
      workspaceId,
      eventId: dto.eventId || null,
      holderType: dto.holderType,
      holderUserId: dto.holderUserId || null,
      holderPlayerId: dto.holderPlayerId || null,
      holderName: dto.holderName,
      holderRole: dto.holderRole || null,
      organization: dto.organization || null,
      photoUrl: dto.photoUrl || null,
      accessLevel: dto.accessLevel || 'general',
      validFrom,
      validUntil,
      status: 'active',
      notes: dto.notes || null,
      code,
      issuedById: userId,
    });

    const saved = await this.credentialRepo.save(credential);

    if (dto.zoneIds && dto.zoneIds.length > 0) {
      await this.replaceGrants(workspaceId, saved.id, dto.zoneIds);
    }

    return this.getCredentialById(workspaceId, saved.id, userId);
  }

  async updateCredential(
    workspaceId: string,
    id: string,
    dto: UpdateCredentialDto,
    userId: string,
  ): Promise<AccreditationCredential> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const credential = await this.credentialRepo.findOne({
      where: { id, workspaceId },
    });
    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    if (dto.validFrom && dto.validUntil) {
      const from = new Date(dto.validFrom);
      const until = new Date(dto.validUntil);
      if (until <= from) {
        throw new BadRequestException('validUntil must be after validFrom');
      }
    }

    Object.assign(credential, {
      ...(dto.eventId !== undefined && { eventId: dto.eventId }),
      ...(dto.holderName !== undefined && { holderName: dto.holderName }),
      ...(dto.holderUserId !== undefined && {
        holderUserId: dto.holderUserId,
      }),
      ...(dto.holderPlayerId !== undefined && {
        holderPlayerId: dto.holderPlayerId,
      }),
      ...(dto.holderRole !== undefined && { holderRole: dto.holderRole }),
      ...(dto.organization !== undefined && { organization: dto.organization }),
      ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
      ...(dto.accessLevel !== undefined && { accessLevel: dto.accessLevel }),
      ...(dto.validFrom !== undefined && {
        validFrom: new Date(dto.validFrom),
      }),
      ...(dto.validUntil !== undefined && {
        validUntil: new Date(dto.validUntil),
      }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    await this.credentialRepo.save(credential);

    if (dto.zoneIds !== undefined) {
      await this.replaceGrants(workspaceId, credential.id, dto.zoneIds);
    }

    return this.getCredentialById(workspaceId, credential.id, userId);
  }

  async revokeCredential(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<AccreditationCredential> {
    return this.updateCredential(
      workspaceId,
      id,
      { status: 'revoked' },
      userId,
    );
  }

  async deleteCredential(
    workspaceId: string,
    id: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const credential = await this.credentialRepo.findOne({
      where: { id, workspaceId },
    });
    if (!credential) {
      throw new NotFoundException('Credential not found');
    }
    await this.credentialRepo.remove(credential);
  }

  private async replaceGrants(
    workspaceId: string,
    credentialId: string,
    zoneIds: string[],
  ) {
    // Validate all zones belong to the workspace
    const zones = zoneIds.length
      ? await this.zoneRepo.find({
          where: { workspaceId, id: In(zoneIds) },
        })
      : [];
    if (zones.length !== zoneIds.length) {
      throw new BadRequestException(
        'One or more zones do not exist in this workspace',
      );
    }

    await this.grantRepo.delete({ credentialId, workspaceId });
    if (zones.length === 0) return;
    const grants = zones.map((z) =>
      this.grantRepo.create({
        workspaceId,
        credentialId,
        zoneId: z.id,
      }),
    );
    await this.grantRepo.save(grants);
  }

  private generateCode(holderType: CredentialHolderType): string {
    const prefix = holderType.slice(0, 3).toUpperCase();
    const random = randomBytes(9).toString('base64url').toUpperCase();
    return `${prefix}-${random}`;
  }

  // ─── Access Zones ────────────────────────────────────────────────────────

  async getZones(workspaceId: string, userId: string): Promise<AccessZone[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    return this.zoneRepo.find({
      where: { workspaceId },
      relations: { venue: true },
      order: { name: 'ASC' },
    });
  }

  async createZone(
    workspaceId: string,
    dto: CreateZoneDto,
    userId: string,
  ): Promise<AccessZone> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const zone = this.zoneRepo.create({
      workspaceId,
      venueId: dto.venueId || null,
      name: dto.name,
      description: dto.description || null,
      allowedHolderTypes: dto.allowedHolderTypes || null,
      allowedAccessLevels: dto.allowedAccessLevels || null,
      capacity: dto.capacity ?? null,
      color: dto.color || null,
      isActive: dto.isActive ?? true,
    });

    return this.zoneRepo.save(zone);
  }

  async updateZone(
    workspaceId: string,
    zoneId: string,
    dto: UpdateZoneDto,
    userId: string,
  ): Promise<AccessZone> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );

    const zone = await this.zoneRepo.findOne({
      where: { id: zoneId, workspaceId },
    });
    if (!zone) throw new NotFoundException('Zone not found');

    Object.assign(zone, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.venueId !== undefined && { venueId: dto.venueId }),
      ...(dto.allowedHolderTypes !== undefined && {
        allowedHolderTypes: dto.allowedHolderTypes,
      }),
      ...(dto.allowedAccessLevels !== undefined && {
        allowedAccessLevels: dto.allowedAccessLevels,
      }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.color !== undefined && { color: dto.color }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    return this.zoneRepo.save(zone);
  }

  async deleteZone(
    workspaceId: string,
    zoneId: string,
    userId: string,
  ): Promise<void> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const zone = await this.zoneRepo.findOne({
      where: { id: zoneId, workspaceId },
    });
    if (!zone) throw new NotFoundException('Zone not found');
    await this.zoneRepo.remove(zone);
  }

  // ─── Scan / Verify / Attendance ──────────────────────────────────────────

  async verifyByCode(
    workspaceId: string,
    code: string,
    userId: string,
  ): Promise<AccreditationCredential> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const credential = await this.credentialRepo.findOne({
      where: { workspaceId, code },
      relations: {
        holderUser: true,
        holderPlayer: { user: true, team: true },
        event: true,
        accessGrants: { zone: true },
        issuedBy: true,
      },
    });
    if (!credential) {
      throw new NotFoundException('Credential not found for this code');
    }
    return credential;
  }

  async scan(
    workspaceId: string,
    dto: ScanCredentialDto,
    userId: string,
  ): Promise<ScanOutcome> {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const trimmed = dto.code.trim();
    const direction: AttendanceDirection = dto.direction || 'in';
    const now = new Date();

    let zone: AccessZone | null = null;
    if (dto.zoneId) {
      zone = await this.zoneRepo.findOne({
        where: { id: dto.zoneId, workspaceId },
      });
      if (!zone) {
        throw new NotFoundException('Access zone not found');
      }
    }

    const credential = await this.credentialRepo.findOne({
      where: { workspaceId, code: trimmed },
      relations: {
        holderUser: true,
        holderPlayer: { user: true, team: true },
        accessGrants: { zone: true },
      },
    });

    const logBase = {
      workspaceId,
      credentialId: credential?.id || null,
      zoneId: zone?.id || null,
      scannedAt: now,
      scannedById: userId,
      direction,
      scannedCode: trimmed,
      notes: dto.notes || null,
    };

    if (!credential) {
      const log = await this.attendanceRepo.save(
        this.attendanceRepo.create({
          ...logBase,
          result: 'denied_not_found',
        }),
      );
      return {
        result: 'denied_not_found',
        direction,
        credential: null,
        zone,
        message: 'Credential not found. Unknown code.',
        log,
      };
    }

    // Auto-expire stale credentials on read
    if (
      credential.status === 'active' &&
      credential.validUntil.getTime() < now.getTime()
    ) {
      credential.status = 'expired';
      await this.credentialRepo.save(credential);
    }

    let result: AttendanceResult = 'granted';
    let message = 'Access granted';

    if (credential.status === 'revoked' || credential.status === 'lost') {
      result = 'denied_revoked';
      message = `Credential ${credential.status}`;
    } else if (
      credential.status === 'expired' ||
      credential.validUntil.getTime() < now.getTime()
    ) {
      result = 'denied_expired';
      message = 'Credential expired';
    } else if (credential.validFrom.getTime() > now.getTime()) {
      result = 'denied_not_yet_valid';
      message = `Not yet valid — starts ${credential.validFrom.toISOString()}`;
    } else if (zone) {
      const zoneAllows = this.zoneAllowsCredential(zone, credential);
      if (!zoneAllows.ok) {
        result = 'denied_zone';
        message = zoneAllows.reason;
      }
    }

    const log = await this.attendanceRepo.save(
      this.attendanceRepo.create({ ...logBase, result }),
    );

    return { result, direction, credential, zone, message, log };
  }

  private zoneAllowsCredential(
    zone: AccessZone,
    credential: AccreditationCredential,
  ): { ok: boolean; reason: string } {
    if (!zone.isActive) {
      return { ok: false, reason: 'Zone is currently inactive' };
    }
    // Access-level allowance
    if (zone.allowedAccessLevels && zone.allowedAccessLevels.length > 0) {
      if (credential.accessLevel === 'all_areas')
        return { ok: true, reason: '' };
      if (!zone.allowedAccessLevels.includes(credential.accessLevel)) {
        return {
          ok: false,
          reason: `Access level "${credential.accessLevel}" not permitted in ${zone.name}`,
        };
      }
    }
    // Explicit per-credential grants take precedence
    const hasExplicitGrant =
      credential.accessGrants?.some((g) => g.zoneId === zone.id) ?? false;
    if (hasExplicitGrant) return { ok: true, reason: '' };
    // Holder-type allowance
    if (zone.allowedHolderTypes && zone.allowedHolderTypes.length > 0) {
      if (!zone.allowedHolderTypes.includes(credential.holderType)) {
        return {
          ok: false,
          reason: `Holder type "${credential.holderType}" not permitted in ${zone.name}`,
        };
      }
    }
    return { ok: true, reason: '' };
  }

  // ─── Attendance queries ──────────────────────────────────────────────────

  async getAttendance(
    workspaceId: string,
    userId: string,
    filter: {
      credentialId?: string;
      zoneId?: string;
      limit?: number;
    } = {},
  ): Promise<AttendanceLog[]> {
    await this.workspacesService.ensureMember(workspaceId, userId);
    const where: any = { workspaceId };
    if (filter.credentialId) where.credentialId = filter.credentialId;
    if (filter.zoneId) where.zoneId = filter.zoneId;
    return this.attendanceRepo.find({
      where,
      relations: {
        credential: true,
        zone: true,
        scannedBy: true,
      },
      order: { scannedAt: 'DESC' },
      take: filter.limit ?? 200,
    });
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  async getSummary(workspaceId: string, userId: string) {
    await this.workspacesService.ensureMember(workspaceId, userId);

    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalCredentials,
      activeCredentials,
      revoked,
      expired,
      totalZones,
      totalScansToday,
      grantedToday,
      deniedToday,
      expiringSoon,
    ] = await Promise.all([
      this.credentialRepo.count({ where: { workspaceId } }),
      this.credentialRepo.count({ where: { workspaceId, status: 'active' } }),
      this.credentialRepo.count({ where: { workspaceId, status: 'revoked' } }),
      this.credentialRepo.count({ where: { workspaceId, status: 'expired' } }),
      this.zoneRepo.count({ where: { workspaceId } }),
      this.attendanceRepo.count({
        where: { workspaceId, scannedAt: MoreThanOrEqual(dayStart) },
      }),
      this.attendanceRepo.count({
        where: {
          workspaceId,
          scannedAt: MoreThanOrEqual(dayStart),
          result: 'granted',
        },
      }),
      this.attendanceRepo
        .createQueryBuilder('log')
        .where('log.workspace_id = :workspaceId', { workspaceId })
        .andWhere('log.scanned_at >= :dayStart', { dayStart })
        .andWhere('log.result LIKE :prefix', { prefix: 'denied_%' })
        .getCount(),
      this.credentialRepo
        .createQueryBuilder('c')
        .where('c.workspace_id = :workspaceId', { workspaceId })
        .andWhere('c.status = :status', { status: 'active' })
        .andWhere('c.valid_until BETWEEN :now AND :soon', { now, soon })
        .getCount(),
    ]);

    const byHolder = await this.credentialRepo
      .createQueryBuilder('c')
      .select('c.holder_type', 'holderType')
      .addSelect('COUNT(*)', 'count')
      .where('c.workspace_id = :workspaceId', { workspaceId })
      .groupBy('c.holder_type')
      .getRawMany<{ holderType: CredentialHolderType; count: string }>();

    const byHolderMap: Record<string, number> = {};
    for (const row of byHolder) {
      byHolderMap[row.holderType] = Number(row.count);
    }

    return {
      totalCredentials,
      activeCredentials,
      revoked,
      expired,
      totalZones,
      totalScansToday,
      grantedToday,
      deniedToday,
      expiringSoon,
      byHolderType: byHolderMap,
      generatedAt: now.toISOString(),
    };
  }

  // ─── Housekeeping ────────────────────────────────────────────────────────

  async expireStale(workspaceId: string, userId: string): Promise<number> {
    await this.workspacesService.ensurePermission(
      workspaceId,
      userId,
      'workspace.update',
    );
    const now = new Date();
    const result = await this.credentialRepo
      .createQueryBuilder()
      .update()
      .set({ status: 'expired' })
      .where('workspace_id = :workspaceId', { workspaceId })
      .andWhere('status = :status', { status: 'active' })
      .andWhere('valid_until < :now', { now })
      .execute();
    return result.affected ?? 0;
  }
}
