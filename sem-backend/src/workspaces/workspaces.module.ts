import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { Role } from './entities/role.entity';
import { Team } from './entities/team.entity';
import { Player } from './entities/player.entity';
import { Event } from './entities/event.entity';
import { Sport } from './entities/sport.entity';
import { Competition } from './entities/competition.entity';
import { CompetitionStage } from './entities/competition-stage.entity';
import { Match } from './entities/match.entity';
import { CompetitionTeam } from './entities/competition-team.entity';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { SystemSettingsController } from './system-settings.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      WorkspaceMember,
      Role,
      Team,
      Player,
      Event,
      Sport,
      Competition,
      CompetitionStage,
      Match,
      CompetitionTeam,
    ]),
    UsersModule,
  ],

  controllers: [WorkspacesController, SystemSettingsController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
