import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrorLog } from './error-log.entity';
import { ErrorLoggerService } from './error-logger.service';
import { LogsAdminController } from './logs-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ErrorLog])],
  controllers: [LogsAdminController],
  providers: [ErrorLoggerService],
  exports: [ErrorLoggerService],
})
export class LoggingModule {}
