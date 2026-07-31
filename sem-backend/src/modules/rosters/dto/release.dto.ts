import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class ReleasePlayerDto {
  @IsNotEmpty()
  @IsUUID()
  playerId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  season?: string;
}

export class ReplacePlayerDto {
  @IsNotEmpty()
  @IsUUID()
  outgoingPlayerId: string;

  @IsNotEmpty()
  @IsUUID()
  incomingPlayerId: string;

  @IsNotEmpty()
  @IsUUID()
  teamId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  season: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsNotEmpty()
  @IsString()
  contractStartDate: string;

  @IsNotEmpty()
  @IsString()
  contractEndDate: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  salary?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  jerseyNumber?: string;
}

export class CarryForwardDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  fromSeason: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  toSeason: string;

  @IsNotEmpty()
  @IsString()
  newStartDate: string;

  @IsNotEmpty()
  @IsString()
  newEndDate: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}

export class CheckEligibilityDto {
  @IsNotEmpty()
  @IsUUID()
  playerId: string;

  @IsNotEmpty()
  @IsString()
  season: string;

  @IsOptional()
  @IsString()
  matchDate?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
