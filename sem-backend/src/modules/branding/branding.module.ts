import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceBranding } from './workspace-branding.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { BrandingService } from './branding.service';
import { BrandingController } from './branding.controller';
import { PublicBrandingController } from './public-branding.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { LicensingModule } from '../licensing/licensing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceBranding, Workspace]),
    WorkspacesModule,
    LicensingModule,
  ],
  controllers: [BrandingController, PublicBrandingController],
  providers: [BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}
