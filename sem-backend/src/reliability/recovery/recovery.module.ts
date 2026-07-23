import { Module } from '@nestjs/common';
import { RecoveryService } from './recovery.service';
import { RecoveryAdminController } from './recovery-admin.controller';

@Module({
  controllers: [RecoveryAdminController],
  providers: [RecoveryService],
  exports: [RecoveryService],
})
export class RecoveryModule {}
