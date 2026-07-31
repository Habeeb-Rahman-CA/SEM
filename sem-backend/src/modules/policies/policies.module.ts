import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolicyConfig } from './entities/policy-config.entity';
import { AuctionPlayer } from '../auctions/entities/auction-player.entity';
import { TransferRequest } from '../transfers/entities/transfer-request.entity';
import { PlayerContract } from '../rosters/entities/player-contract.entity';
import { RosterConfig } from '../rosters/entities/roster-config.entity';
import { TeamFinancialAccount } from '../finance/entities/financial-account.entity';
import { Payment } from '../finance/entities/payment.entity';
import { PoliciesService } from './policies.service';
import { PoliciesController } from './policies.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PolicyConfig,
      AuctionPlayer,
      TransferRequest,
      PlayerContract,
      RosterConfig,
      TeamFinancialAccount,
      Payment,
    ]),
    WorkspacesModule,
  ],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
