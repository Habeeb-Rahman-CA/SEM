import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from '../workspaces/entities/player.entity';
import { Team } from '../workspaces/entities/team.entity';
import { Match } from '../workspaces/entities/match.entity';
import { MatchPlayer } from '../workspaces/entities/match-player.entity';
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
