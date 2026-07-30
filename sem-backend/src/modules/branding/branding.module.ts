import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceBranding } from './workspace-branding.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { BrandingService } from './branding.service';
import { BrandingController } from './branding.controller';
import { PublicBrandingController } from './public-branding.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceBranding, Workspace]),
    WorkspacesModule,
    SubscriptionsModule,
  ],
  controllers: [BrandingController, PublicBrandingController],
  providers: [BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}
