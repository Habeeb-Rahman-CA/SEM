import { Module } from '@nestjs/common';
import { VersionHistoryService } from './version-history.service';
import { VersionHistoryController } from './version-history.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [WorkspacesModule],
  controllers: [VersionHistoryController],
  providers: [VersionHistoryService],
  exports: [VersionHistoryService],
})
export class VersionHistoryModule {}
