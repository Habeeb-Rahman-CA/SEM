import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamFinancialAccount } from './entities/financial-account.entity';
import { Payment } from './entities/payment.entity';
import { AuctionTeamBudget } from '../auctions/entities/auction-team-budget.entity';
import { AuctionPlayer } from '../auctions/entities/auction-player.entity';
import { TransferRequest } from '../transfers/entities/transfer-request.entity';
import { PlayerContract } from '../rosters/entities/player-contract.entity';
import { Team } from '../teams/entities/team.entity';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamFinancialAccount,
      Payment,
      AuctionTeamBudget,
      AuctionPlayer,
      TransferRequest,
      PlayerContract,
      Team,
    ]),
    WorkspacesModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
