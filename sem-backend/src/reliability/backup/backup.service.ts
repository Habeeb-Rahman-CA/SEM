import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { BackupLog, BackupStatus } from './backup-log.entity';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly retentionDays: number;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(BackupLog)
    private readonly backupLogRepo: Repository<BackupLog>,
  ) {
    this.backupDir = this.configService.get<string>(
      'BACKUP_DIR',
      path.join(process.cwd(), 'backups'),
    );
    this.retentionDays = this.configService.get<number>(
      'BACKUP_RETENTION_DAYS',
      7,
    );
    this.ensureBackupDir();
  }

  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Full DB backup — runs daily at 02:00
   */
  @Cron('0 2 * * *', { name: 'daily-backup' })
  async runDailyBackup(): Promise<void> {
    this.logger.log('Starting scheduled daily database backup');
    await this.performBackup('daily');
  }

  /**
   * Quick backup every 6 hours as a safety net
   */
  @Cron('0 */6 * * *', { name: 'incremental-backup' })
  async runIncrementalBackup(): Promise<void> {
    this.logger.log('Starting scheduled incremental backup');
    await this.performBackup('incremental');
  }

  /**
   * Clean up backups older than retention window — runs daily at 03:00
   */
  @Cron('0 3 * * *', { name: 'backup-cleanup' })
  async cleanupOldBackups(): Promise<void> {
    this.logger.log(`Cleaning up backups older than ${this.retentionDays} days`);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.retentionDays);

    try {
      const files = fs.readdirSync(this.backupDir);
      let removed = 0;
      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile() && stat.mtime < cutoff) {
          fs.unlinkSync(filePath);
          removed++;
        }
      }
      this.logger.log(`Backup cleanup complete: removed ${removed} file(s)`);

      // Also prune old DB log records
      await this.backupLogRepo
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoff', { cutoff })
        .execute();
    } catch (err) {
      this.logger.error('Backup cleanup failed', err instanceof Error ? err.stack : String(err));
    }
  }

  /**
   * Manually triggered backup (e.g., before a migration or deployment)
   */
  async triggerManualBackup(): Promise<BackupLog> {
    this.logger.log('Manual backup triggered');
    return this.performBackup('manual');
  }

  async getBackupHistory(limit = 20): Promise<BackupLog[]> {
    return this.backupLogRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async performBackup(type: string): Promise<BackupLog> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `sem_${type}_${timestamp}.sql.gz`;
    const filePath = path.join(this.backupDir, filename);

    const log = this.backupLogRepo.create({
      backupType: type,
      filename,
      filePath,
      status: BackupStatus.RUNNING,
    });
    await this.backupLogRepo.save(log);

    const startedAt = Date.now();

    try {
      const host = this.configService.get<string>('DB_HOST', 'localhost');
      const port = this.configService.get<number>('DB_PORT', 5432);
      const username = this.configService.get<string>('DB_USERNAME', 'postgres');
      const database = this.configService.get<string>('DB_DATABASE', 'sem_db');
      const password = this.configService.get<string>('DB_PASSWORD', '');

      const cmd = [
        `PGPASSWORD="${password}"`,
        'pg_dump',
        `-h ${host}`,
        `-p ${port}`,
        `-U ${username}`,
        `-d ${database}`,
        '--format=custom',
        `--file="${filePath}"`,
      ].join(' ');

      await execAsync(cmd);

      const stat = fs.statSync(filePath);
      const durationMs = Date.now() - startedAt;

      log.status = BackupStatus.SUCCESS;
      log.sizeBytes = stat.size;
      log.durationMs = durationMs;
      log.completedAt = new Date();
      await this.backupLogRepo.save(log);

      this.logger.log(
        `Backup completed: ${filename} (${(stat.size / 1024).toFixed(1)} KB, ${durationMs}ms)`,
      );
    } catch (err: any) {
      log.status = BackupStatus.FAILED;
      log.errorMessage = err?.message ?? String(err);
      log.completedAt = new Date();
      await this.backupLogRepo.save(log);

      this.logger.error(`Backup FAILED: ${filename}`, err?.stack);
    }

    return log;
  }
}
