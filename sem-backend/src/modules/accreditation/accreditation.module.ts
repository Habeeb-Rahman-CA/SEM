import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccreditationCredential } from './entities/credential.entity';
import { AccessZone } from './entities/access-zone.entity';
import { CredentialAccessGrant } from './entities/credential-access-grant.entity';
import { AttendanceLog } from './entities/attendance-log.entity';
import { AccreditationService } from './accreditation.service';
import { AccreditationController } from './accreditation.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccreditationCredential,
      AccessZone,
      CredentialAccessGrant,
      AttendanceLog,
    ]),
    WorkspacesModule,
  ],
  controllers: [AccreditationController],
  providers: [AccreditationService],
  exports: [AccreditationService],
})
export class AccreditationModule {}
