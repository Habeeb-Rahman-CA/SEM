import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditCategory } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async logAudit(
    action: string,
    category: string = AuditCategory.SYSTEM,
    entityType?: string,
    entityId?: string,
    performedById?: string,
    performedByName?: string,
    details?: string,
    status: string = 'SUCCESS',
  ): Promise<AuditLog> {
    try {
      const log = new AuditLog();
      log.action = action;
      log.category = category;
      log.entityType = entityType ?? (null as any);
      log.entityId = entityId ?? (null as any);
      log.performedById = performedById ?? (null as any);
      log.performedByName = performedByName ?? (null as any);
      log.status = status;
      log.details = details ?? (null as any);
      return await this.auditLogRepo.save(log);
    } catch (e) {
      return null as any;
    }
  }

  async getAuditLogs(
    category?: string,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    const whereClause: any = {};
    if (category) {
      whereClause.category = category;
    }
    return this.auditLogRepo.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async clearAuditLogs(): Promise<void> {
    await this.auditLogRepo.clear();
  }
}
