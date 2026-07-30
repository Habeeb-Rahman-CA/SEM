import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sponsor } from './entities/sponsor.entity';
import { EventSponsor } from './entities/event-sponsor.entity';
import { Event } from '../events/entities/event.entity';
import { SponsorsService } from './sponsors.service';
import { SponsorsController } from './sponsors.controller';
import { PublicSponsorsController } from './public-sponsors.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sponsor, EventSponsor, Event]),
    WorkspacesModule,
  ],
  controllers: [SponsorsController, PublicSponsorsController],
  providers: [SponsorsService],
  exports: [SponsorsService],
})
export class SponsorsModule {}
