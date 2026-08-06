import { Module } from '@nestjs/common';
import { BackgroundJobsService } from './background-jobs.service';
import { BackgroundJobsController } from './background-jobs.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { NotificationCenterModule } from '../notification-center/notification-center.module';

@Module({
  imports: [WorkspacesModule, NotificationCenterModule],
  controllers: [BackgroundJobsController],
  providers: [BackgroundJobsService],
  exports: [BackgroundJobsService],
})
export class BackgroundJobsModule {}
