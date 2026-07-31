import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateInjuryDto {
  @IsNotEmpty()
  @IsUUID()
  profileId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bodyPart?: string;

  @IsOptional()
  @IsEnum(['minor', 'moderate', 'severe', 'critical'])
  severity?: 'minor' | 'moderate' | 'severe' | 'critical';

  @IsOptional()
  @IsEnum(['active', 'recovering', 'recovered', 'chronic'])
  status?: 'active' | 'recovering' | 'recovered' | 'chronic';

  @IsNotEmpty()
  @IsString()
  sustainedDate: string;

  @IsOptional()
  @IsString()
  diagnosisDate?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  treatment?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
