import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateFitnessStatusDto {
  @IsNotEmpty()
  @IsUUID()
  profileId: string;

  @IsNotEmpty()
  @IsString()
  assessedAt: string;

  @IsOptional()
  @IsEnum(['fit', 'limited', 'unfit', 'injured'])
  fitnessLevel?: 'fit' | 'limited' | 'unfit' | 'injured';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  cardioScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  strengthScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  flexibilityScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  enduranceScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  restingHeartRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bodyFatPercent?: number;

  @IsOptional()
  @IsBoolean()
  clearedToPlay?: boolean;

  @IsOptional()
  @IsString()
  restrictions?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
