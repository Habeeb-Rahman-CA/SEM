import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../workspaces/entities/event.entity';
import { Team } from '../workspaces/entities/team.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PublicEventsController } from './public-events.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Team]),
    WorkspacesModule,
    CompetitionsModule,
  ],
  controllers: [EventsController, PublicEventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
