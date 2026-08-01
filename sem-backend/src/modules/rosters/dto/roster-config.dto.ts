import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PositionRuleDto {
  @IsNotEmpty()
  @IsString()
  position: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  min?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  max?: number;
}

export class UpsertRosterConfigDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  season: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxSquadSize?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxForeignPlayers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStarters?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxSubstitutes?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PositionRuleDto)
  positionRules?: PositionRuleDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
