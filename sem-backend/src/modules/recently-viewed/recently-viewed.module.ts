import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRecentlyViewed } from './entities/recently-viewed.entity';
import { RecentlyViewedService } from './recently-viewed.service';
import { RecentlyViewedController } from './recently-viewed.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserRecentlyViewed]), WorkspacesModule],
  controllers: [RecentlyViewedController],
  providers: [RecentlyViewedService],
  exports: [RecentlyViewedService],
})
export class RecentlyViewedModule {}
