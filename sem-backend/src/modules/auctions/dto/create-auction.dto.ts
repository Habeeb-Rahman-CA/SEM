import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAuctionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsUUID()
  competitionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  budgetPerTeam?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  bidIncrement?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  bidWindowSec?: number;

  @IsOptional()
  @IsString()
  scheduledStart?: string;
}

export class UpdateAuctionDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsUUID()
  competitionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  budgetPerTeam?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  bidIncrement?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  bidWindowSec?: number;

  @IsOptional()
  @IsString()
  scheduledStart?: string;

  @IsOptional()
  @IsEnum(['draft', 'scheduled', 'live', 'paused', 'completed', 'cancelled'])
  status?:
    'draft' | 'scheduled' | 'live' | 'paused' | 'completed' | 'cancelled';
}
