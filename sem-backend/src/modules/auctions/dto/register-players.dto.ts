import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class RegisterPlayerDto {
  @IsUUID()
  playerId: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  customBasePrice?: number;

  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RegisterPlayersDto {
  @IsArray()
  @ArrayNotEmpty()
  players: RegisterPlayerDto[];
}

export class UpdateAuctionPlayerDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  customBasePrice?: number | null;

  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
