import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction } from './entities/auction.entity';
import { AuctionCategory } from './entities/auction-category.entity';
import { AuctionPlayer } from './entities/auction-player.entity';
import { AuctionBid } from './entities/auction-bid.entity';
import { AuctionTeamBudget } from './entities/auction-team-budget.entity';
import { Player } from '../players/entities/player.entity';
import { Team } from '../teams/entities/team.entity';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Auction,
      AuctionCategory,
      AuctionPlayer,
      AuctionBid,
      AuctionTeamBudget,
      Player,
      Team,
    ]),
    WorkspacesModule,
  ],
  controllers: [AuctionsController],
  providers: [AuctionsService],
  exports: [AuctionsService],
})
export class AuctionsModule {}
