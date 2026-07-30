import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../entities/system-config.entity';
import { Workspace } from '../entities/workspace.entity';
import { Competition } from '../../competitions/entities/competition.entity';
import { Match } from '../../competitions/entities/match.entity';
import { Sport } from '../entities/sport.entity';
import { AuditLog, AuditCategory } from '../entities/audit-log.entity';
import { UsersService } from '../../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepo: Repository<SystemConfig>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Sport)
    private readonly sportRepo: Repository<Sport>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getSystemConfigs(): Promise<Record<string, string>> {
    const configs = await this.systemConfigRepo.find();
    const map: Record<string, string> = {
      maintenance_mode: 'false',
      allow_registrations: 'true',
      announcement_text: '',
      announcement_level: 'info',
      max_workspaces_per_user: '10',
    };
    for (const c of configs) {
      map[c.key] = c.value;
    }
    return map;
  }

  async updateSystemConfig(
    key: string,
    value: string,
    userId?: string,
    userName?: string,
  ): Promise<Record<string, string>> {
    let config = await this.systemConfigRepo.findOne({ where: { key } });
    if (!config) {
      config = this.systemConfigRepo.create({ key, value });
    } else {
      config.value = value;
    }
    await this.systemConfigRepo.save(config);

    await this.auditLogsService.logAudit(
      'UPDATE_SYSTEM_CONFIG',
      AuditCategory.SYSTEM,
      'SystemConfig',
      key,
      userId,
      userName,
      `Changed config "${key}" to "${value}"`,
    );

    return this.getSystemConfigs();
  }

  async getSystemMetrics(): Promise<any> {
    const uptimeSeconds = Math.floor(process.uptime());
    const memoryUsage = process.memoryUsage();

    const [
      totalUsers,
      totalWorkspaces,
      totalCompetitions,
      totalMatches,
      totalSports,
      totalAuditLogs,
    ] = await Promise.all([
      this.usersService.countAll
        ? this.usersService.countAll()
        : Promise.resolve(0),
      this.workspaceRepo.count(),
      this.competitionRepo.count(),
      this.matchRepo.count(),
      this.sportRepo.count(),
      this.auditLogRepo.count(),
    ]);

    return {
      status: 'OPERATIONAL',
      uptime: uptimeSeconds,
      uptimeFormatted: this.formatUptime(uptimeSeconds),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapUsagePercent: `${((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(1)}%`,
      },
      counts: {
        users: totalUsers,
        workspaces: totalWorkspaces,
        competitions: totalCompetitions,
        matches: totalMatches,
        sports: totalSports,
        auditLogs: totalAuditLogs,
      },
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  }
}
