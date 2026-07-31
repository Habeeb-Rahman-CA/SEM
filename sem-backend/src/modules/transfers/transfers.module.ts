import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferWindow } from './entities/transfer-window.entity';
import { TransferRequest } from './entities/transfer-request.entity';
import { PlayerTransfer } from '../players/entities/player-transfer.entity';
import { Player } from '../players/entities/player.entity';
import { Team } from '../teams/entities/team.entity';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransferWindow,
      TransferRequest,
      PlayerTransfer,
      Player,
      Team,
    ]),
    WorkspacesModule,
  ],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
