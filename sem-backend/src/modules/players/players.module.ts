import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './entities/player.entity';
import { Team } from '../teams/entities/team.entity';
import { Match } from '../competitions/entities/match.entity';
import { MatchPlayer } from './entities/match-player.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { UsersModule } from '../users/users.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Player,
      Team,
      Match,
      MatchPlayer,
      WorkspaceMember,
    ]),
    WorkspacesModule,
    UsersModule,
    SearchModule,
  ],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
