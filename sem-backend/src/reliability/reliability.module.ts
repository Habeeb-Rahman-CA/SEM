import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';

import { LoggingModule } from './logging/logging.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { BackupModule } from './backup/backup.module';
import { RecoveryModule } from './recovery/recovery.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TerminusModule,
    LoggingModule,
    MonitoringModule,
    BackupModule,
    RecoveryModule,
  ],
  exports: [LoggingModule, MonitoringModule, BackupModule, RecoveryModule],
})
export class ReliabilityModule {}
