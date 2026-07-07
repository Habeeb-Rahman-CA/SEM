import { IsOptional, IsString, IsUUID, MaxLength, MinLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PointsConfigEntryDto } from './create-competition.dto';

export class UpdateCompetitionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsUUID()
  sportId?: string;

  @IsOptional()
  @IsString()
  status?: string; // 'upcoming' | 'ongoing' | 'completed' | 'cancelled'

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointsConfigEntryDto)
  pointsConfig?: PointsConfigEntryDto[] | null;
}
