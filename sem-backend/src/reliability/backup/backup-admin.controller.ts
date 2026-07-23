import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../auth/guards/super-admin.guard';

@ApiTags('Backups (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/backups')
export class BackupAdminController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  @ApiOperation({ summary: 'List recent backup history' })
  getHistory() {
    return this.backupService.getBackupHistory();
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger a database backup' })
  triggerManual() {
    return this.backupService.triggerManualBackup();
  }
}
