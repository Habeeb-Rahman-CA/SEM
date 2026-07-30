import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/entities/event.entity';
import { Match } from '../competitions/entities/match.entity';
import { Player } from '../players/entities/player.entity';
import { Team } from '../teams/entities/team.entity';
import { SeoController } from './seo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Match, Player, Team])],
  controllers: [SeoController],
})
export class SeoModule {}
