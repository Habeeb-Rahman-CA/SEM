import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Team } from '../teams/entities/team.entity';
import { EventTemplate } from './entities/event-template.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PublicEventsController } from './public-events.controller';
import { EventTemplatesService } from './event-templates.service';
import { EventTemplatesController } from './event-templates.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Team, EventTemplate]),
    WorkspacesModule,
    CompetitionsModule,
  ],
  controllers: [
    EventsController,
    PublicEventsController,
    EventTemplatesController,
  ],
  providers: [EventsService, EventTemplatesService],
  exports: [EventsService, EventTemplatesService],
})
export class EventsModule {}
