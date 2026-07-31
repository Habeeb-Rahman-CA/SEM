import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Team } from '../teams/entities/team.entity';
import { EventTemplate } from './entities/event-template.entity';
import { Venue } from '../venues/entities/venue.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PublicEventsController } from './public-events.controller';
import { EventTemplatesService } from './event-templates.service';
import { EventTemplatesController } from './event-templates.controller';
import { AttendanceForecastingService } from './services/attendance-forecasting.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CompetitionsModule } from '../competitions/competitions.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Team, EventTemplate, Venue, Competition]),
    WorkspacesModule,
    CompetitionsModule,
    AiModule,
  ],
  controllers: [
    EventsController,
    PublicEventsController,
    EventTemplatesController,
  ],
  providers: [
    EventsService,
    EventTemplatesService,
    AttendanceForecastingService,
  ],
  exports: [EventsService, EventTemplatesService, AttendanceForecastingService],
})
export class EventsModule {}
