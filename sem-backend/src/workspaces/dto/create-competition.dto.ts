import { IsNotEmpty, IsString, IsUUID, IsOptional, MaxLength, MinLength, IsArray, ValidateNested, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class PointsConfigEntryDto {
  @IsInt()
  @Min(1)
  position: number;

  @IsString()
  @MaxLength(50)
  label: string;

  @IsNumber()
  @Min(0)
  points: number;
}

export class CreateCompetitionDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsNotEmpty()
  @IsUUID()
  sportId: string;

  @IsOptional()
  @IsString()
  status?: string; // 'upcoming' | 'ongoing' | 'completed' | 'cancelled'

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointsConfigEntryDto)
  pointsConfig?: PointsConfigEntryDto[];
}
