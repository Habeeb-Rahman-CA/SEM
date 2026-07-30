import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupLog } from './backup-log.entity';
import { BackupService } from './backup.service';
import { BackupAdminController } from './backup-admin.controller';

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([BackupLog])],
  controllers: [BackupAdminController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
