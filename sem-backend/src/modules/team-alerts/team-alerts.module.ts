import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamAlert } from './entities/team-alert.entity';
import { TeamAlertPreference } from './entities/alert-preference.entity';
import { Team } from '../teams/entities/team.entity';
import { TransferRequest } from '../transfers/entities/transfer-request.entity';
import { TransferWindow } from '../transfers/entities/transfer-window.entity';
import { PlayerContract } from '../rosters/entities/player-contract.entity';
import { TeamFinancialAccount } from '../finance/entities/financial-account.entity';
import { Payment } from '../finance/entities/payment.entity';
import { TeamAlertsService } from './team-alerts.service';
import { TeamAlertsController } from './team-alerts.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamAlert,
      TeamAlertPreference,
      Team,
      TransferRequest,
      TransferWindow,
      PlayerContract,
      TeamFinancialAccount,
      Payment,
    ]),
    WorkspacesModule,
  ],
  controllers: [TeamAlertsController],
  providers: [TeamAlertsService],
  exports: [TeamAlertsService],
})
export class TeamAlertsModule {}
