import { Module } from '@nestjs/common';
import { CustomDashboardService } from './custom-dashboard.service';
import { CustomDashboardController } from './custom-dashboard.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [WorkspacesModule],
  controllers: [CustomDashboardController],
  providers: [CustomDashboardService],
  exports: [CustomDashboardService],
})
export class CustomDashboardModule {}
