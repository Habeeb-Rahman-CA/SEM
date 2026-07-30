import { Module } from '@nestjs/common';
import { ShareController } from './share.controller';
import { EventsModule } from '../events/events.module';
import { PlayersModule } from '../players/players.module';
import { TeamsModule } from '../teams/teams.module';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [EventsModule, PlayersModule, TeamsModule, CompetitionsModule],
  controllers: [ShareController],
})
export class ShareModule {}
