import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../workspaces/entities/team.entity';
import { Player } from '../workspaces/entities/player.entity';
import { Match } from '../workspaces/entities/match.entity';
import { MatchPlayer } from '../workspaces/entities/match-player.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Team,
      Player,
      Match,
      MatchPlayer,
      WorkspaceMember,
    ]),
    WorkspacesModule,
    SearchModule,
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
