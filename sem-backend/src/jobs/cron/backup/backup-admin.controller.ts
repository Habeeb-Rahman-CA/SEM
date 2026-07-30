import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { BackupStatus } from './backup-log.entity';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../modules/auth/guards/super-admin.guard';

// ─── Response shape classes for Swagger ──────────────────────────────────────

class BackupLogResponse {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  id: string;

  @ApiProperty({
    example: 'daily',
    description: 'Type of backup: daily | incremental | manual',
  })
  backupType: string;

  @ApiProperty({ example: 'sem_daily_2026-07-23T02-00-00-000Z.sql.gz' })
  filename: string;

  @ApiProperty({
    example: '/app/backups/sem_daily_2026-07-23T02-00-00-000Z.sql.gz',
  })
  filePath: string;

  @ApiProperty({ enum: BackupStatus, example: BackupStatus.SUCCESS })
  status: BackupStatus;

  @ApiProperty({
    example: 2097152,
    nullable: true,
    description: 'Compressed backup file size in bytes',
  })
  sizeBytes: number | null;

  @ApiProperty({
    example: 4320,
    nullable: true,
    description: 'Time taken to complete the backup in milliseconds',
  })
  durationMs: number | null;

  @ApiProperty({
    nullable: true,
    description: 'Error message if the backup failed',
  })
  errorMessage: string | null;

  @ApiProperty({ example: '2026-07-23T02:00:04.320Z', nullable: true })
  completedAt: Date | null;

  @ApiProperty({ example: '2026-07-23T02:00:00.000Z' })
  createdAt: Date;
}

class TriggerBackupResponse {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000000' })
  id: string;

  @ApiProperty({ example: 'manual' })
  backupType: string;

  @ApiProperty({ example: 'sem_manual_2026-07-23T13-41-00-000Z.sql.gz' })
  filename: string;

  @ApiProperty({ enum: BackupStatus, example: BackupStatus.RUNNING })
  status: BackupStatus;

  @ApiProperty({ example: '2026-07-23T13:41:00.000Z' })
  createdAt: Date;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Admin — Backups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/backups')
export class BackupAdminController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * GET /api/admin/backups
   * Returns the 20 most recent backup run records.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List recent backup history',
    description:
      'Returns the 20 most recent backup run records ordered by creation date (newest first). ' +
      'Each record includes the backup type, file size, duration, and final status.\n\n' +
      '**Scheduled backups run automatically:**\n' +
      '- `daily` — full `pg_dump` at **02:00** every day\n' +
      '- `incremental` — snapshot every **6 hours**\n' +
      '- Old files are purged at **03:00** based on `BACKUP_RETENTION_DAYS` (default: 7)',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of the 20 most recent backup log records',
    type: [BackupLogResponse],
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Super-admin access required' })
  getHistory() {
    return this.backupService.getBackupHistory();
  }

  /**
   * POST /api/admin/backups/trigger
   * Manually trigger a database backup outside of the scheduled windows.
   */
  @Post('trigger')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Trigger a manual database backup',
    description:
      'Immediately starts a full `pg_dump` backup of the database. ' +
      'Useful before a migration, deployment, or any high-risk operation.\n\n' +
      'The backup runs asynchronously — the response returns the initial `BackupLog` ' +
      'record with `status: "running"`. Poll `GET /api/admin/backups` to check ' +
      'when it transitions to `success` or `failed`.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Backup initiated — returns the log record with status `running`',
    type: TriggerBackupResponse,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Super-admin access required' })
  triggerManual() {
    return this.backupService.triggerManualBackup();
  }
}
