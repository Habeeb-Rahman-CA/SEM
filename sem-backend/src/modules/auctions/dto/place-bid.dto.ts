import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class PlaceBidDto {
  @IsNotEmpty()
  @IsUUID()
  teamId: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  amount: number;
}

export class StartBiddingDto {
  @IsNotEmpty()
  @IsUUID()
  auctionPlayerId: string;
}
