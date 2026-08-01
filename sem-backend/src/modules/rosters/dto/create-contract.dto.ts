import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateContractDto {
  @IsNotEmpty()
  @IsUUID()
  playerId: string;

  @IsNotEmpty()
  @IsUUID()
  teamId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  season: string;

  @IsOptional()
  @IsEnum(['full_time', 'loan', 'youth', 'short_term', 'amateur'])
  contractType?: 'full_time' | 'loan' | 'youth' | 'short_term' | 'amateur';

  @IsNotEmpty()
  @IsString()
  startDate: string;

  @IsNotEmpty()
  @IsString()
  endDate: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  salary?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  jerseyNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @IsOptional()
  @IsBoolean()
  isForeign?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateContractDto {
  @IsOptional()
  @IsEnum(['full_time', 'loan', 'youth', 'short_term', 'amateur'])
  contractType?: 'full_time' | 'loan' | 'youth' | 'short_term' | 'amateur';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  salary?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  jerseyNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string | null;

  @IsOptional()
  @IsBoolean()
  isForeign?: boolean;

  @IsOptional()
  @IsEnum(['active', 'expired', 'terminated', 'suspended'])
  status?: 'active' | 'expired' | 'terminated' | 'suspended';

  @IsOptional()
  @IsString()
  suspensionReason?: string;

  @IsOptional()
  @IsString()
  suspensionEndsAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
