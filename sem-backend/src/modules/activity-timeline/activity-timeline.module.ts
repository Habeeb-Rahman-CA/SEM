import { Module } from '@nestjs/common';
import { ActivityTimelineService } from './activity-timeline.service';
import { ActivityTimelineController } from './activity-timeline.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [WorkspacesModule],
  controllers: [ActivityTimelineController],
  providers: [ActivityTimelineService],
  exports: [ActivityTimelineService],
})
export class ActivityTimelineModule {}
