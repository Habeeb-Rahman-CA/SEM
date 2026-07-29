import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class DuplicateEventDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  duplicateCompetitions?: boolean;

  @IsOptional()
  @IsBoolean()
  duplicateStages?: boolean;

  @IsOptional()
  @IsBoolean()
  duplicateVenues?: boolean;

  @IsOptional()
  @IsBoolean()
  duplicateTeams?: boolean;

  @IsOptional()
  @IsBoolean()
  duplicatePointSystems?: boolean;

  @IsOptional()
  @IsBoolean()
  duplicateSettings?: boolean;
}
