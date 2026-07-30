import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Advertisement } from './entities/advertisement.entity';
import { AdEvent } from './entities/ad-event.entity';
import { Event } from '../events/entities/event.entity';
import { Sponsor } from '../sponsors/entities/sponsor.entity';
import { AdvertisementsService } from './advertisements.service';
import { AdvertisementsController } from './advertisements.controller';
import { PublicAdsController } from './public-ads.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { LicensingModule } from '../licensing/licensing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Advertisement, AdEvent, Event, Sponsor]),
    WorkspacesModule,
    LicensingModule,
  ],
  controllers: [AdvertisementsController, PublicAdsController],
  providers: [AdvertisementsService],
  exports: [AdvertisementsService],
})
export class AdvertisementsModule {}
