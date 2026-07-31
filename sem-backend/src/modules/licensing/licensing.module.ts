import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureOverride } from './feature-override.entity';
import { LicensingService } from './licensing.service';
import { LicensingController } from './licensing.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CommerceConfigModule } from '../commerce-config/commerce-config.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeatureOverride]),
    SubscriptionsModule,
    CommerceConfigModule,
    WorkspacesModule,
  ],
  controllers: [LicensingController],
  providers: [LicensingService],
  exports: [LicensingService],
})
export class LicensingModule {}
