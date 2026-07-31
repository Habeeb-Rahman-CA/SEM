import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RosterConfig } from './entities/roster-config.entity';
import { PlayerContract } from './entities/player-contract.entity';
import { RosterRelease } from './entities/roster-release.entity';
import { Player } from '../players/entities/player.entity';
import { Team } from '../teams/entities/team.entity';
import { RostersService } from './rosters.service';
import { RostersController } from './rosters.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RosterConfig,
      PlayerContract,
      RosterRelease,
      Player,
      Team,
    ]),
    WorkspacesModule,
  ],
  controllers: [RostersController],
  providers: [RostersService],
  exports: [RostersService],
})
export class RostersModule {}
